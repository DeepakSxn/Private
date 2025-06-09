/**
 * API endpoint for managing messages within a specific chat thread.
 * Provides operations to fetch and create messages for a given thread ID.
 * Uses Supabase for data persistence and maintains message ordering.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { extractTextFromBuffer } from '@/lib/file-utils';
import { promises as fs } from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('GET /api/threads/[id]/messages - Fetching messages for thread:', id);
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', id)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('GET /api/threads/[id]/messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('GET /api/threads/[id]/messages - Success:', data?.length, data);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { role, content, file } = body;
  console.log('POST /api/threads/[id]/messages - Received body:', body);
  console.log('POST /api/threads/[id]/messages - Creating message:', { id, role, content, file });
  if (!id) {
    console.error('POST /api/threads/[id]/messages error: Missing thread_id');
    return NextResponse.json({ error: 'Missing thread_id' }, { status: 400 });
  }
  if (!role || !content) {
    console.error('POST /api/threads/[id]/messages error: Missing role or content', body);
    return NextResponse.json({ error: 'Missing role or content' }, { status: 400 });
  }

  // Save the message as before
  const { data, error } = await supabase
    .from('messages')
    .insert([{ thread_id: id, role, content, file }])
    .select();
  if (error) {
    console.error('POST /api/threads/[id]/messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('POST /api/threads/[id]/messages - Inserted data:', data);
  console.log('POST /api/threads/[id]/messages - Success:', data[0]);

  // If this is a user message, trigger OpenAI with all files in the thread
  if (role === 'user') {
    // Prevent double response for image uploads
    if (file && file.type && file.type.startsWith('image/')) {
      // Do NOT generate a backend AI response for image uploads
      return NextResponse.json(data[0]);
    }
    // Fetch all files for this thread
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('thread_id', id);
    if (filesError) {
      console.error('Error fetching files for thread:', filesError);
      return NextResponse.json({ error: filesError.message }, { status: 500 });
    }

    // De-duplicate files by name
    const uniqueFiles = [];
    const seenNames = new Set();
    for (const file of files) {
      if (!seenNames.has(file.name)) {
        uniqueFiles.push(file);
        seenNames.add(file.name);
      }
    }

    // Fetch file contents (for all supported file types)
    let fileContents = [];
    for (const file of uniqueFiles) {
      try {
        if (file.url && file.type) {
          // Check if it's a supported file type
          const supportedTypes = [
            'application/pdf',
            'text/plain',
            'text/csv',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/tiff'
          ];
          
          if (supportedTypes.includes(file.type) || file.type.startsWith('text/')) {
            // Download the file from storage
            const res = await fetch(file.url);
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Use the extraction util for all supported file types
            const text = await extractTextFromBuffer(buffer, file.type);
            fileContents.push(`File: ${file.name}\n${text}`);
          } else {
            fileContents.push(`File: ${file.name} (unsupported file type: ${file.type})`);
          }
        } else {
          fileContents.push(`File: ${file.name} (missing url or type)`);
        }
      } catch (e) {
        fileContents.push(`File: ${file.name} (error reading file: ${e})`);
      }
    }

    // Detect if the user question is about the file
    const isFileQuestion = (text: string) => /file|document|pdf|excel|spreadsheet|word|docx?|xlsx?|image|photo|picture|attached|above/i.test(text);

    let prompt;
    if (files.length > 0 && isFileQuestion(content)) {
      // Include file content in the prompt
      prompt = `Files in this thread:\n${fileContents.join('\n\n')}\n\nUser question: ${content}`;
    } else {
      // General question, do NOT include file content
      prompt = content;
    }

    // Send to OpenAI (example, you may want to stream or handle differently)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
    });
    // Save the assistant's response as a message
    const aiResponse = completion.choices[0]?.message?.content || '[No response]';
    await supabase.from('messages').insert([
      { thread_id: id, role: 'assistant', content: aiResponse }
    ]);
  }

  return NextResponse.json(data[0]);
} 
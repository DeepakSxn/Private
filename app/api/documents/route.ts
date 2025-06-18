import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || '';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching documents from vector store...');
    
    // List files in the vector store
    const filesResponse = await openai.vectorStores.files.list(VECTOR_STORE_ID);
    console.log('Vector store files response:', filesResponse);
    
    const vectorFiles = filesResponse.data;
    console.log('Number of files found:', vectorFiles.length);

    // For each file, fetch its metadata from OpenAI files endpoint
    const filesWithNames = await Promise.all(
      vectorFiles.map(async (file: any) => {
        let filename = 'Untitled';
        try {
          console.log('Fetching metadata for file:', file.id);
          const fileMeta = await openai.files.retrieve(file.id);
          filename = fileMeta.filename || 'Untitled';
          console.log('File metadata retrieved:', { id: file.id, filename });
        } catch (e) {
          console.error('Error fetching file metadata:', e);
          // If metadata fetch fails, fallback to Untitled
        }
        return {
          ...file,
          filename,
          bytes: file.usage_bytes, // for compatibility with frontend
          created_at: file.created_at,
        };
      })
    );

    console.log('Returning files with names:', filesWithNames);
    return NextResponse.json({ success: true, files: filesWithNames }, { status: 200 });
  } catch (e: any) {
    console.error('Error in documents API:', e);
    return NextResponse.json({ 
      error: 'Failed to fetch documents', 
      details: e.message || e.toString(),
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
  }
} 
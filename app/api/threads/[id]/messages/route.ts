/**
 * API endpoint for managing messages within a specific chat thread.
 * Provides operations to fetch and create messages for a given thread ID.
 * Uses Supabase for data persistence and maintains message ordering.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

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
  return NextResponse.json(data[0]);
} 
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
  console.log('GET /api/threads/[id]/messages - Success:', data?.length);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  console.log('POST /api/threads/[id]/messages - Creating message:', { id, body });
  const { data, error } = await supabase
    .from('messages')
    .insert([{ thread_id: id, role: body.role, content: body.content }])
    .select();
  if (error) {
    console.error('POST /api/threads/[id]/messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('POST /api/threads/[id]/messages - Success:', data[0]);
  return NextResponse.json(data[0]);
} 
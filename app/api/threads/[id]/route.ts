/**
 * API endpoint for managing individual chat threads.
 * Provides CRUD operations (GET, PUT, DELETE) for a specific thread by ID.
 * Uses Supabase for data persistence.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('GET /api/threads/[id] - Fetching thread with id:', id);
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('GET /api/threads/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('GET /api/threads/[id] - Success:', data);
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  console.log('PUT /api/threads/[id] - Updating thread:', { id, body });
  const { data, error } = await supabase
    .from('threads')
    .update({ name: body.name })
    .eq('id', id)
    .select();
  if (error) {
    console.error('PUT /api/threads/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('PUT /api/threads/[id] - Success:', data);
  return NextResponse.json(data[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('DELETE /api/threads/[id] - Deleting thread with id:', id);
  const { error } = await supabase
    .from('threads')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('DELETE /api/threads/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('DELETE /api/threads/[id] - Success');
  return NextResponse.json({ success: true });
} 
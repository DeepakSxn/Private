import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const threadId = formData.get('thread_id') as string | null;
    if (!file) {
      console.error('[upload-image] No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!threadId) {
      return NextResponse.json({ error: 'No thread_id provided' }, { status: 400 });
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type,
      });
    if (error) {
      console.error('[upload-image] Supabase upload error:', error.message, error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);
    if (!publicUrlData.publicUrl) {
      console.error('[upload-image] Supabase getPublicUrl error: No public URL found');
      return NextResponse.json({ error: 'No public URL found' }, { status: 500 });
    }
    // Insert into files table
    const { error: fileInsertError } = await supabase
      .from('files')
      .insert([
        {
          thread_id: threadId,
          name: file.name,
          url: publicUrlData.publicUrl,
          type: file.type,
        },
      ]);
    if (fileInsertError) {
      console.error('[upload-image] Error inserting file into files table:', fileInsertError);
      return NextResponse.json({ error: fileInsertError.message }, { status: 500 });
    }
    return NextResponse.json({ url: publicUrlData.publicUrl }, {
      headers: {
        'Cache-Control': 'public, max-age=31536000',
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Vercel-CDN-Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (err: any) {
    console.error('[upload-image] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload image', details: err }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || '';
const MAPPING_FILE = path.resolve(process.cwd(), 'vector-file-mapping.json');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vectorFileId } = await params;
    // Step 1: Look up the mapping file for the original file id
    let mappings: any[] = [];
    try {
      const data = await fs.readFile(MAPPING_FILE, 'utf-8');
      mappings = JSON.parse(data);
    } catch (e) {
      // File may not exist yet
      mappings = [];
    }
    const mapping = mappings.find((m) => m.vector_store_file_id === vectorFileId);
    if (!mapping) {
      return NextResponse.json({ error: 'Download is not available for this file. The original file ID is missing.' }, { status: 404 });
    }
    const fileId = mapping.original_file_id;
    // Get file metadata
    const fileMeta = await openai.files.retrieve(fileId);
    // Download file content
    const fileContent = await openai.files.content(fileId);
    // fileContent is a ReadableStream
    return new NextResponse(fileContent.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileMeta.filename || mapping.filename || 'document'}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to download file', details: e.message || e.toString() }, { status: 500 });
  }
} 
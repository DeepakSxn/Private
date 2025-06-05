import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
const pdfParse = require('pdf-parse');
import * as XLSX from 'xlsx';
import * as textract from 'textract';

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // ✅ Ensure /tmp exists and write file to disk
    await fs.mkdir('/tmp', { recursive: true });
    const tempPath = path.join('/tmp', file.name);
    await fs.writeFile(tempPath, buffer);

    let text = '';

    if (mimeType === 'application/pdf') {
      const pdfData = await pdfParse(buffer); // or use tempPath with pdfParse if needed
      text = pdfData.text;
    } else if (mimeType === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      text = buffer.toString('utf-8');
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx')
    ) {
      // Try to extract data from all sheets
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let extracted = '';
      let foundData = false;
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (json.length > 0 && json.some(row => row.length > 0)) {
          foundData = true;
          extracted += `Sheet: ${sheetName}\n`;
          // Convert to Markdown table
          const rows = json.slice(0, 20); // limit to 20 rows per sheet
          const header = rows[0].map((cell: any) => cell || '').join(' | ');
          const separator = rows[0].map(() => '---').join(' | ');
          const body = rows.slice(1).map((row: any[]) => row.map(cell => cell || '').join(' | ')).join('\n');
          extracted += `| ${header} |\n| ${separator} |\n${body ? body.split('\n').map(r => `| ${r} |`).join('\n') : ''}\n\n`;
        }
      }
      if (!foundData) {
        text = 'No data found in any sheet of the Excel file.';
      } else {
        text = extracted;
      }
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      // Word .docx file support
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (
      mimeType === 'application/msword' ||
      file.name.endsWith('.doc')
    ) {
      // Word .doc file support using textract
      text = await new Promise((resolve, reject) => {
        textract.fromBufferWithMime(
          mimeType,
          buffer,
          (error: Error | null, result: string | null) => {
            if (error) reject(error);
            else resolve(result ?? "");
          }
        );
      });
    } else {
      text = 'Unsupported file type.';
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('File parsing failed:', err);
    return new Response(JSON.stringify({
      error: 'Failed to read file',
      details: (err as Error).message || String(err),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

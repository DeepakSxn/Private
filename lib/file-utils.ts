import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument } from 'pdfjs-dist';
import { read, utils } from 'xlsx';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(buffer);
      const numPages = pdfDoc.getPageCount();
      let fullText = '';

      // Load the PDF using PDF.js for text extraction
      const pdf = await getDocument({ data: buffer }).promise;

      // Extract text from each page
      for (let i = 0; i < numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        fullText += pageText + '\n\n';
      }

      return fullText.trim();
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'text/csv'
    ) {
      // Handle Excel files
      const workbook = read(buffer, { type: 'buffer' });
      let text = '';
      
      // Process each sheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert each row to a string
        text += `Sheet: ${sheetName}\n`;
        jsonData.forEach((row: any) => {
          text += row.join('\t') + '\n';
        });
        text += '\n';
      });
      
      return text.trim();
    } else if (mimeType.startsWith('text/')) {
      // Handle text files
      return buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
} 
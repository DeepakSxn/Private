import { PDFDocument } from 'pdf-lib';
import { read, utils } from 'xlsx';
import pdfParse from 'pdf-parse';

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      try {
        // Use pdf-parse for text extraction
        const pdfData = await pdfParse(buffer);
        let fullText = pdfData.text;

        // If text extraction was successful, return it
        if (fullText && fullText.trim().length > 0) {
          return fullText.trim();
        }

        // Fallback to basic PDF info if text extraction failed
        const pdfDoc = await PDFDocument.load(buffer);
        const numPages = pdfDoc.getPageCount();
        return `PDF Document (${numPages} pages)\nNote: Could not extract text from this PDF. The file might be scanned or contain only images.`;
      } catch (pdfError) {
        console.error('Error parsing PDF:', pdfError);
        // Fallback to basic PDF info
        const pdfDoc = await PDFDocument.load(buffer);
        const numPages = pdfDoc.getPageCount();
        return `PDF Document (${numPages} pages)\nError: Could not extract text from this PDF. The file might be corrupted or password protected.`;
      }
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
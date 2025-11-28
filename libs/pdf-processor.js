/**
 * PDF Processing Module - Extracts text from PDFs using PDF.js
 */

// Import PDF.js from local files
import * as pdfjsLib from './pdf.mjs';

// Set worker source to the local worker file
// Note: In service worker, this won't actually spawn a worker, PDF.js will run in main thread
const workerSrc = chrome.runtime.getURL('libs/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

console.log('PDF.js module loaded, worker source:', workerSrc);

/**
 * Extract text from PDF - Returns base64 for GPT-4 Vision API processing
 * Note: PDF.js cannot run in service workers due to import() restrictions
 * Instead, we convert the PDF to base64 and send to GPT-4 Vision API
 *
 * @param {Uint8Array} pdfData - Binary PDF data
 * @returns {Promise<Object>} Object with base64 data for Vision API
 */
export async function extractTextFromPDF(pdfData) {
  try {
    console.log('Converting PDF to base64 for GPT-4 Vision API...');
    console.log('Note: PDF.js cannot run in Chrome service workers due to import() restrictions');

    // Convert PDF to base64
    const base64 = uint8ArrayToBase64(pdfData);

    console.log('PDF converted to base64, length:', base64.length);

    // Return special marker indicating this needs Vision API processing
    return {
      useVisionAPI: true,
      base64: base64,
      mimeType: 'application/pdf'
    };

  } catch (error) {
    console.error('PDF base64 conversion failed:', error);
    console.error('Error details:', error.message);
    return null;
  }
}

/**
 * Convert hex string to text
 */
function hexToText(hex) {
  let text = '';
  for (let i = 0; i < hex.length; i += 2) {
    text += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return text;
}

/**
 * Extract text using OCR - For now, return base64 for GPT-4 Vision
 * @param {Uint8Array} pdfData - Binary PDF data
 * @returns {Promise<string>} Base64 PDF for vision API
 */
export async function extractWithOCR(pdfData) {
  try {
    console.log('OCR fallback: Converting PDF to base64 for GPT-4 Vision API');

    // Convert PDF to base64 - we'll send this to GPT-4 Vision
    // Note: This is a workaround since we can't run Tesseract in service worker
    const base64 = uint8ArrayToBase64(pdfData);

    console.log('PDF converted to base64, length:', base64.length);

    // Return a message indicating this needs vision API
    return `[PDF_BASE64_FOR_VISION_API]\n\nThis PDF requires OCR. The PDF has been converted to base64.\n\nUse GPT-4 Vision API or download a proper PDF.js library to extract text from this document.\n\nFor now, please try uploading a PDF with selectable text, or the system will need to be enhanced with proper OCR capabilities.`;
  } catch (error) {
    console.error('OCR/Base64 conversion failed:', error);
    throw new Error('Failed to process PDF for OCR. Please try a different PDF file.');
  }
}

/**
 * Convert PDF pages to images for OCR
 * @param {Uint8Array} pdfData - Binary PDF data
 * @returns {Promise<Array>} Array of image data URLs
 */
async function convertPDFToImages(pdfData) {
  try {
    await initPDFJS();

    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    const images = [];

    // Convert each page to image
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) { // Limit to 10 pages
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      // Create canvas
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to blob
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);

      images.push(imageUrl);
    }

    return images;
  } catch (error) {
    console.error('PDF to image conversion failed:', error);
    throw error;
  }
}

/**
 * Load Tesseract.js library
 */
async function loadTesseract() {
  try {
    // Import Tesseract from CDN
    const { createWorker } = await import('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.esm.min.js');
    const worker = await createWorker();
    return worker;
  } catch (error) {
    console.error('Failed to load Tesseract:', error);
    throw error;
  }
}

/**
 * Convert Uint8Array to base64
 */
function uint8ArrayToBase64(uint8Array) {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Simplified PDF text extraction using fetch and PDF.js
 * This is a fallback method that works in service workers
 */
export async function extractTextFromPDFSimple(pdfUrl) {
  try {
    const response = await fetch(pdfUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // For now, return base64 encoded PDF for AI to process directly
    // OpenAI's GPT-4 Vision can handle PDFs
    const base64 = uint8ArrayToBase64(uint8Array);

    return {
      type: 'pdf_base64',
      data: base64,
      size: uint8Array.length
    };
  } catch (error) {
    console.error('Simple PDF extraction failed:', error);
    throw error;
  }
}

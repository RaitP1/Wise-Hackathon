/**
 * PDF Processing Module - Extracts text from PDFs using PDF.js and OCR fallback
 */

// Import PDF.js library (will be loaded via CDN in practice)
// For production, download pdf.js and pdf.worker.js locally

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib = null;

/**
 * Initialize PDF.js library
 */
async function initPDFJS() {
  if (pdfjsLib) return pdfjsLib;

  // Load PDF.js from CDN
  try {
    // In a real extension, you'd bundle this or use importScripts
    // For now, we'll use dynamic import
    const script = await import(/* webpackIgnore: true */ PDFJS_CDN);
    pdfjsLib = script;
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw new Error('PDF.js library failed to load');
  }
}

/**
 * Extract text from PDF using PDF.js
 * @param {Uint8Array} pdfData - Binary PDF data
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromPDF(pdfData) {
  try {
    // For service worker compatibility, we'll use a simpler approach
    // Convert PDF to base64 and use it directly
    const base64 = uint8ArrayToBase64(pdfData);

    // Load PDF using data URL
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');

      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }

    return fullText.trim();
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    return null;
  }
}

/**
 * Extract text using OCR (Tesseract.js)
 * @param {Uint8Array} pdfData - Binary PDF data
 * @returns {Promise<string>} OCR extracted text
 */
export async function extractWithOCR(pdfData) {
  try {
    // Convert PDF pages to images first
    const images = await convertPDFToImages(pdfData);

    // Load Tesseract
    const Tesseract = await loadTesseract();

    let ocrText = '';

    // Process each image with OCR
    for (let i = 0; i < images.length; i++) {
      const { data: { text } } = await Tesseract.recognize(images[i], 'eng', {
        logger: m => console.log(`OCR Page ${i + 1}:`, m)
      });

      ocrText += `\n--- Page ${i + 1} (OCR) ---\n${text}\n`;
    }

    return ocrText.trim();
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw error;
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

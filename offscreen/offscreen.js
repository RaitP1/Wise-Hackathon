/**
 * Offscreen Document for PDF Processing
 * This runs PDF.js which requires a DOM environment
 */

import * as pdfjsLib from '../libs/pdf.mjs';

// Configure PDF.js worker
const workerSrc = chrome.runtime.getURL('libs/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

console.log('Offscreen document loaded, PDF.js configured');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractPDFText') {
    console.log('Received PDF extraction request in offscreen document');
    extractPDFText(message.pdfData)
      .then(text => {
        console.log('PDF extraction successful, text length:', text.length);
        sendResponse({ success: true, text: text });
      })
      .catch(error => {
        console.error('PDF extraction failed in offscreen:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

/**
 * Extract text from PDF using PDF.js
 * @param {Array} pdfDataArray - PDF data as array
 * @returns {Promise<string>} Extracted text
 */
async function extractPDFText(pdfDataArray) {
  try {
    console.log('Starting PDF text extraction...');
    console.log('PDF data size:', pdfDataArray.length);

    // Convert array to Uint8Array
    const pdfData = new Uint8Array(pdfDataArray);

    // Load PDF
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      verbosity: 0
    });

    const pdf = await loadingTask.promise;
    console.log(`PDF loaded: ${pdf.numPages} pages`);

    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdf.numPages}...`);

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');

      fullText += pageText + '\n';
      console.log(`Page ${pageNum}: ${pageText.length} characters`);
    }

    fullText = fullText.trim();
    console.log(`Total text extracted: ${fullText.length} characters`);

    if (fullText.length > 0) {
      console.log('First 500 chars:', fullText.substring(0, 500));
    }

    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}

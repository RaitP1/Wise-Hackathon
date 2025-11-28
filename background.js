/**
 * Background Service Worker - Handles PDF processing and AI API calls
 */

import { extractTextFromPDF, extractWithOCR } from './libs/pdf-processor.js';
import { extractInvoiceFieldsWithAI } from './libs/ai-extractor.js';

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content script and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processPDF') {
    handlePDFProcessing(message).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'extractWithAI') {
    handleAIExtraction(message).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (message.action === 'getApiKey') {
    getApiKey().then(sendResponse);
    return true;
  }

  if (message.action === 'saveApiKey') {
    saveApiKey(message.apiKey).then(sendResponse);
    return true;
  }
});

/**
 * Handle PDF processing
 */
async function handlePDFProcessing(message) {
  try {
    const { pdfUrl, pdfType } = message;

    // Fetch PDF data
    const pdfData = await fetchPDF(pdfUrl, pdfType);

    // Try text extraction first
    let extractedText = await extractTextFromPDF(pdfData);

    // If text extraction fails or returns empty, try OCR
    if (!extractedText || extractedText.trim().length < 100) {
      console.log('Text layer insufficient, attempting OCR...');
      extractedText = await extractWithOCR(pdfData);
    }

    return {
      source_type: 'PDF',
      text: extractedText,
      url: pdfUrl,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw error;
  }
}

/**
 * Fetch PDF data from URL
 */
async function fetchPDF(url, pdfType) {
  try {
    // For Google Drive URLs (Gmail attachments)
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      return await fetchGoogleDrivePDF(url);
    }

    // For blob URLs, we need to fetch from the active tab
    if (url.startsWith('blob:')) {
      // Request content script to fetch the blob
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fetchBlob',
        url: url
      });
      return response.data;
    }

    // For data URLs
    if (url.startsWith('data:')) {
      const base64Data = url.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    // For regular URLs, fetch directly
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    throw error;
  }
}

/**
 * Fetch PDF from Google Drive (Gmail attachments)
 */
async function fetchGoogleDrivePDF(url) {
  try {
    // Extract file ID from URL
    const fileIdMatch = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
    if (!fileIdMatch) {
      throw new Error('Could not extract Google Drive file ID');
    }

    const fileId = fileIdMatch[1];

    // Try to fetch using Google Drive export URL
    const exportUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await fetch(exportUrl);
    if (!response.ok) {
      // If direct download fails, try alternate method
      throw new Error('Google Drive PDF requires authentication. Please download the PDF and open it directly.');
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Google Drive PDF fetch error:', error);
    // Provide helpful error message
    throw new Error('Cannot access PDF from Gmail attachment viewer. Please download the PDF and open it in a new tab to extract data.');
  }
}

/**
 * Handle AI extraction
 */
async function handleAIExtraction(message) {
  try {
    const { data } = message;

    // Get API key from storage
    const apiKey = await getApiKey();

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set it in the extension settings.');
    }

    // Call AI extraction
    const extractedFields = await extractInvoiceFieldsWithAI(data, apiKey);

    return {
      success: true,
      fields: extractedFields
    };
  } catch (error) {
    console.error('AI extraction error:', error);
    throw error;
  }
}

/**
 * Get API key from storage
 */
async function getApiKey() {
  const result = await chrome.storage.local.get(['openai_api_key']);
  return result.openai_api_key || null;
}

/**
 * Save API key to storage
 */
async function saveApiKey(apiKey) {
  await chrome.storage.local.set({ openai_api_key: apiKey });
  return { success: true };
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Invoice Extraction Plugin installed');
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

console.log('Background service worker loaded');

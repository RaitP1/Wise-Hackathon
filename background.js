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

  if (message.action === 'processPDFFile') {
    handlePDFFileProcessing(message).then(sendResponse).catch(error => {
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

  // Wise transfer flow from sidebar
  if (message.action === 'createWiseTransfer') {
    createWiseTransferFlow(message.transferData)
      .then(sendResponse)
      .catch(error => {
        console.error('Wise transfer flow error:', error);
        sendResponse({ success: false, error: error.message || 'Wise transfer failed' });
      });
    return true;
  }
});

// ===== Wise Sandbox API integration =====

// NOTE: Using static sandbox bearer token provided by user
const WISE_SANDBOX_TOKEN = 'a95c29fe-241b-4951-ad3a-ebff3d7c6787';
const WISE_API_BASE = 'https://api.wise-sandbox.com';

/**
 * Execute full Wise transfer flow:
 * 1) Create quote
 * 2) Create recipient account
 * 3) Create transfer
 */
async function createWiseTransferFlow(transferData) {
  const profileId = 28692607; // fixed sandbox profile

  const { amount, currency, receiverName, bankFields, referenceNumber } = transferData;

  if (!amount || !currency || !receiverName || !bankFields) {
    throw new Error('Missing required transfer data');
  }

  // 1) Create quote
  const quoteBody = {
    sourceCurrency: currency,
    targetCurrency: currency,
    sourceAmount: null,
    targetAmount: parseFloat(amount),
    profile: profileId,
    targetAccount: null,
    preferredPayIn: 'BALANCE'
  };

  const quote = await wisePost(`/v3/profiles/${profileId}/quotes`, quoteBody);

  if (!quote || !quote.id) {
    throw new Error('Failed to create Wise quote');
  }

  // 2) Create recipient account (IBAN only for now)
  const iban = bankFields.iban || bankFields.IBAN || null;
  if (!iban) {
    throw new Error('IBAN is required for Wise transfer in this demo');
  }

  const cleanIban = iban.replace(/\s+/g, '');

  const recipientBody = {
    accountHolderName: receiverName,
    currency: currency,
    type: 'iban',
    profile: profileId,
    details: {
      legalType: 'PRIVATE',
      IBAN: cleanIban
    }
  };

  const recipient = await wisePost('/v1/accounts', recipientBody);

  if (!recipient || !recipient.id) {
    throw new Error('Failed to create Wise recipient account');
  }

  // 3) Create transfer
  const transferBody = {
    targetAccount: recipient.id,
    quoteUuid: quote.id,
    customerTransactionId: crypto.randomUUID(),
    details: {
      reference: referenceNumber || 'Invoice payment',
      transferPurpose: 'verification.transfers.purpose.pay.bills'
    }
  };

  const transfer = await wisePost('/v1/transfers', transferBody);

  if (!transfer || !transfer.id) {
    throw new Error('Failed to create Wise transfer');
  }

  return { success: true, transferId: transfer.id, quoteId: quote.id, recipientId: recipient.id };
}

/**
 * Helper for Wise POST requests
 */
async function wisePost(path, body) {
  const url = `${WISE_API_BASE}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WISE_SANDBOX_TOKEN}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('Wise API error:', response.status, text);
    throw new Error(`Wise API error ${response.status}`);
  }

  return response.json();
}

/**
 * Handle PDF processing
 */
async function handlePDFProcessing(message) {
  try {
    const { pdfUrl, pdfType } = message;

    // Fetch PDF data
    const pdfData = await fetchPDF(pdfUrl, pdfType);

    // Ensure offscreen PDF parser exists
    await setupOffscreenDocument();

    // Ask offscreen document (PDF.js) to extract text
    const offscreenResult = await chrome.runtime.sendMessage({
      action: 'extractPDFText',
      pdfData: Array.from(pdfData)
    });

    if (!offscreenResult || !offscreenResult.success) {
      throw new Error(offscreenResult?.error || 'Offscreen PDF text extraction failed');
    }

    let extractedText = offscreenResult.text || '';

    // Fallback to heuristic extraction if offscreen text is too short
    if (!extractedText || extractedText.trim().length < 50) {
      console.log('Offscreen text insufficient, attempting heuristic extraction...');
      extractedText = await extractTextFromPDF(pdfData);
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
 * Ensure offscreen document exists
 */
async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return; // Already exists
  }

  console.log('Creating offscreen document for PDF processing...');
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['DOM_SCRAPING'], // Need DOM for PDF.js
    justification: 'PDF text extraction requires PDF.js which needs a DOM environment'
  });
  console.log('Offscreen document created');
}

/**
 * Handle PDF file processing from drag-and-drop
 */
async function handlePDFFileProcessing(message) {
  try {
    console.log('=== Background: Starting PDF file processing ===');
    const { pdfData, fileName } = message;

    console.log('PDF file name:', fileName);
    console.log('PDF data size:', pdfData.length, 'bytes');

    // Validate PDF header
    const uint8Array = new Uint8Array(pdfData);
    const header = String.fromCharCode(...uint8Array.slice(0, 5));
    console.log('PDF header:', header);
    if (!header.startsWith('%PDF-')) {
      throw new Error('Invalid PDF file: Missing PDF header');
    }

    // Setup offscreen document for PDF.js
    await setupOffscreenDocument();

    // Send PDF to offscreen document for text extraction
    console.log('Sending PDF to offscreen document for processing...');
    const result = await chrome.runtime.sendMessage({
      action: 'extractPDFText',
      pdfData: pdfData
    });

    if (!result.success) {
      throw new Error(result.error || 'PDF extraction failed in offscreen document');
    }

    let extractedText = result.text;

    // Fallback to heuristic extraction if needed
    if (!extractedText || extractedText.trim().length < 50) {
      console.log('Offscreen text insufficient for file, attempting heuristic extraction...');
      const uint8Array = new Uint8Array(pdfData);
      extractedText = await extractTextFromPDF(uint8Array);
    }
    console.log('Text extracted from offscreen:', extractedText ? extractedText.length : 0, 'characters');

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error('Could not extract enough text from PDF. The PDF might be image-based or empty.');
    }

    console.log('First 500 chars:', extractedText.substring(0, 500));
    console.log('=== Background: PDF processing complete ===');

    return {
      source_type: 'PDF',
      text: extractedText,
      fileName: fileName,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('PDF file processing error:', error);
    throw error;
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

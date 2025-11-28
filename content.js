/**
 * Content Script - Detects and extracts invoice data from DOM and PDFs
 * Only activates when sidebar is opened
 */

(function() {
  'use strict';

  // Listen for extraction requests from sidebar
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractInvoice') {
      handleExtraction().then(sendResponse).catch(error => {
        sendResponse({ error: error.message });
      });
      return true; // Keep channel open for async response
    }
  });

  /**
   * Main extraction handler
   */
  async function handleExtraction() {
    try {
      // Detect content type
      const contentType = detectContentType();

      if (contentType === 'pdf') {
        return await extractFromPDF();
      } else {
        return await extractFromDOM();
      }
    } catch (error) {
      console.error('Extraction error:', error);
      throw error;
    }
  }

  /**
   * Detect if current page is a PDF or HTML
   */
  function detectContentType() {
    // Check if it's Chrome/Firefox PDF viewer
    if (document.contentType === 'application/pdf' ||
        window.location.href.endsWith('.pdf') ||
        document.querySelector('embed[type="application/pdf"]') ||
        document.querySelector('iframe[src*=".pdf"]') ||
        document.querySelector('object[type="application/pdf"]')) {
      return 'pdf';
    }
    return 'html';
  }

  /**
   * Extract data from DOM/HTML page
   */
  async function extractFromDOM() {
    // Get cleaned text content
    const textContent = extractCleanText();

    // Get structured HTML for better context
    const structuredHTML = extractStructuredHTML();

    return {
      source_type: 'DOM',
      text: textContent,
      html: structuredHTML,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract clean text from DOM
   */
  function extractCleanText() {
    // Clone the document to avoid modifying the original
    const clone = document.body.cloneNode(true);

    // Remove scripts, styles, and other non-content elements
    const elementsToRemove = clone.querySelectorAll('script, style, noscript, iframe, svg, path');
    elementsToRemove.forEach(el => el.remove());

    return clone.innerText.trim();
  }

  /**
   * Extract structured HTML (preserve tables and important structure)
   */
  function extractStructuredHTML() {
    const clone = document.body.cloneNode(true);

    // Remove unnecessary elements but keep structure
    const elementsToRemove = clone.querySelectorAll('script, style, noscript, iframe, svg, path, img, video, audio');
    elementsToRemove.forEach(el => el.remove());

    // Keep only text and structural elements
    return clone.innerHTML.substring(0, 50000); // Limit size
  }

  /**
   * Extract data from PDF
   */
  async function extractFromPDF() {
    try {
      // Try to find PDF source
      const pdfSource = findPDFSource();

      if (!pdfSource) {
        throw new Error('Could not locate PDF source');
      }

      // Send PDF URL to background script for processing
      const response = await chrome.runtime.sendMessage({
        action: 'processPDF',
        pdfUrl: pdfSource.url,
        pdfType: pdfSource.type
      });

      return response;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw error;
    }
  }

  /**
   * Find PDF source URL
   */
  function findPDFSource() {
    // Check for embed element
    let pdfElement = document.querySelector('embed[type="application/pdf"]');
    if (pdfElement && pdfElement.src) {
      return { url: pdfElement.src, type: 'embed' };
    }

    // Check for iframe
    pdfElement = document.querySelector('iframe[src*=".pdf"]');
    if (pdfElement && pdfElement.src) {
      return { url: pdfElement.src, type: 'iframe' };
    }

    // Check for object
    pdfElement = document.querySelector('object[type="application/pdf"]');
    if (pdfElement && pdfElement.data) {
      return { url: pdfElement.data, type: 'object' };
    }

    // Check if current page is PDF viewer
    if (document.contentType === 'application/pdf' || window.location.href.endsWith('.pdf')) {
      return { url: window.location.href, type: 'direct' };
    }

    // Check for blob URLs
    const allIframes = document.querySelectorAll('iframe');
    for (const iframe of allIframes) {
      if (iframe.src && iframe.src.startsWith('blob:')) {
        return { url: iframe.src, type: 'blob' };
      }
    }

    return null;
  }

  /**
   * Helper function to check if element is visible
   */
  function isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0';
  }

  console.log('Invoice Extraction Content Script loaded');
})();

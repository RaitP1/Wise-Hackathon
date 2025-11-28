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
    // Check if we're on Gmail
    if (window.location.hostname.includes('mail.google.com')) {
      return extractGmailContent();
    }

    // Check if we're on Google Docs
    if (window.location.hostname.includes('docs.google.com')) {
      return extractGoogleDocsContent();
    }

    // Clone the document to avoid modifying the original
    const clone = document.body.cloneNode(true);

    // Remove scripts, styles, and other non-content elements
    const elementsToRemove = clone.querySelectorAll('script, style, noscript, iframe, svg, path');
    elementsToRemove.forEach(el => el.remove());

    return clone.innerText.trim();
  }

  /**
   * Extract content specifically from Gmail
   */
  function extractGmailContent() {
    let emailText = '';

    console.log('Extracting Gmail content...');

    // BEST APPROACH: Get ALL .a3s elements (which contain email content)
    // Gmail often splits content into multiple .a3s divs
    const allEmailParts = document.querySelectorAll('.a3s.aiL, .a3s');

    if (allEmailParts.length > 0) {
      console.log(`Found ${allEmailParts.length} email content parts`);

      // Combine all visible parts
      const textParts = Array.from(allEmailParts)
        .filter(el => {
          // Only get visible elements
          const rect = el.getBoundingClientRect();
          return rect.height > 0 && rect.width > 0;
        })
        .map(el => {
          const text = el.innerText || el.textContent;
          console.log('Part length:', text.length, 'Preview:', text.substring(0, 50).replace(/\n/g, ' '));
          return text;
        })
        .filter(text => text && text.trim().length > 0);

      emailText = textParts.join('\n\n');
      console.log('Combined all parts, total length:', emailText.length);
    }

    // Fallback 1: Try to get the main message container
    if (!emailText || emailText.length < 100) {
      console.log('Trying .ii.gt container...');
      const messageContainer = document.querySelector('.ii.gt');
      if (messageContainer && isElementVisible(messageContainer)) {
        emailText = messageContainer.innerText || messageContainer.textContent;
        console.log('Got from .ii.gt, length:', emailText.length);
      }
    }

    // Fallback 2: Get everything from the message view
    if (!emailText || emailText.length < 100) {
      console.log('Using full message area fallback...');
      const messageArea = document.querySelector('.nH.bkK .adn') ||
                         document.querySelector('.h7') ||
                         document.querySelector('[role="listitem"]');

      if (messageArea) {
        const clone = messageArea.cloneNode(true);
        // Remove UI elements but keep content
        const elementsToRemove = clone.querySelectorAll('script, style, button, svg, [role="button"], .T-I, .asa, .G-atb, nav, header');
        elementsToRemove.forEach(el => el.remove());
        emailText = clone.innerText.trim();
        console.log('Fallback extraction, length:', emailText.length);
      }
    }

    console.log('Final extracted text length:', emailText.length);
    console.log('First 500 chars:', emailText.substring(0, 500));

    // Check for invoice keywords
    const hasInvoiceData = emailText.toLowerCase().includes('iban') ||
                          emailText.toLowerCase().includes('summa') ||
                          emailText.toLowerCase().includes('konto');
    console.log('Contains invoice keywords:', hasInvoiceData);

    return emailText.trim();
  }

  /**
   * Extract content from Google Docs (including PDF viewer)
   */
  function extractGoogleDocsContent() {
    let docsText = '';

    console.log('Extracting Google Docs content...');
    console.log('URL:', window.location.href);

    // Method 1: Try to extract from Google Docs Editor (if it's a document)
    // Text in Google Docs is stored in .kix-wordhtmlgenerator-word-node elements
    const docWords = document.querySelectorAll('.kix-wordhtmlgenerator-word-node');
    if (docWords.length > 0) {
      console.log(`Found ${docWords.length} word nodes in Google Docs editor`);
      docsText = Array.from(docWords)
        .map(node => node.textContent)
        .join(' ');
      console.log('Extracted from word nodes, length:', docsText.length);
    }

    // Method 2: Try to extract from Google Docs canvas (another rendering method)
    if (!docsText || docsText.length < 100) {
      const canvas = document.querySelector('.kix-canvas-tile-content');
      if (canvas) {
        console.log('Found canvas content');
        // For canvas, we need to get the accessible text
        const parent = canvas.closest('.kix-appview-editor');
        if (parent) {
          docsText = parent.innerText || parent.textContent;
          console.log('Extracted from canvas parent, length:', docsText.length);
        }
      }
    }

    // Method 3: Google Drive PDF Viewer (when PDF is opened in Google Docs)
    // The PDF viewer renders text in a different structure
    if (!docsText || docsText.length < 100) {
      console.log('Trying PDF viewer extraction...');

      // Look for the text layer in PDF viewer
      const textLayers = document.querySelectorAll('.textLayer');
      if (textLayers.length > 0) {
        console.log(`Found ${textLayers.length} text layers (PDF)`);
        docsText = Array.from(textLayers)
          .map(layer => layer.innerText || layer.textContent)
          .join('\n\n');
        console.log('Extracted from PDF text layers, length:', docsText.length);
      }
    }

    // Method 4: Try the main viewer content area (works for both docs and PDFs)
    if (!docsText || docsText.length < 100) {
      console.log('Trying main content area...');
      const contentArea = document.querySelector('#viewer') ||
                         document.querySelector('.doc-content') ||
                         document.querySelector('[role="main"]');
      if (contentArea) {
        const clone = contentArea.cloneNode(true);
        // Remove UI elements
        const elementsToRemove = clone.querySelectorAll('script, style, button, svg, nav, header, [role="button"]');
        elementsToRemove.forEach(el => el.remove());
        docsText = clone.innerText || clone.textContent;
        console.log('Extracted from main content area, length:', docsText.length);
      }
    }

    // Method 5: Last resort - get all visible text from body
    if (!docsText || docsText.length < 100) {
      console.log('Using fallback - full body text...');
      const clone = document.body.cloneNode(true);
      // Remove menus, toolbars, scripts, etc.
      const elementsToRemove = clone.querySelectorAll(
        'script, style, button, svg, nav, header, footer, ' +
        '[role="menu"], [role="menubar"], [role="toolbar"], ' +
        '.goog-menu, .goog-toolbar, [aria-label*="menu"]'
      );
      elementsToRemove.forEach(el => el.remove());
      docsText = clone.innerText.trim();
      console.log('Fallback extraction, length:', docsText.length);
    }

    console.log('Final extracted text length:', docsText.length);
    console.log('First 500 chars:', docsText.substring(0, 500));

    // Check for invoice keywords
    const hasInvoiceData = docsText.toLowerCase().includes('iban') ||
                          docsText.toLowerCase().includes('summa') ||
                          docsText.toLowerCase().includes('invoice') ||
                          docsText.toLowerCase().includes('konto');
    console.log('Contains invoice keywords:', hasInvoiceData);

    return docsText.trim();
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
    // Check for Gmail attachment viewer (Google Drive viewer)
    const gmailIframes = document.querySelectorAll('iframe[src*="drive.google.com"], iframe[src*="docs.google.com"]');
    for (const iframe of gmailIframes) {
      if (iframe.src && (iframe.src.includes('/file/') || iframe.src.includes('/preview'))) {
        // Extract the file ID from Google Drive URL
        const match = iframe.src.match(/\/d\/([^\/]+)/);
        if (match) {
          return {
            url: iframe.src,
            type: 'google-drive',
            fileId: match[1]
          };
        }
      }
    }

    // Check for embed element
    let pdfElement = document.querySelector('embed[type="application/pdf"]');
    if (pdfElement && pdfElement.src) {
      return { url: pdfElement.src, type: 'embed' };
    }

    // Check for iframe with PDF
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

    // Check for blob URLs in any iframe
    const allIframes = document.querySelectorAll('iframe');
    for (const iframe of allIframes) {
      if (iframe.src) {
        // Blob URLs
        if (iframe.src.startsWith('blob:')) {
          return { url: iframe.src, type: 'blob' };
        }
        // Data URLs
        if (iframe.src.startsWith('data:application/pdf')) {
          return { url: iframe.src, type: 'data-url' };
        }
      }
    }

    // Check for Gmail specific PDF attachment indicators
    const attachmentLinks = document.querySelectorAll('a[download*=".pdf"], a[href*=".pdf"]');
    for (const link of attachmentLinks) {
      if (link.href && isElementVisible(link)) {
        return { url: link.href, type: 'attachment-link' };
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

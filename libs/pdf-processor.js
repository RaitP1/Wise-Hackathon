/**
 * PDF Processing Module - Extracts rough text from PDFs in a service worker-safe way.
 *
 * NOTE: We cannot use PDF.js here because dynamic import() is disallowed in
 * service workers. Instead, we approximate text extraction by decoding the
 * raw bytes and heuristically pulling out readable strings from the PDF.
 */

/**
 * Extract text from PDF bytes using a lightweight, PDF.js-free heuristic.
 *
 * @param {Uint8Array} pdfData - Binary PDF data
 * @returns {Promise<string>} Approximate text content from the PDF
 */
export async function extractTextFromPDF(pdfData) {
  try {
    console.log('Heuristic PDF text extraction starting. Byte length:', pdfData.length);

    // Decode bytes to a latin1 string (preserves byte values)
    const decoder = new TextDecoder('latin1');
    const pdfString = decoder.decode(pdfData);

    // In many PDFs, visible text appears in parentheses. Extract those.
    const textMatches = pdfString.match(/\(([^)]{3,})\)/g);
    let extractedText = '';

    if (textMatches && textMatches.length > 0) {
      console.log(`Found ${textMatches.length} candidate text strings in PDF`);

      for (const match of textMatches) {
        let text = match.slice(1, -1); // Remove surrounding parentheses

        // Skip very short or obviously binary chunks
        if (text.length < 3 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
          continue;
        }

        // Unescape common PDF escape sequences
        text = text
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/\\([()])/g, '$1');

        extractedText += text + ' ';
      }
    }

    extractedText = extractedText.trim();
    console.log('Heuristic PDF text length:', extractedText.length);
    console.log('Heuristic PDF text sample:', extractedText.substring(0, 500));

    return extractedText;
  } catch (error) {
    console.error('Heuristic PDF text extraction failed:', error);
    throw error;
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
 * Extract text using OCR fallback.
 * Currently we do not run a real OCR engine in the service worker.
 * We simply reuse the heuristic text extraction as a best-effort fallback.
 *
 * @param {Uint8Array} pdfData - Binary PDF data
 * @returns {Promise<string>} Extracted text (same heuristic as extractTextFromPDF)
 */
export async function extractWithOCR(pdfData) {
  try {
    console.log('OCR fallback: reusing heuristic PDF text extraction.');
    return await extractTextFromPDF(pdfData);
  } catch (error) {
    console.error('OCR fallback extraction failed:', error);
    throw new Error('Failed to process PDF. Please try a different PDF file.');
  }
}

// NOTE: All PDF.js and Tesseract/OCR-related code has been removed from this
// module because it is not compatible with Chrome's service worker
// restrictions (no dynamic import()). If you later want full-fidelity PDF
// parsing, it should be done in an offscreen document or content script, not
// directly in the background service worker.

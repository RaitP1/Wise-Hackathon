/**
 * AI Extraction Module - Uses OpenAI GPT-4 to extract invoice fields semantically
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4-turbo-preview'; // or 'gpt-4-vision-preview' for PDFs with images

/**
 * Extract invoice fields using OpenAI GPT-4
 * @param {Object} data - Extracted data from content script
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Extracted invoice fields
 */
export async function extractInvoiceFieldsWithAI(data, apiKey) {
  try {
    console.log('=== AI EXTRACTION START ===');
    console.log('Source type:', data.source_type);

    // Check if we need to use Vision API for PDF
    if (data.source_type === 'PDF_VISION' && data.useVisionAPI) {
      console.log('Using GPT-4 Vision API for PDF processing');
      return await extractFromPDFWithVision(data.pdfBase64, apiKey);
    }

    const prompt = buildExtractionPrompt(data);

    console.log('Text length:', data.text ? data.text.length : 0);
    console.log('Text preview:', data.text ? data.text.substring(0, 500) : 'NO TEXT');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content;

    console.log('AI Raw Response:', extractedText);

    // Parse JSON response
    const extractedFields = JSON.parse(extractedText);

    console.log('AI Parsed Fields:', extractedFields);

    // Validate and normalize fields
    const normalized = normalizeFields(extractedFields);

    console.log('AI Normalized Fields:', normalized);
    console.log('=== AI EXTRACTION END ===');

    return normalized;
  } catch (error) {
    console.error('AI extraction error:', error);
    throw error;
  }
}

/**
 * Build extraction prompt from data
 */
function buildExtractionPrompt(data) {
  if (data.source_type === 'PDF_VISION') {
    // This will be handled differently - see extractInvoiceFieldsWithAI
    return null;
  } else if (data.source_type === 'PDF') {
    return `Extract invoice information from the following PDF text content:\n\n${data.text}`;
  } else {
    // DOM/HTML content
    return `Extract invoice information from the following webpage content:\n\nText Content:\n${data.text}\n\nURL: ${data.url}`;
  }
}

/**
 * Get system prompt for invoice extraction
 */
function getSystemPrompt() {
  return `You are an expert invoice data extraction system. Your task is to extract structured invoice information from various document formats (HTML, PDF, scanned documents) in any language.

Extract the following fields from the invoice. If a field is not found, use null:

BASIC INVOICE INFORMATION:
1. invoice_number: The invoice number or ID
2. amount: The total amount to be paid (numbers only, no currency symbols)
3. currency: The currency code (EUR, USD, GBP, etc.)
4. due_date: Payment due date (YYYY-MM-DD format)
5. issue_date: Invoice issue date (YYYY-MM-DD format)
6. reference_number: Payment reference number (Viitenumber/KID/Payment Reference)
7. description: Brief payment description or invoice subject
8. receiver_name: Name of the payee/receiver/vendor
9. receiver_address: Full address of receiver (if present)
10. sender_name: Name of the payer/sender (if present)

BANK ACCOUNT DETAILS (extract all that are present):
11. iban: International Bank Account Number (for EUR, CHF, NOK, SEK, DKK, etc.)
12. account_number: Bank account number (for USD, GBP, AUD, INR, etc.)
13. routing_number: US ABA routing number (9 digits, for USD)
14. account_type: Account type (CHECKING or SAVINGS, for USD/JPY/BRL)
15. sort_code: UK sort code (6 digits, for GBP)
16. ifsc_code: Indian IFSC code (11 characters, for INR)
17. bsb_code: Australian BSB code (6 digits, for AUD)
18. bank_code: Bank identification code (for JPY, SGD, HKD, BRL)
19. branch_code: Branch identification code (for JPY, SGD, HKD, BRL)
20. institution_number: Canadian institution number (3 digits, for CAD)
21. transit_number: Canadian transit number (5 digits, for CAD)
22. cnaps_code: Chinese CNAPS code (12 digits, for CNY)
23. clabe_number: Mexican CLABE number (18 digits, for MXN)

Important instructions:
- Understand context semantically, not just keywords
- Support all languages automatically (English, Estonian, Norwegian, German, French, etc.)
- For dates: convert any date format to YYYY-MM-DD
- For amounts: extract only the number, remove currency symbols and thousand separators
- Extract ALL bank account fields that are present in the document
- For account_type: convert to uppercase (CHECKING or SAVINGS)
- If multiple amounts exist (subtotal, tax, total), extract the TOTAL amount
- Be precise and accurate

Return ONLY a JSON object with these fields. Example:

{
  "invoice_number": "INV-2025-0012",
  "amount": "1250.00",
  "currency": "USD",
  "due_date": "2025-12-15",
  "issue_date": "2025-11-28",
  "iban": null,
  "account_number": "987654321",
  "routing_number": "021000021",
  "account_type": "CHECKING",
  "sort_code": null,
  "ifsc_code": null,
  "bsb_code": null,
  "bank_code": null,
  "branch_code": null,
  "institution_number": null,
  "transit_number": null,
  "cnaps_code": null,
  "clabe_number": null,
  "reference_number": "INV-USD-001",
  "description": "Consulting services November 2025",
  "receiver_name": "Test US Receiver",
  "receiver_address": "123 Main St, New York, NY 10001",
  "sender_name": null
}`;
}

/**
 * Normalize and validate extracted fields
 */
function normalizeFields(fields) {
  const normalized = {
    invoice_number: fields.invoice_number || '',
    amount: normalizeAmount(fields.amount),
    currency: normalizeCurrency(fields.currency),
    due_date: normalizeDate(fields.due_date),
    issue_date: normalizeDate(fields.issue_date),
    reference_number: fields.reference_number || '',
    description: fields.description || '',
    receiver_name: fields.receiver_name || '',
    receiver_address: fields.receiver_address || '',
    sender_name: fields.sender_name || '',

    // Bank account fields
    iban: normalizeIBAN(fields.iban),
    account_number: fields.account_number || '',
    routing_number: fields.routing_number || '',
    account_type: fields.account_type ? fields.account_type.toUpperCase() : '',
    sort_code: fields.sort_code || '',
    ifsc_code: fields.ifsc_code || '',
    bsb_code: fields.bsb_code || '',
    bank_code: fields.bank_code || '',
    branch_code: fields.branch_code || '',
    institution_number: fields.institution_number || '',
    transit_number: fields.transit_number || '',
    cnaps_code: fields.cnaps_code || '',
    clabe_number: fields.clabe_number || ''
  };

  return normalized;
}

/**
 * Normalize amount (remove spaces, convert comma to dot)
 */
function normalizeAmount(amount) {
  if (!amount) return '';

  const cleaned = String(amount)
    .replace(/\s/g, '') // Remove spaces
    .replace(/,/g, '.'); // Convert comma to dot

  return cleaned;
}

/**
 * Normalize currency code
 */
function normalizeCurrency(currency) {
  if (!currency) return 'EUR'; // Default to EUR

  return String(currency).toUpperCase().substring(0, 3);
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(date) {
  if (!date) return '';

  // If already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Try to parse and reformat
  try {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }

  return date; // Return as-is if can't parse
}

/**
 * Normalize IBAN
 */
function normalizeIBAN(iban) {
  if (!iban) return '';

  // Remove spaces and convert to uppercase
  return String(iban)
    .replace(/\s/g, '')
    .toUpperCase();
}

/**
 * Validate IBAN (basic check)
 */
function validateIBAN(iban) {
  if (!iban) return false;

  // Basic IBAN format check (2 letters + 2 digits + up to 30 alphanumeric)
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
  return ibanRegex.test(iban);
}

/**
 * Extract fields from PDF using GPT-4o with text-only approach
 * Since Vision API doesn't support PDFs and we can't run PDF.js in service worker,
 * we'll attempt a basic text extraction and send that to GPT-4
 *
 * @param {string} base64PDF - Base64 encoded PDF
 * @param {string} apiKey - OpenAI API key
 */
async function extractFromPDFWithVision(base64PDF, apiKey) {
  try {
    console.log('Processing PDF for GPT-4o...');
    console.log('PDF base64 length:', base64PDF.length);

    // Decode base64 back to binary
    const binaryString = atob(base64PDF);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Try basic text extraction from PDF
    const decoder = new TextDecoder('latin1');
    const pdfString = decoder.decode(bytes);

    // Extract all text in parentheses (PDF text objects)
    const textMatches = pdfString.match(/\(([^)]{3,})\)/g);
    let extractedText = '';

    if (textMatches && textMatches.length > 0) {
      console.log(`Found ${textMatches.length} text strings in PDF`);

      for (const match of textMatches) {
        let text = match.slice(1, -1); // Remove parentheses

        // Skip if looks like metadata or binary
        if (text.length < 3 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
          continue;
        }

        // Unescape common PDF escapes
        text = text.replace(/\\n/g, ' ')
                   .replace(/\\r/g, ' ')
                   .replace(/\\t/g, ' ')
                   .replace(/\\\\/g, '\\')
                   .replace(/\\([()])/g, '$1');

        extractedText += text + ' ';
      }
    }

    extractedText = extractedText.trim();
    console.log(`Extracted ${extractedText.length} characters from PDF`);
    console.log('Sample text:', extractedText.substring(0, 500));

    if (extractedText.length < 50) {
      throw new Error('Could not extract enough text from PDF. The PDF might use custom fonts or be image-based. Please try a different PDF or use the "Extract from Invoice" button on a web page.');
    }

    // Send extracted text to GPT-4 for processing
    console.log('Sending extracted PDF text to GPT-4o...');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: getSystemPrompt()
          },
          {
            role: 'user',
            content: `Extract invoice information from the following PDF text content:\n\n${extractedText}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GPT-4 API error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('GPT-4o raw response:', result);

    const extractedJSON = result.choices[0].message.content;
    console.log('GPT-4o content:', extractedJSON);

    const extractedFields = JSON.parse(extractedJSON);
    console.log('GPT-4o parsed fields:', extractedFields);

    return normalizeFields(extractedFields);
  } catch (error) {
    console.error('PDF GPT-4 extraction error:', error);
    throw error;
  }
}

/**
 * Alternative: Extract fields using GPT-4 Vision for image-based PDFs
 * @param {string} base64Image - Base64 encoded image
 * @param {string} apiKey - OpenAI API key
 */
export async function extractFromImageWithVision(base64Image, apiKey) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: getSystemPrompt()
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all invoice fields from this image. Return JSON only.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content;
    const extractedFields = JSON.parse(extractedText);

    return normalizeFields(extractedFields);
  } catch (error) {
    console.error('Vision extraction error:', error);
    throw error;
  }
}

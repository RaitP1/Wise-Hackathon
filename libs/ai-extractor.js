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
    const prompt = buildExtractionPrompt(data);

    console.log('=== AI EXTRACTION START ===');
    console.log('Source type:', data.source_type);
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
  if (data.source_type === 'PDF') {
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

1. invoice_number: The invoice number or ID
2. amount: The total amount to be paid (numbers only, no currency symbols)
3. currency: The currency code (EUR, USD, GBP, etc.)
4. due_date: Payment due date (YYYY-MM-DD format)
5. issue_date: Invoice issue date (YYYY-MM-DD format)
6. iban: International Bank Account Number (if present)
7. account_number: Alternative account number (if IBAN not present)
8. reference_number: Payment reference number (Viitenumber/KID/Payment Reference)
9. description: Brief payment description or invoice subject
10. receiver_name: Name of the payee/receiver/vendor
11. receiver_address: Full address of receiver (if present)
12. sender_name: Name of the payer/sender (if present)

Important instructions:
- Understand context semantically, not just keywords
- Support all languages automatically (English, Estonian, Norwegian, German, French, etc.)
- For dates: convert any date format to YYYY-MM-DD
- For amounts: extract only the number, remove currency symbols and thousand separators
- For IBAN: validate format if possible
- For reference numbers: look for patterns like RF**, KID numbers, or payment references
- If multiple amounts exist (subtotal, tax, total), extract the TOTAL amount
- Be precise and accurate

Return ONLY a JSON object with these fields. Example:

{
  "invoice_number": "INV-2025-0012",
  "amount": "1250.00",
  "currency": "EUR",
  "due_date": "2025-12-15",
  "issue_date": "2025-11-28",
  "iban": "DE89370400440532013000",
  "account_number": null,
  "reference_number": "RF18539007547034",
  "description": "Consulting services November 2025",
  "receiver_name": "Global Solutions GmbH",
  "receiver_address": "Hauptstrasse 123, 10115 Berlin, Germany",
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
    iban: normalizeIBAN(fields.iban || fields.account_number),
    reference_number: fields.reference_number || '',
    description: fields.description || '',
    receiver_name: fields.receiver_name || '',
    receiver_address: fields.receiver_address || '',
    sender_name: fields.sender_name || ''
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

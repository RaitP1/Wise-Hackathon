# AI Invoice Extraction - Prompt Documentation

## Overview

This document describes the AI extraction system used by the Invoice Extraction Plugin. The system uses OpenAI's GPT-4 to semantically extract invoice fields from HTML/DOM and PDF content.

## System Architecture

### Input Processing Flow

```
Invoice Source → Content Extraction → AI Processing → Field Normalization → Form Filling
     ↓                    ↓                  ↓               ↓                ↓
  HTML/PDF          Text/Structure      GPT-4 API      Validation        Auto-fill
```

## AI Prompt Structure

### System Prompt

The system prompt defines the AI's role and extraction rules:

**Location**: `libs/ai-extractor.js` → `getSystemPrompt()`

**Key Components**:

1. **Role Definition**: Expert invoice data extraction system
2. **Capabilities**: Multi-language, semantic understanding
3. **Field Specification**: Exact fields to extract
4. **Output Format**: Structured JSON
5. **Validation Rules**: Date formats, IBAN validation, etc.

### User Prompt

The user prompt provides the actual invoice data:

**Format**:
```
Extract invoice information from the following {PDF/webpage} content:

{Text Content}

URL: {optional URL}
```

**Example**:
```
Extract invoice information from the following webpage content:

Text Content:
INVOICE
Invoice Number: INV-2025-001
Date: 2025-11-28
Due Date: 2025-12-28
Receiver: Global Solutions GmbH
IBAN: DE89370400440532013000
Amount: €1,250.00
Reference: RF18539007547034
Description: Consulting services November 2025

URL: https://example.com/invoice
```

## Extracted Fields

### Field Specifications

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `invoice_number` | string | Yes | Invoice ID/number | "INV-2025-001" |
| `amount` | string | Yes | Total amount (numeric) | "1250.00" |
| `currency` | string | Yes | 3-letter currency code | "EUR" |
| `due_date` | string | No | Payment due date (YYYY-MM-DD) | "2025-12-28" |
| `issue_date` | string | No | Invoice issue date (YYYY-MM-DD) | "2025-11-28" |
| `iban` | string | No | International bank account | "DE89370400440532013000" |
| `account_number` | string | No | Alternative account number | "12345678" |
| `reference_number` | string | No | Payment reference/KID | "RF18539007547034" |
| `description` | string | No | Payment description | "Consulting services" |
| `receiver_name` | string | Yes | Payee name | "Global Solutions GmbH" |
| `receiver_address` | string | No | Payee address | "Hauptstrasse 123, Berlin" |
| `sender_name` | string | No | Payer name | "Acme Corporation" |

### Output JSON Schema

```json
{
  "invoice_number": "string | null",
  "amount": "string | null",
  "currency": "string",
  "due_date": "string | null",
  "issue_date": "string | null",
  "iban": "string | null",
  "account_number": "string | null",
  "reference_number": "string | null",
  "description": "string | null",
  "receiver_name": "string | null",
  "receiver_address": "string | null",
  "sender_name": "string | null"
}
```

## Semantic Understanding

### AI Capabilities

The AI is instructed to:

1. **Understand Context**: Not just match keywords
2. **Multi-Language**: Automatically detect and process any language
3. **Flexible Formats**: Handle various invoice layouts
4. **Intelligent Extraction**: Find fields even with non-standard naming

### Examples of Semantic Understanding

#### Example 1: Different Languages

**German Invoice**:
```
Rechnungsnummer: RE-2025-001
Fälligkeitsdatum: 28.12.2025
Betrag: 1.250,00 €
```

**Extracted**:
```json
{
  "invoice_number": "RE-2025-001",
  "due_date": "2025-12-28",
  "amount": "1250.00",
  "currency": "EUR"
}
```

#### Example 2: Non-Standard Field Names

**Norwegian Invoice**:
```
Fakturanr: 12345
Forfallsdato: 2025-12-28
Beløp: 1.250,00 kr
KID-nummer: 1234567890123
```

**Extracted**:
```json
{
  "invoice_number": "12345",
  "due_date": "2025-12-28",
  "amount": "1250.00",
  "currency": "NOK",
  "reference_number": "1234567890123"
}
```

#### Example 3: Complex HTML Structure

**HTML with Tables**:
```html
<table>
  <tr><td>Invoice #</td><td>INV-001</td></tr>
  <tr><td>Total Due</td><td>$1,250.00 USD</td></tr>
  <tr><td>Pay to</td><td>Acme Corp</td></tr>
  <tr><td>Account</td><td>US12 3456 7890 1234 5678 90</td></tr>
</table>
```

**Extracted**:
```json
{
  "invoice_number": "INV-001",
  "amount": "1250.00",
  "currency": "USD",
  "receiver_name": "Acme Corp",
  "iban": "US12345678901234567890"
}
```

## Field Normalization

### Post-Extraction Processing

After AI extraction, fields are normalized:

**Location**: `libs/ai-extractor.js` → `normalizeFields()`

#### Amount Normalization

- Remove spaces: `"1 250,00"` → `"1250.00"`
- Convert comma to dot: `"1250,00"` → `"1250.00"`
- Remove currency symbols: `"€1,250.00"` → `"1250.00"`

#### Currency Normalization

- Convert to uppercase: `"eur"` → `"EUR"`
- Limit to 3 characters: `"EURO"` → `"EUR"`
- Default to EUR if missing

#### Date Normalization

- Convert to YYYY-MM-DD format
- Parse various formats:
  - `"28.12.2025"` → `"2025-12-28"`
  - `"December 28, 2025"` → `"2025-12-28"`
  - `"28/12/2025"` → `"2025-12-28"`

#### IBAN Normalization

- Remove spaces: `"DE89 3704 0044 0532 0130 00"` → `"DE89370400440532013000"`
- Convert to uppercase
- Basic format validation

## API Configuration

### OpenAI API Settings

**Model**: `gpt-4-turbo-preview`
- Faster than GPT-4
- Supports JSON mode
- Good balance of speed/accuracy

**Parameters**:
```javascript
{
  model: 'gpt-4-turbo-preview',
  response_format: { type: 'json_object' },
  temperature: 0.1,  // Low for consistency
  max_tokens: 1000   // Sufficient for invoice fields
}
```

### Alternative Models

For different use cases:

| Model | Speed | Cost | Accuracy | Use Case |
|-------|-------|------|----------|----------|
| gpt-4-turbo-preview | Fast | Medium | High | Recommended |
| gpt-4 | Slow | High | Highest | Complex invoices |
| gpt-3.5-turbo | Very Fast | Low | Medium | Simple invoices |
| gpt-4-vision-preview | Medium | High | High | Image-based PDFs |

## Error Handling

### Common Issues and Solutions

#### 1. Missing Fields

**Issue**: AI doesn't find certain fields

**Solutions**:
- Return `null` for missing fields
- User can manually fill
- Form validation catches required fields

#### 2. Incorrect Extraction

**Issue**: AI extracts wrong data

**Solutions**:
- User can edit before submitting
- Visual indication of auto-filled fields
- Re-extraction button available

#### 3. API Errors

**Issue**: OpenAI API fails

**Solutions**:
- Retry logic (not implemented yet)
- Clear error messages to user
- Fallback to manual entry

## Optimization

### Token Usage Optimization

To minimize API costs:

1. **Clean HTML**: Remove scripts, styles, unnecessary elements
2. **Truncate Large Content**: Limit to 50,000 characters
3. **Extract Text Only**: Don't send full HTML structure
4. **Efficient Prompts**: Short, clear instructions

### Performance Improvements

Current extraction time:
- HTML: 2-5 seconds
- PDF (with text): 5-10 seconds
- PDF (with OCR): 15-30 seconds

Potential improvements:
- Caching for repeated extractions
- Parallel processing for multi-page PDFs
- Local AI models for offline use

## Testing

### Test Scenarios

1. **Simple Invoice**: Single page, clear structure
2. **Complex Invoice**: Multiple pages, tables
3. **Multi-Language**: Non-English invoices
4. **Poor Quality**: Scanned/OCR invoices
5. **Edge Cases**: Missing fields, unusual formats

### Test Prompts

See `test/sample_invoice.html` for a working example.

## Customization

### Modifying Extraction Fields

To add new fields:

1. Update system prompt in `getSystemPrompt()`
2. Add field to output JSON schema
3. Add normalization logic in `normalizeFields()`
4. Update sidebar form fields

### Changing AI Behavior

Adjust system prompt to:
- Extract additional information
- Apply different validation rules
- Handle specific invoice formats
- Support custom field types

## API Costs

### Cost Estimation

**GPT-4 Turbo Pricing** (as of 2025):
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens

**Typical Invoice**:
- Input: ~2,000 tokens (invoice content + prompt)
- Output: ~200 tokens (JSON response)
- **Cost per extraction**: ~$0.02-0.04

**Monthly Usage** (1000 invoices):
- Cost: $20-40

## Security Considerations

### Data Privacy

- Invoice content sent to OpenAI
- Data retained by OpenAI per their policy
- No data stored on plugin servers
- API key stored locally in browser

### Best Practices

1. Review OpenAI's data usage policy
2. Don't extract sensitive personal data beyond invoice info
3. Inform users about AI processing
4. Implement rate limiting
5. Monitor API usage

## Future Enhancements

### Planned Improvements

1. **Multiple AI Providers**: Claude, Gemini, local models
2. **Confidence Scores**: Show extraction certainty
3. **Learning System**: Improve based on corrections
4. **Template Detection**: Recognize recurring vendors
5. **Batch Processing**: Extract multiple invoices at once

## References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [GPT-4 Model Information](https://platform.openai.com/docs/models/gpt-4)
- [JSON Mode Guide](https://platform.openai.com/docs/guides/text-generation/json-mode)

---

**Last Updated**: 2025-11-28
**Version**: 1.0.0
**Maintainer**: Global Bank Development Team

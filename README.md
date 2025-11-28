# Invoice Extraction Browser Plugin

A production-ready browser extension that automatically extracts invoice data from web pages and PDFs using AI, designed for global bank transfers.

## Features

- **Automatic Invoice Detection**: Detects invoices in both HTML/DOM and PDF formats
- **AI-Powered Extraction**: Uses OpenAI GPT-4 to semantically extract invoice fields
- **Multi-Language Support**: Works with invoices in any language
- **PDF Processing**: Extracts text from PDFs using PDF.js with OCR fallback (Tesseract.js)
- **Smart Form Filling**: Automatically fills bank transfer form with extracted data
- **Privacy-Focused**: Only processes data when explicitly requested by user
- **MV3 Compatible**: Built for Chrome/Firefox Manifest V3

## Extracted Fields

The plugin automatically extracts:

- Receiver Name
- IBAN / Account Number
- Amount
- Currency
- Invoice Number
- Issue Date
- Due Date
- Payment Reference (Viitenumber / KID / Payment Reference)
- Description / Payment Explanation

## Architecture

### Components

1. **manifest.json** - Extension configuration (MV3)
2. **content.js** - Content script for DOM/PDF detection
3. **background.js** - Service worker for PDF processing and AI calls
4. **sidebar/** - Side panel UI with bank transfer form
5. **libs/** - PDF processing and AI extraction modules
6. **options/** - Settings page for API key configuration

### Data Flow

```
Invoice Page → Content Script → Background Worker → AI API → Sidebar Form
     ↓              ↓                    ↓              ↓           ↓
  HTML/PDF    Extract Data        Process PDF     GPT-4 API   Auto-fill
```

## Installation

### Prerequisites

- Node.js (optional, for development)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Chrome or Firefox browser

### Steps

1. **Clone or download this repository**

2. **Load extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

3. **Load extension in Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from the extension directory

4. **Configure API Key:**
   - Click the extension icon
   - Click "Settings" in the sidebar
   - Enter your OpenAI API key
   - Click "Save Settings"

## Usage

1. **Open an invoice** (webpage or PDF)
2. **Click the extension icon** to open the sidebar
3. **Click "Extract Invoice Data"** button
4. **Review** the auto-filled form fields
5. **Edit** any fields if needed
6. **Click "Send Payment"** to process the transfer

## How It Works

### DOM Extraction

The content script extracts clean text and structured HTML from web pages:

- Removes scripts, styles, and non-content elements
- Preserves tables and important structure
- Sends to AI for semantic analysis

### PDF Processing

For PDFs, the extension:

1. Detects PDF sources (embed, iframe, object, blob, or direct)
2. Fetches PDF binary data
3. Extracts text using PDF.js
4. Falls back to OCR (Tesseract.js) if text layer is missing
5. Sends extracted text to AI

### AI Extraction

Uses OpenAI GPT-4 with a specialized prompt:

- Understands context semantically, not just keywords
- Supports all languages automatically
- Validates and normalizes extracted data
- Returns structured JSON output

## Configuration

### API Settings

Configure in the extension settings page:

- **OpenAI API Key**: Your personal API key for GPT-4 access

### Supported Currencies

- EUR (Euro)
- USD (US Dollar)
- GBP (British Pound)
- NOK (Norwegian Krone)
- SEK (Swedish Krona)
- DKK (Danish Krone)
- CHF (Swiss Franc)

## Development

### Project Structure

```
├── manifest.json           # Extension manifest (MV3)
├── content.js             # Content script
├── background.js          # Background service worker
├── libs/
│   ├── pdf-processor.js   # PDF extraction logic
│   └── ai-extractor.js    # OpenAI integration
├── sidebar/
│   ├── sidebar.html       # Side panel UI
│   ├── sidebar.css        # Styles
│   └── sidebar.js         # Form logic
├── options/
│   ├── options.html       # Settings page
│   ├── options.css        # Settings styles
│   └── options.js         # Settings logic
└── icons/                 # Extension icons
```

### Key Technologies

- **PDF.js**: PDF text extraction
- **Tesseract.js**: OCR for image-based PDFs
- **OpenAI GPT-4**: Semantic field extraction
- **Chrome Extension APIs**: Storage, messaging, side panel

### Customization

#### Change AI Model

Edit `libs/ai-extractor.js`:

```javascript
const MODEL = 'gpt-4-turbo-preview'; // Change to desired model
```

#### Modify Extracted Fields

Update the system prompt in `libs/ai-extractor.js` function `getSystemPrompt()`.

#### Add Custom Validation

Edit `normalizeFields()` in `libs/ai-extractor.js`.

## Security & Privacy

- **Local Storage**: API key stored securely in browser local storage
- **On-Demand Processing**: Only extracts when user clicks the button
- **No Automatic Scanning**: Does not scan tabs automatically
- **OpenAI Processing**: Invoice content sent to OpenAI API for extraction
- **No External Storage**: No data stored on external servers (except OpenAI processing)

## Troubleshooting

### "Please configure your OpenAI API key"

- Go to extension settings
- Enter your OpenAI API key
- Make sure it starts with "sk-"

### "Failed to extract invoice data"

- Check if the page contains invoice information
- Try refreshing the page
- Check browser console for errors
- Verify API key is valid

### PDF not detected

- Ensure PDF is fully loaded
- Try reloading the page
- Check if PDF is embedded correctly

### Extraction is inaccurate

- The invoice format may be unusual
- Manually correct the fields
- Consider providing feedback or examples

## API Costs

The extension uses OpenAI GPT-4 API:

- Cost depends on invoice size
- Typical invoice: $0.01-0.05 per extraction
- Monitor usage in [OpenAI dashboard](https://platform.openai.com/usage)

## Browser Compatibility

- ✅ Chrome 109+
- ✅ Edge 109+
- ✅ Firefox 109+ (with MV3 support)
- ❌ Safari (MV3 support limited)

## Limitations

- Requires OpenAI API key (paid service)
- PDF OCR limited to first 10 pages
- Large PDFs may take longer to process
- Depends on invoice format clarity

## Future Enhancements

- [ ] Support for more AI providers (Claude, Gemini)
- [ ] Offline mode with local AI models
- [ ] Batch processing for multiple invoices
- [ ] Export to CSV/Excel
- [ ] Template learning for recurring vendors
- [ ] Direct bank API integration

## Contributing

This is a production plugin for a global bank. For internal contributions:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly with various invoice formats
4. Submit pull request with description

## License

Proprietary - For bank internal use only.

## Support

For issues or questions:

- Check the troubleshooting section
- Review browser console errors
- Contact the development team

## Credits

Built with:

- [PDF.js](https://mozilla.github.io/pdf.js/) - Mozilla PDF rendering
- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR processing
- [OpenAI GPT-4](https://openai.com/) - AI extraction
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - Browser platform

---

**Version**: 1.0.0
**Last Updated**: 2025-11-28
**AI Model**: GPT-4 Turbo

# Invoice Extraction Plugin - Setup Guide

## Quick Start (5 minutes)

### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Important**: Save it securely - you won't see it again!

### Step 2: Install Extension

#### Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select this project directory
6. Extension icon should appear in toolbar

#### Firefox

1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to this directory
5. Select `manifest.json`
6. Extension loaded (temporary until browser restart)

### Step 3: Configure API Key

1. Click the extension icon in toolbar
2. Sidebar opens on the right
3. Click "Settings" link at bottom
4. Paste your OpenAI API key
5. Click "Save Settings"
6. ✅ Success message appears

### Step 4: Test with Sample Invoice

1. Open `test/sample_invoice.html` in your browser
2. Click the extension icon
3. Click "Extract Invoice Data" button
4. Watch as fields auto-fill!
5. Review and edit if needed

## Detailed Setup

### Prerequisites

- **Browser**: Chrome 109+ or Firefox 109+
- **OpenAI Account**: With API access
- **API Credits**: ~$5 recommended for testing

### Project Structure Verification

Ensure all files are present:

```
Wise-Hackathon/
├── manifest.json          ✓
├── content.js             ✓
├── background.js          ✓
├── package.json           ✓
├── README.md              ✓
├── libs/
│   ├── pdf-processor.js   ✓
│   └── ai-extractor.js    ✓
├── sidebar/
│   ├── sidebar.html       ✓
│   ├── sidebar.css        ✓
│   └── sidebar.js         ✓
├── options/
│   ├── options.html       ✓
│   ├── options.css        ✓
│   └── options.js         ✓
└── icons/
    └── (icon files needed) ⚠️
```

### Creating Icons

Before production use, create icons:

1. See `icons/ICON_INSTRUCTIONS.md`
2. Create 16x16, 32x32, 48x48, 128x128 PNG files
3. Name them: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
4. Place in `icons/` directory

### API Key Security

**Important Security Notes:**

- Never commit API keys to git
- Never share your API key publicly
- The key is stored in browser local storage
- Each user needs their own API key

For production deployment:

- Consider using a backend proxy
- Implement rate limiting
- Monitor API usage
- Rotate keys regularly

## Testing

### Test 1: HTML Invoice

1. Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Invoice</title>
</head>
<body>
    <h1>INVOICE</h1>
    <p>Invoice Number: INV-2025-001</p>
    <p>Date: 2025-11-28</p>
    <p>Due Date: 2025-12-28</p>

    <h2>Bill To:</h2>
    <p>Receiver: Acme Corporation</p>
    <p>IBAN: DE89370400440532013000</p>

    <h2>Amount Due:</h2>
    <p>Total: €1,250.00</p>
    <p>Reference: RF18539007547034</p>

    <p>Description: Consulting services for November 2025</p>
</body>
</html>
```

2. Open in browser
3. Click extension icon
4. Click "Extract Invoice Data"
5. Verify all fields are filled correctly

### Test 2: PDF Invoice

1. Find any PDF invoice online or use a sample
2. Open in browser
3. Click extension icon
4. Click "Extract Invoice Data"
5. Wait for PDF processing (may take 5-10 seconds)
6. Verify extraction

### Test 3: Multi-language

Test with invoices in different languages:

- German
- French
- Norwegian
- Estonian
- Spanish

The AI should extract fields regardless of language.

## Troubleshooting

### Extension Won't Load

**Issue**: Error when loading extension

**Solutions**:
- Check all files are present
- Verify `manifest.json` is valid JSON
- Look for syntax errors in console
- Try reloading the extension

### API Key Invalid

**Issue**: "Invalid API key" error

**Solutions**:
- Ensure key starts with `sk-`
- Copy key without extra spaces
- Check key hasn't been revoked
- Verify OpenAI account is active

### Extraction Fails

**Issue**: "Failed to extract invoice data"

**Solutions**:
- Check browser console for errors
- Verify page contains invoice data
- Try refreshing the page
- Check API quota hasn't been exceeded

### PDF Not Detected

**Issue**: Button clicks but nothing happens

**Solutions**:
- Ensure PDF is fully loaded
- Check PDF isn't in a cross-origin iframe
- Try opening PDF directly in browser
- Look for console errors

### Sidebar Won't Open

**Issue**: Clicking icon does nothing

**Solutions**:
- Check extension is enabled
- Try reloading the extension
- Check browser console
- Try restarting browser

### Fields Not Auto-Filling

**Issue**: Extraction succeeds but form stays empty

**Solutions**:
- Check browser console for JavaScript errors
- Verify response from AI contains data
- Check network tab for API call status
- Try manually filling one field to test form

## Development Tips

### Debugging

Enable verbose logging:

1. Open browser console (F12)
2. Go to Console tab
3. Look for messages from:
   - "Invoice Extraction Content Script loaded"
   - "Background service worker loaded"
   - "Sidebar loaded"

### Testing Changes

After modifying code:

1. Go to `chrome://extensions/`
2. Click reload icon on the extension
3. Refresh the test page
4. Test the functionality

### Viewing Storage

Check stored API key:

1. Open browser console (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Expand Local Storage
4. Look for `chrome-extension://...`
5. See `openai_api_key`

### Monitoring API Calls

Track API usage:

1. Open Network tab in DevTools
2. Filter by "openai.com"
3. Click "Extract Invoice Data"
4. See API request/response
5. Check response time and data

## Performance Optimization

### Reduce Token Usage

The extension sends invoice content to OpenAI. To minimize costs:

- DOM content is cleaned (scripts/styles removed)
- HTML is truncated to 50,000 characters
- Only visible text is extracted
- PDFs are text-extracted (not sent as images)

### Improve Speed

For faster extraction:

- Use `gpt-4-turbo-preview` (faster than GPT-4)
- Consider `gpt-3.5-turbo` for simple invoices
- Implement caching for repeated extractions

### OCR Performance

OCR is slow. To optimize:

- Only use OCR as fallback
- Limit to first 10 pages
- Consider using parallel processing

## Production Deployment

### Before Going Live

1. ✅ Create professional icons
2. ✅ Test with 50+ different invoice formats
3. ✅ Implement error tracking
4. ✅ Add usage analytics
5. ✅ Set up API key proxy (backend)
6. ✅ Add rate limiting
7. ✅ Write user documentation
8. ✅ Conduct security audit
9. ✅ Test on all supported browsers
10. ✅ Get legal approval for AI usage

### Distribution

#### Internal Bank Distribution

1. Package extension as `.zip`
2. Distribute via internal software portal
3. Provide setup instructions
4. Offer training sessions

#### Chrome Web Store (Public)

1. Create developer account ($5 fee)
2. Prepare store assets (screenshots, description)
3. Submit for review
4. Wait for approval (1-3 days)

#### Firefox Add-ons (Public)

1. Create Mozilla developer account
2. Submit for review
3. Wait for approval

## Support

### Common Questions

**Q: How much does it cost?**
A: ~$0.01-0.05 per invoice extraction with GPT-4

**Q: Is my data secure?**
A: Data is sent to OpenAI for processing. Review their privacy policy.

**Q: Can it work offline?**
A: No, requires internet for AI API calls.

**Q: What invoice formats are supported?**
A: HTML pages and PDF documents.

**Q: Does it work in all languages?**
A: Yes, GPT-4 understands 50+ languages.

### Getting Help

1. Check README.md for overview
2. Review this SETUP_GUIDE.md
3. Check browser console for errors
4. Contact development team

## Next Steps

1. ✅ Extension installed
2. ✅ API key configured
3. ✅ Test extraction successful
4. → Try with real invoices
5. → Provide feedback
6. → Request features

---

**Need help?** Check the troubleshooting section or contact support.

**Happy extracting!** 🎉

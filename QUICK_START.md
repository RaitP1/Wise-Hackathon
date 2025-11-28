# Quick Start Guide - Invoice Extraction Plugin

## 5-Minute Setup ⚡

### Step 1: Get OpenAI API Key (2 minutes)

1. Visit: https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Save it somewhere safe

### Step 2: Load Extension (1 minute)

**Chrome:**
```
1. Open chrome://extensions/
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this folder
5. Done!
```

**Firefox:**
```
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on"
3. Select manifest.json
4. Done!
```

### Step 3: Configure (1 minute)

1. Click extension icon in toolbar
2. Click "Settings" link
3. Paste your API key
4. Click "Save"
5. ✅ Ready!

### Step 4: Test (1 minute)

1. Open `test/sample_invoice.html` in browser
2. Click extension icon
3. Click "Extract Invoice Data"
4. Watch the magic! ✨

## What You Get

✅ Automatic invoice field extraction
✅ Works with HTML pages and PDFs
✅ Supports all languages
✅ AI-powered semantic understanding
✅ One-click form filling

## Common Issues

### "Please configure your OpenAI API key"
→ Go to Settings and enter your API key

### "Failed to extract"
→ Check the page has invoice data
→ Verify API key is valid
→ Check browser console for errors

### Extension won't load
→ Make sure all files are present
→ Check manifest.json is valid
→ Try reloading the extension

## Need Help?

📖 **Detailed Setup**: See SETUP_GUIDE.md
📖 **Full Documentation**: See README.md
📖 **AI Details**: See AI_PROMPT_DOCUMENTATION.md

## What's Next?

1. ✅ Extension installed
2. ✅ API key configured
3. ✅ Test successful
4. → Try with real invoices!
5. → Customize for your bank
6. → Deploy to your team

## File Overview

```
📁 Your Extension
├── 📄 manifest.json        (Extension config)
├── 📄 content.js           (Detects invoices)
├── 📄 background.js        (Processes data)
├── 📁 sidebar/             (User interface)
├── 📁 libs/                (PDF & AI logic)
├── 📁 options/             (Settings page)
├── 📁 test/                (Sample invoice)
└── 📁 icons/               (Add your icons!)
```

## Before Production

- [ ] Create professional icons (see icons/ICON_INSTRUCTIONS.md)
- [ ] Test with 50+ different invoices
- [ ] Set up backend API proxy
- [ ] Add usage tracking
- [ ] Conduct security review
- [ ] Train your team
- [ ] Monitor API costs

## Cost Estimate

- **Per extraction**: $0.02 - $0.04
- **100 invoices/month**: ~$3
- **1000 invoices/month**: ~$30

## Support

**Questions?** Check SETUP_GUIDE.md
**Issues?** Check browser console (F12)
**Customization?** Edit the code!

---

**Happy extracting!** 🎉

*Built with ❤️ for Global Bank*

# Using Invoice Extraction with Gmail

## Overview

The extension now supports extracting invoice data directly from Gmail emails and PDF attachments. Here's how it works:

## Extracting from Email Text

### When to Use

When you receive an invoice as **plain text** or **HTML email** (not as an attachment).

### How to Extract

1. **Open the email** in Gmail
2. Make sure the email content is visible
3. **Click the extension icon** in your browser toolbar
4. **Click "Extract Invoice Data"** button
5. The extension will scan the email body and extract invoice fields

### What Gets Extracted

The extension looks for:
- Invoice numbers in the email text
- Payment amounts and currency
- IBAN/account numbers
- Payment references (KID, Viitenumber)
- Due dates and issue dates
- Receiver information
- Payment descriptions

### Tips for Email Extraction

- Make sure the email is **fully loaded** before extracting
- If the email is in a **thread**, open the specific message
- Works with **all languages** (English, Norwegian, Estonian, German, etc.)
- The email should be **in reading view** (not in compose mode)

## Extracting from PDF Attachments

### Limitation with Gmail PDF Viewer

⚠️ **Important**: Gmail displays PDF attachments using Google Drive's viewer in a secure iframe. Due to browser security restrictions, the extension **cannot directly extract** from PDFs shown in Gmail's modal viewer.

### Workaround for PDF Attachments

When you have a PDF invoice attached to a Gmail email:

#### Option 1: Download and Open (Recommended)

1. **Download the PDF** from Gmail (click the download icon)
2. **Open the downloaded PDF** in a new browser tab
3. **Click the extension icon**
4. **Click "Extract Invoice Data"**
5. ✅ Extraction will work!

#### Option 2: Open in New Tab

1. Right-click the PDF attachment in Gmail
2. Select **"Open in new tab"** or **"Open link in new tab"**
3. The PDF will open directly in the browser (not in Gmail viewer)
4. **Click the extension icon**
5. **Click "Extract Invoice Data"**

#### Option 3: Google Drive Direct Link

1. If the PDF is stored in Google Drive
2. Open it directly from Google Drive (not through Gmail)
3. Use the extension to extract

### Why Gmail PDFs Don't Work in the Viewer

Gmail shows PDF attachments in an **embedded Google Drive viewer** which:
- Runs in a **cross-origin iframe** (different domain)
- Has **security restrictions** that prevent extensions from accessing the content
- Requires **authentication** that the extension can't bypass

This is a browser security feature, not a bug in the extension.

## Gmail-Specific Features

### Email Content Detection

The extension automatically detects when you're on Gmail and uses special selectors to find invoice data:

- **Main email body**: `.a3s.aiL`
- **Alternative formats**: `.ii.gt`
- **Threaded emails**: Extracts from the visible message

### Supported Gmail Formats

✅ **Plain text emails**
✅ **HTML formatted emails**
✅ **Tables in emails** (invoice line items)
✅ **Multi-language emails**
✅ **Downloaded PDF attachments** (opened separately)
❌ **PDFs in Gmail modal viewer** (due to security restrictions)

## Troubleshooting Gmail Extraction

### Problem: "Failed to extract invoice data"

**Possible causes:**
1. Email not fully loaded
2. Invoice data is in an image (not text)
3. Invoice is in a PDF attachment (see PDF workaround above)

**Solutions:**
- Wait for email to fully load
- Scroll through the entire email
- If PDF, download and open separately

### Problem: Empty or incorrect fields

**Possible causes:**
1. Invoice format is unusual
2. Data is in attached images/PDFs
3. Email contains multiple invoices

**Solutions:**
- Try extracting again after scrolling
- Download attachments and extract separately
- Manually correct the fields

### Problem: "Cannot access PDF from Gmail attachment viewer"

**This is expected behavior!**

**Solution:**
- Download the PDF and open it in a new tab
- Or right-click → "Open in new tab"

## Best Practices for Gmail

### For Email Invoices

1. ✅ Open the email fully
2. ✅ Ensure email content is visible
3. ✅ Click extension icon
4. ✅ Extract data
5. ✅ Review and edit fields if needed

### For PDF Invoices

1. ✅ Download the PDF first
2. ✅ Open PDF in new browser tab
3. ✅ Click extension icon
4. ✅ Extract data

### For Better Results

- Use Gmail in **standard view** (not compact)
- Ensure emails are **not collapsed**
- **Scroll through** long emails before extracting
- If invoice has **attachments**, check them separately

## Example: Complete Workflow

### Scenario: Invoice received as email text

```
1. Email arrives with invoice details in the body
2. Open Gmail and click on the email
3. Wait for it to fully load
4. Click the extension icon (sidebar opens)
5. Click "Extract Invoice Data"
6. Wait 2-5 seconds
7. Review auto-filled form
8. Edit any incorrect fields
9. Click "Send Payment"
```

### Scenario: Invoice received as PDF attachment

```
1. Email arrives with PDF invoice attached
2. Open Gmail and click on the email
3. DON'T click the PDF preview in Gmail
4. Click the "Download" button on the PDF attachment
5. Open the downloaded PDF in a new tab
6. Click the extension icon (sidebar opens)
7. Click "Extract Invoice Data"
8. Wait 5-15 seconds (PDF processing)
9. Review auto-filled form
10. Edit any incorrect fields
11. Click "Send Payment"
```

## Technical Details

### Gmail DOM Structure

Gmail uses a complex structure:
- Dynamic loading of email content
- Shadow DOM in some cases
- Iframes for certain content
- CSS classes that change frequently

The extension handles this by:
- Detecting Gmail specifically
- Using multiple selectors
- Waiting for content to load
- Falling back to full page extraction if needed

### Security Considerations

The extension:
- Only accesses **visible email content**
- Cannot read **other emails** in your inbox
- Only runs when **you click** the extract button
- Doesn't store email content
- Sends invoice text to AI for processing only

## FAQ

**Q: Can I extract from the Gmail mobile app?**
A: No, browser extensions only work in desktop browsers.

**Q: Will this work with Gmail in Outlook or other email clients?**
A: No, the Gmail-specific features only work with mail.google.com.

**Q: Can it extract from forwarded invoices?**
A: Yes, as long as the invoice text is visible in the email body.

**Q: What about email attachments that are Word or Excel files?**
A: Currently only PDFs are supported. Convert other formats to PDF first.

**Q: Does it work with Gmail's confidential mode?**
A: Yes, if the invoice text is visible, it will work.

## Summary

✅ **Works great with**: Email text, HTML emails, downloaded PDFs
⚠️ **Workaround needed**: Gmail PDF modal viewer
❌ **Not supported**: Images of invoices, scanned attachments without OCR

For best results with Gmail:
1. Plain text/HTML invoices → Extract directly from email
2. PDF invoices → Download first, then extract

---

**Need more help?** See README.md or SETUP_GUIDE.md

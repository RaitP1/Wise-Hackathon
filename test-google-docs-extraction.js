/**
 * Test Google Docs Extraction
 *
 * Copy and paste this into the browser console while on Google Docs
 * (including PDF viewer) to test if the selectors are finding content
 */

console.log('=== Testing Google Docs/PDF Viewer Extraction ===\n');
console.log('Current URL:', window.location.href);
console.log('');

// Test all the selectors we use for Google Docs
const selectors = [
  { name: 'Google Docs word nodes', selector: '.kix-wordhtmlgenerator-word-node' },
  { name: 'Google Docs canvas', selector: '.kix-canvas-tile-content' },
  { name: 'Google Docs editor', selector: '.kix-appview-editor' },
  { name: 'PDF text layers', selector: '.textLayer' },
  { name: 'Viewer container', selector: '#viewer' },
  { name: 'Doc content', selector: '.doc-content' },
  { name: 'Main role', selector: '[role="main"]' }
];

let foundContent = false;

selectors.forEach(({ name, selector }) => {
  const elements = document.querySelectorAll(selector);
  if (elements.length > 0) {
    console.log(`✓ ${name}: FOUND (${elements.length} elements)`);

    // Get text from first element
    const text = elements[0].innerText || elements[0].textContent;
    if (text && text.length > 0) {
      console.log(`  Text length: ${text.length} characters`);
      console.log(`  Preview: ${text.substring(0, 100).replace(/\n/g, ' ')}`);
      foundContent = true;
    } else {
      console.log(`  WARNING: Element found but contains no text`);
    }
  } else {
    console.log(`✗ ${name}: NOT FOUND`);
  }
  console.log('');
});

// Try to simulate the actual extraction function
console.log('=== Simulating Actual Extraction ===\n');

let extractedText = '';

// Method 1: Word nodes
const docWords = document.querySelectorAll('.kix-wordhtmlgenerator-word-node');
if (docWords.length > 0) {
  extractedText = Array.from(docWords).map(node => node.textContent).join(' ');
  console.log('✓ Method 1 (word nodes): SUCCESS');
  console.log(`  Length: ${extractedText.length}`);
}

// Method 2: PDF text layers
if (!extractedText || extractedText.length < 100) {
  const textLayers = document.querySelectorAll('.textLayer');
  if (textLayers.length > 0) {
    extractedText = Array.from(textLayers)
      .map(layer => layer.innerText || layer.textContent)
      .join('\n\n');
    console.log('✓ Method 2 (PDF text layers): SUCCESS');
    console.log(`  Length: ${extractedText.length}`);
  }
}

// Method 3: Main content area
if (!extractedText || extractedText.length < 100) {
  const contentArea = document.querySelector('#viewer') ||
                     document.querySelector('.doc-content') ||
                     document.querySelector('[role="main"]');
  if (contentArea) {
    extractedText = contentArea.innerText || contentArea.textContent;
    console.log('✓ Method 3 (main content): SUCCESS');
    console.log(`  Length: ${extractedText.length}`);
  }
}

console.log('');
console.log('=== Final Result ===');
console.log(`Total extracted text: ${extractedText.length} characters`);
console.log('');
console.log('First 1000 characters:');
console.log(extractedText.substring(0, 1000));
console.log('');

// Check for invoice keywords
console.log('=== Checking for Invoice Keywords ===\n');
const keywords = ['IBAN', 'invoice', 'arve', 'tellimus', 'summa', 'amount', 'konto', 'account', 'payment', 'makse'];

keywords.forEach(keyword => {
  const found = extractedText.toLowerCase().includes(keyword.toLowerCase());
  console.log(`${found ? '✓' : '✗'} ${keyword}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});

if (!foundContent) {
  console.log('\n⚠️ WARNING: Could not find any content using known selectors!');
  console.log('This might be a different type of page or the structure has changed.');
  console.log('');
  console.log('Dumping all visible elements for debugging:');
  console.log(document.body.innerText.substring(0, 500));
}

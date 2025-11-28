/**
 * Test Gmail Extraction
 *
 * Copy and paste this into the browser console while on Gmail
 * to test if the selectors are finding the email content
 */

console.log('=== Testing Gmail Extraction ===\n');

// Test all the selectors we use
const selectors = [
  { name: 'Main email body (.ii.gt .a3s.aiL)', selector: '.ii.gt .a3s.aiL' },
  { name: 'Email in conversation', selector: 'div[role="list"] .a3s.aiL' },
  { name: 'Direct .a3s.aiL', selector: '.a3s.aiL' },
  { name: 'Container .ii.gt', selector: '.ii.gt' },
  { name: 'Alternative .gs .a3s', selector: '.gs .a3s' },
  { name: 'ID pattern', selector: '[id^=":"][id$="r"].ii.gt' },
  { name: 'Main content area', selector: '.nH.bkK' }
];

selectors.forEach(({ name, selector }) => {
  const element = document.querySelector(selector);
  if (element) {
    const text = element.innerText || element.textContent;
    console.log(`✓ ${name}: FOUND`);
    console.log(`  Length: ${text.length} characters`);
    console.log(`  Preview: ${text.substring(0, 100).replace(/\n/g, ' ')}`);
  } else {
    console.log(`✗ ${name}: NOT FOUND`);
  }
  console.log('');
});

// Check for invoice keywords
console.log('=== Checking for Invoice Keywords ===\n');
const bodyText = document.body.innerText;
const keywords = ['IBAN', 'invoice', 'arve', 'tellimus', 'summa', 'amount', 'konto', 'account', 'payment', 'makse'];

keywords.forEach(keyword => {
  const found = bodyText.toLowerCase().includes(keyword.toLowerCase());
  console.log(`${found ? '✓' : '✗'} ${keyword}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});

console.log('\n=== Full Email Body Text (first 1000 chars) ===\n');
const mainEmail = document.querySelector('.ii.gt .a3s.aiL') || document.querySelector('.a3s.aiL');
if (mainEmail) {
  console.log(mainEmail.innerText.substring(0, 1000));
} else {
  console.log('Could not find main email body');
}

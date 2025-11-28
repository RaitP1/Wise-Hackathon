/**
 * Sidebar JavaScript - Handles invoice extraction and form filling
 */

(function() {
  'use strict';

  // Cookie helper functions
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }

  // Check if user is logged in
  if (!getCookie('wise_auth_session')) {
    console.log('Not logged in, redirecting to login...');
    window.location.href = 'login.html';
    return;
  }

  // DOM elements
  const extractBtn = document.getElementById('extract-btn');
  const sendBtn = document.getElementById('send-btn');
  const clearFormLink = document.getElementById('clear-form');
  const settingsLink = document.getElementById('settings-link');
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const errorDiv = document.getElementById('error');
  const errorText = document.getElementById('error-text');
  const successDiv = document.getElementById('success');
  const dismissErrorBtn = document.getElementById('dismiss-error');
  const form = document.getElementById('transfer-form');
  const fullscreenLoading = document.getElementById('fullscreen-loading');
  const successScreen = document.getElementById('success-screen');
  const returnBtn = document.getElementById('return-btn');
  const dropZone = document.getElementById('drop-zone');
  const logoutBtn = document.getElementById('logout-btn');

  // Currency-specific bank field requirements
  const CURRENCY_BANK_FIELDS = {
    // IBAN-based currencies
    'BGN': ['iban'],
    'CHF': ['iban'],
    'CZK': ['iban'],
    'DKK': ['iban'],
    'EUR': ['iban'],
    'GEL': ['iban'],
    'HRK': ['iban'],
    'HUF': ['iban'],
    'NOK': ['iban'],
    'PKR': ['iban'],
    'PLN': ['iban'],
    'RON': ['iban'],
    'SEK': ['iban'],
    'TRY': ['iban'],

    // GBP - Sort code and account number
    'GBP': ['sortCode', 'accountNumber'],

    // USD - Routing number, account number, account type
    'USD': ['routingNumber', 'accountNumber', 'accountType'],

    // CAD - Institution number, transit number, account number
    'CAD': ['institutionNumber', 'transitNumber', 'accountNumber'],

    // AUD - BSB code and account number
    'AUD': ['bsbCode', 'accountNumber'],

    // NZD - Account number (with bank/branch/account/suffix format)
    'NZD': ['accountNumber'],

    // INR - IFSC code and account number
    'INR': ['ifscCode', 'accountNumber'],

    // CNY - CNAPS code and account number
    'CNY': ['cnapsCode', 'accountNumber'],

    // JPY - Bank code, branch code, account number, account type
    'JPY': ['bankCode', 'branchCode', 'accountNumber', 'accountType'],

    // SGD - Bank code, branch code, account number
    'SGD': ['bankCode', 'branchCode', 'accountNumber'],

    // HKD - Bank code, branch code, account number
    'HKD': ['bankCode', 'branchCode', 'accountNumber'],

    // BRL - Bank code, branch code, account number, account type
    'BRL': ['bankCode', 'branchCode', 'accountNumber', 'accountType'],

    // MXN - CLABE number
    'MXN': ['clabeNumber'],

    // ZAR - Account number
    'ZAR': ['accountNumber'],

    // Default for other currencies - account number
    'DEFAULT': ['accountNumber']
  };

  // Field labels and placeholders
  const FIELD_CONFIG = {
    iban: {
      label: 'IBAN',
      placeholder: 'DE89 3704 0044 0532 0130 00',
      help: 'International Bank Account Number'
    },
    sortCode: {
      label: 'Sort Code',
      placeholder: '40-47-84',
      help: '6-digit UK bank sort code'
    },
    accountNumber: {
      label: 'Account Number',
      placeholder: '12345678',
      help: 'Bank account number'
    },
    routingNumber: {
      label: 'Routing Number',
      placeholder: '026009593',
      help: '9-digit ABA routing number'
    },
    accountType: {
      label: 'Account Type',
      placeholder: 'Select account type',
      help: 'Checking or Savings',
      type: 'select',
      options: [
        { value: 'checking', label: 'Checking' },
        { value: 'savings', label: 'Savings' }
      ]
    },
    institutionNumber: {
      label: 'Institution Number',
      placeholder: '001',
      help: '3-digit Canadian institution number'
    },
    transitNumber: {
      label: 'Transit Number',
      placeholder: '12345',
      help: '5-digit Canadian transit number'
    },
    bsbCode: {
      label: 'BSB Code',
      placeholder: '062-001',
      help: '6-digit Australian BSB code'
    },
    ifscCode: {
      label: 'IFSC Code',
      placeholder: 'SBIN0001234',
      help: '11-character Indian IFSC code'
    },
    cnapsCode: {
      label: 'CNAPS Code',
      placeholder: '102100099996',
      help: '12-digit Chinese CNAPS code'
    },
    bankCode: {
      label: 'Bank Code',
      placeholder: '0001',
      help: 'Bank identification code'
    },
    branchCode: {
      label: 'Branch Code',
      placeholder: '001',
      help: 'Branch identification code'
    },
    clabeNumber: {
      label: 'CLABE Number',
      placeholder: '012180001234567897',
      help: '18-digit Mexican CLABE number'
    }
  };

  // Form fields
  const fields = {
    receiverName: document.getElementById('receiver-name'),
    amount: document.getElementById('amount'),
    currency: document.getElementById('currency'),
    referenceNumber: document.getElementById('reference-number'),
    description: document.getElementById('description'),
    invoiceNumber: document.getElementById('invoice-number'),
    issueDate: document.getElementById('issue-date'),
    dueDate: document.getElementById('due-date')
  };

  // Event listeners
  extractBtn.addEventListener('click', handleExtraction);
  sendBtn.addEventListener('click', handleSubmit);
  clearFormLink.addEventListener('click', handleClearForm);
  settingsLink.addEventListener('click', handleSettings);
  dismissErrorBtn.addEventListener('click', hideError);
  form.addEventListener('submit', handleSubmit);
  returnBtn.addEventListener('click', handleReturn);
  logoutBtn.addEventListener('click', handleLogout);

  // Drag and drop event listeners
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);
  dropZone.addEventListener('click', handleDropZoneClick);

  // Currency change listener
  fields.currency.addEventListener('change', handleCurrencyChange);

  // Optional fields toggle
  const toggleOptional = document.getElementById('toggle-optional');
  const optionalFields = document.getElementById('optional-fields');
  toggleOptional.addEventListener('click', () => {
    optionalFields.classList.toggle('hidden');
    toggleOptional.classList.toggle('expanded');
  });

  /**
   * Handle invoice extraction
   */
  async function handleExtraction(e) {
    e.preventDefault();

    try {
      // Check if API key is configured
      const apiKey = await checkApiKey();
      if (!apiKey) {
        showError('Please configure your OpenAI API key in the extension settings.');
        return;
      }

      // Show loading state
      showStatus('Extracting invoice data...');
      setButtonLoading(extractBtn, true);

      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabUrl = tab.url || '';

      let extractedData;

      // If the active tab is a direct PDF URL, process it as PDF
      if (tabUrl.toLowerCase().includes('.pdf')) {
        console.log('Active tab looks like a PDF URL, processing as PDF:', tabUrl);

        const pdfResult = await chrome.runtime.sendMessage({
          action: 'processPDF',
          pdfUrl: tabUrl,
          pdfType: 'direct'
        });

        if (pdfResult.error) {
          throw new Error(pdfResult.error);
        }

        extractedData = pdfResult;
      } else {
        // Request extraction from content script (main frame only)
        extractedData = await chrome.tabs.sendMessage(tab.id, {
          action: 'extractInvoice'
        });
      }

      console.log('Extracted data:', extractedData);

      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      // Check if we got empty text
      if (!extractedData.text || extractedData.text.trim().length < 50) {
        throw new Error('Could not find email content on this page. Please open an email in Gmail and try again.');
      }

      // Log the extracted text for debugging
      if (extractedData.text) {
        console.log('Extracted text length:', extractedData.text.length);
        console.log('First 500 chars:', extractedData.text.substring(0, 500));
      }

      // Update status
      statusText.textContent = 'Processing with AI...';

      // Send to background for AI processing
      const result = await chrome.runtime.sendMessage({
        action: 'extractWithAI',
        data: extractedData
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Debug: Log what AI returned
      console.log('AI Result:', result);
      console.log('AI Extracted Fields:', JSON.stringify(result.fields, null, 2));

      // Fill form with extracted data
      fillForm(result.fields);

      // Show success
      hideStatus();
      showSuccess('Invoice data extracted successfully!');

    } catch (error) {
      console.error('Extraction error:', error);
      hideStatus();
      showError(error.message || 'Failed to extract invoice data. Please try again.');
    } finally {
      setButtonLoading(extractBtn, false);
    }
  }

  /**
   * Fill form with extracted data
   */
  function fillForm(data) {
    console.log('=== FILLING FORM ===');
    console.log('Data received:', data);

    // STEP 1: Set currency first and re-render bank fields
    if (data.currency) {
      console.log('✓ Setting currency:', data.currency);
      fields.currency.value = data.currency;
      fields.currency.classList.add('auto-filled');

      // Re-render bank fields for the detected currency
      console.log('Re-rendering bank fields for currency:', data.currency);
      renderBankFields(data.currency);
    } else {
      console.log('✗ currency is empty/null');
    }

    // STEP 2: Fill basic fields
    if (data.receiver_name) {
      console.log('✓ Setting receiver_name:', data.receiver_name);
      fields.receiverName.value = data.receiver_name;
      fields.receiverName.classList.add('auto-filled');
    } else {
      console.log('✗ receiver_name is empty/null');
    }

    if (data.amount) {
      console.log('✓ Setting amount:', data.amount);
      fields.amount.value = data.amount;
      fields.amount.classList.add('auto-filled');
    } else {
      console.log('✗ amount is empty/null');
    }

    // STEP 3: Fill bank fields (after they've been rendered for the correct currency)
    // Use setTimeout to ensure bank fields are rendered before we try to fill them
    setTimeout(() => {
      const bankFieldMapping = {
        'iban': 'iban',
        'account_number': 'accountNumber',
        'routing_number': 'routingNumber',
        'account_type': 'accountType',
        'sort_code': 'sortCode',
        'ifsc_code': 'ifscCode',
        'bsb_code': 'bsbCode',
        'bank_code': 'bankCode',
        'branch_code': 'branchCode',
        'institution_number': 'institutionNumber',
        'transit_number': 'transitNumber',
        'cnaps_code': 'cnapsCode',
        'clabe_number': 'clabeNumber'
      };

      Object.entries(bankFieldMapping).forEach(([aiField, formField]) => {
        if (data[aiField]) {
          console.log(`✓ Setting ${aiField}:`, data[aiField]);
          const field = document.getElementById(`bank-${formField}`);
          if (field) {
            // Special handling for IBAN formatting
            if (formField === 'iban') {
              field.value = formatIBAN(data[aiField]);
            } else {
              field.value = data[aiField];
            }
            field.classList.add('auto-filled');
          } else {
            console.log(`✗ Field not found: bank-${formField}`);
          }
        }
      });
    }, 100);

    if (data.reference_number) {
      console.log('✓ Setting reference_number:', data.reference_number);
      fields.referenceNumber.value = data.reference_number;
      fields.referenceNumber.classList.add('auto-filled');
    } else {
      console.log('✗ reference_number is empty/null');
    }

    if (data.description) {
      console.log('✓ Setting description:', data.description);
      fields.description.value = data.description;
      fields.description.classList.add('auto-filled');
    } else {
      console.log('✗ description is empty/null');
    }

    if (data.invoice_number) {
      console.log('✓ Setting invoice_number:', data.invoice_number);
      fields.invoiceNumber.value = data.invoice_number;
      fields.invoiceNumber.classList.add('auto-filled');
    } else {
      console.log('✗ invoice_number is empty/null');
    }

    if (data.issue_date) {
      console.log('✓ Setting issue_date:', data.issue_date);
      fields.issueDate.value = data.issue_date;
      fields.issueDate.classList.add('auto-filled');
    } else {
      console.log('✗ issue_date is empty/null');
    }

    if (data.due_date) {
      console.log('✓ Setting due_date:', data.due_date);
      fields.dueDate.value = data.due_date;
      fields.dueDate.classList.add('auto-filled');
    } else {
      console.log('✗ due_date is empty/null');
    }

    // Auto-expand optional fields if any invoice data was filled
    if (data.invoice_number || data.issue_date || data.due_date) {
      const toggleOptional = document.getElementById('toggle-optional');
      const optionalFields = document.getElementById('optional-fields');
      if (optionalFields.classList.contains('hidden')) {
        optionalFields.classList.remove('hidden');
        toggleOptional.classList.add('expanded');
      }
    }

    console.log('=== FORM FILLING COMPLETE ===');
  }

  /**
   * Format IBAN with spaces for readability
   */
  function formatIBAN(iban) {
    if (!iban) return '';

    // Remove all spaces
    const cleaned = iban.replace(/\s/g, '');

    // Add space every 4 characters
    return cleaned.match(/.{1,4}/g).join(' ');
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    // Validate basic required fields
    if (!fields.receiverName.value || !fields.amount.value) {
      showError('Please fill in all required fields (Receiver Name, Amount)');
      return;
    }

    // Validate bank fields
    const bankFields = getBankFieldValues();
    const hasEmptyBankField = Object.values(bankFields).some(value => !value || value.trim() === '');

    if (hasEmptyBankField) {
      showError('Please fill in all required bank account fields');
      return;
    }

    try {
      // Collect form data
      const formData = {
        receiverName: fields.receiverName.value,
        bankFields: getBankFieldValues(),
        amount: fields.amount.value,
        currency: fields.currency.value,
        referenceNumber: fields.referenceNumber.value,
        description: fields.description.value,
        invoiceNumber: fields.invoiceNumber.value,
        issueDate: fields.issueDate.value,
        dueDate: fields.dueDate.value
      };

      console.log('Submitting payment:', formData);

      // Show full-screen loading
      showFullscreenLoading();

      // Here you would send to your bank's API
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Hide loading and show success screen
      hideFullscreenLoading();
      showSuccessScreen();

    } catch (error) {
      console.error('Submission error:', error);
      hideFullscreenLoading();
      showError('Failed to submit payment. Please try again.');
    }
  }

  /**
   * Handle clear form
   */
  function handleClearForm(e) {
    e.preventDefault();

    if (confirm('Are you sure you want to clear the form?')) {
      clearForm();
    }
  }

  /**
   * Clear all form fields
   */
  function clearForm() {
    form.reset();

    // Remove auto-filled classes
    Object.values(fields).forEach(field => {
      field.classList.remove('auto-filled');
    });

    hideSuccess();
    hideError();
  }

  /**
   * Handle settings link
   */
  function handleSettings(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  }

  /**
   * Check if API key is configured
   */
  async function checkApiKey() {
    const response = await chrome.runtime.sendMessage({ action: 'getApiKey' });
    return response;
  }

  /**
   * Show status message
   */
  function showStatus(message) {
    statusText.textContent = message;
    statusDiv.classList.remove('hidden');
    hideError();
    hideSuccess();
  }

  /**
   * Hide status message
   */
  function hideStatus() {
    statusDiv.classList.add('hidden');
  }

  /**
   * Show error message
   */
  function showError(message) {
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
    hideStatus();
    hideSuccess();
  }

  /**
   * Hide error message
   */
  function hideError() {
    errorDiv.classList.add('hidden');
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    document.getElementById('success-text').textContent = message;
    successDiv.classList.remove('hidden');
    hideStatus();
    hideError();

    // Auto-hide after 5 seconds
    setTimeout(hideSuccess, 5000);
  }

  /**
   * Hide success message
   */
  function hideSuccess() {
    successDiv.classList.add('hidden');
  }

  /**
   * Set button loading state
   */
  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  /**
   * Show full-screen loading
   */
  function showFullscreenLoading() {
    fullscreenLoading.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide full-screen loading
   */
  function hideFullscreenLoading() {
    fullscreenLoading.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Show success screen
   */
  function showSuccessScreen() {
    successScreen.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide success screen
   */
  function hideSuccessScreen() {
    successScreen.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Handle return to form
   */
  function handleReturn(e) {
    e.preventDefault();
    hideSuccessScreen();
    clearForm();
  }

  /**
   * Handle logout
   */
  function handleLogout(e) {
    e.preventDefault();
    console.log('Logging out...');

    // Delete the session cookie
    deleteCookie('wise_auth_session');

    // Redirect to login page
    window.location.href = 'login.html';
  }

  /**
   * Handle drag over event
   */
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  }

  /**
   * Handle drag leave event
   */
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  }

  /**
   * Handle drop event
   */
  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;

    if (files.length === 0) {
      showError('No file was dropped. Please try again.');
      return;
    }

    const file = files[0];

    // Validate file type
    if (file.type !== 'application/pdf') {
      showError('Please drop a PDF file. Other file types are not supported.');
      return;
    }

    // Process the PDF file
    await processPDFFile(file);
  }

  /**
   * Handle drop zone click (open file picker)
   */
  function handleDropZoneClick(e) {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await processPDFFile(file);
      }
    };
    input.click();
  }

  /**
   * Process a PDF file from drag-and-drop or file picker
   */
  async function processPDFFile(file) {
    try {
      // Check if API key is configured
      const apiKey = await checkApiKey();
      if (!apiKey) {
        showError('Please configure your OpenAI API key in the extension settings.');
        return;
      }

      console.log('Processing PDF file:', file.name, 'Size:', file.size, 'bytes');

      // Show loading state
      showStatus('Reading PDF file...');
      setButtonLoading(extractBtn, true);

      // Read file as ArrayBuffer
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const uint8Array = new Uint8Array(arrayBuffer);

      // Convert to base64 for message passing (or use array)
      const pdfDataArray = Array.from(uint8Array);

      console.log('PDF file read, size:', pdfDataArray.length, 'bytes');

      // Update status
      statusText.textContent = 'Extracting text from PDF (this may take a moment)...';

      // Send to background script for PDF processing
      console.log('Sending PDF to background script for processing...');
      const extractedData = await chrome.runtime.sendMessage({
        action: 'processPDFFile',
        pdfData: pdfDataArray,
        fileName: file.name
      });
      console.log('Received response from background:', extractedData);

      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      console.log('PDF extraction complete:', extractedData);

      // Check if we're using Vision API or text extraction
      if (extractedData.useVisionAPI) {
        console.log('Using Vision API for PDF processing');
        console.log('PDF base64 length:', extractedData.pdfBase64 ? extractedData.pdfBase64.length : 0);
      } else {
        // Text extraction path
        if (!extractedData.text || extractedData.text.trim().length < 50) {
          throw new Error('Could not extract text from PDF. The PDF might be image-based or empty.');
        }
        console.log('Extracted text length:', extractedData.text.length);
        console.log('First 500 chars:', extractedData.text.substring(0, 500));
      }

      // Update status
      statusText.textContent = 'Processing with AI (GPT-4 Vision)...';

      // Send to background for AI processing
      const result = await chrome.runtime.sendMessage({
        action: 'extractWithAI',
        data: extractedData
      });

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('AI Result:', result);
      console.log('AI Extracted Fields:', JSON.stringify(result.fields, null, 2));

      // Fill form with extracted data
      fillForm(result.fields);

      // Show success
      hideStatus();
      showSuccess('Invoice data extracted successfully from PDF!');

    } catch (error) {
      console.error('PDF file processing error:', error);
      hideStatus();
      showError(error.message || 'Failed to process PDF file. Please try again.');
    } finally {
      setButtonLoading(extractBtn, false);
    }
  }

  /**
   * Read file as ArrayBuffer
   */
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Handle currency change - update bank fields dynamically
   */
  function handleCurrencyChange() {
    const selectedCurrency = fields.currency.value;
    console.log('Currency changed to:', selectedCurrency);
    renderBankFields(selectedCurrency);
  }

  /**
   * Render bank account fields based on currency
   */
  function renderBankFields(currency) {
    const container = document.getElementById('bank-fields-container');
    container.innerHTML = '';

    // Get required fields for this currency
    const requiredFields = CURRENCY_BANK_FIELDS[currency] || CURRENCY_BANK_FIELDS['DEFAULT'];

    // Create each field
    requiredFields.forEach(fieldName => {
      const config = FIELD_CONFIG[fieldName];
      if (!config) return;

      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';

      const label = document.createElement('label');
      label.htmlFor = `bank-${fieldName}`;
      label.textContent = `${config.label} *`;
      formGroup.appendChild(label);

      if (config.type === 'select') {
        // Create select field
        const select = document.createElement('select');
        select.id = `bank-${fieldName}`;
        select.name = `bank-${fieldName}`;
        select.required = true;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = config.placeholder;
        select.appendChild(defaultOption);

        config.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          select.appendChild(option);
        });

        formGroup.appendChild(select);
      } else {
        // Create text input
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `bank-${fieldName}`;
        input.name = `bank-${fieldName}`;
        input.placeholder = config.placeholder;
        input.required = true;
        formGroup.appendChild(input);
      }

      // Add help text
      if (config.help) {
        const helpText = document.createElement('small');
        helpText.className = 'field-help';
        helpText.textContent = config.help;
        formGroup.appendChild(helpText);
      }

      container.appendChild(formGroup);
    });
  }

  /**
   * Get bank field values for form submission
   */
  function getBankFieldValues() {
    const values = {};
    const container = document.getElementById('bank-fields-container');
    const inputs = container.querySelectorAll('input, select');

    inputs.forEach(input => {
      const fieldName = input.id.replace('bank-', '');
      values[fieldName] = input.value;
    });

    return values;
  }

  // Initialize
  console.log('Sidebar loaded');

  // Render initial bank fields for EUR (default)
  renderBankFields('EUR');
})();

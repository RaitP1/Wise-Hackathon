/**
 * Sidebar JavaScript - Handles invoice extraction and form filling
 */

(function() {
  'use strict';

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

  // Form fields
  const fields = {
    receiverName: document.getElementById('receiver-name'),
    iban: document.getElementById('iban'),
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

      // Request extraction from content script (main frame only)
      const extractedData = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractInvoice'
      });

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

    // Fill each field and mark as auto-filled
    if (data.receiver_name) {
      console.log('✓ Setting receiver_name:', data.receiver_name);
      fields.receiverName.value = data.receiver_name;
      fields.receiverName.classList.add('auto-filled');
    } else {
      console.log('✗ receiver_name is empty/null');
    }

    if (data.iban) {
      console.log('✓ Setting iban:', data.iban);
      fields.iban.value = formatIBAN(data.iban);
      fields.iban.classList.add('auto-filled');
    } else {
      console.log('✗ iban is empty/null');
    }

    if (data.amount) {
      console.log('✓ Setting amount:', data.amount);
      fields.amount.value = data.amount;
      fields.amount.classList.add('auto-filled');
    } else {
      console.log('✗ amount is empty/null');
    }

    if (data.currency) {
      console.log('✓ Setting currency:', data.currency);
      fields.currency.value = data.currency;
      fields.currency.classList.add('auto-filled');
    } else {
      console.log('✗ currency is empty/null');
    }

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

    // Validate required fields
    if (!fields.receiverName.value || !fields.iban.value || !fields.amount.value) {
      showError('Please fill in all required fields (Receiver Name, IBAN, Amount)');
      return;
    }

    try {
      setButtonLoading(sendBtn, true);

      // Collect form data
      const formData = {
        receiverName: fields.receiverName.value,
        iban: fields.iban.value,
        amount: fields.amount.value,
        currency: fields.currency.value,
        referenceNumber: fields.referenceNumber.value,
        description: fields.description.value,
        invoiceNumber: fields.invoiceNumber.value,
        issueDate: fields.issueDate.value,
        dueDate: fields.dueDate.value
      };

      console.log('Submitting payment:', formData);

      // Here you would send to your bank's API
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      showSuccess('Payment submitted successfully!');

      // Optionally clear form after successful submission
      // setTimeout(() => clearForm(), 2000);

    } catch (error) {
      console.error('Submission error:', error);
      showError('Failed to submit payment. Please try again.');
    } finally {
      setButtonLoading(sendBtn, false);
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

  // Initialize
  console.log('Sidebar loaded');
})();

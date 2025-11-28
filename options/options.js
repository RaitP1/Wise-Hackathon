/**
 * Options/Settings Page JavaScript
 */

(function() {
  'use strict';

  // DOM elements
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const successDiv = document.getElementById('success');
  const errorDiv = document.getElementById('error');
  const errorText = document.getElementById('error-text');

  // Event listeners
  saveBtn.addEventListener('click', handleSave);
  apiKeyInput.addEventListener('input', hideMessages);

  // Load saved settings on page load
  loadSettings();

  /**
   * Load saved settings from storage
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['openai_api_key']);

      if (result.openai_api_key) {
        // Show masked API key
        apiKeyInput.value = result.openai_api_key;
        apiKeyInput.placeholder = 'API key configured';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  async function handleSave() {
    try {
      const apiKey = apiKeyInput.value.trim();

      // Validate API key
      if (!apiKey) {
        showError('Please enter your OpenAI API key');
        return;
      }

      if (!apiKey.startsWith('sk-')) {
        showError('Invalid API key format. OpenAI API keys start with "sk-"');
        return;
      }

      // Show loading state
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      // Test API key before saving
      const isValid = await testApiKey(apiKey);

      if (!isValid) {
        showError('Invalid API key. Please check your key and try again.');
        return;
      }

      // Save to storage
      await chrome.storage.local.set({ openai_api_key: apiKey });

      // Show success message
      showSuccess();

      // Reset button
      saveBtn.textContent = 'Save Settings';

    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings. Please try again.');
    } finally {
      saveBtn.disabled = false;
    }
  }

  /**
   * Test API key validity
   */
  async function testApiKey(apiKey) {
    try {
      // Make a simple API call to test the key
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('API key test error:', error);
      return false;
    }
  }

  /**
   * Show success message
   */
  function showSuccess() {
    successDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      successDiv.classList.add('hidden');
    }, 3000);
  }

  /**
   * Show error message
   */
  function showError(message) {
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
    successDiv.classList.add('hidden');
  }

  /**
   * Hide all messages
   */
  function hideMessages() {
    successDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
  }

  console.log('Options page loaded');
})();

/**
 * Login Page JavaScript - Mockup authentication
 */

(function() {
  'use strict';

  // Cookie helper functions
  function setCookie(name, value, hours) {
    const date = new Date();
    date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }

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

  // Check if already logged in
  if (getCookie('wise_auth_session')) {
    console.log('Already logged in, redirecting to sidebar...');
    window.location.href = 'sidebar.html';
  }

  // DOM elements
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const loadingScreen = document.getElementById('loading-screen');

  // Event listeners
  loginForm.addEventListener('submit', handleLogin);

  // Remove error when user starts typing
  emailInput.addEventListener('input', clearError);
  passwordInput.addEventListener('input', clearError);

  /**
   * Handle login form submission
   */
  async function handleLogin(e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Clear any previous errors
    clearError();

    // Basic validation
    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      showError('Please enter a valid email address');
      emailInput.classList.add('error');
      return;
    }

    try {
      // Show loading state on button
      setButtonLoading(true);

      // Simulate authentication delay (mockup - accepts any credentials)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Show full-screen loading
      showLoadingScreen();

      // Simulate additional loading time
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Login successful, creating session cookie...');

      // Create session cookie that expires in 24 hours
      setCookie('wise_auth_session', 'authenticated', 24);

      console.log('Redirecting to main app...');

      // Add fade out animation before redirect
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.5s ease';

      // Wait for fade out to complete, then redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to the main sidebar
      window.location.href = 'sidebar.html';

    } catch (error) {
      console.error('Login error:', error);
      hideLoadingScreen();
      showError('An error occurred. Please try again.');
      setButtonLoading(false);
    }
  }

  /**
   * Validate email format
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Show error message
   */
  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  /**
   * Clear error message
   */
  function clearError() {
    errorMessage.classList.add('hidden');
    emailInput.classList.remove('error');
    passwordInput.classList.remove('error');
  }

  /**
   * Set button loading state
   */
  function setButtonLoading(isLoading) {
    if (isLoading) {
      loginBtn.classList.add('loading');
      loginBtn.disabled = true;
    } else {
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
    }
  }

  /**
   * Show loading screen
   */
  function showLoadingScreen() {
    loadingScreen.classList.remove('hidden');
  }

  /**
   * Hide loading screen
   */
  function hideLoadingScreen() {
    loadingScreen.classList.add('hidden');
  }

  // Auto-focus email input on load
  emailInput.focus();

  console.log('Login page loaded');
})();

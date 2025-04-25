/**
 * Popup script for CSC Project AI Enhancer
 * Handles API key management and displays extension status
 */

// DOM elements
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiKeyStatus = document.getElementById('api-key-status');
const keyStatusDisplay = document.getElementById('key-status');

// Initialize the popup
document.addEventListener('DOMContentLoaded', function() {
  console.log('CSC Project AI Enhancer popup initialized');
  
  // Load saved API key if any
  loadApiKey();
  
  // Set up event listeners
  setupEventListeners();
});

/**
 * Load the saved API key from storage
 */
function loadApiKey() {
  chrome.storage.sync.get(['anthropic_api_key'], function(result) {
    if (result.anthropic_api_key) {
      // Don't show the actual key, just indicate it's set
      apiKeyInput.value = '••••••••••••••••••••••••••••••';
      updateKeyStatus(true);
    } else {
      updateKeyStatus(false);
    }
  });
}

/**
 * Set up event listeners for the popup
 */
function setupEventListeners() {
  // Save API key button click
  saveApiKeyBtn.addEventListener('click', function() {
    saveApiKey();
  });
  
  // Enter key in input field
  apiKeyInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      saveApiKey();
    }
  });
  
  // Clear status message when input changes
  apiKeyInput.addEventListener('input', function() {
    apiKeyStatus.className = 'status';
    apiKeyStatus.textContent = '';
  });
}

/**
 * Save the API key to storage
 */
function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  // Check if the key is valid
  if (!isValidApiKey(apiKey)) {
    showStatus('Please enter a valid Anthropic API key', 'error');
    return;
  }
  
  // Save the key to storage
  chrome.storage.sync.set({anthropic_api_key: apiKey}, function() {
    // Show success message
    showStatus('API key saved successfully!', 'success');
    
    // Update key status
    updateKeyStatus(true);
    
    // Mask the key for security
    setTimeout(() => {
      apiKeyInput.value = '••••••••••••••••••••••••••••••';
    }, 1000);
  });
}

/**
 * Check if the API key is valid
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if the key is valid
 */
function isValidApiKey(apiKey) {
  // Anthropic API keys are typically prefixed with "sk-ant-" and are quite long
  if (!apiKey) return false;
  
  // If it's already masked, assume it's valid (user didn't change it)
  if (apiKey === '••••••••••••••••••••••••••••••') return true;
  
  // Check for the typical Anthropic API key format
  return apiKey.startsWith('sk-ant-') && apiKey.length > 40;
}

/**
 * Show a status message
 * @param {string} message - The message to show
 * @param {string} type - The type of message ('success' or 'error')
 */
function showStatus(message, type) {
  apiKeyStatus.textContent = message;
  apiKeyStatus.className = `status ${type}`;
  
  // Hide the message after 3 seconds
  setTimeout(() => {
    apiKeyStatus.className = 'status';
  }, 3000);
}

/**
 * Update the key status display
 * @param {boolean} isSet - Whether the key is set
 */
function updateKeyStatus(isSet) {
  if (isSet) {
    keyStatusDisplay.textContent = 'Set ✓';
    keyStatusDisplay.className = 'status-value set';
  } else {
    keyStatusDisplay.textContent = 'Not set';
    keyStatusDisplay.className = 'status-value not-set';
  }
}

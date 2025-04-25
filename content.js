/**
 * Content script for CSC Project AI Enhancer
 * Replaces the Anthropic API calls with calls to the extension's background script
 * to avoid CORS issues when opening HTML files directly from the filesystem
 */

// Main initialization function
function initializeExtension() {
  console.log("CSC Project AI Enhancer: Checking if this is a project page...");
  
  // Inject the extension script immediately
  injectExtensionScript();
  
  // Set up event listeners for our custom API bridge
  setupCustomEventListeners();
  
  // Check if this is a CSC project page with Anthropic integration
  if (isCSCProjectPage()) {
    console.log("CSC Project AI Enhancer: Project page with Anthropic integration detected!");
    
    // Wait for the page to fully initialize
    waitForPageInitialization().then(() => {
      // Replace the Anthropic API calls with calls to the extension's background script
      replaceAnthropicAPI();
      
      // Add extension status indicator
      addExtensionStatus();
      
      // Ensure buttons are enabled if a document is selected
      const documentSelect = document.getElementById('ai-document-select');
      const analyzeBtn = document.getElementById('analyze-btn');
      const summarizeBtn = document.getElementById('summarize-btn');
      const askBtn = document.getElementById('ask-btn');
      const questionInput = document.getElementById('ai-question');
      
      if (documentSelect && analyzeBtn && summarizeBtn && askBtn && questionInput) {
        const isDocumentSelected = documentSelect.value !== '';
        analyzeBtn.disabled = !isDocumentSelected;
        summarizeBtn.disabled = !isDocumentSelected;
        questionInput.disabled = !isDocumentSelected;
        askBtn.disabled = !isDocumentSelected || questionInput.value.trim() === '';
        
        console.log("CSC Project AI Enhancer: Button states updated based on document selection");
      }
    });
  } else {
    console.log("CSC Project AI Enhancer: Not a CSC project page, extension inactive.");
  }
}

/**
 * Set up custom event listeners for the API bridge
 */
function setupCustomEventListeners() {
  console.log("CSC Project AI Enhancer: Setting up custom event listeners");
  
  // Listen for extension check events immediately
  window.addEventListener('cscProjectExtensionCheck', function(event) {
    console.log("CSC Project AI Enhancer: Received extension check event", event.detail);
    
    // Add a small delay to ensure the bridge is fully loaded before responding
    setTimeout(() => {
      // Respond with confirmation that the extension is available
      window.dispatchEvent(new CustomEvent('cscProjectExtensionResponse', {
        detail: {
          available: true,
          version: '1.0',
          source: 'extension'
        }
      }));
      
      console.log("CSC Project AI Enhancer: Sent extension check response");
    }, 100);
  });
  
  // Listen for API request events
  window.addEventListener('cscProjectApiRequest', function(event) {
    console.log("CSC Project AI Enhancer: Received API request event", event.detail);
    
    // Get the request details
    const { endpoint, apiKey, params } = event.detail;
    
    // Send the request to the background script
    chrome.runtime.sendMessage({
      type: "anthropic_api_request",
      endpoint: endpoint,
      apiKey: apiKey,
      params: params
    }, function(response) {
      console.log("CSC Project AI Enhancer: Received response from background script");
      
      // Send the response back to the page
      window.dispatchEvent(new CustomEvent('cscProjectApiResponse', {
        detail: response
      }));
    });
  });
  
  // Inject the window.cscProjectExtension object
  injectAPIBridge();
  
  // Immediately ping the page to trigger any waiting detectors
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('cscProjectExtensionReady', {
      detail: {
        available: true,
        version: '1.0'
      }
    }));
    console.log("CSC Project AI Enhancer: Sent extension ready event");
    
    // Update the extension status
    updateExtensionStatus(true);
    
    // Enable buttons if a document is selected
    const documentSelect = document.getElementById('ai-document-select');
    const analyzeBtn = document.getElementById('analyze-btn');
    const summarizeBtn = document.getElementById('summarize-btn');
    const askBtn = document.getElementById('ask-btn');
    const questionInput = document.getElementById('ai-question');
    
    if (documentSelect && analyzeBtn && summarizeBtn && askBtn && questionInput) {
      const isDocumentSelected = documentSelect.value !== '';
      analyzeBtn.disabled = !isDocumentSelected;
      summarizeBtn.disabled = !isDocumentSelected;
      questionInput.disabled = !isDocumentSelected;
      askBtn.disabled = !isDocumentSelected || questionInput.value.trim() === '';
    }
  }, 300);
  
  // Listen for directory scan requests from the page bridge
  window.addEventListener('cscProjectDirectoryScanRequest', function(event) {
    console.log("CSC Project AI Enhancer: Received directory scan request", event.detail);
    
    // Get the request details
    const { requestId, path } = event.detail;
    
    if (path) {
      // Send the request to the background script
      chrome.runtime.sendMessage({
        type: "scan_directory",
        folderPath: path
      }, function(response) {
        console.log("CSC Project AI Enhancer: Received directory scan response from background script", response);
        
        // Default to error if response is malformed
        let detailToSend = {
            error: 'Invalid response from background script'
        };

        if (response) {
            if (response.success) {
                detailToSend = {
                    files: response.files || [] // Ensure files is always an array
                };
            } else {
                detailToSend = {
                    error: response.error || 'Unknown error scanning directory'
                };
            }
        } 

        // Send the response back to the page
        window.dispatchEvent(new CustomEvent('cscProjectDirectoryScanResponse_' + requestId, {
            detail: detailToSend
        }));
      });
    } else {
      console.error("CSC Project AI Enhancer: No folder path provided in directory scan request");
      window.dispatchEvent(new CustomEvent('cscProjectDirectoryScanResponse_' + requestId, {
        detail: {
          error: "No folder path provided in the request"
        }
      }));
    }
  });
}

/**
 * Inject the API bridge object into the page
 */
function injectAPIBridge() {
  console.log("CSC Project AI Enhancer: Injecting API bridge");
  
  // Create a script element to load the bridge from a file
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injectAPIBridge.js');
  script.onload = () => {
    // Remove the script element after it loads
    script.remove();
    console.log("CSC Project AI Enhancer: API bridge script loaded");
  };
  
  // Add the script to the page
  (document.head || document.documentElement).appendChild(script);
  
  // Listen for direct API requests
  window.addEventListener('cscProjectApiDirectRequest', function(event) {
    console.log("CSC Project AI Enhancer: Received direct API request", event.detail);
    
    // Get the request details
    const { requestId, params } = event.detail;
    
    // Get the API key from the params and remove it before sending
    let apiKey = null;
    if (params.apiKey) {
      apiKey = params.apiKey;
      // Create a new params object without the apiKey
      const newParams = { ...params };
      delete newParams.apiKey;
      
      // Send the request to the background script
      chrome.runtime.sendMessage({
        type: "anthropic_api_request",
        endpoint: 'https://api.anthropic.com/v1/messages',
        apiKey: apiKey,
        params: newParams
      }, function(response) {
        console.log("CSC Project AI Enhancer: Received response from background script for direct request");
        
        // Send the response back to the page
        window.dispatchEvent(new CustomEvent('cscProjectApiDirectResponse_' + requestId, {
          detail: response
        }));
      });
    } else {
      console.error("CSC Project AI Enhancer: No API key provided in request");
      window.dispatchEvent(new CustomEvent('cscProjectApiDirectResponse_' + requestId, {
        detail: {
          error: "No API key provided in the request"
        }
      }));
    }
  });
  
  // Listen for file read requests
  window.addEventListener('cscProjectFileRequest', function(event) {
    console.log("CSC Project AI Enhancer: Received file read request", event.detail);
    
    // Get the request details
    const { requestId, path } = event.detail;
    
    if (path) {
      // Send the request to the background script
      chrome.runtime.sendMessage({
        type: "read_file_content",
        filePath: path
      }, function(response) {
        console.log("CSC Project AI Enhancer: Received file content response from background script");
        
        if (response && response.success) {
          // Send the successful response back to the page
          window.dispatchEvent(new CustomEvent('cscProjectFileResponse_' + requestId, {
            detail: {
              content: response.content,
              fallback: response.fallback || false
            }
          }));
        } else {
          // Even when there's an error, provide a placeholder to keep UI functional
          const error = response ? response.error : "Failed to read file content";
          window.dispatchEvent(new CustomEvent('cscProjectFileResponse_' + requestId, {
            detail: {
              content: `[Placeholder for ${path.split('/').pop()}] - Error: ${error}`,
              fallback: true,
              error: error
            }
          }));
        }
      });
    } else {
      console.error("CSC Project AI Enhancer: No file path provided in request");
      window.dispatchEvent(new CustomEvent('cscProjectFileResponse_' + requestId, {
        detail: {
          error: "No file path provided in the request"
        }
      }));
    }
  });
}

/**
 * Wait for the page to fully initialize
 * @returns {Promise<void>} Promise that resolves when the page is initialized
 */
function waitForPageInitialization() {
  return new Promise(resolve => {
    // Check if Storage and AIService are initialized in the window/document context
    const checkInitialization = () => {
      // Try to find objects in the document context through DOM interaction
      const storageExists = document.querySelector('script[src*="storage.js"]') !== null;
      const aiServiceExists = document.querySelector('script[src*="aiService.js"]') !== null;
      
      // Also look for logs in the console that indicate initialization
      const hasLogsForInit = true; // We've seen in logs that both were initialized
      
      if (storageExists && aiServiceExists && hasLogsForInit) {
        console.log("CSC Project AI Enhancer: Page initialization complete (detected through script tags)");
        resolve();
      } else {
        // Add a failsafe counter to prevent infinite waiting
        if (!checkInitialization.counter) checkInitialization.counter = 0;
        checkInitialization.counter++;
        
        // After 10 attempts (5 seconds), resolve anyway even if not fully initialized
        if (checkInitialization.counter > 10) {
          console.log("CSC Project AI Enhancer: Forcing initialization after timeout");
          resolve();
          return;
        }
        
        console.log("CSC Project AI Enhancer: Waiting for page initialization...");
        setTimeout(checkInitialization, 500);
      }
    };
    
    checkInitialization();
  });
}

/**
 * Check if the current page is a CSC project page with Anthropic integration
 * @returns {boolean} True if this is a CSC project page with Anthropic integration
 */
function isCSCProjectPage() {
  // Check for AI container
  const aiContainer = document.querySelector('.ai-container');
  
  // Check for AI-specific elements (no longer requiring API key elements)
  const aiElements =
    document.getElementById('ai-document-select') &&
    document.getElementById('analyze-btn') &&
    document.getElementById('summarize-btn') &&
    document.getElementById('ai-question') &&
    document.getElementById('ask-btn');
  
  // Check page title
  const titleMatch = document.title.includes("Project Documentation") ||
                     document.title.includes("HVAC") ||
                     document.title.includes("CSC");
  
  const result = aiContainer && aiElements && titleMatch;
  console.log("CSC Project AI Enhancer: isCSCProjectPage check result:", result);
  console.log("- AI container:", !!aiContainer);
  console.log("- AI elements:", !!aiElements);
  console.log("- Title match:", !!titleMatch);
  
  return result;
}

/**
 * Add extension status indicator to the page
 */
function addExtensionStatus() {
  // Find the extension status container
  const statusContainer = document.getElementById('extension-status-container');
  
  if (statusContainer) {
    // Create a status element
    const statusElement = document.createElement('div');
    statusElement.className = 'extension-status';
    statusElement.innerHTML = `
      <div style="padding: 8px 12px; background-color: #d4edda; color: #155724; border-radius: 5px; font-size: 0.9em;">
        <strong>CSC Project AI Enhancer Active ✓</strong>
      </div>
    `;
    
    // Add the status element to the container
    statusContainer.appendChild(statusElement);
  }
}

/**
 * Update the extension status based on detection
 * @param {boolean} isDetected - Whether the extension is detected
 */
function updateExtensionStatus(isDetected) {
  const statusContainer = document.getElementById('extension-status-container');
  
  if (statusContainer) {
    if (isDetected) {
      statusContainer.innerHTML = `
        <div style="padding: 8px 12px; background-color: #d4edda; color: #155724; border-radius: 5px; font-size: 0.9em;">
          <strong>CSC Project AI Enhancer Active ✓</strong>
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <div style="padding: 8px 12px; background-color: #d1ecf1; color: #0c5460; border-radius: 5px; font-size: 0.9em;">
          <strong>Chrome Extension Required</strong>
          <p style="margin: 5px 0 0 0; font-size: 0.85em;">For AI features to work with local HTML files, please install the CSC Project AI Enhancer extension.</p>
        </div>
      `;
    }
  }
}

/**
 * Function to read file content via the extension
 * @param {string} path - Path to the file
 * @returns {Promise<string>} The file content
 */
function readFileViaExtension(path) {
  return new Promise((resolve, reject) => {
    console.log("Attempting to read file:", path);
    chrome.runtime.sendMessage({
      type: "read_file_content",
      filePath: path
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Extension error:", chrome.runtime.lastError);
        // Instead of rejecting, resolve with a placeholder to keep UI working
        resolve(`[Placeholder for ${path.split('/').pop()}] - Extension error: ${chrome.runtime.lastError.message}`);
        return;
      }
      
      if (response && response.success) {
        // Handle both actual content and fallback content cases as success
        console.log(`Successfully read file (${response.content.length} chars)${response.fallback ? ' (using fallback content)' : ''}`);
        resolve(response.content);
      } else {
        // If we got an error response, still resolve with placeholder to ensure UI remains enabled
        const error = response ? response.error : "Failed to read file";
        console.error("File read error:", error);
        resolve(`[Placeholder for ${path.split('/').pop()}] - Failed to read content: ${error}`);
      }
    });
  });
}

/**
 * Set up the Anthropic API integration
 */
function replaceAnthropicAPI() {
  // Get the API key from the page
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key-btn');
  
  // Only set up API key event listeners if the elements exist
  if (apiKeyInput && saveApiKeyBtn) {
    // Save the API key to the extension's storage when the user clicks the save button
    saveApiKeyBtn.addEventListener('click', function() {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        chrome.storage.sync.set({anthropic_api_key: apiKey});
        console.log("CSC Project AI Enhancer: API key saved to extension storage");
      }
    });
  } else {
    console.log("CSC Project AI Enhancer: API key input elements not found, skipping event listeners");
  }
  
  // Get the analyze, summarize, and ask buttons
  const analyzeBtn = document.getElementById('analyze-btn');
  const summarizeBtn = document.getElementById('summarize-btn');
  const askBtn = document.getElementById('ask-btn');
  const documentSelect = document.getElementById('ai-document-select');
  const questionInput = document.getElementById('ai-question');
  const aiResults = document.getElementById('ai-results');
  const aiLoading = document.getElementById('ai-loading');
  
  // Replace the analyze button click handler
  if (analyzeBtn) {
    // Remove existing event listeners (this is tricky and not always possible)
    // We'll use the cloneNode technique to remove all event listeners
    const newAnalyzeBtn = analyzeBtn.cloneNode(true);
    analyzeBtn.parentNode.replaceChild(newAnalyzeBtn, analyzeBtn);
    
    // Add our own event listener
    newAnalyzeBtn.addEventListener('click', async function() {
      
      const selectedFile = documentSelect.value;
      if (!selectedFile) return;
      
      // Show loading indicator
      aiResults.style.display = 'none';
      aiLoading.style.display = 'flex';
      
      try {
        // Get file extension
        const fileExt = selectedFile.split('.').pop().toLowerCase();
        
        // Try to get actual content for supported file types
        let fileContent;
        if (["txt", "md", "json", "html", "js", "css", "csv"].includes(fileExt)) {
          try {
            fileContent = await readFileViaExtension(selectedFile);
            // Try to cache the content if Storage is available in this context
            try {
              // Use window.postMessage to tell the page to save the file content instead
              window.postMessage({
                type: 'saveFileContent', 
                path: selectedFile, 
                content: fileContent
              }, '*');
              console.log("Requested content save via postMessage");
            } catch (cacheError) {
              console.log("Not caching file content in extension context");
            }
          } catch (error) {
            console.warn("Failed to read file, falling back to cached/placeholder:", error);
            // Fall back to cached content or placeholder
            fileContent = Storage.getFileContent(selectedFile) ||
              `This is a placeholder for the content of ${selectedFile.split('/').pop()}. In a production environment, this would be the actual file content.`;
          }
        } else {
          // For unsupported file types, use cached content or placeholder
          fileContent = Storage.getFileContent(selectedFile) ||
            `This is a placeholder for the content of ${selectedFile.split('/').pop()}. In a production environment, this would be the actual file content.`;
        }
        
        // Send a message to the background script
        chrome.runtime.sendMessage({
          type: "analyze_document",
          documentText: fileContent
        }, function(response) {
          // Hide loading indicator
          aiLoading.style.display = 'none';
          aiResults.style.display = 'block';
          
          if (response.error) {
            aiResults.innerHTML = `
              <h4>Error</h4>
              <div class="ai-error">${response.error}</div>
            `;
          } else {
            aiResults.innerHTML = `
              <h4>Analysis Results</h4>
              <div class="ai-summary">${response.analysis}</div>
              <div class="ai-usage">Tokens used: ${response.usage ? response.usage.total_tokens : 'N/A'}</div>
            `;
          }
        });
      } catch (error) {
        // Hide loading indicator
        aiLoading.style.display = 'none';
        aiResults.style.display = 'block';
        
        // Show error
        aiResults.innerHTML = `
          <h4>Error</h4>
          <div class="ai-error">${error.message}</div>
        `;
      }
    }, true); // Use capture phase to run before other handlers
  }
  
  // Replace the summarize button click handler
  if (summarizeBtn) {
    // Remove existing event listeners
    const newSummarizeBtn = summarizeBtn.cloneNode(true);
    summarizeBtn.parentNode.replaceChild(newSummarizeBtn, summarizeBtn);
    
    // Add our own event listener
    newSummarizeBtn.addEventListener('click', async function() {
      
      const selectedFile = documentSelect.value;
      if (!selectedFile) return;
      
      // Show loading indicator
      aiResults.style.display = 'none';
      aiLoading.style.display = 'flex';
      
      try {
        // Get file extension
        const fileExt = selectedFile.split('.').pop().toLowerCase();
        
        // Try to get actual content for supported file types
        let fileContent;
        if (["txt", "md", "json", "html", "js", "css", "csv"].includes(fileExt)) {
          try {
            fileContent = await readFileViaExtension(selectedFile);
            // Try to cache the content if Storage is available in this context
            try {
              // Use window.postMessage to tell the page to save the file content instead
              window.postMessage({
                type: 'saveFileContent', 
                path: selectedFile, 
                content: fileContent
              }, '*');
              console.log("Requested content save via postMessage for summarize operation");
            } catch (cacheError) {
              console.log("Not caching file content in extension context for summarize operation");
            }
          } catch (error) {
            console.warn("Failed to read file, falling back to cached/placeholder:", error);
            // Fall back to cached content or placeholder
            fileContent = Storage.getFileContent(selectedFile) ||
              `This is a placeholder for the content of ${selectedFile.split('/').pop()}. In a production environment, this would be the actual file content.`;
          }
        } else {
          // For unsupported file types, use cached content or placeholder
          fileContent = Storage.getFileContent(selectedFile) ||
            `This is a placeholder for the content of ${selectedFile.split('/').pop()}. In a production environment, this would be the actual file content.`;
        }
        
        // Send a message to the background script
        chrome.runtime.sendMessage({
          type: "summarize_document",
          documentText: fileContent
        }, function(response) {
          // Hide loading indicator
          aiLoading.style.display = 'none';
          aiResults.style.display = 'block';
          
          if (response.error) {
            aiResults.innerHTML = `
              <h4>Error</h4>
              <div class="ai-error">${response.error}</div>
            `;
          } else {
            aiResults.innerHTML = `
              <h4>Summary</h4>
              <div class="ai-summary">${response.summary}</div>
              <div class="ai-usage">Tokens used: ${response.usage ? response.usage.total_tokens : 'N/A'}</div>
            `;
          }
        });
      } catch (error) {
        // Hide loading indicator
        aiLoading.style.display = 'none';
        aiResults.style.display = 'block';
        
        // Show error
        aiResults.innerHTML = `
          <h4>Error</h4>
          <div class="ai-error">${error.message}</div>
        `;
      }
    }, true); // Use capture phase to run before other handlers
  }
  
  // Replace the ask button click handler
  if (askBtn) {
    // Remove existing event listeners
    const newAskBtn = askBtn.cloneNode(true);
    askBtn.parentNode.replaceChild(newAskBtn, askBtn);
    
    // Add our own event listener
    newAskBtn.addEventListener('click', async function() {
      
      const selectedFile = documentSelect.value;
      const question = questionInput.value.trim();
      if (!selectedFile || !question) return;
      
      // Show loading indicator
      aiResults.style.display = 'none';
      aiLoading.style.display = 'flex';
      
      try {
        // Get file extension
        const fileExt = selectedFile.split('.').pop().toLowerCase();
        
        // Try to get actual content for supported file types
        let fileContent;
        if (["txt", "md", "json", "html", "js", "css", "csv"].includes(fileExt)) {
          try {
            fileContent = await readFileViaExtension(selectedFile);
            // Try to cache the content if Storage is available in this context
            try {
              // Use window.postMessage to tell the page to save the file content instead
              window.postMessage({
                type: 'saveFileContent', 
                path: selectedFile, 
                content: fileContent
              }, '*');
              console.log("Requested content save via postMessage for ask question operation");
            } catch (cacheError) {
              console.log("Not caching file content in extension context for ask question operation");
            }
          } catch (error) {
            console.warn("Failed to read file, falling back to cached/placeholder:", error);
            // Fall back to cached content or placeholder
            fileContent = Storage.getFileContent(selectedFile) ||
              `This is a placeholder for the content of ${selectedFile.split('/').pop()}. In a production environment, this would be the actual file content.`;
          }
        } else {
          // For unsupported file types, use cached content or placeholder
          fileContent = Storage.getFileContent(selectedFile) ||
            `This is a placeholder for the content of ${selectedFile.split('/').pop()}. In a production environment, this would be the actual file content.`;
        }
        
        // Send a message to the background script
        chrome.runtime.sendMessage({
          type: "ask_question",
          documentText: fileContent,
          question: question
        }, function(response) {
          // Hide loading indicator
          aiLoading.style.display = 'none';
          aiResults.style.display = 'block';
          
          if (response.error) {
            aiResults.innerHTML = `
              <h4>Error</h4>
              <div class="ai-error">${response.error}</div>
            `;
          } else {
            aiResults.innerHTML = `
              <h4>Question: ${question}</h4>
              <div class="ai-answer">${response.answer}</div>
              <div class="ai-usage">Tokens used: ${response.usage ? response.usage.total_tokens : 'N/A'}</div>
            `;
          }
        });
      } catch (error) {
        // Hide loading indicator
        aiLoading.style.display = 'none';
        aiResults.style.display = 'block';
        
        // Show error
        aiResults.innerHTML = `
          <h4>Error</h4>
          <div class="ai-error">${error.message}</div>
        `;
      }
    }, true); // Use capture phase to run before other handlers
  }
  
  // Force AIService to use direct API calls
  if (typeof AIService !== 'undefined' && typeof AIService.setUseProxy === 'function') {
    AIService.setUseProxy(false);
    console.log("CSC Project AI Enhancer: Forced direct API calls for extension compatibility");
  }
  
  console.log("CSC Project AI Enhancer: Successfully set up Anthropic API integration");
}

// Inject a notification that the extension is active
function injectExtensionScript() {
  // No longer add a notification to the page since we're using the header status
  console.log("CSC Project AI Enhancer: Script injected without notification");
  
  // We can still do other initialization here if needed
}

// Initialize the extension when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Log that the extension is ready
console.log('CSC Project AI Enhancer: Extension is ready and detectable by the page');

/**
 * Background script for CSC Project AI Enhancer
 * Handles API calls to Anthropic and manages communication with content scripts
 */

/**
 * Function to read text file content using fetch, compatible with Service Workers.
 * @param {string} filePath - Path to the file
 * @param {string} tabUrl - The current tab URL for path resolution
 * @returns {Promise<string>} The file content or an error message string
 */
function readTextFile(filePath, tabUrl) {
  return new Promise((resolve) => { // Removed reject, always resolve with content or error string
    console.log("Reading file with fetch:", filePath);
    console.log("Tab URL for path resolution:", tabUrl);

    // Handle relative paths
    let absolutePath;
    if (filePath.startsWith("../")) {
      // Remove the "../" prefix
      const relativePath = filePath.substring(3);
      // Get the parent directory of the current URL
      const baseUrl = tabUrl.substring(0, tabUrl.lastIndexOf('/'));
      const parentUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
      absolutePath = `${parentUrl}/${relativePath}`;
    } else if (filePath.startsWith("./")) {
      // Handle current directory relative paths
      const baseUrl = tabUrl.substring(0, tabUrl.lastIndexOf('/'));
      absolutePath = `${baseUrl}/${filePath.substring(2)}`;
    } else if (!filePath.includes('://')) {
      // If it doesn't have a protocol but isn't relative with ./ or ../
      // Assume it's relative to the current directory
      const baseUrl = tabUrl.substring(0, tabUrl.lastIndexOf('/'));
      absolutePath = `${baseUrl}/${filePath}`;
    } else {
      // Already has a protocol (http://, file://, etc.)
      absolutePath = filePath;
    }

    console.log("Resolved absolute path:", absolutePath);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`Fetch timeout for ${filePath}`);
      controller.abort();
      // Resolve directly here in case the fetch promise hangs indefinitely after abort
      resolve(`[Timeout loading content for ${filePath}]`); 
    }, 5000); // 5 second timeout

    fetch(absolutePath, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          // Throw an error to be caught by the .catch block
          throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        }
        return response.text(); // Get response body as text
      })
      .then(text => {
        clearTimeout(timeoutId); // Clear the timeout if fetch succeeds
        console.log(`Successfully read file content via fetch (${text.length} chars)`);
        resolve(text); // Resolve the promise with the file content
      })
      .catch(error => {
        clearTimeout(timeoutId); // Clear the timeout on error as well
        if (error.name === 'AbortError') {
          // Timeout already handled by the setTimeout callback resolving the promise
          console.log(`Fetch aborted for ${filePath} (likely timeout).`);
          // Resolve was already called in the timeout handler, prevent double resolve
        } else {
          console.error(`Fetch error for ${filePath}:`, error);
          // Resolve with an error message string
          resolve(`[Error loading content for ${filePath}: ${error.message}]`);
        }
      });
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle file reading requests
  if (request.type === "read_file_content") {
    const fileExt = request.filePath.split('.').pop().toLowerCase();
    
    // Handle text-based file types
    if (["txt", "md", "json", "html", "js", "css", "csv"].includes(fileExt)) {
      console.log(`Requesting file content read for ${request.filePath}`);
      
      // Get the sender's tab URL (Ensure sender.tab exists)
      if (sender.tab && sender.tab.id && sender.tab.url) {
        chrome.tabs.get(sender.tab.id, (tab) => {
          // Check if tab object is valid
          if (chrome.runtime.lastError || !tab || !tab.url) {
            console.error("Error getting sender tab:", chrome.runtime.lastError?.message || "Tab object invalid");
             sendResponse({
               success: true, // Still report "success" to avoid disabling UI
               content: `[Placeholder for ${request.filePath}] - Unable to get sender tab URL`,
               fallback: true
             });
            return;
          }
          
          // Use an IIAFE (Immediately Invoked Async Function Expression) to use await
          (async () => {
            try {
              // Pass the tab URL to the function
              const content = await readTextFile(request.filePath, tab.url);
              console.log(`Received file content response in listener (${content.length} chars)`);
              // Check if content indicates an error occurred during read
              const isFallback = content.startsWith("[Error") || content.startsWith("[Timeout") || content.startsWith("[Placeholder");
              sendResponse({
                success: true, // Report success to keep UI enabled
                content: content,
                fallback: isFallback // Mark if it's placeholder/error content
              });
            } catch (error) // Should not happen as readTextFile always resolves
            { 
              console.error(`Unexpected error in readTextFile handling: ${error.message}`);
              sendResponse({
                success: true, 
                content: `[Placeholder for ${request.filePath}] - Unexpected error: ${error.message}`,
                fallback: true
              });
            }
          })();
        });
      } else {
         console.error("Sender tab information is missing or incomplete.");
         sendResponse({
           success: true, // Still report "success" to avoid disabling UI
           content: `[Placeholder for ${request.filePath}] - Missing sender tab info`,
           fallback: true
         });
      }
      
      return true; // Indicates async response
    } else {
      // For other file types, return fallback placeholder
      console.log(`File type not supported for reading: ${request.filePath}`);
      sendResponse({
        success: true, // Keep UI enabled
        content: `[Placeholder for ${request.filePath}] - File type not supported for reading`,
        fallback: true
      });
      return true;
    }
  }

  // Handle directory scan requests
  if (request.type === "scan_directory") {
    console.log(`Background: Received scan_directory request for path: ${request.folderPath}`);
    // IMPORTANT: Implement actual directory scanning logic here!
    // This requires appropriate Chrome Extension APIs and permissions 
    // (e.g., nativeMessaging, fileSystemProvider, etc.) which depend on your setup.
    // The following is a placeholder.
    
    // Placeholder Implementation (replace with real logic):
    try {
        // *** START Placeholder Logic ***
        // In a real scenario, you would use Chrome APIs here to list files.
        // For example, if using Native Messaging:
        // chrome.runtime.sendNativeMessage('your.native.app.id', 
        //     { command: 'list_dir', path: request.folderPath }, 
        //     function(nativeResponse) { ... process nativeResponse ... });
        // Since we cannot implement that here, we send back a placeholder success.
        
        // Simulate finding some files based on path - REPLACE THIS
        let mockFiles = [];
        const folderName = request.folderPath.split('/').pop(); // Get last part of path
        if (folderName === 'sales') {
            mockFiles = [
                { name: 'SomeSaleFile.pdf', modified: '2024-01-10' }, 
                { name: 'AnotherSale.xlsx', modified: '2024-01-09' } 
            ];
        } else if (folderName === 'booking') {
            mockFiles = [
                { name: 'BookingConfirmation.pdf', modified: '2024-01-11' }
            ];
        } // Add other folders if needed for testing
        
        console.log(`Background: (Placeholder) Simulating success for ${request.folderPath}, returning ${mockFiles.length} files.`);
        sendResponse({ success: true, files: mockFiles });
        // *** END Placeholder Logic ***
        
    } catch (error) {
        console.error(`Background: Error scanning directory ${request.folderPath}:`, error);
        sendResponse({ success: false, error: error.message || 'Failed to scan directory' });
    }
    return true; // Indicates async response (important if using real async Chrome APIs)
  }

  // Handle Anthropic API requests
  if (request.type === "anthropic_request") {
    handleAnthropicRequest(request, sendResponse);
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  // Handle API key check requests
  if (request.type === "check_api_key") {
    chrome.storage.sync.get(['anthropic_api_key'], function(result) {
      sendResponse({
        hasKey: !!result.anthropic_api_key,
        key: result.anthropic_api_key
      });
    });
    return true;
  }
  
  // Handle analyze document requests
  if (request.type === "analyze_document") {
    handleAnalyzeDocument(request, sendResponse);
    return true;
  }
  
  // Handle summarize document requests
  if (request.type === "summarize_document") {
    handleSummarizeDocument(request, sendResponse);
    return true;
  }
  
  // Handle ask question requests
  if (request.type === "ask_question") {
    handleAskQuestion(request, sendResponse);
    return true;
  }
  
  // Handle direct Anthropic API requests
  if (request.type === "anthropic_api_request") {
    handleAnthropicAPIRequest(request, sendResponse);
    return true;
  }
});

/**
 * Clean an API key by removing any prefix
 * @param {string} apiKey - The API key to clean
 * @returns {string} The cleaned API key
 */
function cleanApiKey(apiKey) {
  if (!apiKey) return apiKey;
  
  // Remove any prefix like "ANTHROPIC_API_KEY=" if present
  if (apiKey.includes('=')) {
    return apiKey.split('=')[1];
  }
  
  return apiKey;
}

/**
 * Handle Anthropic API requests
 * @param {Object} request - The request object from the content script
 * @param {Function} sendResponse - Function to send response back to content script
 */
async function handleAnthropicRequest(request, sendResponse) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['anthropic_api_key']);
    let apiKey = result.anthropic_api_key;
    
    if (!apiKey) {
      sendResponse({
        error: "API key not set. Click the extension icon to set your Anthropic API key."
      });
      return;
    }
    
    // Clean the API key
    apiKey = cleanApiKey(apiKey);
    
    // Log request (without sensitive data)
    console.log(`Making Anthropic API request: ${request.data.messages[0].content.substring(0, 50)}...`);
    
    // Make the API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(request.data)
    });
    
    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Send the response back to the content script
    sendResponse({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    sendResponse({
      error: error.message || "Unknown error occurred"
    });
  }
}

/**
 * Handle analyze document requests
 * @param {Object} request - The request object from the content script
 * @param {Function} sendResponse - Function to send response back to content script
 */
async function handleAnalyzeDocument(request, sendResponse) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['anthropic_api_key']);
    let apiKey = result.anthropic_api_key;
    
    if (!apiKey) {
      sendResponse({
        error: "API key not set. Click the extension icon to set your Anthropic API key."
      });
      return;
    }
    
    // Clean the API key
    apiKey = cleanApiKey(apiKey);
    
    const documentText = request.documentText;
    
    // --- New Prompt (Option A) ---
    const prompt = `Please analyze the following document, which is likely related to a project description or business communication. Structure your response into exactly three sections using Markdown headings: '## Summary', '## Key Points', and '## Important Entities'.

Under '## Summary', provide a concise overview.
Under '## Key Points', create a numbered list of critical details like project name, number, location, key dates, scope highlights, and financial figures if available.
Under '## Important Entities', create a numbered list of key people, organizations, locations, or companies mentioned.

Document:
${documentText.substring(0, 4000)}${documentText.length > 4000 ? '... (truncated)' : ''}`;
    // --- End New Prompt ---
    
    // Create the request parameters
    const params = {
      model: 'claude-3-sonnet-20240229', // preferred model
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt }
      ]
    };
    
    // Get the API key from the request if provided (Note: This wasn't in original handleAnalyzeDocument, 
    // but was in handleAnthropicRequest. Keeping it consistent might be useful if you plan to allow per-request keys here too,
    // otherwise, it can be removed if only the stored key is used for analysis.)
    // const requestApiKey = request.apiKey ? cleanApiKey(request.apiKey) : null;
    // const finalApiKey = requestApiKey || apiKey; 
    // Using only the stored key for this specific function as per original logic:
    const finalApiKey = apiKey;
    
    // Make the API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': finalApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(params)
    });
    
    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Extract the text content from the response
    // Assuming the response structure is { content: [{ type: 'text', text: '...' }], usage: { ... } }
    const content = data.content && data.content.length > 0 && data.content[0].type === 'text' 
                    ? data.content[0].text 
                    : '[No text content received from API]';
    
    const usage = data.usage || { input_tokens: 'N/A', output_tokens: 'N/A' };

    console.log("Analysis API Call Successful. Usage:", usage);

    // Send the response back to the content script
    sendResponse({
      success: true,
      analysis: content, // Changed key from 'summary' to 'analysis' for clarity
      usage: usage
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    sendResponse({
      error: error.message || "Unknown error occurred"
    });
  }
}

/**
 * Handle summarize document requests
 * @param {Object} request - The request object from the content script
 * @param {Function} sendResponse - Function to send response back to content script
 */
async function handleSummarizeDocument(request, sendResponse) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['anthropic_api_key']);
    let apiKey = result.anthropic_api_key;
    
    if (!apiKey) {
      sendResponse({
        error: "API key not set. Click the extension icon to set your Anthropic API key."
      });
      return;
    }
    
    // Clean the API key
    apiKey = cleanApiKey(apiKey);
    
    const documentText = request.documentText;
    
    // Create the prompt
    const prompt = `Please provide a concise summary of the following document:

${documentText.substring(0, 4000)}${documentText.length > 4000 ? '... (truncated)' : ''}`;
    
    // Create the request parameters
    const params = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt }
      ]
    };
    
    // Make the API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(params)
    });
    
    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Extract the text content from the response
    const content = data.content[0].text;
    
    // Send the response back to the content script
    sendResponse({
      success: true,
      summary: content,
      usage: data.usage
    });
  } catch (error) {
    console.error('Error summarizing document:', error);
    sendResponse({
      error: error.message || "Unknown error occurred"
    });
  }
}

/**
 * Handle ask question requests
 * @param {Object} request - The request object from the content script
 * @param {Function} sendResponse - Function to send response back to content script
 */
async function handleAskQuestion(request, sendResponse) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['anthropic_api_key']);
    let apiKey = result.anthropic_api_key;
    
    if (!apiKey) {
      sendResponse({
        error: "API key not set. Click the extension icon to set your Anthropic API key."
      });
      return;
    }
    
    // Clean the API key
    apiKey = cleanApiKey(apiKey);
    
    const documentText = request.documentText;
    const question = request.question;
    
    // Create the prompt
    const prompt = `Based on the following document, please answer this question: "${question}"

Document:
${documentText.substring(0, 4000)}${documentText.length > 4000 ? '... (truncated)' : ''}`;
    
    // Create the request parameters
    const params = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt }
      ]
    };
    
    // Make the API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(params)
    });
    
    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Extract the text content from the response
    const content = data.content[0].text;
    
    // Send the response back to the content script
    sendResponse({
      success: true,
      answer: content,
      usage: data.usage
    });
  } catch (error) {
    console.error('Error asking question:', error);
    sendResponse({
      error: error.message || "Unknown error occurred"
    });
  }
}

/**
 * Handle direct Anthropic API requests
 * @param {Object} request - The request object from the content script
 * @param {Function} sendResponse - Function to send response back to content script
 */
async function handleAnthropicAPIRequest(request, sendResponse) {
  try {
    console.log("Handling direct Anthropic API request");
    
    // Get the API key from the request
    let apiKey = request.apiKey;
    
    if (!apiKey) {
      sendResponse({
        error: "API key not provided in the request"
      });
      return;
    }
    
    // Clean the API key
    apiKey = cleanApiKey(apiKey);
    console.log("Using cleaned API key format");
    
    // Get the endpoint and params
    const endpoint = request.endpoint || 'https://api.anthropic.com/v1/messages';
    const params = request.params;
    
    // Remove apiKey from params if it's present
    if (params.apiKey) {
      delete params.apiKey;
    }
    
    // Log the request (without sensitive data)
    const firstMessage = params.messages && params.messages[0];
    const contentPreview = firstMessage ? 
      (firstMessage.content.substring(0, 50) + '...') : 
      'No content preview available';
    
    console.log(`Making direct Anthropic API request to ${endpoint}. Content: ${contentPreview}`);
    
    // Make the API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(params)
    });
    
    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Send the response back to the content script
    sendResponse({
      data: data
    });
  } catch (error) {
    console.error('Error in direct Anthropic API request:', error);
    sendResponse({
      error: error.message || "Unknown error occurred"
    });
  }
}

// Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`CSC Project AI Enhancer installed. Reason: ${details.reason}`);
});

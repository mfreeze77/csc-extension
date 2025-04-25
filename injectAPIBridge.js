// Create the extension API bridge
window.cscProjectExtension = {
    // Flag to indicate that the extension is available
    available: true,
    
    // API call function
    callAnthropicAPI: function(params) {
      return new Promise((resolve, reject) => {
        // Create a unique ID for this request
        const requestId = 'req_' + Math.random().toString(36).substring(2, 15);
        
        // Listen for the response
        window.addEventListener('cscProjectApiDirectResponse_' + requestId, function(event) {
          if (event.detail.error) {
            reject(new Error(event.detail.error));
          } else {
            resolve(event.detail.data);
          }
        }, { once: true });
        
        // Send the request event
        window.dispatchEvent(new CustomEvent('cscProjectApiDirectRequest', {
          detail: {
            requestId: requestId,
            params: params
          }
        }));
        
        // Set a timeout
        setTimeout(() => {
          reject(new Error('API request timed out'));
        }, 30000);
      });
    },
    
    // File reading function
    readFile: function(path) {
      return new Promise((resolve, reject) => {
        // Create a unique ID for this request
        const requestId = 'file_' + Math.random().toString(36).substring(2, 15);
        
        // Listen for the response
        window.addEventListener('cscProjectFileResponse_' + requestId, function(event) {
          if (event.detail.error) {
            reject(new Error(event.detail.error));
          } else {
            resolve(event.detail.content);
          }
        }, { once: true });
        
        // Send the file read request event
        window.dispatchEvent(new CustomEvent('cscProjectFileRequest', {
          detail: {
            requestId: requestId,
            path: path
          }
        }));
        
        // Set a timeout
        setTimeout(() => {
          reject(new Error('File read request timed out'));
        }, 10000);
      });
    },
    
    // Directory scanning function
    scanDirectory: function(path) {
      return new Promise((resolve, reject) => {
        // Create a unique ID for this request
        const requestId = 'dirscan_' + Math.random().toString(36).substring(2, 15);
        
        // Listen for the response from the content script
        window.addEventListener('cscProjectDirectoryScanResponse_' + requestId, function(event) {
          if (event.detail.error) {
            console.error("Extension scanDirectory error:", event.detail.error);
            reject(new Error(event.detail.error));
          } else {
            console.log("Extension scanDirectory success:", event.detail.files);
            resolve(event.detail.files);
          }
        }, { once: true });
        
        // Send the directory scan request event to the content script
        console.log(`Dispatching directory scan request event for path: ${path}, ID: ${requestId}`);
        window.dispatchEvent(new CustomEvent('cscProjectDirectoryScanRequest', {
          detail: {
            requestId: requestId,
            path: path // Pass the correctly resolved path
          }
        }));
        
        // Set a timeout
        setTimeout(() => {
          // Check if the listener was removed (meaning response received)
          // This is a bit hacky, ideally Promises handle timeouts better
          // If the listener still exists, it means we timed out
          // We might need a more robust timeout mechanism if this is unreliable
          reject(new Error('Directory scan request timed out')); 
        }, 15000); // Increased timeout for potentially slower FS operations
      });
    }
};

console.log("CSC Project AI Enhancer: API bridge injected successfully");

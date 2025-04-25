# CSC Project AI Enhancer

A Chrome extension that fixes CORS issues when using Anthropic's Claude API with CSC project documentation HTML files. This extension allows users to analyze documents, generate summaries, and ask questions about project documentation using Anthropic's Claude models directly from local HTML files.

## Features

- **Document Analysis**: Analyze project documents to extract key information
- **Document Summarization**: Generate concise summaries of project documents
- **Question Answering**: Ask specific questions about project documents
- **Automatic Integration**: Seamlessly integrates with existing CSC project HTML files
- **Secure API Key Management**: Each user manages their own Anthropic API key

## Installation

### For Developers

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the `csc-project-extension` folder
5. The extension should now be installed and visible in your extensions list

### For End Users

1. Obtain the `csc-project-extension.zip` file from your administrator
2. Extract the ZIP file to a location on your computer
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" using the toggle in the top-right corner
5. Click "Load unpacked" and select the extracted `csc-project-extension` folder
6. The extension should now be installed and visible in your extensions list

## Setup

1. Click on the CSC Project AI Enhancer icon in your Chrome toolbar
2. Enter your Anthropic API key in the popup
3. Click "Save" to store your API key securely in your browser

## Usage

1. Open any CSC project HTML file in Chrome
2. The extension will automatically detect the file and add AI capabilities
3. Use the AI features in the "AI Assistant" section:
   - Select a document from the dropdown
   - Click "Analyze Document" to get a detailed analysis
   - Click "Summarize Document" to get a concise summary
   - Enter a question and click "Ask Question" to get an answer based on the document

## How It Works

The extension works by:

1. Detecting when you open a CSC project HTML file
2. Intercepting Anthropic API calls from the page
3. Routing the calls through the extension to avoid CORS issues
4. Returning the API responses back to the page

## Security Considerations

- Your Anthropic API key is stored securely in your browser's local storage
- The key is only used for API calls from your browser
- The extension does not send your key or project data to any third-party servers
- All API calls are made directly to Anthropic's API from your browser

## Note on HTML Files

This extension is designed to work with the existing CSC project HTML files without requiring any modifications. It automatically detects the Anthropic API integration and intercepts the API calls to fix CORS issues.

The extension works with HTML files that:
1. Have an `.ai-container` element
2. Use the Anthropic Claude API for AI features
3. Are opened directly from the filesystem (file:// protocol)

## Troubleshooting

- **Extension not working**: Make sure you have set your Anthropic API key in the extension popup
- **API errors**: Check that your Anthropic API key is valid and has sufficient credits
- **No documents found**: Make sure your HTML file contains links to documents (PDF, DOCX, TXT, etc.)
- **CORS issues persist**: Make sure you're opening the HTML file in Chrome with the extension installed

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `background.js`: Background script for API calls
- `content.js`: Content script injected into HTML files
- `popup.html/css/js`: Extension popup UI
- `icons/`: Extension icons

### Building the Extension

To build the extension for distribution:

1. Zip the contents of the `csc-project-extension` folder
2. Rename the ZIP file to `csc-project-extension.zip`
3. Distribute to users

## License

This extension is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

© 2025 Control Service Company

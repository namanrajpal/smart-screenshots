// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Screenshots extension installed!");

  // Initialize default settings
  chrome.storage.sync.get('settings', (data) => {
    if (!data.settings) {
      chrome.storage.sync.set({
        settings: {
          apiKey: '',
          serverUrl: 'http://localhost:5000',
          folderStructure: 'Screenshots/[Type]/[Month]/[Name]',
          saveLocation: 'Downloads'
        }
      });
    }
  });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    captureVisibleTab();
  }
  return true;
});

// Function to capture the visible tab
function captureVisibleTab() {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    // Send the screenshot to the local processing server
    sendToLocalServer(dataUrl);
  });
}

// Function to send the screenshot to the local server
function sendToLocalServer(dataUrl) {
  chrome.storage.sync.get('settings', (data) => {
    const settings = data.settings || {};
    const serverUrl = settings.serverUrl || 'http://localhost:5000';

    fetch(`${serverUrl}/process-screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: dataUrl,
        apiKey: settings.apiKey,
        folderStructure: settings.folderStructure
      })
    })
      .then(response => response.json())
      .then(data => {
        console.log('Screenshot processed:', data);
        // Notify the popup about the processed screenshot
        chrome.runtime.sendMessage({
          action: 'screenshotProcessed',
          result: data
        });
      })
      .catch(error => {
        console.error('Error processing screenshot:', error);
        chrome.runtime.sendMessage({
          action: 'screenshotError',
          error: error.message
        });
      });
  });
}
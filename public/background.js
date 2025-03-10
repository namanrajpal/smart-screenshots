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

// Create an offscreen document for image processing
async function createOffscreenDocumentIfNeeded() {
  // Simplified version that doesn't use getContexts()
  try {
    // Try to create the offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Need to process images using canvas API'
    });
    console.log("Offscreen document created for image processing");
  } catch (error) {
    // If error contains "context already exists", we can proceed
    if (error.message && error.message.includes("already exists")) {
      console.log("Offscreen document already exists, reusing it");
      return;
    }
    console.error("Error creating offscreen document:", error);
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    captureVisibleTab();
    // Don't return true unless using sendResponse
  } else if (message.action === 'initiateAreaSelection') {
    initiateAreaSelection(message.tabId);
    // Don't return true unless using sendResponse
  } else if (message.action === 'captureSelectedArea') {
    captureSelectedArea(message.area);
    // Don't return true unless using sendResponse
  } else if (message.action === 'croppedImageReady') {
    sendToLocalServer(message.croppedDataUrl);
    // Don't return true unless using sendResponse
  }
});

// Function to capture the visible tab
function captureVisibleTab() {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    sendToLocalServer(dataUrl);
  });
}

// Function to initiate area selection in the content script
function initiateAreaSelection(tabId) {
  // Inject the content script first to ensure it's available
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ['content.js']
    },
    () => {
      // After ensuring the content script is loaded, send the message
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'initAreaSelection' });
      }, 100); // Small delay to ensure script is fully loaded
    }
  );
}

// Function to capture a selected area
async function captureSelectedArea(area) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
    try {
      // Create the offscreen document for image processing
      await createOffscreenDocumentIfNeeded();

      // Send the data to the offscreen document for processing
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'cropImage',
        dataUrl: dataUrl,
        area: area
      });
    } catch (error) {
      console.error("Error processing screenshot:", error);
    }
  });
}

// Function to send the screenshot to the local server
function sendToLocalServer(dataUrl) {
  // For testing without a server, just save the image directly
  console.log("Image processed successfully. Would normally send to server.");

  chrome.downloads.download({
    url: dataUrl,
    filename: 'smart-screenshot-' + new Date().getTime() + '.png',
    saveAs: false
  }, (downloadId) => {
    console.log("Screenshot saved with ID:", downloadId);

    // Notify the popup about the processed screenshot
    chrome.runtime.sendMessage({
      action: 'screenshotProcessed',
      result: {
        name: 'Screenshot_' + new Date().toLocaleString()
      }
    });
  });

  /*
  // Original server code - uncomment when you have a server running
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
  */
}
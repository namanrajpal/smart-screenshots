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

  // Initialize screenshot history
  chrome.storage.local.get('screenshotHistory', (data) => {
    if (!data.screenshotHistory) {
      chrome.storage.local.set({ screenshotHistory: [] });
    }
  });

  // Request notification permission
  if (chrome.notifications) {
    chrome.notifications.getPermissionLevel((level) => {
      console.log("Notification permission level:", level);
    });
  }
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
  } else if (message.action === 'captureSelectedArea') {
    captureSelectedArea(message.area);
  } else if (message.action === 'croppedImageReady') {
    sendToLocalServer(message.croppedDataUrl);
  } else if (message.action === 'openScreenshot') {
    // Open file explorer to show the screenshot
    openScreenshotLocation(message.downloadId);
  }
});

// Function to capture the visible tab
function captureVisibleTab() {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    sendToLocalServer(dataUrl);
  });
}

function openScreenshotLocation(downloadId) {
  // Use the downloads API to open the file if we have a downloadId
  if (downloadId && chrome.downloads) {
    chrome.downloads.show(parseInt(downloadId));
  } else {
    // If no download ID or API not available, show a notification
    showNotification(
      'Open File Location',
      'Use the Downloads page to find your screenshot',
      'FILE_LOCATION'
    );

    // Open Downloads page
    chrome.downloads.showDefaultFolder();
  }
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

  // For testing without a server, just save the image directly
  const screenshotName = 'smart-screenshot-' + new Date().getTime() + '.png';
  const timestamp = new Date().getTime();

  chrome.downloads.download({
    url: dataUrl,
    filename: screenshotName,
    saveAs: false
  }, (downloadId) => {
    console.log("Screenshot saved with ID:", downloadId);

    // Add to history with what we know for sure
    const screenshotInfo = {
      name: screenshotName,
      timestamp: timestamp,
      downloadId: downloadId,
    };

    console.log("Updating screenshot history:", screenshotInfo);

    // Add to history
    updateScreenshotHistory(screenshotInfo);

    // Show notification
    showScreenshotSavedNotification(screenshotName, downloadId);

    // Notify the popup about the processed screenshot
    chrome.runtime.sendMessage({
      action: 'screenshotProcessed',
      result: {
        name: screenshotName,
        downloadId: downloadId
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

function updateScreenshotHistory(screenshotInfo) {
  chrome.storage.local.get('screenshotHistory', (data) => {
    let history = data.screenshotHistory || [];

    // Add new screenshot to the beginning of the array
    history.unshift(screenshotInfo);

    // Limit history to most recent 20 items
    if (history.length > 20) {
      history = history.slice(0, 20);
    }

    // Save updated history
    chrome.storage.local.set({ screenshotHistory: history }, () => {
      // Notify popup that history has been updated
      chrome.runtime.sendMessage({ action: 'historyUpdated' });
    });
  });
}

// Function to show notification when screenshot is saved
function showScreenshotSavedNotification(name, path) {
  showNotification(
    'Screenshot Saved',
    'Your screenshot has been saved as: ' + name,
    'SCREENSHOT_SAVED',
    path
  );
}

// Generic notification function
function showNotification(title, message, type, contextData) {
  if (!chrome.notifications) {
    console.log("Notifications not available");
    return;
  }

  const notificationId = type + '_' + new Date().getTime();

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icon128.png',
    title: title,
    message: message,
    buttons: [{ title: 'Open Location' }],
    requireInteraction: false,
    priority: 1
  });

  // Store context data for button clicks
  if (contextData) {
    chrome.storage.local.set({ [notificationId]: contextData });
  }
}

if (chrome.notifications) {
  // Handle clicking on the notification
  chrome.notifications.onClicked.addListener((notificationId) => {
    handleNotificationClick(notificationId);
  });

  // Handle clicking the action button
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) { // "Open Location" button
      handleNotificationClick(notificationId);
    }
  });
}

// Handle notification click events
function handleNotificationClick(notificationId) {
  // Get the stored context data
  chrome.storage.local.get(notificationId, (data) => {
    const contextData = data[notificationId];
    if (!contextData) return;

    if (notificationId.startsWith('SCREENSHOT_SAVED_')) {
      // For screenshot saved notifications, open file in explorer
      chrome.downloads.show(parseInt(contextData));
    } else if (notificationId.startsWith('FILE_LOCATION_')) {
      // For file location notifications, show in folder
      chrome.downloads.showDefaultFolder();
    }
    chrome.storage.local.remove(notificationId);
    chrome.notifications.clear(notificationId);
  });
}
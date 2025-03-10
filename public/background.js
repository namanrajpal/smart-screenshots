chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Screenshots extension installed!");

  // Initialize default settings
  chrome.storage.sync.get('settings', (data) => {
    if (!data.settings) {
      chrome.storage.sync.set({
        settings: {
          apiKey: '',
          folderStructure: 'Screenshots/[Type]/[Month]/[Name]',
          saveLocation: 'Downloads',
          compressionLevel: 'medium', // Setting for image compression
          aiEnabled: true            // Toggle AI features
        }
      });
    }
  });

  // Initialize screenshots metadata storage
  chrome.storage.local.get('screenshotMetadata', (data) => {
    if (!data.screenshotMetadata) {
      chrome.storage.local.set({ screenshotMetadata: [] });
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
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Need to process images using canvas API'
    });
    console.log("Offscreen document created for image processing");
  } catch (error) {
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
  } else if (message.action === 'initiateAreaSelection') {
    initiateAreaSelection(message.tabId);
  } else if (message.action === 'croppedImageReady') {
    processScreenshot(message.croppedDataUrl);
  } else if (message.action === 'openScreenshot') {
    openScreenshotLocation(message.downloadId);
  } else if (message.action === 'prepareForCapture') {
    console.log("Preparing for capture with area:", message.area);
    chrome.storage.local.set({ 'pendingCaptureArea': message.area });
    return false;
  } else if (message.action === 'captureSelectedArea') {
    chrome.storage.local.get('pendingCaptureArea', (data) => {
      const area = data.pendingCaptureArea || message.area;
      captureSelectedArea(area);
      chrome.storage.local.remove('pendingCaptureArea');
    });
    return false;
  }
});

// Function to capture the visible tab
function captureVisibleTab() {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    processScreenshot(dataUrl);
  });
}

function openScreenshotLocation(downloadId) {
  if (downloadId && chrome.downloads) {
    chrome.downloads.show(parseInt(downloadId));
  } else {
    showNotification(
      'Open File Location',
      'Use the Downloads page to find your screenshot',
      'FILE_LOCATION'
    );
    chrome.downloads.showDefaultFolder();
  }
}

// Function to initiate area selection in the content script
function initiateAreaSelection(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ['content.js']
    },
    () => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'initAreaSelection' });
      }, 100);
    }
  );
}

async function captureSelectedArea(area) {
  try {
    await createOffscreenDocumentIfNeeded();

    setTimeout(() => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Error capturing tab:", chrome.runtime.lastError);
          notifyError(chrome.runtime.lastError);
          return;
        }

        try {
          chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'cropImage',
            dataUrl: dataUrl,
            area: area
          });
        } catch (error) {
          console.error("Error sending to offscreen document:", error);
          notifyError(error.message);
        }
      });
    }, 50);
  } catch (error) {
    console.error("Error in captureSelectedArea:", error);
    notifyError(error.message);
  }
}

// Process screenshot - main function that handles AI analysis and saving
async function processScreenshot(dataUrl) {
  try {
    chrome.runtime.sendMessage({
      action: 'processingStatus',
      status: 'Processing screenshot...'
    });

    // Get settings
    const data = await new Promise(resolve =>
      chrome.storage.sync.get('settings', resolve)
    );
    const settings = data.settings || {};

    // Check if AI is enabled and API key exists
    if (settings.aiEnabled && settings.apiKey) {
      // Notify processing status
      chrome.runtime.sendMessage({
        action: 'processingStatus',
        status: 'Analyzing with AI...'
      });

      try {
        // Compress image if needed
        const processedDataUrl = compressImageIfNeeded(dataUrl, settings.compressionLevel);

        // Analyze the screenshot with OpenAI Vision
        const analysis = await analyzeScreenshotWithAI(processedDataUrl, settings.apiKey);

        // Save with AI analysis results
        saveScreenshotWithMetadata(dataUrl, analysis, settings.folderStructure);
      } catch (error) {
        console.error("AI analysis error:", error);
        chrome.runtime.sendMessage({
          action: 'processingStatus',
          status: `AI Analysis Failed with error ${error.message}`
        });
        // Fall back to basic save if AI fails
        saveBasicScreenshot(dataUrl);
      }
    } else {
      // Basic save without AI
      saveBasicScreenshot(dataUrl);
    }
  } catch (error) {
    console.error("Error processing screenshot:", error);
    notifyError(error.message);
  }
}

// Analyze screenshot with OpenAI Vision API
// Analyze screenshot with OpenAI Vision API
async function analyzeScreenshotWithAI(imageDataUrl, apiKey) {
  try {
    // Validate and extract base64 data
    if (typeof imageDataUrl !== 'string') {
      console.error("Invalid dataUrl type:", typeof imageDataUrl);
      throw new Error("Image data is not a valid string");
    }

    if (!imageDataUrl.includes(',')) {
      console.error("DataUrl doesn't contain expected format");
      console.log("DataUrl prefix:", imageDataUrl.substring(0, 50));
      throw new Error("Invalid image data format");
    }

    const base64Image = imageDataUrl.split(',')[1];

    console.log("Sending image to OpenAI Vision API...");

    // Call OpenAI API with current format
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use a current model with vision capabilities
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this screenshot and provide the following information in JSON format: 1) title - a concise, descriptive name for this image (no quotes needed), 2) category - the type of content (e.g., receipt, document, web page, social media, code, chart, etc.)"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: "low" // Use low detail to reduce token usage
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", response.status, response.statusText, errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    // Parse the response
    const responseData = await response.json();
    console.log("OpenAI response received:", responseData);

    // Added more robust error handling
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error("Unexpected API response format:", responseData);
      throw new Error("Invalid API response format");
    }

    const responseContent = responseData.choices[0].message.content;
    let analysisData;

    try {
      analysisData = JSON.parse(responseContent);
    } catch (error) {
      console.error("Failed to parse JSON response:", responseContent);
      throw new Error("Invalid JSON response from API");
    }

    console.log("Parsed analysis data:", analysisData);

    return {
      title: analysisData.title || "Screenshot",
      category: analysisData.category || "Other",
      date: new Date(),
      aiGenerated: true
    };
  } catch (error) {
    console.error("Error analyzing with AI:", error);
    throw error;
  }
}
// Compress image based on compression level setting
function compressImageIfNeeded(dataUrl, compressionLevel) {
  //TODO(namanrajpal)
  return dataUrl;
}

// Save screenshot with AI-generated metadata and folder structure
async function saveScreenshotWithMetadata(dataUrl, analysis, folderTemplate) {
  try {
    // Format date components
    const date = analysis.date;
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear().toString();

    // Create folder path from template
    let folderPath = folderTemplate
      .replace('[Type]', analysis.category)
      .replace('[Month]', month)
      .replace('[Year]', year);

    // Sanitize the title for use in filenames
    const sanitizedTitle = analysis.title.replace(/[\\/:*?"<>|]/g, '_');

    // Create the complete filename path
    // TODO(namanrajpal) : Folders have to exist already
    // const filename = `${folderPath}/${sanitizedTitle}.png`;
    const filename = `${sanitizedTitle}.png`;
    const timestamp = Date.now();

    // Save the file
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, async (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download error:", chrome.runtime.lastError);
        notifyError("Failed to save screenshot");
        return;
      }

      // Create metadata object
      const metadata = {
        id: timestamp,
        downloadId: downloadId,
        filename: filename,
        title: analysis.title,
        category: analysis.category,
        date: date.toISOString(),
        virtualPath: folderPath,
        aiGenerated: analysis.aiGenerated || false
      };

      // Store in both metadata and history
      await storeScreenshotMetadata(metadata);

      updateScreenshotHistory({
        name: sanitizedTitle,
        timestamp: timestamp,
        downloadId: downloadId,
        category: analysis.category,
        virtualPath: folderPath
      });

      // Show notification
      showScreenshotSavedNotification(sanitizedTitle, downloadId);

      // Notify success
      chrome.runtime.sendMessage({
        action: 'screenshotProcessed',
        result: {
          name: analysis.title,
          category: analysis.category,
          path: filename,
          downloadId: downloadId
        }
      });
    });
  } catch (error) {
    console.error("Error saving screenshot:", error);
    // Fall back to basic save
    saveBasicScreenshot(dataUrl);
  }
}

// Store metadata for organization
async function storeScreenshotMetadata(metadata) {
  const data = await new Promise(resolve =>
    chrome.storage.local.get('screenshotMetadata', resolve)
  );
  const metadataArray = data.screenshotMetadata || [];

  // Add new metadata to beginning
  metadataArray.unshift(metadata);

  // Limit to 500 entries
  if (metadataArray.length > 500) {
    metadataArray.splice(500);
  }

  await chrome.storage.local.set({ 'screenshotMetadata': metadataArray });
}

// Basic screenshot save without AI
function saveBasicScreenshot(dataUrl) {
  console.log("Saving basic screenshot");
  const timestamp = new Date();
  const screenshotName = 'smart-screenshot-' + timestamp.getTime() + '.png';

  chrome.downloads.download({
    url: dataUrl,
    filename: screenshotName,
    saveAs: false
  }, (downloadId) => {
    console.log("Screenshot saved with ID:", downloadId);

    // Add to history with what we know for sure
    const screenshotInfo = {
      name: screenshotName,
      timestamp: timestamp.getTime(),
      downloadId: downloadId,
    };

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
}

function notifyError(message) {
  chrome.runtime.sendMessage({
    action: 'screenshotError',
    error: message
  });
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
function showScreenshotSavedNotification(name, downloadId) {
  showNotification(
    'Screenshot Saved',
    'Your screenshot has been saved as: ' + name,
    'SCREENSHOT_SAVED',
    downloadId
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
// offscreen.js
console.log("Offscreen document loaded");

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen' && message.action === 'cropImage') {
    console.log("Offscreen received cropImage request");
    cropImage(message.dataUrl, message.area);
    //return true;
  }
});

// Function to crop the image
function cropImage(dataUrl, area) {
  console.log("Starting image cropping");
  
  const img = new Image();
  
  img.onload = function() {
    console.log("Image loaded successfully");
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Account for device pixel ratio
    const dpr = area.devicePixelRatio || 1;
    
    canvas.width = area.width * dpr;
    canvas.height = area.height * dpr;
    
    try {
      // Draw the cropped image
      ctx.drawImage(
        img,
        area.x * dpr,
        area.y * dpr,
        area.width * dpr,
        area.height * dpr,
        0,
        0,
        area.width * dpr,
        area.height * dpr
      );
      
      // Get the data URL from the canvas
      const croppedDataUrl = canvas.toDataURL('image/png');
      console.log("Image cropped successfully");
      
      // Send the cropped image back to the background script
      chrome.runtime.sendMessage({
        action: 'croppedImageReady',
        croppedDataUrl: croppedDataUrl
      });
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };
  
  img.onerror = function(error) {
    console.error("Error loading image:", error);
  };
  
  // Set the source to the data URL to load the image
  img.src = dataUrl;
}

// Keep the offscreen document alive - this is required for Manifest V3
const keepAlive = setInterval(() => {
  console.log("Keeping offscreen document alive");
}, 25000);

// Close the offscreen document when it's no longer needed
// This would be triggered by a message from the background script
function closeOffscreenDocument() {
  clearInterval(keepAlive);
  window.close();
}
// content.js
console.log('Smart Screenshots content script loaded');

let isSelecting = false;
let startX = 0;
let startY = 0;
let overlay = null;
let selection = null;

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);

    if (message.action === 'ping') {
        console.log("Ping received, replying with pong");
        sendResponse({ status: 'ok' });
        return true;
    }

    if (message.action === 'initAreaSelection') {
        console.log("Initializing area selection");
        initializeAreaSelection();
        return true;
    }
});

function initializeAreaSelection() {
    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'smart-screenshots-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    overlay.style.zIndex = '2147483647'; // Max z-index
    overlay.style.cursor = 'crosshair';

    // Create selection element
    selection = document.createElement('div');
    selection.id = 'smart-screenshots-selection';
    selection.style.position = 'fixed';
    selection.style.border = '2px dashed #4285f4';
    selection.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
    selection.style.display = 'none';
    selection.style.zIndex = '2147483647';

    // Add instruction label
    const instructions = document.createElement('div');
    instructions.id = 'smart-screenshots-instructions';
    instructions.style.position = 'fixed';
    instructions.style.top = '10px';
    instructions.style.left = '50%';
    instructions.style.transform = 'translateX(-50%)';
    instructions.style.padding = '8px 12px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    instructions.style.color = 'white';
    instructions.style.borderRadius = '4px';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '14px';
    instructions.style.zIndex = '2147483648';
    instructions.textContent = 'Click and drag to select an area. Press ESC to cancel.';

    // Append elements to body
    document.body.appendChild(overlay);
    document.body.appendChild(selection);
    document.body.appendChild(instructions);

    // Add event listeners
    overlay.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    // Prevent scrolling
    document.body.style.overflow = 'hidden';
}

// Mouse event handlers for area selection
function handleMouseDown(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0';
    selection.style.height = '0';
    selection.style.display = 'block';
}

function handleMouseMove(e) {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    // Calculate dimensions
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Calculate position (handle selection in any direction)
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);

    // Update selection element
    selection.style.left = left + 'px';
    selection.style.top = top + 'px';
    selection.style.width = width + 'px';
    selection.style.height = height + 'px';
}

function handleMouseUp(e) {
    if (!isSelecting) return;
    isSelecting = false;

    // Get the final selection dimensions
    const rect = selection.getBoundingClientRect();

    // Store the selection area
    const selectedArea = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: window.devicePixelRatio || 1
    };

    // Check if selection is large enough
    if (rect.width > 10 && rect.height > 10) {
        console.log("Sending selected area to background script:", selectedArea);

        // First signal that we're about to capture
        chrome.runtime.sendMessage({
            action: 'prepareForCapture',
            area: selectedArea
        });

        // Clean up the overlay
        cleanupAreaSelection();

        // Wait a short time to ensure the overlay is fully removed
        // before the actual screenshot is taken
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: 'captureSelectedArea',
                area: selectedArea
            });
        }, 100); // 100ms delay should be enough for the DOM to update
    } else {
        // If selection is too small, just clean up without capturing
        cleanupAreaSelection();
    }
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        console.log("ESC pressed, canceling area selection");
        cleanupAreaSelection();
    }
}

function cleanupAreaSelection() {
    // Remove elements
    if (overlay) document.body.removeChild(overlay);
    if (selection) document.body.removeChild(selection);

    const instructions = document.getElementById('smart-screenshots-instructions');
    if (instructions) document.body.removeChild(instructions);

    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);

    // Restore scrolling
    document.body.style.overflow = '';

    // Reset state
    isSelecting = false;
    overlay = null;
    selection = null;

    console.log("Area selection cleaned up");
}
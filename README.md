
## Project Overview

A Chrome extension that captures screenshots, analyzes them with AI, and saves them with semantic names and organized folder structure
Built with React for the UI and will use a Python backend service to handle image processing with OpenAI's Vision API

#### Main Components Implemented

smart-screenshots/
├── manifest.json - Chrome extension manifest file 
├── background.js - Handles background tasks and screenshot capturing
├── content.js - Handles area selection overlay
├── React components for UI
    ├── Popup UI - Screenshot buttons and status display
    ├── Options UI - Settings for API key, folder structure, etc.

#### React based Chrome Extension Setup

Used create-react-app with react-app-rewired to customize the build process
Modified build process to create separate entry points for popup and options pages
Post-build script to create the proper Chrome extension file structure

### Key Features

#### Screenshot Capture

Capture visible area of the current tab
Area selection with a visual overlay (similar to macOS/Ubuntu)

#### Settings Management

provide OpenAI API key 
Local server URL configuration
Folder structure template customization

## Project Structure

src/
├── components/
│   ├── Popup/
│   │   ├── CaptureButtons.js
│   │   ├── StatusDisplay.js
│   │   └── Popup.js
│   └── Options/
│       ├── ApiKeyInput.js
│       ├── FolderStructureInput.js
│       ├── ServerUrlInput.js
│       └── Options.js
├── contexts/
│   └── SettingsContext.js
├── pages/
│   ├── PopupPage.js
│   └── OptionsPage.js
├── utils/
│   ├── chromeUtils.js
│   └── screenshotUtils.js
├── App.js
├── index.js
├── options-index.js
└── index.css

```mermaid
flowchart TB
    subgraph "Chrome Extension"
        subgraph "Frontend"
            popup[React Popup UI]
            options[Options Page]
        end

        subgraph "Background"
            bg[Background Script\nManages core functionality]
        end

        subgraph "Content"
            cs[Content Script\nHandles area selection]
        end

        subgraph "Processing"
            off[Offscreen Document - Does image processing]
        end
    end

    subgraph "User Interface"
        browser[Chrome Browser]
        storage[Chrome Storage\nSettings & Data]
    end

    subgraph "Backend Service"
        server[Python Server - AI Image Analysis]
        disk[File System - Saves organized screenshots]
    end

    popup --> |1 User initiates capture| bg
    bg -->|2 Inject & activate| cs
    cs -->|3 Selection coordinates| bg
    bg -->|4 Capture screenshot| browser
    browser -->|5 Sends image data| bg
    bg -->|6 Image for processing| off
    off -->|7 Cropped image| bg
    bg -->|8 Send to server| server
    server -->|9 Process with AI| server
    server -->|10 Save organized file| disk
    server -->|11 Return metadata| bg
    bg -->|12 Notify completion| popup
    options -->|Configure settings| storage
    bg -->|Read settings| storage

    classDef react fill:#61dafb,color:black,stroke:#61dafb
    classDef chrome fill:#4285F4,color:white
    classDef python fill:#306998,color:white
    classDef content fill:#0F9D58,color:white
    classDef offscreen fill:#F4B400,color:black
    
    class popup,options react
    class bg,browser,storage chrome
    class server,disk python
    class cs content
    class off offscreen
```

```mermaid
sequenceDiagram
    participant Popup as Popup Component (React)
    participant Background as background.js
    participant Content as content.js
    participant Offscreen as offscreen.js
    
    Note over Popup,Offscreen: Capture Area Flow
    
    Popup->>Background: chrome.runtime.sendMessage({action: 'initiateAreaSelection', tabId: tabs[0].id})
    Note right of Popup: User clicks "Capture Area" button
    
    Background->>Background: initiateAreaSelection(tabId)
    
    Background->>Content: chrome.scripting.executeScript({files: ['content.js']})
    Note right of Background: Ensures content script is loaded
    
    Background->>Content: chrome.tabs.sendMessage({action: 'initAreaSelection'})
    Note right of Background: Tells content script to show selection UI
    
    Content->>Content: initializeAreaSelection()
    Note right of Content: Creates overlay for area selection
    
    Note over Content: User draws selection rectangle
    
    Content->>Background: chrome.runtime.sendMessage({action: 'captureSelectedArea', area: {...}})
    Note right of Content: After user completes selection
    
    Background->>Background: captureSelectedArea(area)
    
    Background->>Background: chrome.tabs.captureVisibleTab()
    Note right of Background: Captures full screenshot
    
    Background->>Background: createOffscreenDocumentIfNeeded()
    Note right of Background: Creates offscreen document if it doesn't exist
    
    Background->>Offscreen: chrome.runtime.sendMessage({target: 'offscreen', action: 'cropImage', dataUrl, area})
    Note right of Background: Sends screenshot and area to crop
    
    Offscreen->>Offscreen: cropImage(dataUrl, area)
    Note right of Offscreen: Processes image using canvas API
    
    Offscreen->>Background: chrome.runtime.sendMessage({action: 'croppedImageReady', croppedDataUrl})
    Note right of Offscreen: Returns cropped image
    
    Background->>Background: sendToLocalServer(croppedDataUrl)
    Note right of Background: Processes the cropped image
    
    Background->>Popup: chrome.runtime.sendMessage({action: 'screenshotProcessed', result})
    Note right of Background: Notifies popup of completion
    
    Note over Popup,Offscreen: Error Handling
    
    Background->>Popup: chrome.runtime.sendMessage({action: 'screenshotError', error})
    Note right of Background: If any error occurs during processing
```


## Testing 

### During Development (React Development Mode)

#### Run the development server:
```bash
npm start
```

This will start the React development server, typically at http://localhost:3000. While this environment doesn't fully emulate the Chrome extension context, it's useful for rapidly developing and testing your UI components.
Test React components:

You can test the basic functionality of your React components
The popup and options UI will be visible in the browser
Note that Chrome extension APIs (like chrome.storage or chrome.tabs) won't work in this environment



### Testing the Actual Chrome Extension

#### Build the extension:
```bash
npm run build
```
This creates the production build in the build directory, structured as a Chrome extension.
Load the extension in Chrome:

Open Chrome and navigate to chrome://extensions/
- Enable "Developer mode" using the toggle in the top-right corner
- Click "Load unpacked"
- Select your project's build directory


#### Test the extension functionality:

- Click on the extension icon in Chrome's toolbar to open the popup
- Test the "Capture Visible Area" and "Select Area" buttons
- Access the options page by right-clicking the extension icon and selecting "Options" (or via the link in your popup)
- Verify that screenshots are being captured correctly
- Check that your local backend server is receiving the screenshots (when you implement that part)



### Debugging

#### View extension logs:

Open Chrome DevTools for the extension by right-clicking the extension popup and selecting "Inspect"
Watch the console for log messages and errors

#### Inspect the background page:

In chrome://extensions/, find your extension and click "service worker" under "Inspect views"
This opens DevTools for the background script

#### View content script logs:

Open the DevTools for any page where your content script is active
Your content script logs will appear in that page's console

#### Reload the extension:

After making changes and rebuilding, click the refresh icon in chrome://extensions/ to reload your extension
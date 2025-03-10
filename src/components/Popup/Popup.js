// src/components/Popup/Popup.js
import React, { useState, useContext, useEffect } from 'react';
import CaptureButtons from './CaptureButtons';
import StatusDisplay from './StatusDisplay';
import ScreenshotHistory from './ScreenshotHistory';
import { SettingsContext } from '../../contexts/SettingsContext';
import './Popup.css';

const Popup = () => {
  const { settings, loading } = useContext(SettingsContext);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const handleCaptureVisible = () => {
    if (!settings.apiKey) {
      setStatus('Please set your OpenAI API key in Settings');
      return;
    }

    setStatus('Capturing visible area...');
    setProcessing(true);

    // Send message to background script to capture screenshot
    chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    window.close();
  };

  const handleCaptureArea = () => {
    if (!settings.apiKey) {
      setStatus('Please set your OpenAI API key in Settings');
      return;
    }

    setStatus('Select an area to capture...');
    setProcessing(true);

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        console.log("Initiating area selection for tab:", tabs[0].id);
        // Send message to background script to initiate area selection
        chrome.runtime.sendMessage({
          action: 'initiateAreaSelection',
          tabId: tabs[0].id
        });
        window.close();
      } else {
        setStatus('Error: Could not get current tab');
        setProcessing(false);
      }
    });
  };

  const openOptions = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  // Listen for messages from background script
  useEffect(() => {
    const messageListener = (message) => {
      if (message.action === 'screenshotProcessed') {
        setStatus(`Screenshot saved: ${message.result.name}`);
        setProcessing(false);
      } else if (message.action === 'screenshotError') {
        setStatus(`Error: ${message.error}`);
        setProcessing(false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="popup">
      <h1>Smart Screenshots</h1>

      <CaptureButtons
        onCaptureVisible={handleCaptureVisible}
        onCaptureArea={handleCaptureArea}
        disabled={processing}
      />

      <StatusDisplay status={status} isError={status.startsWith('Error') || status.startsWith('Please set')} />

      <div className="popup-footer">
        <button onClick={openOptions} className="link-button">
          Settings
        </button>
        <button onClick={toggleHistory} className="link-button">
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {showHistory && <ScreenshotHistory />}
    </div>
  );
};

export default Popup;
// src/components/Popup/Popup.js
import React, { useState, useContext, useEffect } from 'react';
import CaptureButtons from './CaptureButtons';
import StatusDisplay from './StatusDisplay';
import { SettingsContext } from '../../contexts/SettingsContext';
import './Popup.css';

const Popup = () => {
  const { settings, loading } = useContext(SettingsContext);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCaptureVisible = () => {
    if (!settings.apiKey) {
      setStatus('Please set your OpenAI API key in Settings');
      return;
    }

    setStatus('Capturing visible area...');
    setProcessing(true);

    // Send message to background script to capture screenshot
    chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    window.close(); // Close the popup
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
        //window.close(); // Close the popup
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

      <div className="settings-link">
        <button onClick={openOptions} className="link-button">
          Settings
        </button>
      </div>
    </div>
  );
};

export default Popup;
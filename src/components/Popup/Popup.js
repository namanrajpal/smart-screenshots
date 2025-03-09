// src/components/Popup/Popup.js
import React, { useState, useContext } from 'react';
import CaptureButtons from './CaptureButtons';
import StatusDisplay from './StatusDisplay';
import { SettingsContext } from '../../contexts/SettingsContext';
import './Popup.css';

const Popup = () => {
  const { settings, loading } = useContext(SettingsContext);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCapture = () => {
    if (!settings.apiKey) {
      setStatus('Please set your OpenAI API key in Settings');
      return;
    }

    setStatus('Capturing...');
    setProcessing(true);

    // Send message to background script to capture screenshot
    chrome.runtime.sendMessage({ action: 'captureScreenshot' });
  };

  const openOptions = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  // Listen for messages from background script
  React.useEffect(() => {
    const messageListener = (message) => {
      if (message.action === 'screenshotProcessed') {
        setStatus(`Screenshot saved: ${message.result.filename}`);
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
        onCaptureVisible={handleCapture}
        onCaptureArea={() => setStatus('Area selection coming soon!')}
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
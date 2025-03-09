// src/components/Popup/CaptureButtons.js
import React from 'react';

const CaptureButtons = ({ onCaptureVisible, onCaptureArea, disabled }) => {
  return (
    <div className="capture-buttons">
      <button 
        onClick={onCaptureVisible} 
        className="button primary" 
        disabled={disabled}
      >
        Capture Visible Area
      </button>
      <button 
        onClick={onCaptureArea} 
        className="button secondary" 
        disabled={disabled}
      >
        Select Area
      </button>
    </div>
  );
};

export default CaptureButtons;
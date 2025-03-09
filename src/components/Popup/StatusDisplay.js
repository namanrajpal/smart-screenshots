// src/components/Popup/StatusDisplay.js
import React from 'react';

const StatusDisplay = ({ status, isError }) => {
  if (!status) return null;
  
  return (
    <div className={`status ${isError ? 'error' : 'success'}`}>
      {status}
    </div>
  );
};

export default StatusDisplay;
// src/components/Options/ApiKeyInput.js
import React, { useState } from 'react';

const ApiKeyInput = ({ value, onChange }) => {
  const [showKey, setShowKey] = useState(false);
  
  return (
    <div className="form-group">
      <label htmlFor="apiKey">OpenAI API Key:</label>
      <div className="input-with-toggle">
        <input
          type={showKey ? 'text' : 'password'}
          id="apiKey"
          name="apiKey"
          value={value}
          onChange={onChange}
          placeholder="Enter your OpenAI API key"
        />
        <button 
          type="button" 
          className="toggle-button"
          onClick={() => setShowKey(!showKey)}
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
};

export default ApiKeyInput;
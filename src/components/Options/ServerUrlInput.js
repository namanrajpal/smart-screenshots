// src/components/Options/ServerUrlInput.js
import React from 'react';

const ServerUrlInput = ({ value, onChange }) => {
  return (
    <div className="form-group">
      <label htmlFor="serverUrl">Local Server URL:</label>
      <input
        type="text"
        id="serverUrl"
        name="serverUrl"
        value={value}
        onChange={onChange}
        placeholder="http://localhost:5000"
      />
    </div>
  );
};

export default ServerUrlInput;
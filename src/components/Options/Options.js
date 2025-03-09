// src/components/Options/Options.js
import React, { useContext, useState } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import ApiKeyInput from './ApiKeyInput';
import ServerUrlInput from './ServerUrlInput';
import FolderStructureInput from './FolderStructureInput';
import './Options.css';

const Options = () => {
  const { settings, saveSettings, loading } = useContext(SettingsContext);
  const [localSettings, setLocalSettings] = useState(settings);
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalSettings({ ...localSettings, [name]: value });
  };

  const handleSave = async () => {
    await saveSettings(localSettings);
    setStatus('Settings saved successfully!');
    setTimeout(() => setStatus(''), 3000);
  };

  const handleReset = () => {
    const defaultSettings = {
      apiKey: '',
      serverUrl: 'http://localhost:5000',
      folderStructure: 'Screenshots/[Type]/[Month]/[Name]',
      saveLocation: 'Downloads'
    };
    setLocalSettings(defaultSettings);
    saveSettings(defaultSettings);
    setStatus('Settings reset to default!');
    setTimeout(() => setStatus(''), 3000);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="options">
      <h1>Smart Screenshots Settings</h1>
      
      <ApiKeyInput value={localSettings.apiKey} onChange={handleChange} />
      
      <ServerUrlInput value={localSettings.serverUrl} onChange={handleChange} />
      
      <FolderStructureInput value={localSettings.folderStructure} onChange={handleChange} />
      
      <div className="form-group">
        <label htmlFor="saveLocation">Save Location:</label>
        <select
          id="saveLocation"
          name="saveLocation"
          value={localSettings.saveLocation}
          onChange={handleChange}
        >
          <option value="Downloads">Downloads Folder</option>
          <option value="Custom">Custom Location (Coming Soon)</option>
        </select>
      </div>
      
      <div className="buttons">
        <button onClick={handleSave} className="button primary">
          Save Settings
        </button>
        <button onClick={handleReset} className="button secondary">
          Reset to Default
        </button>
      </div>
      
      {status && <div className="status">{status}</div>}
    </div>
  );
};

export default Options;
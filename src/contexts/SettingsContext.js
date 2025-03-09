// src/contexts/SettingsContext.js
import React, { createContext, useState, useEffect } from 'react';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    apiKey: '',
    serverUrl: 'http://localhost:5000',
    folderStructure: 'Screenshots/[Type]/[Month]/[Name]',
    saveLocation: 'Downloads'
  });
  const [loading, setLoading] = useState(true);

  // Load settings from Chrome storage when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      if (chrome.storage) {
        chrome.storage.sync.get('settings', (data) => {
          if (data.settings) {
            setSettings(data.settings);
          }
          setLoading(false);
        });
      } else {
        // For development outside of Chrome extension
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to Chrome storage
  const saveSettings = async (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    if (chrome.storage) {
      chrome.storage.sync.set({ settings: updatedSettings });
    }
    
    return updatedSettings;
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
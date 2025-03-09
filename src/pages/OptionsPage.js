// src/pages/OptionsPage.js
import React from 'react';
import Options from '../components/Options/Options';
import { SettingsProvider } from '../contexts/SettingsContext';

const OptionsPage = () => {
  return (
    <SettingsProvider>
      <div className="options-container">
        <Options />
      </div>
    </SettingsProvider>
  );
};

export default OptionsPage;
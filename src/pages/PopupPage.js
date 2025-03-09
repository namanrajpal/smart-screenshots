// src/pages/PopupPage.js
import React from 'react';
import Popup from '../components/Popup/Popup';
import { SettingsProvider } from '../contexts/SettingsContext';

const PopupPage = () => {
  return (
    <SettingsProvider>
      <div className="popup-container">
        <Popup />
      </div>
    </SettingsProvider>
  );
};

export default PopupPage;
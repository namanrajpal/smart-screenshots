import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import OptionsPage from './pages/OptionsPage';

// This will initialize when options.html is opened
document.addEventListener('DOMContentLoaded', () => {
  const optionsRoot = document.getElementById('options-root');
  if (optionsRoot) {
    const root = ReactDOM.createRoot(optionsRoot);
    root.render(
      <React.StrictMode>
        <OptionsPage />
      </React.StrictMode>
    );
  }
});
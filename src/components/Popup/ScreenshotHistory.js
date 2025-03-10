// src/components/Popup/ScreenshotHistory.js
import React, { useState, useEffect } from 'react';

const ScreenshotHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load history from Chrome storage when component mounts
        const loadHistory = () => {
            if (chrome.storage) {
                chrome.storage.local.get('screenshotHistory', (data) => {
                    if (data.screenshotHistory) {
                        setHistory(data.screenshotHistory);
                    }
                    setLoading(false);
                });
            } else {
                // For development outside of Chrome extension
                setLoading(false);
            }
        };

        loadHistory();

        // Listen for updates to the history
        const handleHistoryUpdate = (message) => {
            if (message.action === 'historyUpdated') {
                loadHistory();
            }
        };

        chrome.runtime.onMessage.addListener(handleHistoryUpdate);

        return () => {
            chrome.runtime.onMessage.removeListener(handleHistoryUpdate);
        };
    }, []);

    const handleOpenFile = (downloadId) => {
        if (chrome.downloads && downloadId) {
            chrome.downloads.show(downloadId);
        } else {
            // Fallback if chrome.downloads isn't available or no downloadId
            chrome.runtime.sendMessage({
                action: 'openScreenshot',
                downloadId: downloadId
            });
        }
    };

    const handleClearHistory = () => {
        chrome.storage.local.set({ screenshotHistory: [] }, () => {
            setHistory([]);
        });
    };

    if (loading) {
        return <div className="loading">Loading history...</div>;
    }

    if (history.length === 0) {
        return (
            <div className="history-empty">
                <p>No screenshots yet</p>
            </div>
        );
    }

    return (
        <div className="screenshot-history">
            <div className="history-header">
                <h2>Recent Screenshots</h2>
                <button onClick={handleClearHistory} className="clear-history-button">
                    Clear
                </button>
            </div>
            <div className="history-list">
                {history.slice(0, 5).map((item, index) => (
                    <div key={index} className="history-item">
                        <div className="history-item-info">
                            <div className="history-item-name">{item.name}</div>
                            <div className="history-item-time">
                                {new Date(item.timestamp).toLocaleString()}
                            </div>
                        </div>
                        <button
                            onClick={() => handleOpenFile(item.downloadId)}
                            className="history-item-button"
                            title="Open file location"
                        >
                            <span role="img" aria-label="Open">📂</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScreenshotHistory;
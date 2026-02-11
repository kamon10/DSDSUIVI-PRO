import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log('[HEMO-STATS] Booting...');

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('[HEMO-STATS] Error during render:', error);
  }
} else {
  console.error('[HEMO-STATS] Target element #root not found.');
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[HEMO-STATS] Booting...');

window.onerror = (message, source, lineno, colno, error) => {
  console.error('[HEMO-STATS] Global Error:', message, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>Erreur de chargement</h2>
      <p>${message}</p>
      <pre>${error?.stack || ''}</pre>
    </div>`;
  }
};

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
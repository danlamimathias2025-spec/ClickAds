import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign cross-origin script errors from third-party advertising or monetization scripts
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msgStr = String(message || '');
    if (msgStr === 'Script error.' || msgStr.includes('Script error')) {
      return true; // Swallows the error
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };

  window.addEventListener('error', (event) => {
    if (
      event.message === 'Script error.' || 
      (event.message && event.message.includes('Script error')) ||
      (event.filename && event.filename.includes('illuminationacceptedkeynote'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason && 
      (event.reason.message === 'Script error.' || 
       (event.reason.message && event.reason.message.includes('Script error')))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


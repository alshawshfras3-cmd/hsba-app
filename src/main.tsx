import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runAllStorageMigrations } from './lib/migration';

// Run migrations for localStorage values on startup
runAllStorageMigrations();

// Register Service Worker for PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('SW registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('SW registration failed:', err);
        });
    } catch (err) {
      console.warn('SW registration synchronous failure:', err);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

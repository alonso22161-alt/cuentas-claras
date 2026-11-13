import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { Proveedor } from './store.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Proveedor>
      <App />
    </Proveedor>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

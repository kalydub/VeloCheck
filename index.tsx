import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("index.tsx is running...");

window.onerror = function (message, source, lineno, colno, error) {
  // Ignorer l'erreur spécifique ResizeObserver qui est souvent sans conséquence mais déclenche ce handler
  if (message === 'ResizeObserver loop completed with undelivered notifications.' || 
      message === 'ResizeObserver loop limit exceeded') {
    return;
  }
  
  console.error("Global error caught:", message, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') { // Seulement si l'app n'est pas déjà montée ou si c'est une erreur fatale
    root.innerHTML = `<div style="color: white; padding: 20px; background: rgba(255,0,0,0.5);">
      <h2>Erreur de chargement</h2>
      <pre>${message}</pre>
    </div>`;
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Could not find root element to mount to");
}

console.log("Mounting React app...");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("React app mounted.");

import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Redireccionar consola del renderer al archivo log en disco
if (window.desktopAPI && window.desktopAPI.logToServer) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const formatArgs = (args: any[]) => {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  };

  console.log = (...args: any[]) => {
    originalLog(...args);
    window.desktopAPI.logToServer('log', formatArgs(args));
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    window.desktopAPI.logToServer('error', formatArgs(args));
  };

  console.warn = (...args: any[]) => {
    originalWarn(...args);
    window.desktopAPI.logToServer('warn', formatArgs(args));
  };

  // Capturar errores no controlados (uncaught exceptions)
  window.addEventListener('error', (event) => {
    window.desktopAPI.logToServer('error', `Uncaught Exception: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
  });

  // Capturar rechazos de promesas no controlados (unhandled promise rejections)
  window.addEventListener('unhandledrejection', (event) => {
    window.desktopAPI.logToServer('error', `Unhandled Promise Rejection: ${event.reason}`);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import './index.css';

console.log('main.tsx: Starting app initialization');
const rootElement = document.getElementById('root');
console.log('main.tsx: root element:', rootElement);

if (!rootElement) {
  console.error('main.tsx: Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-size: 18px;">Error: Root element not found!</div>';
} else {
  console.log('main.tsx: Rendering App component');
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('main.tsx: App component rendered');
  } catch (error) {
    console.error('main.tsx: Error rendering app:', error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red; font-size: 18px;">Error rendering app: ${error}</div>`;
  }
}


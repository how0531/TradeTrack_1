import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// ⬇️ 修改這裡：把 './src/components/...' 改成 './components/...'
import { ErrorBoundary } from './components/ErrorBoundary'; 

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
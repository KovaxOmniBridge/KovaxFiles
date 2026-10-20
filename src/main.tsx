import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (new URLSearchParams(location.search).has('packaged-smoke') || new URLSearchParams(location.search).has('packaged-journey')) {
  const errors: string[] = [];
  window.addEventListener('error', e => errors.push(e.message));
  window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
  Object.assign(window, { packagedSmokeErrors: errors,
    inspectReopenedJourneyFile: async () => (await import('./packagedJourney')).inspectReopenedJourneyFile(),
    runPackagedRendererSmoke: async () => (await import('./packagedSmoke')).runRendererSmoke() });
}

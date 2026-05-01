import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initCurrentUser, resolveCurrentUserId } from './api';
import { initializeTelemetry, trackException } from './utils';
import './index.css';

initializeTelemetry({ appVersion: __APP_VERSION__ });

async function bootstrap(): Promise<void> {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    const error = new Error('Root element not found');
    trackException(error, { area: 'bootstrap', action: 'findRootElement' });
    throw error;
  }

  try {
    const userId = await resolveCurrentUserId();
    await initCurrentUser(userId);

    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (e) {
    trackException(e, { area: 'bootstrap', action: 'renderRoot' });
    console.error('Render error:', e);
    const pre = document.createElement('pre');
    pre.style.cssText = 'color:red;padding:20px';
    pre.textContent = String(e);
    rootEl.appendChild(pre);
  }
}

void bootstrap();

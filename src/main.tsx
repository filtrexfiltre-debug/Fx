import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import App from './App.tsx';
import { SettingsProvider } from './context/SettingsContext';
import './index.css';

// Register AG Grid Community Modules to enable localeText, pagination, rowSelection, cell styles, etc.
ModuleRegistry.registerModules([AllCommunityModule]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);



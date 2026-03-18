import React from 'react';
import { createRoot } from 'react-dom/client';
import { initExtension } from '../shared/init';
import { SidePanelApp } from './App';

initExtension();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <SidePanelApp />
    </React.StrictMode>
  );
}

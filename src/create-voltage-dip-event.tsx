import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import CreateVoltageDipWorkspace from './components/EventManagement/CreateVoltageDipWorkspace';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <CreateVoltageDipWorkspace />
    </AuthProvider>
  </React.StrictMode>,
);

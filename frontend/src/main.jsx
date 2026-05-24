import React from 'react';
import ReactDOM from 'react-dom/client'; // Обязательно 'client'
import App from './App';
import { BuildProvider } from './BuildContext.jsx'; // Проверьте путь

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BuildProvider>
      <App />
    </BuildProvider>
  </React.StrictMode>
);
import React, { createContext, useState } from 'react';

export const BuildContext = createContext();

export const BuildProvider = ({ children }) => {
  const [components, setComponents] = useState([]);

  // Функция для полного сброса сборки
  const clearBuild = () => setComponents([]);

  return (
    <BuildContext.Provider value={{ components, setComponents, clearBuild }}>
      {children}
    </BuildContext.Provider>
  );
};
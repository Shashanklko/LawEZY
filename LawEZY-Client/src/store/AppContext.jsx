import React, { createContext, useContext, useState } from 'react';

/**
 * Global App State (MVC: Model)
 */
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState({ id: 1, name: 'Guest User', role: 'Premium' });
  const [preferences, setPreferences] = useState({ theme: 'dark', language: 'en' });

  const value = {
    user,
    setUser,
    preferences,
    setPreferences
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

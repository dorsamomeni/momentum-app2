// @ts-nocheck
import React, { createContext, useState, useContext } from 'react';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [weightUnit, setWeightUnit] = useState('kg');

  const toggleWeightUnit = () => {
    setWeightUnit(prev => prev === 'kg' ? 'lbs' : 'kg');
  };

  return (
    <SettingsContext.Provider value={{ weightUnit, toggleWeightUnit }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext); 
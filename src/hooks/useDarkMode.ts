import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../constants';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check if user has a preference stored in localStorage
    const storedValue = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (storedValue) {
      return storedValue === 'true';
    }
    
    // Otherwise, check system preference
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Default to dark mode if no preference detected
    return true;
  });
  
  useEffect(() => {
    // Add or remove the dark class from the body
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Store the preference
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, isDarkMode.toString());
  }, [isDarkMode]);

  // Function to toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };
  
  return { isDarkMode, toggleDarkMode };
}; 
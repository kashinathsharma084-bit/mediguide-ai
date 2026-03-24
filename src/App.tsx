import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged, User, googleProvider, signInWithPopup } from './firebase';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import { useTranslation } from './hooks/useTranslation';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [language, setLanguage] = useState('en');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { t } = useTranslation(language);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      alert(`Login failed: ${error.message}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        user ? <Navigate to="/home" replace /> : <LandingPage onLogin={handleLogin} t={t} />
      } />
      <Route path="/home" element={
        user ? (
          <HomePage 
            user={user} 
            language={language} 
            setLanguage={setLanguage} 
            isOnline={isOnline} 
            t={t} 
          />
        ) : <Navigate to="/" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

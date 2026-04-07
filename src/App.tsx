/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Admin } from './components/Admin';
import { Landing } from './components/Landing';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isAdmin = user?.email === 'danlamimathias2025@gmail.com';

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={user ? <Dashboard /> : <Landing />} 
          />
          <Route 
            path="/auth" 
            element={!user ? <Auth /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/admin" 
            element={isAdmin ? <Admin /> : <Navigate to="/" replace />} 
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

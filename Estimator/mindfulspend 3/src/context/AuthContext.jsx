import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [ready, setReady]     = useState(false); // true once we've checked stored token
  const [authError, setAuthError] = useState('');

  // On mount: validate stored token and restore session
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { setReady(true); return; }
    api.getMe()
      .then(u => setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError('');
    const { token, user: u } = await api.login(email, password);
    tokenStore.set(token);
    setUser(u);
  }, []);

  const signup = useCallback(async (email, password, firstName, lastName) => {
    setAuthError('');
    const { token, user: u } = await api.signup(email, password, firstName, lastName);
    tokenStore.set(token);
    setUser(u);
  }, []);

  const googleLogin = useCallback(async (idToken) => {
    setAuthError('');
    const { token, user: u } = await api.googleAuth(idToken);
    tokenStore.set(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, authError, setAuthError, login, signup, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

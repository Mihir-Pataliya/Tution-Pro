import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        if (token) {
          const response = await authAPI.getMe();
          const responseData = response.data?.data ?? response.data;
          if (active) {
            setUser(responseData?.user ?? responseData);
          }
        }
      } catch (error) {
        // Token is invalid or expired
        if (active) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const authData = response.data?.data ?? response.data;
      const { token: newToken, user: newUser } = authData || {};
      if (!newToken || !newUser) {
        throw new Error('Login response did not include a user and token');
      }
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const authData = response.data?.data ?? response.data;
      const { user: newUser } = authData || {};
      if (!newUser) {
        throw new Error('Registration response did not include a user account');
      }

      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return newUser;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  const replaceSessionToken = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const updateUserProfile = (profile) => {
    setUser((current) => current ? {
      ...current,
      name: profile.ownerName,
      email: profile.email,
      tuitionName: profile.academyName,
      phone: profile.phone,
    } : current);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    replaceSessionToken,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

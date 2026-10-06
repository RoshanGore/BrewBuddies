import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("bb_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("bb_token") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem("bb_user", JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn("[Auth] Token verification failed:", err.message);
          // If token expired, clear
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    localStorage.setItem("bb_token", authToken);
    localStorage.setItem("bb_user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("bb_token");
    localStorage.removeItem("bb_user");
  };

  const setCustomerSession = (authToken, customerData) => {
    setToken(authToken);
    setUser(customerData);
    localStorage.setItem("bb_token", authToken);
    localStorage.setItem("bb_user", JSON.stringify(customerData));
  };

  const updateCustomerPoints = (points) => {
    if (user) {
      const updated = { ...user, loyaltyPoints: points };
      setUser(updated);
      localStorage.setItem("bb_user", JSON.stringify(updated));
    }
  };

  const isOwner = user?.role === "owner";
  const isStaff = user?.role === "staff";
  const isStaffOrOwner = user?.role === "owner" || user?.role === "staff";
  const isCustomer = user?.role === "customer";


  const registerUser = async (registrationData) => {
    const res = await api.register(registrationData);
    if (res.success && res.token) {
      login(res.token, res.user);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isOwner,
        isStaff,
        isStaffOrOwner,
        isCustomer,

        login,
        logout,
        register: registerUser,
        setCustomerSession,
        updateCustomerPoints,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

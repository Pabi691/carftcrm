import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AdminContext = createContext();
export const useAdmin = () => useContext(AdminContext);

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`;

export const AdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(null);
  const [adminUser, setAdminUser]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cw_admin_token");
    const user  = localStorage.getItem("cw_admin_user");
    if (token && user) {
      setAdminToken(token);
      setAdminUser(JSON.parse(user));
    }
    setAuthLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${API_BASE}/sign_in`, { email, password });
      if (data.status && data.access_token) {
        const role = data.user?.role;
        if (role === "customer" || role === "distributor") {
          return { success: false, message: "Access denied. Admin accounts only." };
        }
        setAdminToken(data.access_token);
        setAdminUser(data.user);
        localStorage.setItem("cw_admin_token", data.access_token);
        localStorage.setItem("cw_admin_user", JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.error_message || "Invalid credentials." };
    } catch {
      return { success: false, message: "Cannot connect to server. Is the backend running?" };
    }
  };

  const logout = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem("cw_admin_token");
    localStorage.removeItem("cw_admin_user");
  };

  const api = useCallback(async (method, endpoint, body = null) => {
    const isFormData = body instanceof FormData;
    const headers = {
      Authorization: `Bearer ${adminToken}`,
      Accept: "application/json",
      ...(!isFormData && { "Content-Type": "application/json" }),
    };
    const url = `${API_BASE}${endpoint}`;
    if (method === "get")    return axios.get(url, { headers });
    if (method === "delete") return axios.delete(url, { headers });
    return axios[method](url, body, { headers });
  }, [adminToken]);

  return (
    <AdminContext.Provider value={{ adminToken, adminUser, authLoading, login, logout, api }}>
      {children}
    </AdminContext.Provider>
  );
};

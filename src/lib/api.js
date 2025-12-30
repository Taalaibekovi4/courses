// src/lib/api.js
import axios from "axios";

const LS_ACCESS = "access";
const LS_REFRESH = "refresh";

const rawBase = (import.meta.env.VITE_API_URL || "").trim();
const baseURL = rawBase ? rawBase.replace(/\/+$/, "") + "/" : "/";

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

export function setTokens({ access, refresh }) {
  try {
    localStorage.setItem(LS_ACCESS, access || "");
    localStorage.setItem(LS_REFRESH, refresh || "");
  } catch (e) {
    console.error(e);
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
  } catch (e) {
    console.error(e);
  }
}

function getAccess() {
  try {
    return localStorage.getItem(LS_ACCESS) || "";
  } catch (e) {
    console.error(e);
    return "";
  }
}

function getRefresh() {
  try {
    return localStorage.getItem(LS_REFRESH) || "";
  } catch (e) {
    console.error(e);
    return "";
  }
}

// attach access
api.interceptors.request.use(
  (config) => {
    const token = getAccess();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// refresh on 401
let isRefreshing = false;
let pending = [];

function runPending(err, token) {
  pending.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  pending = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    const refresh = getRefresh();
    if (!refresh) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pending.push({
          resolve: (token) => {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // ВАЖНО: refresh endpoint по твоему swagger может отличаться
      const res = await axios.post(baseURL + "auth/refresh/", { refresh });
      const newAccess = res?.data?.access || "";
      const newRefresh = res?.data?.refresh || refresh;

      if (!newAccess) throw new Error("No access token from refresh");

      setTokens({ access: newAccess, refresh: newRefresh });
      runPending(null, newAccess);

      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (e) {
      clearTokens();
      runPending(e, null);
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

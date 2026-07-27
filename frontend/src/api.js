import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Lisää JWT automaattisesti kaikkiin pyyntöihin
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      localStorage.getItem("authToken");

    console.log("Axios-pyyntö:", config.url);
    console.log("JWT löytyi:", Boolean(token));

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Käsittelee vanhentuneen istunnon
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    const isLoginRequest = requestUrl.includes("/token/");
    const isRefreshRequest = requestUrl.includes("/token/refresh/");

    if (status === 401 && !isLoginRequest && !isRefreshRequest) {
      console.warn("Istunto vanhentunut.");

      localStorage.removeItem("access_token");
      localStorage.removeItem("access");
      localStorage.removeItem("authToken");
      localStorage.removeItem("refresh");

      window.dispatchEvent(new Event("session-expired"));
    }

    return Promise.reject(error);
  }
);

export default api;
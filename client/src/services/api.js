import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
});

// Request interceptor: attach token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("bb_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract error message cleanly
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong. Please check your connection.";
    return Promise.reject(new Error(message));
  }
);

// API Methods
export const api = {
  // Auth
  login: (credentials) => API.post("/auth/login", credentials),
  register: (data) => API.post("/auth/register", data),
  customerSession: (data) => API.post("/auth/customer-session", data),
  getMe: () => API.get("/auth/me"),
  updateProfile: (data) => API.put("/auth/profile", data),

  // Products & Categories
  getProducts: (params) => API.get("/products", { params }),
  getProductById: (id) => API.get(`/products/${id}`),
  createProduct: (data) => API.post("/products", data),
  updateProduct: (id, data) => API.put(`/products/${id}`, data),
  toggleProductStock: (id) => API.patch(`/products/${id}/toggle-stock`),
  deleteProduct: (id) => API.delete(`/products/${id}`),
  getCategories: () => API.get("/products/categories"),
  createCategory: (data) => API.post("/products/categories", data),

  // Orders
  createOrder: (orderData) => API.post("/orders", orderData),
  getMyOrders: (phone) => API.get(`/orders/my-orders?phone=${encodeURIComponent(phone)}`),
  trackOrder: (orderId) => API.get(`/orders/track/${orderId}`),
  getLiveOrders: () => API.get("/orders/live"),
  getAllOrders: (params) => API.get("/orders", { params }),
  updateOrderStatus: (id, data) => API.patch(`/orders/${id}/status`, data),

  // Rewards & Loyalty
  getRewards: (params) => API.get("/rewards", { params }),
  redeemReward: (data) => API.post("/rewards/redeem", data),
  getRedemptionHistory: () => API.get("/rewards/history"),
  getPointsSummary: () => API.get("/points"),
  getPointsHistory: () => API.get("/points/history"),
  createReward: (data) => API.post("/rewards", data),
  updateReward: (id, data) => API.put(`/rewards/${id}`, data),
  deleteReward: (id) => API.delete(`/rewards/${id}`),

  // Offers
  getOffers: () => API.get("/offers"),
  validateOffer: (data) => API.post("/offers/validate", data),
  createOffer: (data) => API.post("/offers", data),
  updateOffer: (id, data) => API.put(`/offers/${id}`, data),
  deleteOffer: (id) => API.delete(`/offers/${id}`),

  // Tables
  getTables: () => API.get("/tables"),
  resolveTable: (token) => API.get(`/tables/resolve/${encodeURIComponent(token)}`),
  verifyTable: (tableNum) => API.get(`/tables/verify/${tableNum}`),
  createTable: (data) => API.post("/tables", data),
  updateTable: (id, data) => API.put(`/tables/${id}`, data),
  deleteTable: (id) => API.delete(`/tables/${id}`),

  // Customers (Owner)
  getCustomers: (params) => API.get("/customers", { params }),
  getCustomerById: (id) => API.get(`/customers/${id}`),

  // Analytics (Owner)
  getSummary: (params) => API.get("/analytics/summary", { params }),
  getCharts: (params) => API.get("/analytics/charts", { params }),

  // Settings
  getSettings: () => API.get("/settings"),
  updateSettings: (data) => API.put("/settings", data),

};

export default api;

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Context Providers
import { AuthProvider } from "./context/AuthContext";
import { TableProvider } from "./context/TableContext";
import { CartProvider } from "./context/CartContext";

// Layouts
import CustomerLayout from "./layouts/CustomerLayout";
import OwnerLayout from "./layouts/OwnerLayout";

// Customer Pages
import Home from "./pages/customer/Home";
import Menu from "./pages/customer/Menu";
import Cart from "./pages/customer/Cart";
import Orders from "./pages/customer/Orders";
import Rewards from "./pages/customer/Rewards";
import Offers from "./pages/customer/Offers";
import Profile from "./pages/customer/Profile";

// Owner Pages
import Login from "./pages/owner/Login";
import Dashboard from "./pages/owner/Dashboard";
import LiveOrders from "./pages/owner/LiveOrders";
import Products from "./pages/owner/Products";
import Customers from "./pages/owner/Customers";
import RewardsOwner from "./pages/owner/Rewards";
import OffersOwner from "./pages/owner/Offers";
import QRCodes from "./pages/owner/QRCodes";
import Analytics from "./pages/owner/Analytics";
import Settings from "./pages/owner/Settings";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TableProvider>
          <CartProvider>
            <Routes>
              {/* Customer Routes (Dine-in) */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Owner Authentication */}
              <Route path="/owner/login" element={<Login />} />

              {/* Protected Owner Routes */}
              <Route path="/owner" element={<OwnerLayout />}>
                <Route index element={<Navigate to="/owner/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="orders" element={<LiveOrders />} />
                <Route path="products" element={<Products />} />
                <Route path="customers" element={<Customers />} />
                <Route path="rewards" element={<RewardsOwner />} />
                <Route path="offers" element={<OffersOwner />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="qrcodes" element={<QRCodes />} />
                <Route path="qr-codes" element={<QRCodes />} />
                <Route path="settings" element={<Settings />} />

              </Route>

              {/* Catch all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </TableProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

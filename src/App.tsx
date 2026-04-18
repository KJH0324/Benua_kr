import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import TrackOrder from "./pages/TrackOrder";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Checkout from "./pages/Checkout";
import { motion, AnimatePresence } from "motion/react";
import ErrorBoundary from "./components/ErrorBoundary";
import CouponPopup from "./components/CouponPopup";
import { isAdminSubdomain } from "./lib/subdomain";

export default function App() {
  const isAdmin = isAdminSubdomain();

  if (isAdmin) {
    return (
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <div className="flex flex-col min-h-screen bg-gray-50">
            <main className="flex-grow">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/login" element={<AdminLogin />} />
                  <Route path="/*" element={<AdminDashboard />} />
                </Routes>
              </AnimatePresence>
            </main>
            <Toaster position="top-center" />
          </div>
        </Router>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen bg-white">
          <Navbar />
          <main className="flex-grow">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track" element={<TrackOrder />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/login" element={<Login />} />
                {/* Legacy redirect for /admin */}
                <Route path="/admin/*" element={<Navigate to={`https://admin.benua.shop${window.location.pathname.replace('/admin', '')}`} replace />} />
              </Routes>
            </AnimatePresence>
          </main>
          <Footer />
          <CouponPopup />
          <Toaster 
            position="top-center" 
            toastOptions={{
              classNames: {
                error: 'bg-[#FF4000] text-white border-[#FF4000]',
                warning: 'bg-[#FF4000] text-white border-[#FF4000]',
              }
            }} 
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

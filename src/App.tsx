import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { Toaster } from "sonner";
import { lazy, Suspense, useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import { AnimatePresence } from "motion/react";
import ErrorBoundary from "./components/ErrorBoundary";
import CouponPopup from "./components/CouponPopup";
import RecentFloat from "./components/RecentFloat";
import { isAdminSubdomain } from "./lib/subdomain";

const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Checkout = lazy(() => import("./pages/Checkout"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Gift = lazy(() => import("./pages/Gift"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));

const toastStyle = {
  toastOptions: {
    style: {
      background: "#463221",
      color: "#faf2e7",
      border: "none",
      borderRadius: "16px",
    },
  },
};

function PageTitleHandler() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = "Benua";

    if (path === "/shop") title = "Benua | 스토어";
    else if (path.startsWith("/product/")) return;
    else if (path === "/cart") title = "Benua | 장바구니";
    else if (path === "/checkout") title = "Benua | 결제";
    else if (path === "/profile") title = "Benua | 마이페이지";
    else if (path === "/reset-password") title = "Benua | 비밀번호 재설정";
    else if (path === "/login") title = "Benua | 로그인";
    else if (path === "/about") title = "Benua | 브랜드 스토리";
    else if (path === "/contact") title = "Benua | 고객센터";
    else if (path === "/track") title = "Benua | 배송조회";
    else if (path === "/terms") title = "Benua | 이용약관";
    else if (path === "/privacy") title = "Benua | 개인정보처리방침";
    
    if (isAdminSubdomain() || path.includes("/admin")) {
      title = "Benua | 관리자";
    }

    document.title = title;
  }, [location]);

  return null;
}

function NotFound() {
  return (
    <div className="pt-40 pb-24 px-6 text-center space-y-4">
      <h1 className="text-3xl font-serif font-bold text-venuea-dark">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-venuea-muted">주소를 다시 확인해주세요.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/" className="px-5 py-3 rounded-full bg-venuea-green text-white text-sm font-bold">
          홈으로
        </Link>
        <Link to="/shop" className="px-5 py-3 rounded-full bg-white text-venuea-dark text-sm font-bold">
          컬렉션 보기
        </Link>
        <Link to="/contact" className="px-5 py-3 rounded-full bg-white text-venuea-dark text-sm font-bold">
          문의하기
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const isAdmin = isAdminSubdomain();

  if (isAdmin) {
    return (
      <ErrorBoundary>
        <Router>
          <PageTitleHandler />
          <ScrollToTop />
          <div className="flex flex-col min-h-screen bg-gray-50">
            <main className="flex-grow">
              <AnimatePresence mode="wait">
                <Suspense fallback={null}>
                <Routes>
                  <Route path="/login" element={<AdminLogin />} />
                  <Route path="/*" element={<AdminDashboard />} />
                </Routes>
                </Suspense>
              </AnimatePresence>
            </main>
          <Toaster position="bottom-center" toastOptions={toastStyle.toastOptions} />
          </div>
        </Router>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <PageTitleHandler />
        <ScrollToTop />
        <div className="flex flex-col min-h-screen bg-venuea-beige">
          <Navbar />
          <main className="flex-grow">
            <AnimatePresence mode="wait">
              <Suspense fallback={null}>
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
                <Route path="/gift/:token" element={<Gift />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin/*" element={<Navigate to={`https://dash.benua.shop${window.location.pathname.replace('/admin', '')}`} replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </AnimatePresence>
          </main>
          <Footer />
          <CouponPopup />
          <RecentFloat />
          <Toaster position="bottom-center" toastOptions={toastStyle.toastOptions} />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

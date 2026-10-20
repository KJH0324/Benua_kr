import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, User, Menu, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";

export default function Navbar() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const updateCartCount = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("benua_cart") || "[]");
      const count = Array.isArray(saved)
        ? saved.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0)
        : 0;
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cart-updated", updateCartCount);
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cart-updated", updateCartCount);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    updateCartCount();
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, [location.pathname]);

  const navLinks = [
    { name: "컬렉션", path: "/shop" },
    { name: "브랜드 스토리", path: "/about" },
    { name: "주문조회", path: "/track" },
    { name: "문의하기", path: "/contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-[76px] bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 px-6 md:px-[60px] flex items-center justify-between">
      <Link
        to="/"
        className="text-2xl font-bold tracking-[6px] uppercase text-venuea-dark"
      >
        Benua
      </Link>

      <nav className="hidden md:flex items-center space-x-10">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              "text-xs font-bold uppercase tracking-[0.2em] transition-colors",
              location.pathname === link.path
                ? "text-venuea-gold"
                : "text-venuea-dark hover:text-venuea-gold"
            )}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      <div className="flex items-center space-x-5">
        <Link
          to={user ? "/profile" : "/login"}
          aria-label={user ? "마이페이지" : "로그인"}
          className="text-venuea-dark hover:text-venuea-gold transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <User size={20} />
          <span className="hidden sm:inline">{user ? user.name : "로그인"}</span>
        </Link>

        <Link
          to="/cart"
          aria-label="쇼핑백"
          className="relative text-venuea-dark hover:text-venuea-gold transition-colors"
        >
          <ShoppingBag size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-venuea-gold text-white text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        <button
          aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-venuea-dark p-1"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[76px] bg-white border-b border-gray-200 p-6 flex flex-col space-y-4 md:hidden shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="text-sm font-bold text-venuea-dark py-2 border-b border-gray-50"
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
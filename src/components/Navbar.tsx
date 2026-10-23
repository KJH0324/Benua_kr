import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, User, Menu, X, Search } from "lucide-react";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";
import { mergeServerCart } from "../lib/cart";

export default function Navbar() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);

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
    setSearchOpen(false);
    updateCartCount();
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, [location.pathname]);

  useEffect(() => {
    if (!user || sessionStorage.getItem("benua_cart_synced")) return;
    sessionStorage.setItem("benua_cart_synced", "1");
    mergeServerCart().catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!searchOpen) return;
    const q = keyword.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      apiFetch("/api/products")
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          setResults(list.filter((item) => String(item.name || "").toLowerCase().includes(q)).slice(0, 8));
        })
        .catch(() => {});
    }, 200);
    return () => window.clearTimeout(timer);
  }, [keyword, searchOpen]);

  const navLinks = [
    { name: "컬렉션", path: "/shop" },
    { name: "브랜드 스토리", path: "/about" },
    { name: "주문조회", path: "/track" },
    { name: "문의하기", path: "/contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-[76px] bg-venuea-beige/95 backdrop-blur-md border-b border-black/5 z-50 px-6 md:px-[60px] flex items-center justify-between">
      <Link to="/" aria-label="베뉴아 홈" className="flex items-center shrink-0">
        <img src="/logo-color.png" alt="Benua" className="h-10 w-auto" />
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              "text-sm font-bold tracking-normal transition-colors",
              location.pathname === link.path
                ? "text-venuea-green"
                : "text-venuea-dark hover:text-venuea-green"
            )}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      <div className="flex items-center">
        <button
          type="button"
          aria-label="상품 검색"
          onClick={() => setSearchOpen((open) => !open)}
          className="w-11 h-11 text-venuea-dark hover:text-venuea-green flex items-center justify-center"
        >
          <Search size={20} />
        </button>
        <Link
          to={user ? "/profile" : "/login"}
          aria-label={user ? "마이페이지" : "로그인"}
          className="min-w-11 h-11 px-2 text-venuea-dark hover:text-venuea-green transition-colors flex items-center justify-center gap-1.5 text-sm font-bold"
        >
          <User size={20} />
          <span className="hidden sm:inline">{user ? user.name : "로그인"}</span>
        </Link>

        <Link
          to="/cart"
          aria-label="쇼핑백"
          className="relative w-11 h-11 text-venuea-dark hover:text-venuea-green transition-colors flex items-center justify-center"
        >
          <ShoppingBag size={20} />
          {cartCount > 0 && (
            <span className="absolute top-1 right-0 min-w-4 h-4 px-1 rounded-full bg-venuea-green text-white text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        <button
          type="button"
          aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden w-11 h-11 text-venuea-dark flex items-center justify-center"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {searchOpen && (
        <div className="fixed inset-x-0 top-[76px] z-50 bg-venuea-beige border-b border-black/5 px-6 md:px-[60px] py-4">
          <input
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="상품명 검색"
            className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl text-sm"
          />
          {results.length > 0 && (
            <div className="mt-3 grid gap-2">
              {results.map((item) => (
                <Link key={item.id} to={`/product/${item.id}`} className="flex items-center gap-3 text-sm font-bold text-venuea-dark">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-10 h-12 object-cover rounded-lg" />
                  ) : (
                    <span className="w-10 h-12 bg-white rounded-lg" />
                  )}
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {mobileMenuOpen && (
        <div className="md:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="fixed inset-0 top-[76px] bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-x-0 top-[76px] bg-venuea-beige border-b border-black/5 px-6 py-4 flex flex-col shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="min-h-[52px] flex items-center text-base font-bold tracking-normal text-venuea-dark border-b border-black/5"
              >
                {link.name}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Link
                to={user ? "/profile" : "/login"}
                className="h-12 rounded-xl border border-venuea-green bg-white text-venuea-green text-sm font-bold flex items-center justify-center"
              >
                {user ? "마이페이지" : "로그인"}
              </Link>
              <Link
                to="/cart"
                className="h-12 rounded-xl bg-venuea-green text-white text-sm font-bold flex items-center justify-center"
              >
                쇼핑백{cartCount > 0 ? ` ${cartCount}` : ""}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

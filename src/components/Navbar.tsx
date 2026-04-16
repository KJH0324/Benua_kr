import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => setUser(data.user));
  }, [location.pathname]);

  const navLinks = [
    { name: "컬렉션", path: "/" },
    { name: "스토어", path: "/shop" },
    { name: "브랜드 스토리", path: "/about" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-8 md:px-[60px] py-6 md:py-[40px]",
        isScrolled ? "bg-white/90 backdrop-blur-md border-b border-venuea-dark/5 py-4 md:py-[20px]" : "bg-transparent"
      )}
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-[4px] uppercase text-venuea-dark">
          Benua
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-10">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "text-[13px] font-medium tracking-[1px] uppercase transition-colors hover:text-venuea-gold",
                location.pathname === link.path ? "text-venuea-gold" : "text-venuea-dark"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center space-x-6">
          <Link to="/cart" className="relative text-venuea-dark hover:text-venuea-gold transition-colors">
            <ShoppingCart size={20} />
            <span className="absolute -top-2 -right-2 bg-venuea-gold text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              0
            </span>
          </Link>
          {user ? (
            <Link to="/profile" className="text-[11px] font-bold uppercase tracking-widest text-venuea-dark hover:text-venuea-gold transition-colors">
              마이페이지
            </Link>
          ) : (
            <Link to="/login" className="text-venuea-dark hover:text-venuea-gold transition-colors">
              <User size={20} />
            </Link>
          )}
          <button
            className="md:hidden text-venuea-dark"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[60] md:hidden p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-16">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-bold tracking-[4px] uppercase text-venuea-dark">
                Benua
              </Link>
              <button
                className="text-venuea-dark p-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={32} />
              </button>
            </div>

            <div className="flex flex-col space-y-8 flex-grow">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-4xl font-bold text-venuea-dark tracking-tighter hover:text-venuea-gold transition-colors"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pt-8 border-t border-venuea-dark/5 space-y-6">
              <div className="flex gap-8">
                {user ? (
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-bold uppercase tracking-widest text-venuea-dark flex items-center gap-2"
                  >
                    <User size={20} />
                    마이페이지
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-bold uppercase tracking-widest text-venuea-dark flex items-center gap-2"
                  >
                    <User size={20} />
                    로그인
                  </Link>
                )}
                <Link
                  to="/cart"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-bold uppercase tracking-widest text-venuea-dark flex items-center gap-2"
                >
                  <ShoppingCart size={20} />
                  장바구니
                </Link>
              </div>
              <p className="text-[10px] uppercase tracking-[2px] text-venuea-dark/40">
                &copy; 베누아 컬렉션. ALL RIGHTS RESERVED.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

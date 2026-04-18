import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings, 
  Plus, 
  Search,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  Clock,
  Truck,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  MessageSquare,
  Reply,
  LogOut,
  ShoppingCart,
  Ticket,
  Download,
  Upload,
  FileText,
  ArrowRight,
  Shield,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatPrice } from "../lib/utils";
import { toast } from "sonner";
import { isAdminSubdomain } from "../lib/subdomain";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  discount_rate?: number;
  show_on_main?: number;
  image_url: string;
  description: string;
  stock?: number;
  material?: string;
  dimensions?: string;
  origin?: string;
}

const getStatusText = (status: string) => {
  const map: any = {
    pending: '결제대기',
    paid: '결제완료',
    shipping: '배송중',
    delivered: '배송완료',
    completed: '구매확정',
    refund_requested: '환불요청',
    refunded: '환불완료'
  };
  return map[status] || status;
};

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isAdminSub = isAdminSubdomain();
  const adminPathBase = isAdminSub ? "" : "/admin";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check");
        if (!response.ok) {
          navigate(isAdminSub ? "/login" : "/admin/login");
        }
      } catch (error) {
        navigate(isAdminSub ? "/login" : "/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate, isAdminSub]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-venuea-gold" size={40} />
      </div>
    );
  }
  
  const sidebarLinks = [
    { name: "개요", path: `${adminPathBase}/`, icon: LayoutDashboard },
    { name: "상품 관리", path: `${adminPathBase}/products`, icon: Package },
    { name: "주문 내역", path: `${adminPathBase}/orders`, icon: ShoppingBag },
    { name: "고객 문의", path: `${adminPathBase}/inquiries`, icon: MessageSquare },
    { name: "고객 관리", path: `${adminPathBase}/customers`, icon: Users },
    { name: "쿠폰 관리", path: `${adminPathBase}/coupons`, icon: Ticket },
    { name: "관리자 키", path: `${adminPathBase}/keys`, icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate(isAdminSub ? "/login" : "/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 md:hidden">
        <h2 className="text-sm font-bold uppercase tracking-widest text-venuea-dark">Admin Console</h2>
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 text-venuea-dark hover:bg-gray-100 rounded-lg"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 md:hidden p-6 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="group">
                  <h2 className="text-2xl font-bold tracking-[4px] uppercase text-venuea-dark">Benua</h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-venuea-dark/30 block -mt-1">admin</span>
                </div>
                <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-gray-400 hover:text-gray-900">
                  <X size={20} />
                </button>
              </div>
              
              <nav className="space-y-1 flex-grow">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 px-4 py-4 rounded-lg text-base font-medium transition-all",
                        isActive 
                          ? "bg-venuea-dark text-white shadow-lg shadow-venuea-dark/20" 
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Icon size={20} />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-4 text-sm font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-3"
                >
                  <LogOut size={18} />
                  <span>로그아웃</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="p-6">
          <div className="mb-10 pl-4">
            <h1 className="text-2xl font-bold tracking-[4px] uppercase text-venuea-dark">Benua</h1>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-venuea-dark/20 block -mt-1 ml-0.5">admin</span>
          </div>
          <nav className="space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-venuea-dark text-white shadow-lg shadow-venuea-dark/20" 
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-10 pt-10 border-t border-gray-100">
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-3"
            >
              <LogOut size={18} />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 overflow-x-hidden pt-[60px] md:pt-0">
        {/* Global Admin Header - Desktop Only */}
        <div className="hidden md:flex justify-between items-center mb-10 pb-6 border-b border-gray-100 sticky top-0 bg-gray-50/80 backdrop-blur-md z-20 pt-8">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-venuea-dark/40 flex items-center gap-2">
              <Shield size={12} /> Management Protocol
            </h2>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest leading-none">Authorized Access Only // Benua Infrastructure</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border border-green-100/50 shadow-sm">
              <Activity size={12} className="animate-pulse" />
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              System Online
            </div>
            <div className="h-8 w-[1px] bg-gray-200" />
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Current Date</span>
              <span className="text-xs font-bold text-venuea-dark">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/orders" element={<AdminOrders />} />
          <Route path="/customers" element={<AdminUserPoints />} />
          <Route path="/coupons" element={<AdminCoupons />} />
          <Route path="/inquiries" element={<AdminInquiries />} />
          <Route path="/keys" element={<AdminKeys />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    name: "",
    code: "",
    type: "PERCENT",
    value: 0,
    min_order_amount: 1,
    max_discount_amount: 0
  });
  const [giveTarget, setGiveTarget] = useState({ id: "", email: "" });

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      // Filter out tier-specific coupons from the distribution list to prevent accidents
      const filtered = data.filter((c: any) => {
        const lowerName = c.name.toLowerCase();
        const lowerCode = c.code.toLowerCase();
        const tierKeywords = ['더 블랙', '더블랙', 'the black', 'black', 'green', 'beige', '그린', '베이지', '블랙'];
        return !tierKeywords.some(kw => lowerName.includes(kw) || lowerCode.includes(kw));
      });
      setCoupons(filtered);
    } catch {
      toast.error("쿠폰 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoupon)
      });
      if (res.ok) {
        toast.success("쿠폰이 생성되었습니다.");
        setIsAdding(false);
        setNewCoupon({
          name: "",
          code: "",
          type: "PERCENT",
          value: 0,
          min_order_amount: 1,
          max_discount_amount: 0
        });
        fetchCoupons();
      } else {
        const data = await res.json();
        toast.error(data.error || "생성 실패");
      }
    } catch {
      toast.error("서버 오류");
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!confirm("이 쿠폰을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("쿠폰이 삭제되었습니다.");
        fetchCoupons();
      }
    } catch {
      toast.error("삭제 실패");
    }
  };

  const handleGiveCoupon = async (id: number, target: string) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}/give`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      if (res.ok) {
        toast.success(target === 'all' ? "모든 사용자에게 지급되었습니다." : `${target}님에게 지급되었습니다.`);
        setGiveTarget({ id: "", email: "" });
      } else {
        const data = await res.json();
        toast.error(data.error || "지급 실패");
      }
    } catch {
      toast.error("서버 오류");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">쿠폰 관리</h1>
          <p className="text-sm text-gray-500 mt-1">이벤트 쿠폰을 생성하고 사용자에게 지급합니다.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-venuea-gold transition-colors"
        >
          <Plus size={18} />
          <span>새 쿠폰 생성</span>
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl my-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">새 쿠폰 생성</h2>
                <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddCoupon} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">쿠폰 이름</label>
                  <input 
                    type="text" 
                    required 
                    value={newCoupon.name}
                    onChange={e => setNewCoupon({...newCoupon, name: e.target.value})}
                    placeholder="예: 신규 회원 가입 감사 쿠폰"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:border-venuea-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">쿠폰 코드</label>
                  <input 
                    type="text" 
                    required 
                    value={newCoupon.code}
                    onChange={e => setNewCoupon({...newCoupon, code: e.target.value})}
                    placeholder="예: WELCOME2024"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:border-venuea-gold outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">유형</label>
                    <select 
                      value={newCoupon.type}
                      onChange={e => setNewCoupon({...newCoupon, type: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:border-venuea-gold outline-none text-sm"
                    >
                      <option value="PERCENT">% 할인</option>
                      <option value="FIXED">원 할인</option>
                      <option value="SHIPPING">무료 배송</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">할인 값</label>
                    <input 
                      type="number" 
                      required 
                      value={newCoupon.value}
                      onChange={e => setNewCoupon({...newCoupon, value: parseInt(e.target.value)})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:border-venuea-gold outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">최소 주문 금액 (선택)</label>
                  <input 
                    type="number" 
                    value={newCoupon.min_order_amount}
                    onChange={e => setNewCoupon({...newCoupon, min_order_amount: parseInt(e.target.value)})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:border-venuea-gold outline-none"
                  />
                </div>
                <button type="submit" className="w-full bg-venuea-dark text-white py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors">
                  쿠폰 생성하기
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-venuea-gold" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative group overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-venuea-gold/5 -mr-16 -mt-16 rounded-full group-hover:scale-110 transition-transform" />
               <div className="relative">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <span className="text-[10px] font-bold uppercase tracking-[2px] text-venuea-gold mb-1 block">
                       {coupon.type === 'PERCENT' ? `${coupon.value}% 할인` : coupon.type === 'FIXED' ? `${formatPrice(coupon.value)} 할인` : '무료 배송'}
                     </span>
                     <h3 className="text-lg font-bold text-gray-900">{coupon.name}</h3>
                     <code className="text-xs text-gray-400 block mt-1">{coupon.code}</code>
                   </div>
                   <button 
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                   >
                     <Trash2 size={18} />
                   </button>
                 </div>

                 <div className="pt-4 border-t border-gray-50 mt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <button 
                        onClick={() => handleGiveCoupon(coupon.id, 'all')}
                        className="text-[11px] font-bold uppercase tracking-widest text-venuea-dark hover:text-venuea-gold transition-colors text-left"
                      >
                        전체 사용자에게 지급
                      </button>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="email" 
                          placeholder="사용자 이메일"
                          value={giveTarget.id === coupon.id.toString() ? giveTarget.email : ""}
                          onChange={(e) => setGiveTarget({ id: coupon.id.toString(), email: e.target.value })}
                          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-venuea-gold w-40"
                        />
                        <button 
                          onClick={() => handleGiveCoupon(coupon.id, giveTarget.email)}
                          disabled={!giveTarget.email || giveTarget.id !== coupon.id.toString()}
                          className="text-[11px] font-bold uppercase tracking-widest text-venuea-gold disabled:opacity-30 whitespace-nowrap"
                        >
                          지급
                        </button>
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, orderRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/admin/orders")
        ]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (orderRes.ok) setOrders(await orderRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalRevenue = orders.reduce((acc, order) => acc + (order.status === 'completed' ? order.total_amount : 0), 0);
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'refunded').length;

  const stats = [
    { name: "누적 매출 (확정)", value: formatPrice(totalRevenue), change: "구매확정 건 기준", icon: ShoppingBag },
    { name: "활성 주문", value: activeOrders.toString(), change: "배송중/결제완료 건", icon: Clock },
    { name: "전체 상품", value: products.length.toString(), change: "판매 중인 상품 수", icon: Package },
    { name: "전체 주문", value: orders.length.toString(), change: "누적 주문 횟수", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">대시보드 개요</h1>
          <p className="text-sm text-gray-500">환영합니다, 관리자님.</p>
        </div>
        <Link to="/admin/products" className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-venuea-gold transition-colors">
          <Plus size={18} />
          <span>상품 관리로 이동</span>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg text-venuea-brown">
                  <Icon size={20} />
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    discount_rate: 0,
    show_on_main: 0,
    category: "리빙",
    description: "",
    stock: 0,
    material: "",
    dimensions: "",
    origin: ""
  });
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [descImage, setDescImage] = useState<File | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error("상품 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await fetch("/api/admin/products/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products: results.data })
          });
          if (response.ok) {
            toast.success(`${results.data.length}개의 상품이 등록되었습니다.`);
            fetchProducts();
          } else {
            toast.error("대량 등록 실패");
          }
        } catch (error) {
          toast.error("서버 오류");
        }
      }
    });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("name", newProduct.name);
    formData.append("price", newProduct.price.toString());
    formData.append("discount_rate", newProduct.discount_rate.toString());
    formData.append("show_on_main", newProduct.show_on_main.toString());
    formData.append("category", newProduct.category);
    formData.append("description", newProduct.description);
    formData.append("stock", newProduct.stock.toString());
    formData.append("material", newProduct.material);
    formData.append("dimensions", newProduct.dimensions);
    formData.append("origin", newProduct.origin);
    if (mainImage) formData.append("image", mainImage);
    if (descImage) formData.append("description_image", descImage);

    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(editingId ? "상품이 수정되었습니다." : "상품이 등록되었습니다.");
        setIsModalOpen(false);
        setEditingId(null);
        setNewProduct({ name: "", price: 0, discount_rate: 0, show_on_main: 0, category: "리빙", description: "", stock: 0, material: "", dimensions: "", origin: "" });
        setMainImage(null);
        setDescImage(null);
        fetchProducts();
      } else {
        toast.error(data.error || "상품 처리 실패");
      }
    } catch (error) {
      toast.error("서버 오류");
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setNewProduct({
      name: product.name,
      price: product.price,
      discount_rate: product.discount_rate || 0,
      show_on_main: product.show_on_main || 0,
      category: product.category,
      description: product.description,
      stock: product.stock || 0,
      material: product.material || "",
      dimensions: product.dimensions || "",
      origin: product.origin || ""
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("상품이 삭제되었습니다.");
        fetchProducts();
      }
    } catch (error) {
      toast.error("삭제 실패");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-gray-900">상품 관리</h1>
        <div className="flex space-x-3">
          <label className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <Upload size={18} />
            <span>CSV 대량 등록</span>
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewProduct({ name: "", price: 0, discount_rate: 0, show_on_main: 0, category: "리빙", description: "", stock: 0, material: "", dimensions: "", origin: "" });
              setIsModalOpen(true);
            }}
            className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2-lg shadow-lg shadow-venuea-dark/20 hover:bg-venuea-gold transition-all"
          >
            <Plus size={18} />
            <span>새 상품 등록</span>
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">상품</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">카테고리</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">가격</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center">
                  <Loader2 className="animate-spin mx-auto text-venuea-gold" />
                </td>
              </tr>
            ) : products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img src={product.image_url || "https://picsum.photos/seed/placeholder/100/100"} alt="Product" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-gray-900">{product.name}</p>
                        {product.show_on_main === 1 && (
                          <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-blue-100 italic">Main</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">Stock: {product.stock}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{product.category}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 w-fit",
                      (product.stock || 0) < 5 ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-50 text-gray-500"
                    )}>
                      재고: {product.stock || 0}
                    </span>
                    {product.discount_rate && product.discount_rate > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-red-500 text-[10px] font-bold">{product.discount_rate}% OFF</span>
                        <span className="font-bold text-gray-900">{formatPrice(product.price * (1 - product.discount_rate / 100))}</span>
                        <span className="text-gray-300 line-through text-[10px]">{formatPrice(product.price)}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => handleEditClick(product)}
                      className="text-venuea-dark hover:text-venuea-gold p-1"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">{editingId ? "상품 수정" : "새 상품 등록"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">상품명</label>
                  <input 
                    type="text" 
                    required
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">기본 가격 (원)</label>
                    <input 
                      type="number" 
                      required
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value)})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">할인율 (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="99"
                      value={newProduct.discount_rate}
                      onChange={e => setNewProduct({...newProduct, discount_rate: parseInt(e.target.value)})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">카테고리</label>
                    <select 
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                    >
                      {["리빙", "키친", "데코", "침구", "욕실"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">재고 수량</label>
                    <input 
                      type="number" 
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">재고 수량</label>
                    <input 
                      type="number" 
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">소재</label>
                    <input 
                      type="text" 
                      value={newProduct.material}
                      onChange={e => setNewProduct({...newProduct, material: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                      placeholder="예: 오크 원목, 린넨 100%"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="show_on_main"
                    checked={newProduct.show_on_main === 1}
                    onChange={e => setNewProduct({...newProduct, show_on_main: e.target.checked ? 1 : 0})}
                    className="w-5 h-5 rounded border-gray-300 text-venuea-gold focus:ring-venuea-gold"
                  />
                  <label htmlFor="show_on_main" className="text-sm font-bold text-venuea-dark cursor-pointer">
                    메인 페이지 추천 상품으로 표시
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">크기/치수</label>
                    <input 
                      type="text" 
                      value={newProduct.dimensions}
                      onChange={e => setNewProduct({...newProduct, dimensions: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                      placeholder="예: W1200 x D600 x H750"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">원산지</label>
                    <input 
                      type="text" 
                      value={newProduct.origin}
                      onChange={e => setNewProduct({...newProduct, origin: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                      placeholder="예: 대한민국"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">대표 이미지</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    required={!editingId}
                    onChange={e => setMainImage(e.target.files ? e.target.files[0] : null)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                  />
                  {editingId && <p className="text-[10px] text-gray-400">수정 시 이미지를 변경하려면 파일을 선택하세요. 선택하지 않으면 기존 이미지가 유지됩니다.</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">상세 설명 이미지 (긴 이미지)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setDescImage(e.target.files ? e.target.files[0] : null)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">설명</label>
                  <textarea 
                    rows={3}
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                  />
                </div>
                <button className="w-full bg-venuea-dark text-white py-3 rounded-lg font-bold hover:bg-venuea-gold transition-colors mt-4">
                  {editingId ? "상품 수정 완료" : "상품 등록하기"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    number: "",
    company: "CJ대한통운"
  });

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Fetch failed");
      setOrders(await res.json());
    } catch (err: any) {
      toast.error("주문 목록을 가져오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/orders/export");
      const data = await res.json();
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `venuea_orders_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("주문 내역이 내보내기 되었습니다.");
    } catch (error) {
      toast.error("내보내기 실패");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success("상태가 변경되었습니다.");
        fetchOrders();
        if (selectedOrder?.id === id) {
          setSelectedOrder({ ...selectedOrder, status });
        }
      }
    } catch {
      toast.error("변경 실패");
    }
  };

  const handleTrackingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tracking_number: trackingForm.number, 
          shipping_company: trackingForm.company 
        })
      });
      if (res.ok) {
        toast.success("운송장이 등록되고 배송중 상태로 변경되었습니다.");
        setIsTrackingModalOpen(false);
        setTrackingForm({ number: "", company: "CJ대한통운" });
        fetchOrders();
      }
    } catch {
      toast.error("운송장 등록 실패");
    }
  };

  const handleClearTestOrders = async () => {
    if (!confirm("테스트 과정에서 생성된 모든 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      const response = await fetch("/api/admin/orders/test", { method: "DELETE" });
      if (response.ok) {
        toast.success("모든 테스트 주문이 삭제되었습니다.");
        fetchOrders();
      } else {
        toast.error("삭제 실패");
      }
    } catch (error) {
      toast.error("서버 오류");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-gray-900">주문 관리</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleExport}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            <span>엑셀 내보내기</span>
          </button>
          <button 
            onClick={handleClearTestOrders}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={18} />
            <span>테스트 주문 전체 삭제</span>
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">주문정보</th>
              <th className="px-6 py-4 font-medium">고객명/연락처</th>
              <th className="px-6 py-4 font-medium">결제금액</th>
              <th className="px-6 py-4 font-medium">상태</th>
              <th className="px-6 py-4 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                <td className="px-6 py-4">
                  <button 
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDetailModalOpen(true);
                    }}
                    className="font-bold text-venuea-gold hover:underline"
                  >
                    {order.order_number}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                  <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <p className="font-bold text-venuea-dark mb-1 flex items-center gap-1">
                      <ShoppingBag size={10} /> 주문 품목
                    </p>
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-[10px]">
                        <span>{item.name}</span>
                        <span className="font-bold">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 space-y-2">
                  <div>
                    <p className="font-bold text-gray-900 flex items-center gap-1">
                      <Users size={14} className="text-gray-400" />
                      {order.customer_name}
                    </p>
                    <p className="text-xs text-venuea-gold font-medium">{order.customer_phone || '연락처 없음'}</p>
                    <p className="text-[10px] text-gray-400">{order.customer_email}</p>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                    <p className="text-[10px] font-bold text-blue-600 mb-1 flex items-center gap-1">
                      <Truck size={10} /> 배송지 정보
                    </p>
                    <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                      {order.shipping_address}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-venuea-dark">{formatPrice(order.total_amount)}</p>
                  {order.used_points > 0 && <p className="text-[10px] text-red-500 font-medium">-{formatPrice(order.used_points)} (Point)</p>}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    order.status === 'pending' && "bg-gray-50 text-gray-500",
                    order.status === 'paid' && "bg-blue-50 text-blue-600",
                    order.status === 'shipping' && "bg-blue-600 text-white",
                    order.status === 'delivered' && "bg-green-50 text-green-600",
                    order.status === 'completed' && "bg-venuea-gold/10 text-venuea-gold",
                    order.status === 'refund_requested' && "bg-orange-50 text-orange-600",
                    order.status === 'refunded' && "bg-red-50 text-red-600"
                  )}>
                    {getStatusText(order.status)}
                  </span>
                  {order.refund_reason && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded inline-block">사유: {order.refund_reason}</p>
                      {order.refund_amount > 0 && (
                        <p className="text-[10px] font-bold text-venuea-gold">환불 예정/완료: {formatPrice(order.refund_amount)}</p>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-y-2">
                  <select 
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="w-full border border-gray-200 rounded p-1 text-xs focus:outline-none focus:border-venuea-gold mb-2"
                  >
                    <option value="pending">결제대기</option>
                    <option value="paid">결제완료</option>
                    <option value="shipping">배송중</option>
                    <option value="delivered">배송완료</option>
                    <option value="completed">구매확정</option>
                    <option value="refund_requested">환불요청</option>
                    <option value="refunded">환불완료</option>
                  </select>
                  
                  {order.status === 'paid' && (
                    <button 
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsTrackingModalOpen(true);
                      }}
                      className="w-full bg-venuea-dark text-white text-[10px] font-bold py-2 rounded-lg hover:bg-venuea-gold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Truck size={12} />
                      운송장 등록
                    </button>
                  )}
                  
                  {order.tracking_number && (
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{order.shipping_company}</p>
                      <p className="text-[11px] font-mono font-bold text-venuea-dark">{order.tracking_number}</p>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !isLoading && (
          <div className="p-20 text-center text-gray-400">주문 내역이 없습니다.</div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-sm px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-xl font-bold font-serif text-gray-900">주문 상세 내역</h2>
                  <p className="text-xs text-venuea-gold mt-1 font-mono uppercase tracking-widest">{selectedOrder.order_number}</p>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Status Update */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">주문 상태 변경</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        selectedOrder.status === 'completed' ? 'bg-green-100 text-green-700' :
                        selectedOrder.status === 'refunded' ? 'bg-red-100 text-red-700' :
                        'bg-venuea-gold/10 text-venuea-gold'
                      }`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                      <ArrowRight size={14} className="text-gray-300" />
                      <select 
                        value={selectedOrder.status}
                        onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                        className="text-xs font-bold border-none bg-transparent outline-none focus:ring-0 cursor-pointer text-venuea-dark"
                      >
                        <option value="pending">결제대기</option>
                        <option value="paid">결제완료</option>
                        <option value="shipping">배송중</option>
                        <option value="delivered">배송완료</option>
                        <option value="completed">구매확정</option>
                        <option value="refund_requested">환불요청</option>
                        <option value="refunded">환불완료</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-bold border-l-4 border-venuea-gold pl-3 mb-4">고객 정보</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-400">성함</span>
                        <span className="text-sm font-medium">{selectedOrder.customer_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-400">연락처</span>
                        <span className="text-sm font-medium">{selectedOrder.customer_phone}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-400">이메일</span>
                        <span className="text-sm font-medium">{selectedOrder.customer_email}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold border-l-4 border-venuea-gold pl-3 mb-4">배송지 정보</h3>
                    <div className="space-y-3">
                      <div className="py-2">
                        <span className="text-xs text-gray-400 block mb-1">배송 주소</span>
                        <span className="text-sm font-medium leading-relaxed">{selectedOrder.shipping_address}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tracking Info (If shipping or beyond) */}
                {['shipping', 'delivered', 'completed', 'refund_requested', 'refunded'].includes(selectedOrder.status) && (
                  <div>
                    <h3 className="text-sm font-bold border-l-4 border-venuea-gold pl-3 mb-4">배송 정보</h3>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">택배사</span>
                        <span className="text-sm font-medium">{selectedOrder.shipping_company || '미입력'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">송장번호</span>
                        <span className="text-sm font-mono font-bold text-venuea-gold">{selectedOrder.tracking_number || '미입력'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div>
                  <h3 className="text-sm font-bold border-l-4 border-venuea-gold pl-3 mb-4">주문 품목</h3>
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-4">
                    <div className="bg-gray-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 grid grid-cols-6">
                      <span className="col-span-3">상품명</span>
                      <span className="text-center">단가</span>
                      <span className="text-center">수량</span>
                      <span className="text-right">소계</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedOrder.items?.map((item: any) => (
                        <div key={item.id} className="px-4 py-3 grid grid-cols-6 items-center text-xs">
                          <span className="col-span-3 font-medium">{item.name}</span>
                          <span className="text-center text-gray-500">{formatPrice(item.price)}</span>
                          <span className="text-center font-bold">x{item.quantity}</span>
                          <span className="text-right font-bold text-venuea-dark">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-gray-50 space-y-2">
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-400">포인트 사용</span>
                          <span className="text-red-500 font-bold">-{formatPrice(selectedOrder.used_points || 0)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-gray-200">
                          <span className="text-gray-900">최종 결제 금액</span>
                          <span className="text-lg text-venuea-gold">{formatPrice(selectedOrder.total_amount)}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bottom-0 sticky bg-gray-50 p-6 flex justify-end gap-3 rounded-b-2xl">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-6 py-2 rounded-lg text-sm font-bold border border-gray-200 hover:bg-white transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTrackingModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-bold flex items-center gap-2">
                  <Truck size={20} className="text-venuea-dark" />
                  <span>운송장 번호 입력</span>
                </h2>
                <button onClick={() => setIsTrackingModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleTrackingSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">배송사 선택</label>
                  <select 
                    value={trackingForm.company}
                    onChange={e => setTrackingForm({...trackingForm, company: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-venuea-dark/5"
                  >
                    <option value="CJ대한통운">CJ대한통운</option>
                    <option value="한진택배">한진택배</option>
                    <option value="롯데택배">롯데택배</option>
                    <option value="우체국택배">우체국택배</option>
                    <option value="로젠택배">로젠택배</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">운송장 번호</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={trackingForm.number}
                    onChange={e => setTrackingForm({...trackingForm, number: e.target.value})}
                    placeholder="숫자만 입력해 주세요"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-venuea-dark/5 font-mono"
                  />
                </div>
                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full bg-venuea-dark text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all shadow-lg shadow-venuea-dark/10"
                  >
                    배송 시작 처리
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed">
                    운송장을 등록하면 주문 상태가 즉시 <span className="text-blue-600 font-bold">'배송중'</span>으로 변경됩니다.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminUserPoints() {
  const [pointData, setPointData] = useState({ email: "", amount: 0 });

  const handleGrantPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/users/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pointData)
      });
      if (res.ok) {
        toast.success(`${pointData.email}님께 ${pointData.amount} 포인트가 지급되었습니다.`);
        setPointData({ email: "", amount: 0 });
      } else {
        const d = await res.json();
        toast.error(d.error || "지급 실패");
      }
    } catch { toast.error("서버 오류"); }
  };

  return (
    <div className="space-y-12">
      <h1 className="text-2xl font-serif font-bold text-gray-900">회원/포인트 관리</h1>
      
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-xl">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">임의 포인트 지급</h2>
        <form onSubmit={handleGrantPoints} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">사용자 이메일</label>
            <input 
              type="email" 
              value={pointData.email}
              onChange={e => setPointData({...pointData, email: e.target.value})}
              className="w-full border-b border-gray-200 py-3 text-lg font-bold focus:outline-none focus:border-venuea-gold transition-colors"
              placeholder="example@benua.shop"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">지급 포인트 (차감 시 마이너스 입력)</label>
            <div className="relative">
              <input 
                type="number" 
                value={pointData.amount}
                onChange={e => setPointData({...pointData, amount: parseInt(e.target.value)})}
                className="w-full border-b border-gray-200 py-3 text-lg font-bold pr-12 focus:outline-none focus:border-venuea-gold transition-colors"
                required
              />
              <span className="absolute right-0 bottom-3 font-bold text-gray-400">P</span>
            </div>
          </div>
          <button className="w-full bg-venuea-dark text-white py-4 rounded-xl font-bold hover:bg-venuea-gold transition-all shadow-lg hover:shadow-venuea-gold/20 mt-4">포인트 적용하기</button>
        </form>
      </div>

      <div className="bg-amber-50 rounded-xl p-8 border border-amber-100 max-w-xl">
        <h3 className="text-amber-800 font-bold mb-4 flex items-center space-x-2">
          <span>등급 산정 기준 확인</span>
        </h3>
        <ul className="space-y-3 text-sm text-amber-900/70">
          <li className="flex justify-between"><span>Beige</span> <span>신규 가입</span></li>
          <li className="flex justify-between font-bold border-b border-amber-200 pb-1"><span>Green</span> <span>10만원 이상</span></li>
          <li className="flex justify-between font-bold border-b border-amber-200 pb-1"><span>Black</span> <span>50만원 이상</span></li>
          <li className="flex justify-between font-bold text-black"><span>The Black</span> <span>100만원 이상</span></li>
        </ul>
      </div>
    </div>
  );
}

function AdminKeys() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState("");

  const fetchKeys = async () => {
    const res = await fetch("/api/admin/keys");
    if (res.ok) {
      setKeys(await res.json());
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyValue: newKey })
      });
      if (res.ok) {
        toast.success("관리자 Key가 추가되었습니다.");
        setNewKey("");
        fetchKeys();
      } else {
        const data = await res.json();
        toast.error(data.error || "추가 실패");
      }
    } catch {
      toast.error("서버 오류");
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm("이 관리자 Key를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("관리자 Key가 삭제되었습니다.");
        fetchKeys();
      } else {
        const data = await res.json();
        toast.error(data.error || "삭제 실패");
      }
    } catch {
      toast.error("서버 오류");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-serif font-bold text-gray-900">관리자 Key 관리</h1>
        <p className="text-sm text-gray-500 mt-1">시스템에 접근할 수 있는 관리자 Key와 2FA 상태를 관리합니다.</p>
      </header>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">새 Key 추가</h2>
        <form onSubmit={handleAddKey} className="flex gap-4">
          <input 
            type="text" 
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="새로운 관리자 Key 입력"
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-venuea-gold transition-colors"
          />
          <button type="submit" className="bg-venuea-dark text-white px-6 py-2 rounded-lg font-medium hover:bg-venuea-gold transition-colors">
            추가
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">관리자 Key</th>
              <th className="px-6 py-4 font-medium">2FA 상태</th>
              <th className="px-6 py-4 font-medium">생성일</th>
              <th className="px-6 py-4 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {keys.map((key) => (
              <tr key={key.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-mono text-venuea-dark">{key.key_value}</td>
                <td className="px-6 py-4">
                  {key.has_2fa ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      <CheckCircle2 size={12} /> 등록됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                      <AlertCircle size={12} /> 미등록
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(key.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDeleteKey(key.id)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/inquiries");
      const data = await response.json();
      setInquiries(data);
    } catch (error) {
      toast.error("문의 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setIsReplying(true);

    try {
      const response = await fetch(`/api/admin/inquiries/${selectedInquiry.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyMessage })
      });

      if (response.ok) {
        toast.success("답변이 전송되었습니다.");
        setSelectedInquiry(null);
        setReplyMessage("");
        fetchInquiries();
      } else {
        toast.error("답변 전송 실패");
      }
    } catch (error) {
      toast.error("서버 오류");
    } finally {
      setIsReplying(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-venuea-gold" size={24} /></div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">고객 문의 관리</h1>
        <p className="text-sm text-gray-500">고객님들이 남겨주신 문의 사항을 확인하고 답변하세요.</p>
      </header>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">상태</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">고객/이메일</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">제목</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px]">날짜</th>
              <th className="px-6 py-4 font-medium uppercase tracking-widest text-[10px] text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inquiries.map((inquiry) => (
              <tr key={inquiry.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    inquiry.status === 'replied' 
                      ? "bg-green-50 text-green-700" 
                      : "bg-red-50 text-red-700"
                  )}>
                    {inquiry.status === 'replied' ? "답변완료" : "답변대기"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{inquiry.name}</p>
                  <p className="text-xs text-gray-500">{inquiry.email}</p>
                </td>
                <td className="px-6 py-4 font-medium text-gray-700">{inquiry.subject}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                  {new Date(inquiry.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedInquiry(inquiry)}
                    className="p-2 text-venuea-dark hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ExternalLink size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold">문의 내용 확인</h2>
                  <p className="text-xs text-gray-500 mt-1">{selectedInquiry.email}님의 문의</p>
                </div>
                <button onClick={() => setSelectedInquiry(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">문의 제목</h4>
                    <p className="text-lg font-bold text-gray-900">{selectedInquiry.subject}</p>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">상세 내역</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedInquiry.message}</p>
                    </div>
                  </div>

                  {selectedInquiry.status === 'replied' ? (
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} /> 보낸 답변
                      </h4>
                      <p className="text-green-800 whitespace-pre-wrap">{selectedInquiry.reply_message}</p>
                      <p className="text-[10px] text-green-600 mt-4 uppercase tracking-widest">
                        발송일: {new Date(selectedInquiry.replied_at).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleReply} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">답변 작성</label>
                        <textarea 
                          rows={6}
                          required
                          value={replyMessage}
                          onChange={e => setReplyMessage(e.target.value)}
                          placeholder="이메일로 발송될 답변 내용을 입력해 주세요."
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-venuea-dark/10 resize-none text-sm"
                        />
                      </div>
                      <button 
                        disabled={isReplying}
                        className="w-full bg-venuea-dark text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 disabled:opacity-50 shadow-lg shadow-venuea-dark/20"
                      >
                        <Reply size={18} />
                        <span>{isReplying ? "전송 중..." : "답변 메일 보내기"}</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from "react";
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
  Truck,
  Trash2,
  Loader2,
  X,
  MessageSquare,
  Mail,
  LogOut,
  Ticket,
  Download,
  Upload,
  FileText,
  ArrowRight,
  Activity,
  Shield,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import AdminLogs from "./AdminLogs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatPrice, formatOrderStatus } from "../lib/utils";
import { toast } from "sonner";
import { isAdminSubdomain } from "../lib/subdomain";
import { apiFetch, authStorage } from "../lib/api";
import type { Product, Order } from "../types";

const PRODUCT_CATEGORIES = [
  "오브제",
  "세라믹 오브제",
  "글래스 오브제",
  "아로마 오브제",
  "공간 오브제",
];

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: "결제대기",
    paid: "결제완료",
    shipping: "배송중",
    delivered: "배송완료",
    completed: "구매확정",
    refund_requested: "환불요청",
    refunded: "환불완료",
  };
  return map[status] || status;
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "shipping":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "completed":
      return "bg-gray-900 text-white border-gray-900";
    case "refund_requested":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "refunded":
      return "bg-red-50 text-red-600 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isAdminSub = isAdminSubdomain();
  const adminPathBase = isAdminSub ? "" : "/admin";
  const [adminRole, setAdminRole] = useState<string>("MASTER");
  const [unreadMail, setUnreadMail] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiFetch("/api/admin/check");
        if (!response.ok) {
          navigate(isAdminSub ? "/login" : "/admin/login");
        } else {
          const data = await response.json();
          setAdminRole(data.role || "MASTER");
        }
      } catch {
        navigate(isAdminSub ? "/login" : "/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate, isAdminSub]);

  useEffect(() => {
    if (isCheckingAuth) return;
    apiFetch("/api/admin/inbox")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        setUnreadMail(Array.isArray(rows) ? rows.filter((mail) => !mail.is_read).length : 0);
      })
      .catch(() => {});
  }, [isCheckingAuth, location.pathname]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-venuea-gold" size={40} />
      </div>
    );
  }

  const allSidebarLinks = [
    { name: "대시보드", path: `${adminPathBase}/`, icon: LayoutDashboard },
    { name: "오브제 관리", path: `${adminPathBase}/products`, icon: Package },
    { name: "주문/클레임 관리", path: `${adminPathBase}/orders`, icon: ShoppingBag },
    { name: "정산 관리", path: `${adminPathBase}/settlement`, icon: FileText },
    { name: "운송장 일괄등록", path: `${adminPathBase}/fulfillment`, icon: Truck },
    { name: "리뷰 관리", path: `${adminPathBase}/reviews`, icon: MessageSquare },
    { name: "전시/배너 관리", path: `${adminPathBase}/display`, icon: LayoutDashboard },
    { name: "1:1 문의 관리", path: `${adminPathBase}/inquiries`, icon: MessageSquare },
    { name: "받은 메일", path: `${adminPathBase}/inbox`, icon: Mail },
    { name: "고객/포인트 관리", path: `${adminPathBase}/customers`, icon: Users },
    { name: "쿠폰 관리", path: `${adminPathBase}/coupons`, icon: Ticket },
    { name: "뉴스레터 발송", path: `${adminPathBase}/newsletter`, icon: FileText },
    { name: "감사 로그", path: `${adminPathBase}/logs`, icon: Activity, requiresAdmin: true },
    { name: "보안 키 관리", path: `${adminPathBase}/keys`, icon: Settings, requiresAdmin: true },
  ];

  const sidebarLinks = allSidebarLinks.filter((link) => {
    if (link.requiresAdmin && (adminRole === "OPERATOR" || adminRole === "CS")) {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    await apiFetch("/api/admin/logout", { method: "POST" });
    authStorage.clearAdminToken();
    navigate(isAdminSub ? "/login" : "/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 md:hidden">
        <h2 className="font-logo text-sm uppercase tracking-widest text-venuea-dark">
          Benua Admin
        </h2>
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 text-venuea-dark hover:bg-gray-100 rounded-lg"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Mobile Sidebar */}
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
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 md:hidden p-6 flex flex-col shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="font-logo text-2xl tracking-[4px] uppercase text-venuea-dark">
                    Benua
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-venuea-gold block">
                    {adminRole}
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-900"
                >
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
                        "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-venuea-dark text-white shadow-md"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{link.name}</span>
                      {link.path.endsWith("/inbox") && unreadMail > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-venuea-green text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadMail}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-gray-100 mt-6">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-3"
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
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block shrink-0">
        <div className="p-6 sticky top-0 max-h-screen overflow-y-auto">
          <div className="mb-8 pl-4">
            <h1 className="font-logo text-2xl tracking-[4px] uppercase text-venuea-dark">Benua</h1>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-venuea-gold block mt-0.5">
              {adminRole} CONSOLE
            </span>
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
                      ? "bg-venuea-dark text-white shadow-md"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 pt-6 border-t border-gray-100">
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
      <main className="flex-grow p-4 md:p-8 overflow-x-hidden pt-[72px] md:pt-8">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/orders" element={<AdminOrders />} />
          <Route path="/settlement" element={<AdminSettlement />} />
          <Route path="/fulfillment" element={<AdminFulfillment />} />
          <Route path="/reviews" element={<AdminReviews />} />
          <Route path="/display" element={<AdminDisplay />} />
          <Route path="/customers" element={<AdminUserPoints adminRole={adminRole} />} />
          <Route path="/coupons" element={<AdminCoupons />} />
          <Route path="/inquiries" element={<AdminInquiries adminRole={adminRole} />} />
          <Route path="/inbox" element={<AdminInbox />} />
          <Route path="/newsletter" element={<AdminNewsletter />} />
          {(adminRole === "MASTER" || adminRole === "ADMIN") && (
            <>
              <Route path="/logs" element={<AdminLogs />} />
              <Route path="/keys" element={<AdminKeys adminRole={adminRole} />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

/* =========================================================
   1. Overview & Sales Chart
========================================================= */
function AdminOverview() {
  const [stats, setStats] = useState({
    dailySales: 0,
    weeklySales: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/admin/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    apiFetch("/api/admin/dashboard/chart-data")
      .then((r) => r.json())
      .then((d) => setChartData(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in">
      <header>
        <h1 className="text-2xl font-serif font-bold text-gray-900">대시보드 요약</h1>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">오늘 매출</h3>
          <p className="text-2xl font-bold mt-2">{formatPrice(stats.dailySales)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">최근 7일 매출</h3>
          <p className="text-2xl font-bold mt-2">{formatPrice(stats.weeklySales)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">출고 대기 주문</h3>
          <p className="text-2xl font-bold mt-2">{stats.pendingOrders}건</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">품절 임박 오브제</h3>
          <p className="text-2xl font-bold mt-2">{stats.lowStockProducts}개</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-6">최근 30일 매출 추이</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(val: any) => formatPrice(Number(val))} />
              <Line type="monotone" dataKey="amount" stroke="#C5A059" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   2. Products Management (Fixed duplicate stock & added dimensions)
========================================================= */
function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const initialProductState = {
    name: "",
    price: 0,
    discount_rate: 0,
    show_on_main: 0,
    category: "오브제",
    description: "",
    stock: 10,
    material: "",
    dimensions: "",
    origin: "",
    manufacturer: "",
  };

  const [newProduct, setNewProduct] = useState(initialProductState);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [descImage, setDescImage] = useState<File | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch("/api/products");
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("오브제 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await apiFetch("/api/admin/products/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products: results.data }),
          });
          if (response.ok) {
            toast.success(`${results.data.length}건의 오브제가 등록되었습니다.`);
            fetchProducts();
          } else {
            toast.error("CSV 대량 등록에 실패했습니다.");
          }
        } catch {
          toast.error("CSV 업로드 중 오류가 발생했습니다.");
        }
      },
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", newProduct.name);
    formData.append("price", String(newProduct.price));
    formData.append("discount_rate", String(newProduct.discount_rate));
    formData.append("show_on_main", String(newProduct.show_on_main));
    formData.append("category", newProduct.category);
    formData.append("description", newProduct.description);
    formData.append("stock", String(newProduct.stock));
    formData.append("material", newProduct.material);
    formData.append("dimensions", newProduct.dimensions);
    formData.append("origin", newProduct.origin);
    formData.append("manufacturer", newProduct.manufacturer);

    if (mainImage) formData.append("image", mainImage);
    if (descImage) formData.append("description_image", descImage);

    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";
      const response = await apiFetch(url, { method, body: formData });
      const data = await response.json();

      if (response.ok) {
        toast.success(editingId ? "오브제 정보가 수정되었습니다." : "새 오브제가 등록되었습니다.");
        setIsModalOpen(false);
        setEditingId(null);
        setNewProduct(initialProductState);
        setMainImage(null);
        setDescImage(null);
        fetchProducts();
      } else {
        toast.error(data.error || "저장에 실패했습니다.");
      }
    } catch {
      toast.error("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setNewProduct({
      name: product.name,
      price: product.price,
      discount_rate: product.discount_rate || 0,
      show_on_main: product.show_on_main || 0,
      category: product.category || "오브제",
      description: product.description || "",
      stock: product.stock || 0,
      material: product.material || "",
      dimensions: product.dimensions || "",
      origin: product.origin || "",
      manufacturer: product.manufacturer || "",
    });
    setMainImage(null);
    setDescImage(null);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("이 오브제를 삭제하시겠습니까?")) return;
    try {
      const response = await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("삭제되었습니다.");
        fetchProducts();
      }
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-serif font-bold text-gray-900">오브제 관리</h1>
        <div className="flex space-x-3">
          <label className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <Upload size={18} />
            <span>CSV 일괄 등록</span>
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>
          <button
            onClick={() => {
              setEditingId(null);
              setNewProduct(initialProductState);
              setIsModalOpen(true);
            }}
            className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-venuea-gold transition-all"
          >
            <Plus size={18} />
            <span>오브제 등록</span>
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                오브제 정보
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                카테고리
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                재고 / 판매가
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-right">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center">
                  <Loader2 className="animate-spin mx-auto text-venuea-gold" />
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={product.image_url || "https://picsum.photos/seed/objet/100/100"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-bold text-gray-900">{product.name}</p>
                          {product.show_on_main === 1 && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase border border-amber-200">
                              Main
                            </span>
                          )}
                        </div>
                        {product.dimensions && (
                          <p className="text-[11px] text-gray-400">규격: {product.dimensions}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    {product.category}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 w-fit",
                          (product.stock || 0) < 5
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        재고: {product.stock || 0}개
                      </span>
                      {product.discount_rate && product.discount_rate > 0 ? (
                        <div>
                          <span className="text-red-500 text-xs font-bold mr-1.5">
                            {product.discount_rate}%
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatPrice(product.price * (1 - product.discount_rate / 100))}
                          </span>
                          <span className="text-gray-400 line-through text-xs ml-1.5">
                            {formatPrice(product.price)}
                          </span>
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
                        className="text-venuea-dark hover:text-venuea-gold p-1.5"
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-400 hover:text-red-600 p-1.5"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
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
                <h2 className="text-xl font-bold">
                  {editingId ? "상품 수정" : "상품 등록"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <form
                onSubmit={handleSaveProduct}
                className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">상품명</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">정상가 (원)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.price}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, price: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">할인율 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={newProduct.discount_rate}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          discount_rate: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">카테고리</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">재고 수량</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.stock}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, stock: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">소재</label>
                    <input
                      type="text"
                      value={newProduct.material}
                      onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">규격</label>
                    <input
                      type="text"
                      value={newProduct.dimensions}
                      onChange={(e) => setNewProduct({ ...newProduct, dimensions: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">원산지</label>
                    <input
                      type="text"
                      value={newProduct.origin}
                      onChange={(e) => setNewProduct({ ...newProduct, origin: e.target.value })}
                      placeholder="대한민국"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">제조사</label>
                    <input
                      type="text"
                      value={newProduct.manufacturer}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, manufacturer: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <input
                    type="checkbox"
                    id="show_on_main"
                    checked={newProduct.show_on_main === 1}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, show_on_main: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-venuea-gold"
                  />
                  <label
                    htmlFor="show_on_main"
                    className="text-sm font-bold text-venuea-dark cursor-pointer"
                  >
                    메인 노출
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">대표 이미지</label>
                  <input
                    type="file"
                    accept="image/*"
                    required={!editingId}
                    onChange={(e) => setMainImage(e.target.files ? e.target.files[0] : null)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    상세 설명 이미지 (선택)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDescImage(e.target.files ? e.target.files[0] : null)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">설명</label>
                  <textarea
                    rows={3}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-venuea-dark text-white py-3 rounded-lg font-bold hover:bg-venuea-gold transition-colors"
                >
                  {editingId ? "저장" : "등록"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================================================
   3. Orders & Claims Management (Complete Implementation)
========================================================= */
function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    company: "CJ대한통운",
    number: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      toast.error("주문 내역을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      const res = await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`주문 상태가 '${getStatusText(status)}'(으)로 변경되었습니다.`);
        fetchOrders();
      } else {
        toast.error(data.error || "상태 변경 실패");
      }
    } catch {
      toast.error("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleSaveTracking = async (orderId: number) => {
    if (!trackingForm.number.trim()) {
      toast.error("운송장 번호를 입력해주세요.");
      return;
    }
    try {
      const res = await apiFetch(`/api/admin/orders/${orderId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_company: trackingForm.company,
          tracking_number: trackingForm.number.trim(),
        }),
      });
      if (res.ok) {
        toast.success("운송장이 등록되어 배송중 상태로 전환되었습니다.");
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error("운송장 등록에 실패했습니다.");
      }
    } catch {
      toast.error("운송장 등록 중 오류가 발생했습니다.");
    }
  };

  const handleClaimAction = async (orderId: number, action: "approve" | "reject") => {
    if (
      !confirm(
        action === "approve"
          ? "환불을 승인하시겠습니까? (토스 결제 취소 및 재고/포인트 복구가 자동 실행됩니다)"
          : "환불 요청을 반려하고 구매확정 상태로 전환하시겠습니까?"
      )
    )
      return;

    try {
      const res = await apiFetch(`/api/admin/orders/${orderId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(action === "approve" ? "환불 승인이 완료되었습니다." : "클레임이 반려되었습니다.");
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error(data.error || "클레임 처리 실패");
      }
    } catch {
      toast.error("클레임 처리 중 오류가 발생했습니다.");
    }
  };

  const openDelete = (order: Order) => {
    setDeleteTarget(order);
    setDeleteConfirm("");
    setDeleteError("");
  };

  const handleDeleteOrder = async () => {
    if (!deleteTarget) return;
    if (deleteConfirm !== "삭제") {
      setDeleteError("삭제하려면 삭제 라고 입력해주세요.");
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await apiFetch(`/api/admin/orders/${deleteTarget.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "주문 삭제에 실패했습니다.");
        return;
      }
      toast.success("주문을 삭제했습니다.");
      if (selectedOrder?.id === deleteTarget.id) setSelectedOrder(null);
      setDeleteTarget(null);
      fetchOrders();
    } catch {
      setDeleteError("주문 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await apiFetch("/api/admin/orders/export");
      const data = await res.json();
      const csv = Papa.unparse(data);
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `benua_orders_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch {
      toast.error("CSV 내보내기에 실패했습니다.");
    }
  };

  const filteredOrders =
    statusFilter === "ALL" ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">주문 및 클레임 관리</h1>
          <p className="text-xs text-gray-500 mt-1">
            운송장 입력, 주문 상태 변경, 토스페이먼츠 연동 자동 환불을 관리합니다.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50"
        >
          <Download size={16} />
          <span>CSV 내보내기</span>
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {["ALL", "pending", "paid", "shipping", "delivered", "completed", "refund_requested", "refunded"].map(
          (st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors",
                statusFilter === st
                  ? "bg-venuea-dark text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {st === "ALL" ? "전체" : getStatusText(st)}
            </button>
          )
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-xs font-bold uppercase text-gray-500">주문번호 / 일시</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase text-gray-500">주문자</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase text-gray-500">결제금액 / 수단</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase text-gray-500">상태</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase text-gray-500 text-right">
                  상세 / 처리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-venuea-gold" />
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    해당 상태의 주문 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleString("ko-KR")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{formatPrice(order.total_amount)}</p>
                      <p className="text-xs text-gray-400 uppercase">{order.payment_method}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold border",
                          getStatusBadgeClass(order.status)
                        )}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      >
                        <option value="pending">결제대기</option>
                        <option value="paid">결제완료</option>
                        <option value="shipping">배송중</option>
                        <option value="delivered">배송완료</option>
                        <option value="completed">구매확정</option>
                        <option value="refund_requested">환불요청</option>
                        <option value="refunded">환불완료</option>
                      </select>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setTrackingForm({
                            company: order.shipping_company || "CJ대한통운",
                            number: order.tracking_number || "",
                          });
                        }}
                        className="px-3 py-1.5 bg-venuea-dark text-white rounded-lg text-xs font-bold hover:bg-venuea-gold transition-colors"
                      >
                        상세/운송장
                      </button>
                      <button
                        onClick={() => openDelete(order)}
                        className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Tracking Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold">주문 상세 ({selectedOrder.order_number})</h3>
                  <p className="text-xs text-gray-400">{selectedOrder.customer_name} 고객님</p>
                </div>
                <button onClick={() => setSelectedOrder(null)}>
                  <X size={22} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-bold text-gray-500 mr-2">연락처:</span>
                  {selectedOrder.customer_phone || "-"}
                </p>
                <p>
                  <span className="font-bold text-gray-500 mr-2">배송지:</span>
                  {selectedOrder.shipping_address}
                </p>
                {selectedOrder.refund_reason && (
                  <p className="text-red-600 bg-red-50 p-3 rounded-lg text-xs">
                    <b>환불 요청 사유:</b> {selectedOrder.refund_reason} (예상 환불액:{" "}
                    {formatPrice(selectedOrder.refund_amount || selectedOrder.total_amount)})
                  </p>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-gray-400">주문 오브제 목록</h4>
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase text-gray-400">운송장 등록 / 수정</h4>
                <div className="flex gap-2">
                  <select
                    value={trackingForm.company}
                    onChange={(e) => setTrackingForm({ ...trackingForm, company: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="CJ대한통운">CJ대한통운</option>
                    <option value="우체국택배">우체국택배</option>
                    <option value="한진택배">한진택배</option>
                    <option value="로젠택배">로젠택배</option>
                  </select>
                  <input
                    type="text"
                    value={trackingForm.number}
                    onChange={(e) => setTrackingForm({ ...trackingForm, number: e.target.value })}
                    placeholder="운송장 번호 입력"
                    className="flex-grow border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => handleSaveTracking(selectedOrder.id)}
                    className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-venuea-gold"
                  >
                    발송처리
                  </button>
                </div>
              </div>

              {selectedOrder.status === "refund_requested" && (
                <div className="border-t pt-4 flex gap-3">
                  <button
                    onClick={() => handleClaimAction(selectedOrder.id, "approve")}
                    className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-red-700"
                  >
                    환불 승인 (PG 취소)
                  </button>
                  <button
                    onClick={() => handleClaimAction(selectedOrder.id, "reject")}
                    className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-300"
                  >
                    환불 반려
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">주문을 삭제할까요?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {deleteTarget.order_number} 주문은 복구할 수 없습니다. 결제된 주문이면 결제 취소와 재고·포인트
              복구 후 지웁니다. 아래에 삭제 라고 입력해주세요.
            </p>
            {deleteError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {deleteError}
              </p>
            )}
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="삭제"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 border border-gray-200 bg-white rounded-xl text-xs font-bold"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirm !== "삭제"}
                onClick={handleDeleteOrder}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold disabled:opacity-40"
              >
                {isDeleting ? "삭제 중" : "주문 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   4. Display / Banner Management (Fixed Save Handler)
========================================================= */
function AdminDisplay() {
  const slots = [
    { id: "main-banner", label: "메인 히어로 배너" },
    { id: "promo-section", label: "미드 프로모션 배너" },
    { id: "popup", label: "스토어 공지 팝업" },
  ];

  const [formMap, setFormMap] = useState<
    Record<string, { image_url: string; link_url: string; is_active: number }>
  >({});

  const fetchDisplay = async () => {
    try {
      const res = await apiFetch("/api/admin/display");
      const data = await res.json();
      if (Array.isArray(data)) {
        const nextMap: Record<string, { image_url: string; link_url: string; is_active: number }> = {};
        for (const item of data) {
          nextMap[item.id] = {
            image_url: item.image_url || "",
            link_url: item.link_url || "",
            is_active: item.is_active ?? 1,
          };
        }
        setFormMap(nextMap);
      }
    } catch {
      toast.error("전시 설정을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    fetchDisplay();
  }, []);

  const handleSaveSlot = async (id: string) => {
    const slotData = formMap[id] || { image_url: "", link_url: "", is_active: 1 };
    try {
      const res = await apiFetch("/api/admin/display", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          type: id,
          image_url: slotData.image_url,
          link_url: slotData.link_url,
          is_active: slotData.is_active,
        }),
      });
      if (res.ok) {
        toast.success(`${id} 전시 설정이 저장되었습니다.`);
        fetchDisplay();
      } else {
        toast.error("전시 설정 저장 실패");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in">
      <h2 className="text-xl font-bold font-serif mb-6">전시 및 배너 관리</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map(({ id, label }) => {
          const current = formMap[id] || { image_url: "", link_url: "", is_active: 1 };
          return (
            <div key={id} className="border border-gray-200 p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900">{label}</h3>
                <span className="text-[11px] font-mono text-gray-400">{id}</span>
              </div>
              <input
                placeholder="이미지 URL 입력"
                value={current.image_url}
                onChange={(e) =>
                  setFormMap({
                    ...formMap,
                    [id]: { ...current, image_url: e.target.value },
                  })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="클릭 시 이동할 링크 URL (예: /shop)"
                value={current.link_url}
                onChange={(e) =>
                  setFormMap({
                    ...formMap,
                    [id]: { ...current, link_url: e.target.value },
                  })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleSaveSlot(id)}
                className="w-full bg-venuea-dark text-white py-2.5 rounded-lg text-xs font-bold hover:bg-venuea-gold transition-colors"
              >
                저장하기
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   5. Settlement, Fulfillment, Reviews, Coupons, Newsletter
========================================================= */
function AdminSettlement() {
  const [report, setReport] = useState<any[]>([]);
  const [dates, setDates] = useState({
    startDate: "2026-01-01",
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    apiFetch(`/api/admin/settlement?startDate=${dates.startDate}&endDate=${dates.endDate}`)
      .then((r) => r.json())
      .then((d) => setReport(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [dates]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in">
      <h2 className="text-xl font-bold font-serif mb-6">결제수단별 정산 리포트 (구매확정 기준)</h2>
      <div className="flex gap-4 mb-6">
        <input
          type="date"
          value={dates.startDate}
          onChange={(e) => setDates({ ...dates, startDate: e.target.value })}
          className="border border-gray-200 p-2 rounded-lg text-sm"
        />
        <input
          type="date"
          value={dates.endDate}
          onChange={(e) => setDates({ ...dates, endDate: e.target.value })}
          className="border border-gray-200 p-2 rounded-lg text-sm"
        />
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left p-3">결제수단</th>
            <th className="text-right p-3">주문건수</th>
            <th className="text-right p-3">총 결제금액</th>
            <th className="text-right p-3">PG 수수료</th>
            <th className="text-right p-3">정산 예정금액</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {report.map((r) => (
            <tr key={r.payment_method}>
              <td className="p-3 font-medium uppercase">{r.payment_method}</td>
              <td className="text-right p-3">{r.order_count}건</td>
              <td className="text-right p-3">{formatPrice(r.total_amount)}</td>
              <td className="text-right p-3 text-red-500">-{formatPrice(r.commission)}</td>
              <td className="text-right p-3 font-bold">{formatPrice(r.net_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminFulfillment() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return toast.error("CSV 파일을 선택해주세요.");
    const formData = new FormData();
    formData.append("csv", file);
    const res = await apiFetch("/api/admin/fulfillment/tracking-bulk", {
      method: "POST",
      body: formData,
    });
    if (res.ok) toast.success("운송장 일괄 등록이 완료되었습니다.");
    else toast.error("일괄 등록에 실패했습니다.");
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in space-y-4">
      <h2 className="text-xl font-bold font-serif">운송장 CSV 일괄 등록</h2>
      <p className="text-xs text-gray-500">
        첫 줄 헤더 이후 <code>주문번호,운송장번호,택배사</code> 형식의 CSV 파일을 업로드하면 자동으로 배송중 처리됩니다.
      </p>
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm border border-gray-200 rounded-lg p-2"
        />
        <button
          onClick={handleUpload}
          className="bg-venuea-dark text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-venuea-gold"
        >
          일괄 업로드
        </button>
      </div>
    </div>
  );
}

function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const toggleHidden = async (id: number, isHidden: boolean) => {
    const res = await apiFetch(`/api/admin/reviews/${id}/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !isHidden }),
    });
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_hidden: !isHidden ? 1 : 0 } : r))
      );
      toast.success(!isHidden ? "작성자에게만 보이도록 숨겼습니다." : "리뷰를 다시 공개했습니다.");
    } else {
      toast.error("리뷰 공개 설정에 실패했습니다.");
    }
  };

  const toggleBest = async (id: number, isBest: boolean) => {
    const res = await apiFetch(`/api/admin/reviews/${id}/best`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBest: !isBest }),
    });
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_best: !isBest ? 1 : 0 } : r))
      );
      toast.success("베스트 리뷰 상태가 변경되었습니다.");
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in">
      <h2 className="text-xl font-bold font-serif mb-6">고객 리뷰 관리</h2>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left p-3">오브제</th>
            <th className="text-left p-3">작성자</th>
            <th className="text-left p-3">내용</th>
            <th className="text-right p-3">평점</th>
            <th className="text-right p-3">공개</th>
            <th className="text-right p-3">베스트 선정</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {reviews.map((r) => (
            <tr key={r.id}>
              <td className="p-3 font-medium">{r.product_name || "-"}</td>
              <td className="p-3 text-gray-500">{r.user_name}</td>
              <td className="p-3">{r.content}</td>
              <td className="text-right p-3">★ {r.rating}</td>
              <td className="text-right p-3">
                <button
                  onClick={() => toggleHidden(r.id, Boolean(r.is_hidden))}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-bold",
                    r.is_hidden ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {r.is_hidden ? "작성자만 보기" : "전체 공개"}
                </button>
              </td>
              <td className="text-right p-3">
                <button
                  onClick={() => toggleBest(r.id, Boolean(r.is_best))}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-bold",
                    r.is_best ? "bg-venuea-gold text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {r.is_best ? "BEST 선정됨" : "일반 리뷰"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   6. Customers & Points / Role Management
========================================================= */
function AdminUserPoints({ adminRole }: { adminRole: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [pointForm, setPointForm] = useState({ email: "", amount: 0, reason: "" });

  const fetchUsers = async () => {
    const res = await apiFetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/users/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pointForm),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("포인트가 조정되었습니다.");
      setPointForm({ email: "", amount: 0, reason: "" });
      fetchUsers();
    } else {
      toast.error(data.error || "포인트 조정 실패");
    }
  };

  const handleTierChange = async (userId: number, tier: string) => {
    const res = await apiFetch(`/api/admin/users/${userId}/tier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    if (res.ok) {
      toast.success("회원 등급이 변경되었습니다.");
      fetchUsers();
    } else {
      const d = await res.json();
      toast.error(d.error || "등급 변경 실패");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold font-serif mb-4">회원 포인트 수동 지급 / 차감</h2>
        <form onSubmit={handleAdjustPoints} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="email"
            required
            placeholder="회원 이메일"
            value={pointForm.email}
            onChange={(e) => setPointForm({ ...pointForm, email: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            required
            placeholder="지급(+) 또는 차감(-) 포인트"
            value={pointForm.amount || ""}
            onChange={(e) => setPointForm({ ...pointForm, amount: parseInt(e.target.value, 10) || 0 })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="조정 사유 (예: 이벤트 당첨)"
            value={pointForm.reason}
            onChange={(e) => setPointForm({ ...pointForm, reason: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-venuea-dark text-white rounded-lg text-sm font-bold py-2 hover:bg-venuea-gold"
          >
            포인트 반영
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">이름 / 이메일</th>
              <th className="p-4">등급 (6개월 실적)</th>
              <th className="p-4">보유 포인트</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4">
                  <div className="font-bold">{u.name}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <select
                      disabled={adminRole !== "MASTER" && adminRole !== "ADMIN"}
                      value={(u.tier || "BEIGE").toUpperCase()}
                      onChange={(e) => handleTierChange(u.id, e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs font-bold text-venuea-gold"
                    >
                      <option value="BEIGE">베이지</option>
                      <option value="GREEN">그린</option>
                      <option value="BLACK">블랙</option>
                      <option value="THE_BLACK">더 블랙</option>
                    </select>
                    <span className="text-xs text-gray-400">
                      ({formatPrice(u.total_spent_6m || 0)})
                    </span>
                  </div>
                </td>
                <td className="p-4 font-bold">{Number(u.points || 0).toLocaleString()} P</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   7. Coupons, Inquiries, Newsletter, Security Keys
========================================================= */
function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCoupon, setNewCoupon] = useState({
    name: "",
    code: "",
    type: "PERCENT",
    value: 10,
    min_order_amount: 30000,
    max_discount_amount: 10000,
  });
  const [giveTarget, setGiveTarget] = useState<{ id: string; email: string }>({ id: "", email: "" });

  const fetchCoupons = async () => {
    const res = await apiFetch("/api/admin/coupons");
    if (res.ok) setCoupons(await res.json());
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCoupon),
    });
    if (res.ok) {
      toast.success("쿠폰이 생성되었습니다.");
      setNewCoupon({
        name: "",
        code: "",
        type: "PERCENT",
        value: 10,
        min_order_amount: 30000,
        max_discount_amount: 10000,
      });
      fetchCoupons();
    }
  };

  const handleGive = async (id: number, target: string) => {
    const res = await apiFetch(`/api/admin/coupons/${id}/give`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    if (res.ok) toast.success("쿠폰이 발급되었습니다.");
    else toast.error("발급에 실패했습니다.");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("쿠폰을 삭제하시겠습니까?")) return;
    const res = await apiFetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) fetchCoupons();
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <form
        onSubmit={handleAdd}
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          placeholder="쿠폰명"
          required
          value={newCoupon.name}
          onChange={(e) => setNewCoupon({ ...newCoupon, name: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="쿠폰코드 (예: SPRING10)"
          required
          value={newCoupon.code}
          onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={newCoupon.type}
          onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="PERCENT">% 할인</option>
          <option value="FIXED">정액 할인</option>
          <option value="SHIPPING">무료배송</option>
        </select>
        <input
          type="number"
          placeholder="할인값"
          value={newCoupon.value}
          onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="최소주문금액"
          value={newCoupon.min_order_amount}
          onChange={(e) => setNewCoupon({ ...newCoupon, min_order_amount: Number(e.target.value) })}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-venuea-dark text-white rounded-lg text-sm font-bold py-2 hover:bg-venuea-gold"
        >
          쿠폰 생성
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coupons.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold">{c.name}</h3>
                <code className="text-xs text-gray-400">{c.code}</code>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <button
                onClick={() => handleGive(c.id, "all")}
                className="text-xs font-bold text-venuea-dark hover:text-venuea-gold"
              >
                전체 회원 지급
              </button>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="특정 회원 이메일"
                  value={giveTarget.id === String(c.id) ? giveTarget.email : ""}
                  onChange={(e) => setGiveTarget({ id: String(c.id), email: e.target.value })}
                  className="border rounded px-2 py-1 text-xs"
                />
                <button
                  onClick={() => handleGive(c.id, giveTarget.email)}
                  className="text-xs font-bold text-venuea-gold"
                >
                  개별지급
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminInquiries({ adminRole }: { adminRole: string }) {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [replyMap, setReplyMap] = useState<Record<number, string>>({});
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const fetchInquiries = async () => {
    const res = await apiFetch("/api/admin/inquiries");
    if (res.ok) setInquiries(await res.json());
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleReply = async (id: number) => {
    if (sendingId !== null) return;
    const replyMessage = replyMap[id];
    if (!replyMessage?.trim()) return toast.error("답변 내용을 입력해주세요.");
    setSendingId(id);
    try {
      const res = await apiFetch(`/api/admin/inquiries/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        fetchInquiries();
      } else {
        toast.error(data.error || "답변 발송 실패");
      }
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await apiFetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("문의를 삭제했습니다.");
      setPendingDeleteId(null);
      fetchInquiries();
    } else {
      toast.error(data.error || "문의 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <h2 className="text-xl font-bold font-serif">1:1 고객 문의 관리</h2>
      {inquiries.map((inq) => (
        <div key={inq.id} className="bg-white p-6 rounded-xl border border-gray-200 space-y-3">
          <div className="flex justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-venuea-gold mr-2">[{inq.category}]</span>
              <span className="font-bold">{inq.subject}</span>
              <p className="text-xs text-gray-400">
                {inq.name} ({inq.email}) · {new Date(inq.created_at).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold h-fit",
                  inq.status === "replied"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                )}
              >
                {inq.status === "replied" ? "답변완료" : "답변대기"}
              </span>
              {adminRole === "MASTER" && (
                <button
                  onClick={() => setPendingDeleteId(inq.id)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="문의 삭제"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{inq.message}</p>

          {inq.order_number && (
            <div className="rounded-xl border border-gray-200 bg-[#fbf7f1] p-4 space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-venuea-dark">
                  연결 주문 {inq.order_number}
                </p>
                <span className="text-xs font-bold text-venuea-gold">
                  {inq.linked_order_id ? formatOrderStatus(inq.order_status) : "주문을 찾을 수 없음"}
                </span>
              </div>
              {inq.linked_order_id ? (
                <>
                  <p className="text-xs text-gray-600">
                    {inq.order_customer_name}
                    {inq.order_customer_phone ? ` · ${inq.order_customer_phone}` : ""} ·{" "}
                    {formatPrice(inq.order_total || 0)}
                    {inq.order_created_at
                      ? ` · ${new Date(inq.order_created_at).toLocaleDateString("ko-KR")}`
                      : ""}
                  </p>
                  {(inq.tracking_number || inq.shipping_company) && (
                    <p className="text-xs text-gray-600">
                      {inq.shipping_company || "택배"} {inq.tracking_number || ""}
                    </p>
                  )}
                  {inq.shipping_address && (
                    <p className="text-xs text-gray-500">{inq.shipping_address}</p>
                  )}
                  {inq.refund_reason && (
                    <p className="text-xs text-amber-800">환불 사유: {inq.refund_reason}</p>
                  )}
                  {Array.isArray(inq.order_items) && inq.order_items.length > 0 && (
                    <ul className="text-xs text-gray-700 space-y-1 pt-1">
                      {inq.order_items.map((item: any, idx: number) => (
                        <li key={idx}>
                          {item.name} × {item.quantity} · {formatPrice(item.price * item.quantity)}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500">이 주문번호와 일치하는 주문이 없습니다.</p>
              )}
            </div>
          )}

          {pendingDeleteId === inq.id && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex flex-wrap items-center justify-between gap-2">
              <span>이 문의를 삭제할까요? 마스터 계정에서만 삭제됩니다.</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingDeleteId(null)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 bg-white"
                >
                  취소
                </button>
                <button
                  onClick={() => handleDelete(inq.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold"
                >
                  삭제
                </button>
              </div>
            </div>
          )}

          {inq.status === "replied" ? (
            <div className="text-xs text-gray-600 border-l-2 border-venuea-gold pl-3">
              <b>발송된 답변:</b> {inq.reply_message}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={replyMap[inq.id] || ""}
                onChange={(e) => setReplyMap({ ...replyMap, [inq.id]: e.target.value })}
                placeholder="고객 이메일로 발송할 답변을 입력하세요..."
                className="flex-grow border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleReply(inq.id)}
                disabled={sendingId !== null}
                className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
              >
                {sendingId === inq.id ? "발송 중..." : "답변 발송"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function plainMailBody(mail: { text_body?: string; html_body?: string }) {
  if (mail.text_body?.trim()) return mail.text_body;
  return String(mail.html_body || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"');
}

function AdminInbox() {
  const [mails, setMails] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchMails = async () => {
    const res = await apiFetch("/api/admin/inbox");
    if (res.ok) setMails(await res.json());
  };

  const syncMails = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch("/api/admin/inbox/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "메일을 가져오지 못했습니다.");
      }
      await fetchMails();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    syncMails();
  }, []);

  const openMail = async (id: number) => {
    const res = await apiFetch(`/api/admin/inbox/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "메일을 열지 못했습니다.");
    setSelected(data);
    setMails((prev) => prev.map((mail) => (mail.id === id ? { ...mail, is_read: 1 } : mail)));
  };

  const attachmentNames = (raw: string) => {
    try {
      const items = JSON.parse(raw || "[]");
      return Array.isArray(items) ? items.map((item) => item.filename).filter(Boolean) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-serif">받은 메일</h2>
          <p className="text-xs text-gray-400 mt-1">support@benua.shop 으로 온 메일만 표시됩니다.</p>
        </div>
        <button
          onClick={syncMails}
          disabled={syncing}
          className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
        >
          {syncing ? "불러오는 중..." : "다시 가져오기"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 divide-y max-h-[70vh] overflow-y-auto">
          {mails.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">아직 받은 메일이 없습니다.</p>
          ) : (
            mails.map((mail) => (
              <button
                key={mail.id}
                onClick={() => openMail(mail.id)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-gray-50",
                  selected?.id === mail.id && "bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm truncate", mail.is_read ? "text-gray-600" : "font-bold")}>
                    {mail.from_address || "알 수 없는 발신자"}
                  </span>
                  {!mail.is_read && <span className="w-2 h-2 rounded-full bg-venuea-gold shrink-0" />}
                </div>
                <p className="text-xs text-gray-700 truncate mt-1">{mail.subject}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {mail.received_at ? new Date(mail.received_at).toLocaleString("ko-KR") : ""}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 min-h-[320px]">
          {!selected ? (
            <p className="text-sm text-gray-400">메일을 선택하면 내용이 표시됩니다.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">{selected.subject}</h3>
                <p className="text-xs text-gray-500 mt-1">보낸 사람 {selected.from_address}</p>
                <p className="text-[11px] text-gray-400">
                  {selected.received_at ? new Date(selected.received_at).toLocaleString("ko-KR") : ""}
                </p>
              </div>
              {attachmentNames(selected.attachments).length > 0 && (
                <p className="text-xs text-gray-500">
                  첨부: {attachmentNames(selected.attachments).join(", ")}
                </p>
              )}
              <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-800 font-sans">
                {plainMailBody(selected) || "본문이 없습니다."}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<{ guestSubscribers: any[]; userSubscribers: any[] }>({
    guestSubscribers: [],
    userSubscribers: [],
  });
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const fetchSubscribers = async () => {
    const res = await apiFetch("/api/admin/newsletter/subscribers");
    if (res.ok) setSubscribers(await res.json());
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const recipientRows = [
    ...subscribers.userSubscribers.map((s) => ({ ...s, kind: "회원" })),
    ...subscribers.guestSubscribers
      .filter((g) => !subscribers.userSubscribers.some((u) => u.email === g.email))
      .map((s) => ({ ...s, kind: "비회원" })),
  ];

  const handleSend = async () => {
    if (!subject || !content) return toast.error("제목과 내용을 모두 입력해주세요.");
    setIsSending(true);
    try {
      const res = await apiFetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, content }),
      });
      if (res.ok) {
        toast.success("뉴스레터가 발송되었습니다.");
        setSubject("");
        setContent("");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleRemove = async (email: string) => {
    const res = await apiFetch(`/api/admin/newsletter/subscribers/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPendingEmail(null);
      fetchSubscribers();
    } else {
      toast.error(data.error || "삭제에 실패했습니다.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 space-y-4">
        <h3 className="text-xl font-bold font-serif">뉴스레터 발송</h3>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="이메일 제목"
          className="w-full border rounded-xl px-4 py-3 text-sm"
        />
        <textarea
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="본문 (HTML 지원)"
          className="w-full border rounded-xl px-4 py-3 text-sm font-mono"
        />
        <button
          onClick={handleSend}
          disabled={isSending}
          className="w-full bg-venuea-dark text-white py-3.5 rounded-xl font-bold hover:bg-venuea-gold"
        >
          {isSending ? "발송 중..." : "전체 구독자에게 발송"}
        </button>
      </div>
      <div className="bg-white p-8 rounded-2xl border border-gray-100 space-y-4">
        <h3 className="text-xl font-bold font-serif">
          구독자 현황 (회원 {subscribers.userSubscribers.length}명 / 비회원{" "}
          {subscribers.guestSubscribers.length}명)
        </h3>
        <div className="max-h-96 overflow-y-auto divide-y text-sm">
          {recipientRows.map((s) => (
            <div key={s.email} className="py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span>
                  {s.email}
                  <span className="ml-2 text-[11px] text-gray-400">{s.kind}</span>
                </span>
                <button
                  onClick={() => setPendingEmail(s.email)}
                  className="text-xs text-red-600 underline shrink-0"
                >
                  삭제
                </button>
              </div>
              {pendingEmail === s.email && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex flex-wrap items-center justify-between gap-2">
                  <span>이 메일을 수신 목록에서 뺄까요?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPendingEmail(null)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 bg-white"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleRemove(s.email)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminKeys({ adminRole }: { adminRole: string }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState({ keyValue: "", role: "ADMIN" });

  const fetchKeys = async () => {
    const res = await apiFetch("/api/admin/keys");
    if (res.ok) setKeys(await res.json());
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newKey),
    });
    if (res.ok) {
      toast.success("새 보안 키가 생성되었습니다.");
      setNewKey({ keyValue: "", role: "ADMIN" });
      fetchKeys();
    } else {
      const d = await res.json();
      toast.error(d.error || "생성 실패");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 보안 키를 삭제하시겠습니까?")) return;
    const res = await apiFetch(`/api/admin/keys/${id}`, { method: "DELETE" });
    if (res.ok) fetchKeys();
    else {
      const d = await res.json();
      toast.error(d.error || "삭제 실패");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold font-serif mb-4">관리자 보안 키 발급</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            required
            placeholder="새 보안 키 문자열 입력"
            value={newKey.keyValue}
            onChange={(e) => setNewKey({ ...newKey, keyValue: e.target.value })}
            className="flex-grow border rounded-lg px-4 py-2 text-sm"
          />
          <select
            value={newKey.role}
            onChange={(e) => setNewKey({ ...newKey, role: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {adminRole === "MASTER" && <option value="MASTER">MASTER</option>}
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="CS">CS</option>
          </select>
          <button
            type="submit"
            className="bg-venuea-dark text-white px-6 py-2 rounded-lg text-sm font-bold"
          >
            발급
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">보안 키</th>
              <th className="p-4">권한</th>
              <th className="p-4">2FA(OTP) 연동</th>
              <th className="p-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="p-4 font-mono">{k.key_value}</td>
                <td className="p-4 font-bold">{k.role}</td>
                <td className="p-4">{k.has_2fa ? "연동됨" : "미설정 (최초 로그인 시 QR 생성)"}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold"
                  >
                    삭제
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
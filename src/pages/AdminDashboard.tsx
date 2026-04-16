import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
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
  ShoppingCart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatPrice } from "../lib/utils";
import { toast } from "sonner";

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

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check");
        if (!response.ok) {
          navigate("/admin/login");
        }
      } catch (error) {
        navigate("/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-venuea-gold" size={40} />
      </div>
    );
  }
  
  const sidebarLinks = [
    { name: "개요", path: "/admin", icon: LayoutDashboard },
    { name: "상품 관리", path: "/admin/products", icon: Package },
    { name: "주문 내역", path: "/admin/orders", icon: ShoppingBag },
    { name: "고객 문의", path: "/admin/inquiries", icon: MessageSquare },
    { name: "고객 관리", path: "/admin/customers", icon: Users },
    { name: "관리자 키", path: "/admin/keys", icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50 pt-[140px] md:pt-20">
      {/* Mobile Header */}
      <div className="fixed top-20 left-0 right-0 h-[60px] bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 md:hidden">
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
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">관리자 콘솔</h2>
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">관리자 콘솔</h2>
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
      <main className="flex-grow p-4 md:p-8 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/orders" element={<AdminOrders />} />
          <Route path="/inquiries" element={<AdminInquiries />} />
          <Route path="/keys" element={<AdminKeys />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminOverview() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products").then(res => res.json()).then(setProducts);
  }, []);

  const stats = [
    { name: "총 매출", value: "₩0", change: "0%", icon: ShoppingBag },
    { name: "활성 주문", value: "0", change: "0", icon: Clock },
    { name: "전체 상품", value: products.length.toString(), change: "+0", icon: Package },
    { name: "신규 고객", value: "0", change: "0%", icon: Users },
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
        <div className="flex space-x-4">
          <button 
            onClick={() => {
              setEditingId(null);
              setNewProduct({ name: "", price: 0, discount_rate: 0, show_on_main: 0, category: "리빙", description: "", stock: 0, material: "", dimensions: "", origin: "" });
              setIsModalOpen(true);
            }}
            className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>새 상품</span>
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
                <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                  {product.discount_rate && product.discount_rate > 0 ? (
                    <div className="flex flex-col">
                      <span className="text-red-500 text-[10px]">{product.discount_rate}% OFF</span>
                      <span>{formatPrice(product.price * (1 - product.discount_rate / 100))}</span>
                      <span className="text-gray-300 line-through text-[10px]">{formatPrice(product.price)}</span>
                    </div>
                  ) : (
                    formatPrice(product.price)
                  )}
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
                    required
                    onChange={e => setMainImage(e.target.files ? e.target.files[0] : null)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                  />
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
  const handleClearTestOrders = async () => {
    if (!confirm("테스트 과정에서 생성된 모든 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      const response = await fetch("/api/admin/orders/test", { method: "DELETE" });
      if (response.ok) {
        toast.success("모든 테스트 주문이 삭제되었습니다.");
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
        <button 
          onClick={handleClearTestOrders}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-red-100 transition-colors"
        >
          <Trash2 size={18} />
          <span>테스트 주문 전체 삭제</span>
        </button>
      </header>
      <div className="bg-white p-20 text-center rounded-xl border border-gray-200">
        <p className="text-gray-400">주문 내역이 없습니다.</p>
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

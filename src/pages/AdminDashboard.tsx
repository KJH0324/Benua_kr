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
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatPrice } from "../lib/utils";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string;
  description: string;
}

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
    { name: "고객 관리", path: "/admin/customers", icon: Users },
    { name: "설정", path: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50 pt-20">
      {/* Sidebar */}
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
              className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/orders" element={<AdminOrders />} />
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
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
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
    formData.append("category", newProduct.category);
    formData.append("description", newProduct.description);
    formData.append("stock", newProduct.stock.toString());
    formData.append("material", newProduct.material);
    formData.append("dimensions", newProduct.dimensions);
    formData.append("origin", newProduct.origin);
    if (mainImage) formData.append("image", mainImage);
    if (descImage) formData.append("description_image", descImage);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        toast.success("상품이 등록되었습니다.");
        setIsModalOpen(false);
        setNewProduct({ name: "", price: 0, category: "리빙", description: "", stock: 0, material: "", dimensions: "", origin: "" });
        setMainImage(null);
        setDescImage(null);
        fetchProducts();
      } else {
        toast.error("상품 등록 실패");
      }
    } catch (error) {
      toast.error("서버 오류");
    }
  };

  const handleDeleteProduct = async (id: string) => {
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
            onClick={() => setIsModalOpen(true)}
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
                      <p className="text-sm font-bold text-gray-900">{product.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{product.category}</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-bold">{formatPrice(product.price)}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
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
                <h2 className="text-xl font-bold">새 상품 등록</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
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
                    <label className="text-xs font-bold text-gray-400 uppercase">가격</label>
                    <input 
                      type="number" 
                      required
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value)})}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
                    />
                  </div>
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
                  상품 등록하기
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

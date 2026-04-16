import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
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
  Truck
} from "lucide-react";
import { motion } from "motion/react";
import { cn, formatPrice } from "../lib/utils";

export default function AdminDashboard() {
  const location = useLocation();
  
  const sidebarLinks = [
    { name: "개요", path: "/admin", icon: LayoutDashboard },
    { name: "상품 관리", path: "/admin/products", icon: Package },
    { name: "주문 내역", path: "/admin/orders", icon: ShoppingBag },
    { name: "고객 관리", path: "/admin/customers", icon: Users },
    { name: "설정", path: "/admin/settings", icon: Settings },
  ];

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
                      ? "bg-venuea-brown text-white shadow-lg shadow-venuea-brown/20" 
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
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
  const stats = [
    { name: "총 매출", value: "₩12,450,000", change: "+12.5%", icon: ShoppingBag },
    { name: "활성 주문", value: "24", change: "+3", icon: Clock },
    { name: "전체 상품", value: "142", change: "+12", icon: Package },
    { name: "신규 고객", value: "84", change: "+18%", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">대시보드 개요</h1>
          <p className="text-sm text-gray-500">환영합니다, 관리자님.</p>
        </div>
        <button className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-venuea-gold transition-colors">
          <Plus size={18} />
          <span>상품 추가</span>
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">최근 주문</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                    김
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">주문 #1234{i}</p>
                    <p className="text-xs text-gray-500">2개 상품 • ₩85,000</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-blue-50 text-blue-600 rounded">
                  처리중
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">재고 알림</h3>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden">
                    <img src={`https://picsum.photos/seed/low-${i}/100/100`} alt="Product" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-900">재고 부족 상품 {i}</p>
                    <p className="text-xs text-red-700">남은 수량: 2개</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-red-900 underline">재입고</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminProducts() {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-gray-900">상품 관리</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="상품 검색..." 
              className="bg-white border border-gray-200 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-venuea-dark/20"
            />
          </div>
          <button className="bg-venuea-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
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
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">재고</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">상태</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img src={`https://picsum.photos/seed/prod-${i}/100/100`} alt="Product" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">아티저널 아이템 {i}</p>
                      <p className="text-xs text-gray-500">SKU: BN-00{i}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-medium">리빙</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-bold">₩45,000</td>
                <td className="px-6 py-4 text-sm text-gray-600">42</td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-green-50 text-green-600 rounded">
                    판매중
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={18} />
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

function AdminOrders() {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-gray-900">주문 관리</h1>
        <div className="flex space-x-4">
          <select className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm focus:outline-none">
            <option>모든 상태</option>
            <option>대기중</option>
            <option>처리중</option>
            <option>배송중</option>
            <option>배송 완료</option>
          </select>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">주문 ID</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">고객</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">날짜</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">총액</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">상태</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-gray-900">#BN-982{i}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">김민수</p>
                  <p className="text-xs text-gray-500">minsu@example.com</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">2024.04.15</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-bold">₩128,000</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Clock size={14} className="text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      처리중
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-venuea-dark hover:text-venuea-gold text-xs font-bold uppercase tracking-widest">
                    관리하기
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

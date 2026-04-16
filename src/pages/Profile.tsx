import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Mail, Shield, LogOut, Package, CreditCard, ExternalLink, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, formatPrice } from "../lib/utils";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch("/api/auth/me");
        const userData = await userRes.json();
        
        if (!userData.user) {
          console.log("No user found, redirecting to login");
          navigate("/login");
          return;
        }

        setUser(userData.user);

        const ordersRes = await fetch("/api/orders/me");
        const ordersData = await ordersRes.json();
        
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
        } else {
          console.error("Orders data is not an array:", ordersData);
          setOrders([]);
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
        toast.error("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("로그아웃 되었습니다.");
      navigate("/");
      window.location.reload();
    } catch {
      toast.error("로그아웃 실패");
    }
  };

  if (isLoading) return <div className="pt-32 min-h-screen flex justify-center text-venuea-dark uppercase tracking-widest text-xs">Loading Profile...</div>;
  if (!user) return <div className="pt-32 min-h-screen flex justify-center text-venuea-dark uppercase tracking-widest text-xs">Redirecting to login...</div>;

  const googleLogo = (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-bold text-venuea-dark mb-2 uppercase tracking-tight">마이 프로필</h1>
            <p className="text-venuea-muted underline decoration-venuea-gold/30 underline-offset-4 tracking-tight">회원 정보 및 주문 내역을 한눈에 확인하세요.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors bg-red-50 px-4 py-2 rounded-lg"
          >
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* User Info & Quick Links */}
          <div className="space-y-8">
            <div className="bg-[#F9F9F9] p-10 border border-venuea-dark/5 text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-venuea-gold/5 -mr-10 -mt-10 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="w-24 h-24 bg-venuea-dark text-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-serif">
                {user.name?.[0]}
              </div>
              <h3 className="text-2xl font-bold text-venuea-dark uppercase tracking-tight">{user.name}</h3>
              <p className="text-sm text-venuea-muted font-mono">{user.email}</p>
              <div className="mt-6 flex justify-center gap-3">
                {googleLogo}
                <div className="w-5 h-5 bg-[#03C75A] text-white flex items-center justify-center text-[10px] font-bold rounded-sm">N</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30 ml-2">Quick Navigation</h4>
              <Link to="/cart" className="flex items-center justify-between p-5 bg-white border border-venuea-dark/5 hover:border-venuea-gold transition-all group">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-[#F9F9F9] text-venuea-dark group-hover:text-venuea-gold">
                    <Package size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">장바구니</span>
                </div>
                <ChevronRight size={16} className="text-venuea-dark/20 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Detailed Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Recent Orders */}
            <div className="bg-white p-8 border border-venuea-dark/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
              <header className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-venuea-dark uppercase tracking-widest flex items-center space-x-3">
                  <div className="w-1.5 h-6 bg-venuea-gold" />
                  <span>최근 주문 내역</span>
                </h3>
                <Link to="/track" className="text-[10px] font-bold uppercase tracking-widest text-venuea-gold hover:underline">배송 상세 조회</Link>
              </header>

              {orders.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-venuea-dark/5">
                  <Package size={40} className="mx-auto text-venuea-dark/10 mb-4" />
                  <p className="text-sm text-venuea-muted uppercase tracking-widest">주문 내역이 없습니다.</p>
                  <Link to="/shop" className="mt-6 inline-block bg-venuea-dark text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors">
                    쇼핑 시작하기
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="p-6 bg-[#F9F9F9] border border-venuea-dark/5 group hover:border-venuea-gold transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-venuea-gold uppercase tracking-widest mb-1">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <h4 className="text-sm font-bold text-venuea-dark">주문 번호: #{order.id}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-venuea-dark font-mono">{formatPrice(order.total_amount)}</p>
                          <p className="text-[10px] text-venuea-dark/40 uppercase tracking-widest mt-1">결제 완료</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-venuea-dark/60 uppercase tracking-widest pt-4 border-t border-venuea-dark/5">
                        <User size={12} />
                        <span>수령인: {order.customer_name}</span>
                        <span className="mx-2 text-venuea-dark/10">|</span>
                        <Package size={12} />
                        <span className="line-clamp-1">{order.shipping_address}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Address Info */}
            <div className="bg-white p-8 border border-venuea-dark/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
              <h3 className="text-lg font-bold text-venuea-dark uppercase tracking-widest mb-8 flex items-center space-x-3">
                <div className="w-1.5 h-6 bg-venuea-dark" />
                <span>나의 배송지 정보</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-venuea-dark/40 uppercase tracking-widest">이름 / 연락처</p>
                  <p className="text-sm font-bold text-venuea-dark tracking-tight">{user.name} | {user.phone || '미등록'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-venuea-dark/40 uppercase tracking-widest">기본 배송지</p>
                  <p className="text-sm font-bold text-venuea-dark leading-relaxed">
                    {user.zipcode ? `[${user.zipcode}] ${user.address} ${user.detail_address}` : '배송지 정보가 없습니다.'}
                  </p>
                </div>
              </div>
              <Link to="/settings" className="mt-8 inline-block text-[10px] font-bold uppercase tracking-widest text-venuea-gold hover:underline">
                정보 수정하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Mail, Shield, LogOut, Package, CreditCard, ExternalLink, ChevronRight, Edit3, X, Check, Search, Ticket } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, formatPrice } from "../lib/utils";
import { toast } from "sonner";
import DaumPostcode from "react-daum-postcode";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'coupons'>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [selectedRefundOrder, setSelectedRefundOrder] = useState<any>(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    product_id: 0,
    order_id: 0,
    rating: 5,
    content: "",
    image_url: "",
    product_name: ""
  });

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    zipcode: "",
    address: "",
    detail_address: ""
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const userRes = await fetch(`/api/auth/me?t=${Date.now()}`, { credentials: 'include' });
      const userData = await userRes.json();
      
      if (!userData.user) {
        navigate("/login");
        return;
      }

      setUser(userData.user);
      setEditForm({
        name: userData.user.name || "",
        phone: userData.user.phone || "",
        zipcode: userData.user.zipcode || "",
        address: userData.user.address || "",
        detail_address: userData.user.detail_address || ""
      });

      const ordersRes = await fetch("/api/orders/me");
      const ordersData = await ordersRes.json();
      
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      } else {
        setOrders([]);
      }

      const couponsRes = await fetch("/api/coupons/me");
      if (couponsRes.ok) {
        setCoupons(await couponsRes.ok ? await couponsRes.json() : []);
      }
    } catch (error) {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_LINK_SUCCESS') {
        toast.success("계정이 성공적으로 연동되었습니다.");
        fetchData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        toast.success("정보가 수정되었습니다.");
        setIsEditing(false);
        fetchData();
      } else {
        toast.error("수정 실패");
      }
    } catch {
      toast.error("서버 오류");
    }
  };

  const handleAddressComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setEditForm({
      ...editForm,
      zipcode: data.zonecode,
      address: fullAddress,
    });
    setIsAddressModalOpen(false);
  };

  const handleOAuthLink = async (provider: string) => {
    try {
      const response = await fetch(`/api/auth/${provider}/url`);
      const { url } = await response.json();
      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch {
      toast.error("연동 URL을 불러올 수 없습니다.");
    }
  };

  const fetchOrderDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/orders/${id}/detail`);
      if (res.ok) {
        setOrderDetail(await res.json());
        setIsDetailModalOpen(true);
      }
    } catch {
      toast.error("주문 정보를 불러오지 못했습니다.");
    }
  };

  const handleOrderConfirm = async (id: number) => {
    if (!confirm("구매 확정하시겠습니까? 구매 확정 시 포인트가 적립되며 환불이 불가능합니다.")) return;
    try {
      const res = await fetch(`/api/orders/${id}/confirm`, { method: "POST" });
      if (res.ok) {
        toast.success("구매 확정되었습니다. 포인트가 적립되었습니다.");
        fetchData();
        if (isDetailModalOpen) fetchOrderDetail(id);
      }
    } catch {
      toast.error("처리에 실패했습니다.");
    }
  };

  const handleRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundReason) {
      toast.error("환불 사유를 선택해주세요.");
      return;
    }
    
    try {
      const res = await fetch(`/api/orders/${selectedRefundOrder.id}/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === 'refunded') {
          toast.success("취소 및 즉시 환불 처리가 완료되었습니다.");
        } else {
          toast.success("환불 요청이 접수되었습니다. (배송 후 반품비 5,000원 제외)");
        }
        setIsRefundModalOpen(false);
        setRefundReason("");
        fetchData();
        if (isDetailModalOpen) fetchOrderDetail(selectedRefundOrder.id);
      } else {
        toast.error(data.error || "요청 실패");
      }
    } catch {
      toast.error("서버 오류");
    }
  };

  const openRefundModal = (order: any) => {
    setSelectedRefundOrder(order);
    setRefundReason("");
    setIsRefundModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`리뷰가 등록되었습니다. ${data.points_earned}P가 적립되었습니다.`);
        setIsReviewModalOpen(false);
        fetchData();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("리뷰 등록 실패");
    }
  };

  const getStatusInfo = (status: string) => {
    const map: any = {
      'pending': { label: '결제대기', color: 'text-gray-400 bg-gray-50' },
      'paid': { label: '결제완료', color: 'text-blue-500 bg-blue-50' },
      'shipping': { label: '배송중', color: 'text-blue-600 bg-blue-100' },
      'delivered': { label: '배송완료', color: 'text-green-600 bg-green-50' },
      'completed': { label: '구매확정', color: 'text-venuea-gold bg-venuea-gold/5' },
      'refund_requested': { label: '환불요청', color: 'text-orange-500 bg-orange-50' },
      'refunded': { label: '환불완료', color: 'text-red-500 bg-red-50' }
    };
    return map[status] || { label: status, color: 'text-gray-400' };
  };

  if (isLoading) return <div className="pt-32 min-h-screen flex justify-center text-venuea-dark uppercase tracking-widest text-xs">Loading Profile...</div>;
  if (!user) return <div className="pt-32 min-h-screen flex justify-center text-venuea-dark uppercase tracking-widest text-xs">Redirecting to login...</div>;

  const googleIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="pt-[120px] md:pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-venuea-dark mb-2 uppercase tracking-tight">마이 프로필</h1>
            <p className="text-venuea-muted underline decoration-venuea-gold/30 underline-offset-4 tracking-tight">회원 정보 및 주문 내역을 한눈에 확인하세요.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-venuea-dark hover:text-venuea-gold transition-colors bg-white border border-venuea-dark/10 px-4 py-2 rounded-lg"
            >
              {isEditing ? <X size={16} /> : <Edit3 size={16} />}
              <span>{isEditing ? "취소" : "정보 수정"}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors bg-red-50 px-4 py-2 rounded-lg"
            >
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* User Info & Quick Links */}
          <div className="space-y-8">
            {/* Membership Tier Card */}
            <div className={cn(
              "p-8 relative overflow-hidden group shadow-2xl",
              user.tier === 'BEIGE' ? "bg-[#F5F5F0] text-[#8B7355] border border-[#8B7355]/20" :
              user.tier === 'GREEN' ? "bg-[#2D5A27] text-white" :
              user.tier === 'BLACK' ? "bg-black text-white" :
              "bg-black text-[#D4AF37] border-2 border-[#D4AF37]"
            )}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full" />
              <div className="relative">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[4px] opacity-60 block mb-2">Member Tier</span>
                    <h2 className={cn(
                      "text-3xl font-serif font-bold italic",
                      user.tier === 'THE_BLACK' ? "text-[#D4AF37]" : "text-inherit"
                    )}>
                      {user.tier === 'THE_BLACK' ? 'The Black' : 
                       user.tier === 'BLACK' ? 'Black' : 
                       user.tier === 'GREEN' ? 'Green' : 'Beige'}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-[4px] opacity-60 block mb-1">Points</span>
                    <p className="text-xl font-mono font-bold">{formatPrice(user.points).replace('₩', '')}P</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Spending (6m)</span>
                      <span className="text-xs font-bold font-mono">{formatPrice(user.spent)}</span>
                    </div>
                    {user.tier !== 'THE_BLACK' ? (
                      <>
                        <div className="h-1 w-full bg-current/10 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (user.spent / (user.tier === 'BEIGE' ? 100000 : user.tier === 'GREEN' ? 500000 : 1000000)) * 100)}%` }}
                            className="h-full bg-current"
                          />
                        </div>
                        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest leading-relaxed opacity-60">
                          {formatPrice((user.tier === 'BEIGE' ? 100000 : user.tier === 'GREEN' ? 500000 : 1000000) - user.spent)}원 더 구매 시 {user.tier === 'BEIGE' ? 'GREEN' : user.tier === 'GREEN' ? 'BLACK' : 'THE BLACK'} 등급으로 승급
                        </p>
                      </>
                    ) : (
                      <div className="bg-white/5 p-4 text-[10px] font-bold uppercase tracking-[2px] text-center">
                        최상위 VVIP 등급 혜택 적용 중
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#F9F9F9] p-8 border border-venuea-dark/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-venuea-gold/5 -mr-10 -mt-10 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="w-24 h-24 bg-venuea-dark text-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-serif">
                {user.name?.[0]}
              </div>
              <h3 className="text-2xl font-bold text-venuea-dark uppercase tracking-tight">{user.name}</h3>
              <p className="text-sm text-venuea-muted font-mono">{user.email}</p>
              
              <div className="mt-8 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30 mb-2">Social Linkage</p>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  <button 
                    onClick={() => !user.google_id && handleOAuthLink('google')}
                    disabled={!!user.google_id}
                    className={cn(
                      "flex flex-col items-center justify-center space-y-2 py-4 px-2 text-[10px] font-bold uppercase tracking-widest border transition-all",
                      user.google_id 
                        ? "bg-blue-50 border-blue-100 text-blue-600 cursor-default" 
                        : "bg-white border-venuea-dark/10 text-venuea-dark hover:border-venuea-gold"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center bg-white shadow-sm">
                      {googleIcon}
                    </div>
                    <span>{user.google_id ? "Google 연동됨" : "Google 연동하기"}</span>
                    {user.google_id && <Check size={12} className="mt-1" />}
                  </button>
                  <button 
                    onClick={() => !user.naver_id && handleOAuthLink('naver')}
                    disabled={!!user.naver_id}
                    className={cn(
                      "flex flex-col items-center justify-center space-y-2 py-4 px-2 text-[10px] font-bold uppercase tracking-widest border transition-all",
                      user.naver_id 
                        ? "bg-green-50 border-green-100 text-green-600 cursor-default" 
                        : "bg-white border-venuea-dark/10 text-venuea-dark hover:border-venuea-gold"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center bg-white shadow-sm text-[12px] font-bold text-[#03C75A]">N</div>
                    <span>{user.naver_id ? "Naver 연동됨" : "Naver 연동하기"}</span>
                    {user.naver_id && <Check size={12} className="mt-1" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30 ml-2">Quick Navigation</h4>
              <button 
                onClick={() => setActiveTab('info')}
                className={cn(
                  "w-full flex items-center justify-between p-5 transition-all group border",
                  activeTab === 'info' ? "bg-venuea-dark border-venuea-dark text-white" : "bg-white border-venuea-dark/5 hover:border-venuea-gold"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn("p-2", activeTab === 'info' ? "bg-white/10 text-white" : "bg-[#F9F9F9] text-venuea-dark group-hover:text-venuea-gold")}>
                    <User size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">내 정보</span>
                </div>
                <ChevronRight size={16} className={cn(activeTab === 'info' ? "text-white/40" : "text-venuea-dark/20 group-hover:translate-x-1 transition-transform")} />
              </button>

              <button 
                onClick={() => setActiveTab('orders')}
                className={cn(
                  "w-full flex items-center justify-between p-5 transition-all group border",
                  activeTab === 'orders' ? "bg-venuea-dark border-venuea-dark text-white" : "bg-white border-venuea-dark/5 hover:border-venuea-gold"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn("p-2", activeTab === 'orders' ? "bg-white/10 text-white" : "bg-[#F9F9F9] text-venuea-dark group-hover:text-venuea-gold")}>
                    <Package size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">주문 내역</span>
                </div>
                <ChevronRight size={16} className={cn(activeTab === 'orders' ? "text-white/40" : "text-venuea-dark/20 group-hover:translate-x-1 transition-transform")} />
              </button>

              <button 
                onClick={() => setActiveTab('coupons')}
                className={cn(
                  "w-full flex items-center justify-between p-5 transition-all group border",
                  activeTab === 'coupons' ? "bg-venuea-dark border-venuea-dark text-white" : "bg-white border-venuea-dark/5 hover:border-venuea-gold"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn("p-2", activeTab === 'coupons' ? "bg-white/10 text-white" : "bg-[#F9F9F9] text-venuea-dark group-hover:text-venuea-gold")}>
                    <Ticket size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">내 쿠폰 <span className="ml-1 text-[10px] opacity-70">({coupons.length})</span></span>
                </div>
                <ChevronRight size={16} className={cn(activeTab === 'coupons' ? "text-white/40" : "text-venuea-dark/20 group-hover:translate-x-1 transition-transform")} />
              </button>

              <Link to="/cart" className="flex items-center justify-between p-5 bg-white border border-venuea-dark/5 hover:border-venuea-gold transition-all group">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-[#F9F9F9] text-venuea-dark group-hover:text-venuea-gold">
                    <CreditCard size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">장바구니</span>
                </div>
                <ChevronRight size={16} className="text-venuea-dark/20 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Detailed Content */}
          <div className="lg:col-span-2 space-y-12">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div 
                  key="edit-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 border border-venuea-gold shadow-[0_20px_40px_rgba(0,0,0,0.05)]"
                >
                  <h3 className="text-lg font-bold text-venuea-dark uppercase tracking-widest mb-8 flex items-center space-x-3">
                    <div className="w-1.5 h-6 bg-venuea-gold" />
                    <span>회원 정보 수정</span>
                  </h3>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">이름</label>
                        <input 
                          type="text" 
                          required
                          value={editForm.name}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">전화번호</label>
                        <input 
                          type="tel" 
                          required
                          value={editForm.phone}
                          onChange={e => setEditForm({...editForm, phone: e.target.value})}
                          placeholder="010-0000-0000"
                          className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-end space-x-4">
                        <div className="flex-grow space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">우편번호</label>
                          <input 
                            type="text" 
                            readOnly
                            value={editForm.zipcode}
                            className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => setIsAddressModalOpen(true)}
                          className="bg-venuea-dark text-white h-[46px] px-6 text-[10px] font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors flex items-center space-x-2"
                        >
                          <Search size={14} />
                          <span>검색</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">기본 주소</label>
                        <input 
                          type="text" 
                          readOnly
                          value={editForm.address}
                          className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">상세 주소</label>
                        <input 
                          type="text" 
                          required
                          value={editForm.detail_address}
                          onChange={e => setEditForm({...editForm, detail_address: e.target.value})}
                          className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-venuea-dark/5">
                      <button className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all">
                        변경사항 저장하기
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : activeTab === 'info' ? (
                <motion.div 
                  key="info-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  <div className="bg-white p-8 border border-venuea-dark/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
                    <header className="flex justify-between items-center mb-8">
                      <h3 className="text-lg font-bold text-venuea-dark uppercase tracking-widest flex items-center space-x-3">
                        <div className="w-1.5 h-6 bg-venuea-dark" />
                        <span>나의 배송지 정보</span>
                      </h3>
                    </header>
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
                  </div>

                  <div className="bg-white p-8 border border-venuea-dark/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
                    <h3 className="text-lg font-bold text-venuea-dark uppercase tracking-widest mb-8 flex items-center space-x-3">
                      <div className="w-1.5 h-6 bg-venuea-gold" />
                      <span>포인트 및 등급</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="p-6 bg-[#F9F9F9] border border-venuea-dark/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30 mb-2">현재 보유 포인트</p>
                        <p className="text-2xl font-serif font-bold text-venuea-gold">{formatPrice(user.points)} P</p>
                      </div>
                      <div className="p-6 bg-venuea-dark text-white shadow-xl shadow-venuea-dark/20">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">멤버십 등급</p>
                        <p className="text-2xl font-serif font-bold text-venuea-gold">{user.grade}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'orders' ? (
                <motion.div 
                  key="orders-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white p-8 border border-venuea-dark/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)]"
                >
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
                      <p className="text-sm text-venuea-muted uppercase tracking-widest border-0">주문 내역이 없습니다.</p>
                      <Link to="/shop" className="mt-6 inline-block bg-venuea-dark text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors">
                        쇼핑 시작하기
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => (
                        <div 
                          key={order.id} 
                          onClick={() => fetchOrderDetail(order.id)}
                          className="group bg-white border border-venuea-dark/5 p-6 hover:border-venuea-gold transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-venuea-gold">Order #{order.order_number}</span>
                              <p className="text-xs text-venuea-muted font-mono">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className={cn(
                              "px-3 py-1 text-[10px] font-bold uppercase tracking-widest border self-start md:self-center",
                              getStatusInfo(order.status).color
                            )}>
                              {getStatusInfo(order.status).label}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 relative z-10">
                            <div className="flex-grow">
                              <p className="text-sm font-bold text-venuea-dark line-clamp-1 mb-1">
                                {order.total_amount ? formatPrice(order.total_amount) : '0원'} 결제완료
                              </p>
                              <p className="text-[10px] text-venuea-muted uppercase tracking-widest">
                                {order.payment_method === 'card' ? '신용카드' : order.payment_method === 'transfer' ? '계좌이체' : '가상계좌'} 결제
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-venuea-dark/20 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="coupons-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  <div className="bg-white p-8 border border-venuea-dark/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
                    <header className="mb-10">
                      <h3 className="text-lg font-bold text-venuea-dark uppercase tracking-widest flex items-center space-x-3">
                        <div className="w-1.5 h-6 bg-venuea-gold" />
                        <span>나의 쿠폰함</span>
                      </h3>
                      <p className="text-[10px] text-venuea-dark/40 uppercase tracking-widest mt-1">사용 가능한 쿠폰 코드 및 할인 내역을 확인하세요.</p>
                    </header>

                    {coupons.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-venuea-dark/5">
                        <Ticket size={40} className="mx-auto text-venuea-dark/10 mb-4" />
                        <p className="text-sm text-venuea-muted uppercase tracking-widest border-0">사용 가능한 쿠폰이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {coupons.map((coupon) => (
                          <div key={coupon.id} className="relative group">
                            <div className="h-full bg-[#fdfaf3] border border-venuea-gold/20 p-8 flex flex-col justify-between relative overflow-hidden">
                              {/* Background Pattern */}
                              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-venuea-gold/5 rounded-full" />
                              
                              <div>
                                <div className="flex justify-between items-start mb-6">
                                  <span className="bg-venuea-dark text-white px-3 py-1 text-[9px] font-bold uppercase tracking-widest">
                                    {coupon.type === 'PERCENT' ? `${coupon.value}% OFF` : coupon.type === 'FIXED' ? `${formatPrice(coupon.value)} OFF` : 'Free Shipping'}
                                  </span>
                                  <div className="w-8 h-8 rounded-full border border-venuea-gold/20 flex items-center justify-center text-venuea-gold">
                                    <Ticket size={14} />
                                  </div>
                                </div>
                                <h4 className="text-lg font-bold text-venuea-dark leading-tight mb-2 uppercase tracking-tight">{coupon.name}</h4>
                                <p className="text-[9px] text-venuea-dark/40 uppercase tracking-widest">
                                  Expires: {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'No Expiry'}
                                </p>
                              </div>

                              <div className="mt-8 pt-6 border-t border-venuea-gold/10 flex items-center justify-between">
                                <code className="text-xs font-mono font-bold text-venuea-dark tracking-tighter">{coupon.code}</code>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(coupon.code);
                                    toast.success("쿠폰 코드가 복사되었습니다.");
                                  }}
                                  className="text-[10px] font-bold text-venuea-gold uppercase hover:underline underline-offset-4"
                                >
                                  COPY CODE
                                </button>
                              </div>

                              {/* Coupon Notches */}
                              <div className="absolute top-1/2 -left-2.5 w-5 h-5 bg-white border border-venuea-gold/20 rounded-full -translate-y-1/2" />
                              <div className="absolute top-1/2 -right-2.5 w-5 h-5 bg-white border border-venuea-gold/20 rounded-full -translate-y-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddressModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 bg-venuea-dark text-white flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest">주소 검색</span>
                <button onClick={() => setIsAddressModalOpen(false)} className="hover:text-venuea-gold">
                  <X size={20} />
                </button>
              </div>
              <DaumPostcode onComplete={handleAddressComplete} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && orderDetail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsDetailModalOpen(false)}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-bold text-venuea-dark uppercase tracking-tight mb-1">주문 상세 정보</h3>
                  <p className="text-[10px] font-bold text-venuea-gold uppercase tracking-[2px]">Order #{orderDetail.order_number}</p>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-10">
                {/* Items */}
                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30 mb-4">주문 상품</h4>
                  <div className="space-y-4">
                    {orderDetail.items.map((item: any) => (
                      <div key={item.id} className="flex gap-4">
                        <img src={item.image_url} alt={item.name} className="w-20 h-24 object-cover bg-gray-50 border border-gray-100" />
                        <div className="flex-grow py-1 flex flex-col justify-between">
                          <div>
                            <h5 className="font-bold text-venuea-dark line-clamp-1">{item.name}</h5>
                            <p className="text-xs text-venuea-muted mt-1">{formatPrice(item.price)} x {item.quantity}</p>
                          </div>
                          {orderDetail.status === 'completed' && (
                            <button 
                              onClick={() => {
                                setReviewForm({
                                  ...reviewForm,
                                  product_id: item.product_id,
                                  order_id: orderDetail.id,
                                  product_name: item.name
                                });
                                setIsReviewModalOpen(true);
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-venuea-gold hover:underline flex items-center space-x-1"
                            >
                              리뷰 작성 +
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Shipping */}
                  <section>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30 mb-4">배송 정보</h4>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-venuea-dark/60">배송 상태</p>
                        <p className={cn("text-sm font-bold", getStatusInfo(orderDetail.status).color)}>{getStatusInfo(orderDetail.status).label}</p>
                      </div>
                      {orderDetail.tracking_number && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-venuea-dark/60">운송장 정보</p>
                          <p className="text-sm font-mono">{orderDetail.shipping_company} {orderDetail.tracking_number}</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-venuea-dark/60">배송지</p>
                        <p className="text-sm leading-relaxed">{orderDetail.shipping_address}</p>
                      </div>
                    </div>
                  </section>

                  {/* Payment */}
                  <section>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30 mb-4">결제 정보</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-venuea-dark/60">결제 수단</span>
                        <span className="font-bold uppercase tracking-tight">
                          {orderDetail.payment_method === 'card' ? '신용카드' : orderDetail.payment_method === 'transfer' ? '계좌이체' : '가상계좌'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-venuea-dark/60">상품 금액</span>
                        <span className="font-mono">{formatPrice(orderDetail.total_amount + orderDetail.used_points - orderDetail.shipping_fee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-venuea-dark/60">배송비</span>
                        <span className="font-mono">{orderDetail.shipping_fee === 0 ? '무료' : formatPrice(orderDetail.shipping_fee)}</span>
                      </div>
                      {orderDetail.used_points > 0 && (
                        <div className="flex justify-between text-sm text-[#FF4000]">
                          <span className="font-bold">포인트 사용</span>
                          <span className="font-mono">-{formatPrice(orderDetail.used_points)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-4">
                        <span>최종 결제 금액</span>
                        <span className="font-mono text-venuea-gold">{formatPrice(orderDetail.total_amount)}</span>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Actions */}
                <div className="pt-10 flex gap-4">
                  {(orderDetail.status === 'delivered' || orderDetail.status === 'shipping') && (
                    <button 
                      onClick={() => handleOrderConfirm(orderDetail.id)}
                      className="flex-1 bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all"
                    >
                      구매 확정
                    </button>
                  )}
                  {['paid', 'shipping', 'delivered'].includes(orderDetail.status) && (
                    <button 
                      onClick={() => openRefundModal(orderDetail)}
                      className="flex-1 border border-venuea-dark text-venuea-dark py-4 font-bold uppercase tracking-widest hover:bg-red-50 hover:border-red-500 hover:text-red-500 transition-all"
                    >
                      환불 요청
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {isRefundModalOpen && selectedRefundOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg p-10 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsRefundModalOpen(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-venuea-dark"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[4px] text-red-500 mb-2 block">Refund Request</span>
                <h3 className="text-xl font-bold text-venuea-dark">환불 요청 사유</h3>
                <p className="text-[10px] text-venuea-muted mt-2 uppercase tracking-widest">
                  {['pending', 'paid'].includes(selectedRefundOrder.status) 
                    ? "배송 전 단계로 전액 즉시 환불이 가능합니다." 
                    : "배송 후 단계로 반품 배송비 5,000원을 제외하고 환불됩니다."}
                </p>
              </div>

              <form onSubmit={handleRefundRequest} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">사유 선택</label>
                  <select 
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    required
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 p-4 text-sm focus:outline-none focus:border-venuea-gold appearance-none cursor-pointer"
                  >
                    <option value="">사유를 선택해주세요</option>
                    <option value="단순 변심">단순 변심</option>
                    <option value="주문 실수">주문 실수</option>
                    <option value="배송 지연">배송 지연</option>
                    <option value="상품 파손">상품 파손</option>
                    <option value="오배송">오배송</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex justify-between text-xs py-3 border-t border-gray-100">
                    <span className="text-venuea-dark/60 font-bold uppercase tracking-widest">예상 환불 금액</span>
                    <span className="text-venuea-gold font-bold font-mono">
                      {formatPrice(['pending', 'paid'].includes(selectedRefundOrder.status) 
                        ? selectedRefundOrder.total_amount 
                        : Math.max(0, selectedRefundOrder.total_amount - 5000))}
                    </span>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-red-500 transition-all border border-venuea-dark hover:border-red-500"
                  >
                    환불 요청하기
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsRefundModalOpen(false)}
                    className="w-full bg-white text-venuea-dark/40 py-3 text-[10px] font-bold uppercase tracking-widest hover:text-venuea-dark transition-all"
                  >
                    돌아가기
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg p-10 overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-venuea-dark"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <span className="text-[10px] font-bold uppercase tracking-[4px] text-venuea-gold mb-2 block">Review Writing</span>
                <h3 className="text-2xl font-bold text-venuea-dark">{reviewForm.product_name}</h3>
                <div className="w-12 h-1 bg-venuea-dark mx-auto mt-4" />
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-8">
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/30">Select Rating</span>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className={cn(
                          "transition-transform hover:scale-125",
                          star <= reviewForm.rating ? "text-venuea-gold" : "text-gray-200"
                        )}
                      >
                        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">리뷰 내용 (선택사항)</label>
                  <textarea 
                    value={reviewForm.content}
                    onChange={e => setReviewForm({ ...reviewForm, content: e.target.value })}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 p-4 text-sm h-32 focus:outline-none focus:border-venuea-gold resize-none"
                    placeholder="상품에 대한 소중한 후기를 들려주세요."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">사진 URL (포토리뷰 추가 적립)</label>
                  <input 
                    type="text" 
                    value={reviewForm.image_url}
                    onChange={e => setReviewForm({ ...reviewForm, image_url: e.target.value })}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 p-4 text-sm focus:outline-none focus:border-venuea-gold"
                    placeholder="https://..."
                  />
                </div>

                <div className="p-4 bg-venuea-gold/5 border border-venuea-gold/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Check size={16} className="text-venuea-gold" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark">적립 예정 포인트</span>
                  </div>
                  <span className="text-sm font-bold text-venuea-gold">
                    {user.tier === 'BLACK' || user.tier === 'THE_BLACK' 
                      ? (reviewForm.image_url ? '2,000P' : '500P')
                      : (reviewForm.image_url ? '500P' : '100P')} 적립
                  </span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all"
                >
                  리뷰 등록하기
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

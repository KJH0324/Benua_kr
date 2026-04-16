import { useState } from "react";
import { motion } from "motion/react";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/utils";

export default function Cart() {
  const [items, setItems] = useState([
    { id: "1", name: "Linen Sofa Cover", price: 85000, quantity: 1, image: "https://picsum.photos/seed/sofa/800/1000" },
    { id: "2", name: "Ceramic Coffee Set", price: 42000, quantity: 2, image: "https://picsum.photos/seed/coffee/800/1000" },
  ]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = 3000;
  const total = subtotal + shipping;

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  if (items.length === 0) {
    return (
      <div className="pt-40 pb-20 px-6 text-center">
        <div className="max-w-md mx-auto space-y-8">
          <div className="w-20 h-20 bg-[#F9F9F9] rounded-full flex items-center justify-center mx-auto text-venuea-dark/10">
            <ShoppingBag size={40} />
          </div>
          <h1 className="text-3xl font-bold text-venuea-dark uppercase tracking-tight">장바구니가 비어 있습니다</h1>
          <p className="text-venuea-muted">아직 장바구니에 담은 상품이 없습니다.</p>
          <Link 
            to="/shop" 
            className="inline-block bg-venuea-dark text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all"
          >
            쇼핑 시작하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-12 uppercase tracking-tight">장바구니</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-8">
            {items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center space-x-6 pb-8 border-b border-venuea-dark/5"
              >
                <div className="w-24 h-32 bg-[#F9F9F9] overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-venuea-dark uppercase tracking-tight">{item.name}</h3>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-venuea-dark/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-venuea-muted mb-4">{formatPrice(item.price)}</p>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center border border-venuea-dark/10">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-2 hover:bg-[#F9F9F9] transition-colors text-venuea-dark"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 hover:bg-[#F9F9F9] transition-colors text-venuea-dark"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="text-lg font-bold text-venuea-gold">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 shadow-[0_40px_80px_rgba(0,0,0,0.05)] border border-venuea-dark/5 sticky top-32">
              <h3 className="text-xl font-bold text-venuea-dark mb-8 border-b border-venuea-dark/10 pb-4 uppercase tracking-widest">주문 요약</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-venuea-muted">소계</span>
                  <span className="font-bold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-venuea-muted">배송비</span>
                  <span className="font-bold">{formatPrice(shipping)}</span>
                </div>
                <div className="pt-4 border-t border-venuea-dark/10 flex justify-between items-end">
                  <span className="text-lg font-bold text-venuea-dark uppercase tracking-widest">총 합계</span>
                  <span className="text-2xl font-bold text-venuea-gold">{formatPrice(total)}</span>
                </div>
              </div>
              <button className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 group">
                <span>주문하기</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[10px] text-center text-venuea-muted uppercase tracking-widest mt-6">
                보안 결제 시스템이 적용되었습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

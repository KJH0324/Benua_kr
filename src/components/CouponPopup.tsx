import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ticket, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/utils";

export default function CouponPopup() {
  const [newCoupons, setNewCoupons] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkCoupons = async () => {
      try {
        const res = await fetch("/api/coupons/notifications");
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setNewCoupons(data);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to check for coupons", err);
      }
    };

    checkCoupons();
  }, []);

  const handleClose = async () => {
    setIsOpen(false);
    try {
      await fetch("/api/coupons/notifications/ack", { method: "POST" });
    } catch (err) {
      console.error("Failed to acknowledge notifications", err);
    }
  };

  if (newCoupons.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-venuea-dark/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-venuea-dark/5 transition-colors text-venuea-dark"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 pt-12">
              <div className="w-16 h-16 bg-venuea-gold/10 rounded-full flex items-center justify-center text-venuea-gold mb-6 mx-auto">
                <Ticket size={32} />
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-venuea-dark uppercase tracking-widest mb-2">Congratulation!</h3>
                <p className="text-sm text-venuea-dark/60 uppercase tracking-widest">새로운 쿠폰이 도착했습니다.</p>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                {newCoupons.map((coupon) => (
                  <div key={coupon.id} className="bg-[#fdfaf3] border border-venuea-gold/20 p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-venuea-gold uppercase tracking-[2px]">
                        {coupon.type === 'PERCENT' ? `${coupon.value}% OFF` : coupon.type === 'FIXED' ? `${formatPrice(coupon.value)} OFF` : 'Free Shipping'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-venuea-dark uppercase tracking-wide mb-4">{coupon.name}</h4>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-venuea-gold/10">
                      <code className="text-xs font-mono font-bold text-venuea-dark">{coupon.code}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(coupon.code);
                          // We don't want to close the popup here necessarily, but maybe a tooltip or toast
                        }}
                        className="text-[10px] font-bold text-venuea-gold uppercase hover:underline"
                      >
                        Copy
                      </button>
                    </div>

                    {/* Notches */}
                    <div className="absolute top-1/2 -left-2 w-4 h-4 bg-white border border-venuea-gold/20 rounded-full -translate-y-1/2" />
                    <div className="absolute top-1/2 -right-2 w-4 h-4 bg-white border border-venuea-gold/20 rounded-full -translate-y-1/2" />
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                <Link 
                  to="/profile" 
                  onClick={handleClose}
                  className="block w-full bg-venuea-dark text-white py-4 text-center text-[11px] font-bold uppercase tracking-[3px] hover:bg-venuea-gold transition-all"
                >
                  내 쿠폰함에서 확인하기
                </Link>
                <button 
                  onClick={handleClose}
                  className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40 hover:text-venuea-dark transition-colors"
                >
                  나중에 보기
                </button>
              </div>
            </div>
            
            <div className="h-1 bg-venuea-gold" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

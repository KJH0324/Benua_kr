import { useState, useEffect } from "react";
import { Ticket, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/utils";

export default function CouponPopup() {
  const [newCoupons, setNewCoupons] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkCoupons = async () => {
      try {
        const res = await apiFetch("/api/coupons/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNewCoupons(data);
          setIsOpen(true);
        }
      } catch {}
    };
    checkCoupons();
  }, []);

  const handleClose = async () => {
    setIsOpen(false);
    if (newCoupons.length > 0) {
      try {
        await apiFetch("/api/coupons/notifications/ack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: newCoupons.map((c) => c.id) }),
        });
      } catch {}
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 rounded-full bg-venuea-gold/10 text-venuea-gold flex items-center justify-center mb-4">
              <Ticket size={24} />
            </div>

            <h3 className="text-lg font-serif font-bold text-venuea-dark mb-1">
              새로운 혜택이 도착했습니다
            </h3>
            <p className="text-xs text-venuea-muted mb-4">
              회원님께 발급된 전용 쿠폰을 확인해보세요.
            </p>

            <div className="space-y-2.5 max-h-48 overflow-y-auto mb-6">
              {newCoupons.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-center"
                >
                  <span className="text-xs font-bold text-venuea-dark">{c.name}</span>
                  <span className="text-xs font-bold text-venuea-gold">
                    {c.type === "PERCENT"
                      ? `${c.value}% 할인`
                      : c.type === "FIXED"
                      ? `${formatPrice(c.value)}`
                      : "무료배송"}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-venuea-dark text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors"
            >
              확인
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
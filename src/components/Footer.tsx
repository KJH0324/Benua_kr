import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch } from "../lib/api";

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const res = await apiFetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "뉴스레터 구독이 완료되었습니다.");
        setEmail("");
      } else {
        toast.error(data.error || "구독 처리에 실패했습니다.");
      }
    } catch {
      toast.error("서버 통신 중 오류가 발생했습니다.");
    }
  };

  return (
    <footer className="bg-[#1A1A1B] text-white pt-16 pb-12 px-6 md:px-[60px]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-[6px] uppercase">Benua</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            공간의 호흡을 바꾸는 감각적인 오브제 큐레이션.
            <br />
            일상에 머무는 조형미와 깊이 있는 여백을 제안합니다.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-venuea-gold">
            메뉴
          </h3>
          <ul className="space-y-2 text-xs text-gray-400">
            <li>
              <Link to="/shop" className="hover:text-white transition-colors">
                오브제 컬렉션
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors">
                브랜드 스토리
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-white transition-colors">
                비회원 주문조회
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors">
                고객 문의
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-venuea-gold">
            약관
          </h3>
          <ul className="space-y-2 text-xs text-gray-400">
            <li>
              <Link to="/terms" className="hover:text-white transition-colors">
                이용약관
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white transition-colors">
                개인정보처리방침
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-venuea-gold">
            뉴스레터
          </h3>
          <p className="text-xs text-gray-400">
            새로운 오브제 컬렉션과 프라이빗 혜택을 가장 먼저 받아보세요.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-500 flex-grow focus:outline-none focus:border-venuea-gold"
            />
            <button
              type="submit"
              className="bg-venuea-gold text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shrink-0"
            >
              구독
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 text-[11px] text-gray-500 space-y-2">
        <p className="leading-relaxed">
          상호명 베뉴아 · 대표자 강성달 · 사업자등록번호 574-30-02068 · 통신판매업신고번호
          제2026-인천연수구-1145
          <br />
          사업장 소재지 인천광역시 연수구 새말로 154, 307동 602호
        </p>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <p>© {new Date().getFullYear()} 베뉴아. 무단 전재와 복제를 금합니다.</p>
          <p>고객센터 support@benua.shop</p>
        </div>
      </div>
    </footer>
  );
}
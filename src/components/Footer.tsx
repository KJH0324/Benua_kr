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
    <footer className="bg-venuea-green text-[#faf2e7] pt-16 pb-12 px-6 md:px-[60px]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#faf2e7]/20">
        <div className="space-y-4">
          <Link to="/" className="inline-flex">
            <img src="/benua_horizontal_notag_beige.svg" alt="Benua" width="140" height="32" className="h-8 w-auto" />
          </Link>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold">바로가기</h3>
          <ul className="space-y-2 text-sm text-[#faf2e7]/85">
            <li>
              <Link to="/shop" className="hover:text-white">
                컬렉션
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white">
                브랜드 스토리
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-white">
                주문조회
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">
                고객 문의
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold">고객정책</h3>
          <ul className="space-y-2 text-sm text-[#faf2e7]/85">
            <li>
              <Link to="/terms" className="hover:text-white">
                이용약관
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white">
                개인정보처리방침
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3 min-w-0">
          <h3 className="text-sm font-bold">소식 받기</h3>
          <form onSubmit={handleSubscribe} className="flex gap-2 min-w-0">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="min-w-0 flex-1 bg-transparent border border-[#faf2e7]/40 rounded-lg px-3 py-2 text-sm text-[#faf2e7] placeholder:text-[#faf2e7]/50 focus:outline-none focus:border-[#faf2e7]"
            />
            <button
              type="submit"
              className="bg-[#faf2e7] text-venuea-green px-4 py-2 rounded-lg text-sm font-bold shrink-0"
            >
              구독
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 text-[12px] text-[#faf2e7]/80 space-y-2">
        <p className="leading-relaxed">
          상호명 베뉴아 · 대표자 강성달 · 사업자등록번호 574-30-02068 · 통신판매업신고번호
          제2026-인천연수구-1145
          <br />
          사업장 소재지 인천광역시 연수구 새말로 154, 307동 602호
        </p>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <p>© {new Date().getFullYear()} Benua. All rights reserved.</p>
          <p>
            고객센터{" "}
            <a href="tel:01092618016" className="hover:text-white">
              010-9261-8016
            </a>{" "}
            ·{" "}
            <a href="mailto:support@benua.shop" className="hover:text-white">
              support@benua.shop
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

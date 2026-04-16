import { useState } from "react";
import { motion } from "motion/react";
import { User, Mail, Shield, Chrome, Link as LinkIcon, LogOut, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

export default function Profile() {
  const [user, setUser] = useState({
    name: "김민수",
    email: "minsu@example.com",
    role: "일반 회원",
    linkedAccounts: ["google"]
  });

  const accounts = [
    { id: "google", name: "Google", icon: Chrome, color: "text-venuea-dark" },
    { id: "naver", name: "Naver", icon: () => <span className="font-bold">N</span>, color: "text-[#03C75A]" },
  ];

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-bold text-venuea-dark mb-2 uppercase tracking-tight">마이 프로필</h1>
            <p className="text-venuea-muted">계정 설정 및 소셜 계정 연동을 관리하세요.</p>
          </div>
          <button className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors">
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#F9F9F9] p-8 border border-venuea-dark/5 text-center">
              <div className="w-24 h-24 bg-venuea-dark text-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
                김
              </div>
              <h3 className="text-xl font-bold text-venuea-dark uppercase tracking-tight">{user.name}</h3>
              <p className="text-sm text-venuea-muted">{user.email}</p>
              <div className="mt-4 inline-block px-3 py-1 bg-venuea-gold/10 text-venuea-gold text-[10px] font-bold uppercase tracking-widest rounded-full">
                {user.role}
              </div>
            </div>

            <nav className="space-y-2">
              <Link to="/track" className="flex items-center space-x-3 p-4 bg-white border border-venuea-dark/5 hover:bg-[#F9F9F9] transition-colors">
                <Package size={18} className="text-venuea-dark/40" />
                <span className="text-sm font-medium text-venuea-dark">주문 내역</span>
              </Link>
              <Link to="/settings" className="flex items-center space-x-3 p-4 bg-white border border-venuea-dark/5 hover:bg-[#F9F9F9] transition-colors">
                <Shield size={18} className="text-venuea-dark/40" />
                <span className="text-sm font-medium text-venuea-dark">보안 설정</span>
              </Link>
            </nav>
          </div>

          {/* Linked Accounts */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white p-8 border border-venuea-dark/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="text-lg font-bold text-venuea-dark mb-6 flex items-center space-x-2 uppercase tracking-widest">
                <LinkIcon size={20} className="text-venuea-gold" />
                <span>소셜 계정 연동</span>
              </h3>
              <p className="text-sm text-venuea-muted mb-8 leading-relaxed">
                소셜 계정을 연결하여 더 빠르고 안전하게 로그인하세요. 프로필 정보가 자동으로 동기화됩니다.
              </p>

              <div className="space-y-4">
                {accounts.map((acc) => {
                  const isLinked = user.linkedAccounts.includes(acc.id);
                  const Icon = acc.icon;
                  return (
                    <div key={acc.id} className="flex items-center justify-between p-4 bg-[#F9F9F9] border border-venuea-dark/5">
                      <div className="flex items-center space-x-4">
                        <div className={cn("w-10 h-10 bg-white flex items-center justify-center shadow-sm", acc.color)}>
                          {typeof Icon === 'function' ? <Icon /> : <Icon size={20} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-venuea-dark">{acc.name}</h4>
                          <p className="text-[10px] text-venuea-dark/40 uppercase tracking-widest">
                            {isLinked ? "연결됨" : "연결되지 않음"}
                          </p>
                        </div>
                      </div>
                      <button className={cn(
                        "text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all",
                        isLinked 
                          ? "text-venuea-dark/40 hover:text-red-500" 
                          : "bg-venuea-dark text-white hover:bg-venuea-gold"
                      )}>
                        {isLinked ? "연결 해제" : "연결하기"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-8 border border-venuea-dark/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="text-lg font-bold text-venuea-dark mb-6 uppercase tracking-widest">계정 설정</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">이름</label>
                    <input type="text" defaultValue={user.name} className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">이메일 주소</label>
                    <input type="email" defaultValue={user.email} className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold" />
                  </div>
                </div>
                <button className="bg-venuea-dark text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all">
                  변경 사항 저장
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success("메시지가 전송되었습니다. 관리자가 확인 후 답변 드릴 예정입니다.");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error("전송에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch (error) {
      toast.error("서버 연결 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-[120px] md:pt-32 pb-20 px-6 md:px-[60px]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-venuea-dark mb-8 tracking-tight">문의하기</h1>
            <p className="text-lg text-venuea-muted mb-12 font-light leading-relaxed">
              베뉴아의 제품이나 서비스에 대해 궁금한 점이 있으신가요? <br />
              아래 연락처나 폼을 통해 언제든 문의해 주세요.
            </p>

            <div className="space-y-8">
              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 bg-venuea-dark text-venuea-gold flex items-center justify-center rounded-full shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-venuea-dark mb-1">이메일</h4>
                  <p className="text-venuea-muted">support@benua.shop</p>
                </div>
              </div>
              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 bg-venuea-dark text-venuea-gold flex items-center justify-center rounded-full shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-venuea-dark mb-1">전화</h4>
                  <p className="text-venuea-muted">02-1234-5678</p>
                </div>
              </div>
              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 bg-venuea-dark text-venuea-gold flex items-center justify-center rounded-full shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-venuea-dark mb-1">주소</h4>
                  <p className="text-venuea-muted">인천광역시 [상세 주소 입력]</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white p-10 shadow-[0_40px_80px_rgba(0,0,0,0.05)] border border-venuea-dark/5"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">성함</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">이메일</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">제목</label>
                <input 
                  type="text" 
                  required 
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40">메시지</label>
                <textarea 
                  rows={5} 
                  required 
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-3 text-sm focus:outline-none focus:border-venuea-gold resize-none" 
                />
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 group disabled:opacity-50"
              >
                <span>{isSubmitting ? "전송 중..." : "메시지 보내기"}</span>
                {!isSubmitting && <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


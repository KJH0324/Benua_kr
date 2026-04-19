import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<'prompt' | 'loading' | 'success' | 'error'>('prompt');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (token) {
      try {
        const decodedEmail = atob(token);
        setEmail(decodedEmail);
      } catch {
        setStatus('error');
      }
    } else {
      setStatus('error');
    }
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus('loading');
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="pt-[120px] md:pt-32 pb-20 px-6 min-h-screen flex items-center justify-center">
      <div className="bg-white p-10 max-w-md w-full border border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,0.03)] text-center">
        {status === 'prompt' && (
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-venuea-dark mb-2">뉴스레터 수신 거부</h2>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-bold text-venuea-dark">{email}</span> 주소로 발송되는<br/>
                베뉴아의 새로운 소식과 이벤트 안내를 더 이상 받지 않으시겠습니까?
              </p>
            </div>
            <div className="flex w-full space-x-3">
              <Link 
                to="/" 
                className="flex-1 bg-white border border-venuea-dark text-venuea-dark py-4 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors block text-center"
              >
                취소
              </Link>
              <button 
                onClick={handleUnsubscribe}
                className="flex-1 bg-venuea-dark text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors block text-center"
              >
                수신 거부하기
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="w-12 h-12 text-venuea-gold animate-spin" />
            <p className="text-sm font-bold text-venuea-dark uppercase tracking-widest">수신 거부 처리 중...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <div>
              <h2 className="text-xl font-bold text-venuea-dark mb-2">구독이 취소되었습니다</h2>
              <p className="text-sm text-gray-500 mb-6">다시 만날 그 날을 기다리겠습니다.</p>
            </div>
            <Link 
              to="/" 
              className="w-full bg-venuea-dark text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors block text-center"
            >
              메인으로 돌아가기
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <XCircle className="w-16 h-16 text-red-500" />
            <div>
              <h2 className="text-xl font-bold text-venuea-dark mb-2">요청을 처리할 수 없습니다</h2>
              <p className="text-sm text-gray-500 mb-6">유효하지 않은 링크이거나 문제가 발생했습니다.</p>
            </div>
            <Link 
              to="/" 
              className="w-full bg-white border border-venuea-dark text-venuea-dark py-4 text-xs font-bold uppercase tracking-widest hover:bg-venuea-dark hover:text-white transition-colors block text-center"
            >
              메인으로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

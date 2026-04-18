import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify/${token}`);
        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="pt-[120px] md:pt-32 pb-20 px-6 min-h-screen flex items-center justify-center">
      <div className="bg-white p-10 max-w-md w-full border border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,0.03)] text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="w-12 h-12 text-venuea-gold animate-spin" />
            <p className="text-sm font-bold text-venuea-dark uppercase tracking-widest">이메일 인증 진행 중...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <div>
              <h2 className="text-xl font-bold text-venuea-dark mb-2">이메일 인증이 완료되었습니다</h2>
              <p className="text-sm text-gray-500 mb-6">이제 베뉴아의 모든 서비스를 정상적으로 이용하실 수 있습니다.</p>
            </div>
            <Link 
              to="/profile" 
              className="w-full bg-venuea-dark text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors block text-center"
            >
              마이페이지로 이동하기
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <XCircle className="w-16 h-16 text-red-500" />
            <div>
              <h2 className="text-xl font-bold text-venuea-dark mb-2">인증에 실패했습니다</h2>
              <p className="text-sm text-gray-500 mb-6">유효기간이 만료되었거나 잘못된 접근입니다. 다시 인증을 요청해 주세요.</p>
            </div>
            <Link 
              to="/profile" 
              className="w-full bg-white border border-venuea-dark text-venuea-dark py-4 text-xs font-bold uppercase tracking-widest hover:bg-venuea-dark hover:text-white transition-colors block text-center"
            >
              인증 재요청 하러가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

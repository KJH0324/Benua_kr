import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-venuea-dark/5 py-16 px-8 md:px-[60px]">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-venuea-dark tracking-[4px] uppercase">Benua</h3>
          <p className="text-sm text-venuea-muted leading-relaxed max-w-xs">
            미니멀리즘의 정점. 프리미엄 홈 에센셜을 통한 완벽한 라이프스타일 경험을 제공합니다.
          </p>
        </div>
        
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-venuea-dark mb-6">쇼핑</h4>
          <ul className="space-y-3 text-sm text-venuea-muted">
            <li><Link to="/shop" className="hover:text-venuea-gold transition-colors">전체 상품</Link></li>
            <li><Link to="/shop?category=living" className="hover:text-venuea-gold transition-colors">리빙</Link></li>
            <li><Link to="/shop?category=kitchen" className="hover:text-venuea-gold transition-colors">키친</Link></li>
            <li><Link to="/shop?category=decor" className="hover:text-venuea-gold transition-colors">데코</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-venuea-dark mb-6">회사</h4>
          <ul className="space-y-3 text-sm text-venuea-muted">
            <li><Link to="/about" className="hover:text-venuea-gold transition-colors">소개</Link></li>
            <li><Link to="/contact" className="hover:text-venuea-gold transition-colors">문의</Link></li>
            <li><Link to="/terms" className="hover:text-venuea-gold transition-colors">이용약관</Link></li>
            <li><Link to="/privacy" className="hover:text-venuea-gold transition-colors">개인정보처리방침</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-venuea-dark mb-6">뉴스레터</h4>
          <p className="text-sm text-venuea-muted mb-4">새로운 소식과 특별한 혜택을 받아보세요.</p>
          <form className="flex">
            <input 
              type="email" 
              placeholder="이메일 주소" 
              className="bg-[#F9F9F9] border border-venuea-dark/10 px-4 py-2 text-sm flex-grow focus:outline-none focus:border-venuea-gold"
            />
            <button className="bg-venuea-dark text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors">
              구독하기
            </button>
          </form>
        </div>
      </div>
      
      <div className="max-w-[1440px] mx-auto mt-16 pt-8 border-t border-venuea-dark/5 flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
        <div className="flex flex-wrap gap-8 items-center justify-center md:justify-start text-[10px] text-venuea-muted tracking-widest">
          <span>인천광역시 [상세 주소 입력]</span>
          <span>사업자등록번호: [번호 입력]</span>
        </div>
        
        <p className="text-[10px] text-venuea-muted uppercase tracking-widest">
          © 2026 Benua. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

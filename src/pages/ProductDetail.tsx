import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShoppingBag, Heart, Share2, ChevronRight, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { formatPrice } from "../lib/utils";

export default function ProductDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Mock product data
  const product = {
    id,
    name: "리넨 소파 커버",
    price: 85000,
    category: "리빙",
    description: "베누아의 시그니처 리넨 소파 커버는 100% 유기농 유럽산 아마로 제작되었습니다. 가구 보호와 동시에 거실 공간에 부드럽고 자연스러운 분위기를 선사하도록 디자인되었습니다. 통기성이 뛰어난 소재는 세탁할수록 부드러워지며, 오랜 시간 지속되는 편안함과 스타일을 보장합니다.",
    details: [
      "100% 유기농 리넨",
      "뛰어난 통기성과 내구성",
      "세탁기 사용 가능",
      "4가지 내추럴 톤 선택 가능",
      "수공예 마감 처리"
    ],
    images: [
      "https://picsum.photos/seed/sofa1/1200/1600",
      "https://picsum.photos/seed/sofa2/1200/1600",
      "https://picsum.photos/seed/sofa3/1200/1600",
    ]
  };

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-venuea-dark/40 mb-12">
          <Link to="/" className="hover:text-venuea-dark transition-colors">홈</Link>
          <ChevronRight size={12} />
          <Link to="/shop" className="hover:text-venuea-dark transition-colors">스토어</Link>
          <ChevronRight size={12} />
          <span className="text-venuea-dark">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Image Gallery */}
          <div className="space-y-4">
            <motion.div 
              layoutId={`product-image-${id}`}
              className="aspect-[3/4] bg-[#F9F9F9] overflow-hidden"
            >
              <img 
                src={product.images[activeImage]} 
                alt={product.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <div className="grid grid-cols-3 gap-4">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square overflow-hidden border-2 transition-all ${
                    activeImage === idx ? "border-venuea-gold" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-venuea-gold mb-4">{product.category}</p>
              <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-4 leading-tight uppercase tracking-tight">{product.name}</h1>
              <p className="text-2xl font-bold text-venuea-dark">{formatPrice(product.price)}</p>
            </div>

            <p className="text-venuea-muted leading-relaxed font-light text-lg">
              {product.description}
            </p>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-venuea-dark">주요 특징</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.details.map((detail, i) => (
                  <li key={i} className="flex items-center space-x-3 text-sm text-venuea-muted">
                    <div className="w-1.5 h-1.5 bg-venuea-gold rounded-full" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8 border-t border-venuea-dark/10 space-y-6">
              <div className="flex items-center space-x-6">
                <div className="flex items-center border border-venuea-dark/20 p-1">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors text-venuea-dark"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors text-venuea-dark"
                  >
                    +
                  </button>
                </div>
                <button className="flex-grow bg-venuea-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all flex items-center justify-center space-x-3 group">
                  <ShoppingBag size={18} />
                  <span>장바구니 담기</span>
                </button>
                <button className="w-14 h-14 border border-venuea-dark/20 flex items-center justify-center text-venuea-dark hover:bg-[#F9F9F9] transition-colors">
                  <Heart size={20} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center space-y-2">
                  <Truck size={20} className="mx-auto text-venuea-gold" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/60">무료 배송</p>
                </div>
                <div className="text-center space-y-2">
                  <ShieldCheck size={20} className="mx-auto text-venuea-gold" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/60">2년 보증</p>
                </div>
                <div className="text-center space-y-2">
                  <RotateCcw size={20} className="mx-auto text-venuea-gold" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-venuea-dark/60">30일 반품</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShoppingBag, Heart, ChevronRight, Truck, ShieldCheck, RotateCcw, Loader2 } from "lucide-react";
import { formatPrice } from "../lib/utils";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  description_image_url: string;
  category: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error("상품을 찾을 수 없습니다.");
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        toast.error("상품 정보를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-venuea-gold" size={48} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold">상품을 찾을 수 없습니다.</h1>
        <Link to="/shop" className="text-venuea-gold underline">스토어로 돌아가기</Link>
      </div>
    );
  }

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
                src={product.image_url || "https://picsum.photos/seed/placeholder/1200/1600"} 
                alt={product.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>

          {/* Product Info */}
          <div className="space-y-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-venuea-gold mb-4">{product.category}</p>
              <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-4 leading-tight uppercase tracking-tight">{product.name}</h1>
              <p className="text-2xl font-bold text-venuea-dark">{formatPrice(product.price)}</p>
            </div>

            <p className="text-venuea-muted leading-relaxed font-light text-lg whitespace-pre-wrap">
              {product.description}
            </p>

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

        {/* Long Description Image */}
        {product.description_image_url && (
          <div className="mt-20 pt-20 border-t border-venuea-dark/5">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-center text-xs font-bold uppercase tracking-[4px] text-venuea-gold mb-12">Product Details</h3>
              <img 
                src={product.description_image_url} 
                alt="Product Details" 
                className="w-full h-auto shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

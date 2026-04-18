import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShoppingBag, Heart, ChevronRight, Truck, ShieldCheck, RotateCcw, Loader2 } from "lucide-react";
import { formatPrice, cn } from "../lib/utils";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  price: number;
  discount_rate?: number;
  description: string;
  image_url: string;
  description_image_url: string;
  category: string;
  stock?: number;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error("상품을 찾을 수 없습니다.");
        const data = await response.json();
        setProduct(data);
        document.title = `Benua | ${data.name}`;

        const revRes = await fetch(`/api/products/${id}/reviews`);
        if (revRes.ok) setReviews(await revRes.json());
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

  const addToCart = () => {
    if (!product) return;
    
    try {
      const savedCart = localStorage.getItem("venuea-cart");
      const currentCart = savedCart ? JSON.parse(savedCart) : [];
      
      const productId = Number(product.id);
      const existingItemIndex = currentCart.findIndex((item: any) => Number(item.id) === productId);
      
      const finalPrice = product.discount_rate && product.discount_rate > 0 
        ? product.price * (1 - product.discount_rate / 100)
        : product.price;

      if (existingItemIndex > -1) {
        const totalQuantity = currentCart[existingItemIndex].quantity + quantity;
        if (product.stock !== undefined && totalQuantity > product.stock) {
          toast.error(`재고가 부족합니다. (최대 ${product.stock}개)`);
          return;
        }
        currentCart[existingItemIndex].quantity = totalQuantity;
      } else {
        if (product.stock !== undefined && quantity > product.stock) {
          toast.error(`재고가 부족합니다. (최대 ${product.stock}개)`);
          return;
        }
        currentCart.push({
          id: product.id,
          name: product.name,
          price: finalPrice,
          original_price: product.price,
          discount_rate: product.discount_rate || 0,
          quantity: quantity,
          stock: product.stock,
          image: product.image_url || "https://picsum.photos/seed/placeholder/800/1000"
        });
      }
      
      localStorage.setItem("venuea-cart", JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cartUpdated"));
      toast.success("장바구니에 담겼습니다.");
    } catch (e) {
      console.error(e);
      toast.error("장바구니 담기 실패");
    }
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
            <div className="aspect-[3/4] bg-[#F9F9F9] overflow-hidden">
              <img 
                src={product.image_url || "https://picsum.photos/seed/placeholder/1200/1600"} 
                alt={product.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-venuea-gold mb-4">{product.category}</p>
              <h1 className="text-4xl md:text-5xl font-bold text-venuea-dark mb-4 leading-tight uppercase tracking-tight">{product.name}</h1>
              {product.discount_rate && product.discount_rate > 0 ? (
                <div className="flex items-end space-x-4">
                  <p className="text-3xl font-bold text-red-600">{product.discount_rate}%</p>
                  <p className="text-2xl font-bold text-venuea-dark">{formatPrice(product.price * (1 - product.discount_rate / 100))}</p>
                  <p className="text-lg text-venuea-muted line-through mb-1">{formatPrice(product.price)}</p>
                </div>
              ) : (
                <p className="text-2xl font-bold text-venuea-dark">{formatPrice(product.price)}</p>
              )}
              {product.stock !== undefined && product.stock < 5 && (
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-4",
                  product.stock > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {product.stock <= 0 ? "품절" : `남은 재고: ${product.stock}개`}
                </p>
              )}
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
                    onClick={() => {
                      if (product.stock !== undefined && quantity >= product.stock) {
                        toast.error(`재고 이상 선택할 수 없습니다. (남은 재고: ${product.stock}개)`);
                        return;
                      }
                      setQuantity(quantity + 1);
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-[#F9F9F9] transition-colors text-venuea-dark"
                  >
                    +
                  </button>
                </div>
                <button 
                  onClick={addToCart}
                  disabled={product.stock !== undefined && product.stock <= 0}
                  className={cn(
                    "flex-grow py-4 font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-3 group",
                    product.stock !== undefined && product.stock <= 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-venuea-dark text-white hover:bg-venuea-gold"
                  )}
                >
                  <ShoppingBag size={18} />
                  <span>{product.stock !== undefined && product.stock <= 0 ? "품절" : "장바구니 담기"}</span>
                </button>
                <button className="w-14 h-14 border border-venuea-dark/20 flex items-center justify-center text-venuea-dark hover:bg-[#F9F9F9] transition-colors">
                  <Heart size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Long Description Image */}
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

        {/* Reviews Section */}
        <div className="mt-32 pt-20 border-t border-venuea-dark/10">
          <div className="max-w-4xl mx-auto">
            <header className="text-center mb-16">
              <span className="text-[10px] font-bold uppercase tracking-[4px] text-venuea-gold mb-2 block">Customer Stories</span>
              <h2 className="text-3xl font-bold text-venuea-dark uppercase tracking-tight">리뷰 ({reviews.length})</h2>
              <div className="w-12 h-1 bg-venuea-dark mx-auto mt-4" />
            </header>

            {reviews.length === 0 ? (
              <div className="text-center py-20 bg-[#F9F9F9] border border-venuea-dark/5">
                <p className="text-sm text-venuea-muted uppercase tracking-widest">아직 작성된 리뷰가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-venuea-dark/5 pb-12">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <svg 
                              key={s} 
                              className={cn("w-3 h-3 fill-current", s <= review.rating ? "text-venuea-gold" : "text-gray-200")} 
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-venuea-dark">{review.user_name}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest border",
                          review.user_tier === 'BLACK' || review.user_tier === 'THE_BLACK' ? "text-venuea-gold border-venuea-gold/20 bg-venuea-gold/5" : "text-gray-400 border-gray-100"
                        )}>
                          {review.user_tier}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-venuea-muted">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                      {review.image_url && (
                        <div className="w-full md:w-48 aspect-square bg-gray-50 flex-shrink-0">
                          <img src={review.image_url} alt="Review" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-grow">
                        <p className="text-venuea-dark text-sm leading-relaxed whitespace-pre-wrap">
                          {review.content || "소중한 후기 감사합니다."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

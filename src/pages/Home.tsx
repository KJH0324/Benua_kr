import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn, formatPrice } from "../lib/utils";

export default function Home() {
  const [activeFeatured, setActiveFeatured] = useState(0);
  const [realProducts, setRealProducts] = useState<any[]>([]);

  const featuredProducts = [
    {
      id: "f1",
      name: "시그니처 에센스 컬렉션",
      description: "베누아의 철학이 담긴 가장 순수한 형태의 디자인.",
      price: "₩184,000",
      image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1000"
    },
    {
      id: "f2",
      name: "오크 우드 미니멀 미러",
      description: "자연의 질감을 그대로 살린 정교한 수공예 거울.",
      price: "₩245,000",
      image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=1000"
    },
    {
      id: "f3",
      name: "리넨 소프틀리 소파 세트",
      description: "공간에 평온함을 더하는 부드러운 리넨의 감촉.",
      price: "₩1,250,000",
      image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=1000"
    }
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        const data = await response.json();
        
        // Featured selection (Monthly recommendation) - Top 3 by discount rate
        const featured = [...data]
          .sort((a: any, b: any) => (b.discount_rate || 0) - (a.discount_rate || 0))
          .slice(0, 3)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: formatPrice(p.price * (1 - (p.discount_rate || 0) / 100)),
            image: p.image_url || "https://picsum.photos/seed/placeholder/800/1000"
          }));
        
        if (featured.length > 0) {
          setFeaturedProductsFromDB(featured);
        }

        // Featured Grid (Craftsmanship) - Filter by show_on_main and take top 3
        const mainProducts = data.filter((p: any) => p.show_on_main === 1).slice(0, 3);
        setRealProducts(mainProducts);
      } catch (error) {
        console.error(error);
      }
    };
    fetchProducts();
  }, []);

  const [featuredProductsFromDB, setFeaturedProductsFromDB] = useState<any[]>([]);
  const displayFeatured = featuredProductsFromDB.length > 0 ? featuredProductsFromDB : featuredProducts;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeatured((prev) => (prev + 1) % displayFeatured.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayFeatured.length]);

  return (
    <div className="relative">
      {/* Hero Section - Split Layout */}
      <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden bg-white pt-[80px] md:pt-[100px]">
        <div className="flex flex-col justify-center px-6 md:px-[60px] py-16 md:py-12">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[3px] text-venuea-gold mb-4 md:mb-6 block">
              럭셔리의 새로운 기준
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-[64px] font-bold text-venuea-dark mb-6 md:mb-8 leading-[1.1] tracking-[-1px] md:tracking-[-2px]">
              순수한 우아함을<br className="hidden sm:block" /> 경험하세요.
            </h1>
            <p className="text-sm md:text-[16px] text-venuea-muted max-w-[400px] mb-10 md:mb-12 leading-[1.6]">
              베누아는 미니멀리즘 공예의 정점을 상징합니다. 독자적인 컬렉션을 탐색하고 완벽한 쇼핑 경험을 즐겨보세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              <Link 
                to="/shop" 
                className="bg-venuea-dark text-white px-8 md:px-10 py-4 md:py-5 text-[13px] md:text-sm font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all duration-500 text-center"
              >
                컬렉션 쇼핑하기
              </Link>
              <Link 
                to="/about" 
                className="bg-transparent border border-venuea-dark text-venuea-dark px-8 md:px-10 py-4 md:py-5 text-[13px] md:text-sm font-bold uppercase tracking-widest hover:bg-venuea-dark hover:text-white transition-all duration-500 text-center"
              >
                브랜드 스토리
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="relative bg-[#F9F9F9] flex items-center justify-center overflow-hidden min-h-[400px] md:min-h-0">
          {/* Decorative Circles - Hidden on small mobile to reduce clutter */}
          <div className="absolute w-[300px] md:w-[500px] h-[300px] md:h-[500px] border border-venuea-gold/20 rounded-full" />
          <div className="absolute w-[400px] md:w-[600px] h-[400px] md:h-[600px] border border-venuea-gold/10 rounded-full" />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="relative w-[260px] md:w-[320px] h-[380px] md:h-[440px] bg-white shadow-[0_40px_80px_rgba(0,0,0,0.08)] p-8 md:p-10 flex flex-col justify-between z-10"
          >
            {realProducts.length > 0 ? (
              <>
                <Link to={`/product/${realProducts[0].id}`} className="w-full h-[200px] md:h-[240px] bg-white overflow-hidden group">
                  <img 
                    src={realProducts[0].image_url} 
                    alt={realProducts[0].name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </Link>
                <div className="product-info">
                  <span className="text-[10px] text-venuea-gold uppercase tracking-[2px] font-bold block mb-2">Spotlight Item</span>
                  <h3 className="text-[16px] md:text-[18px] font-bold mb-1 md:mb-2 line-clamp-1">{realProducts[0].name}</h3>
                  <p className="text-venuea-dark font-bold text-[18px] md:text-[20px]">{formatPrice(realProducts[0].price)}</p>
                  <div className="text-[10px] md:text-[11px] mt-3 md:mt-4 uppercase tracking-[1px] text-venuea-muted flex items-center space-x-2">
                    <span className="w-1 h-1 bg-venuea-gold rounded-full" />
                    <span>무료 특급 배송</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-full h-[200px] md:h-[240px] bg-gradient-to-br from-[#F5F5F5] to-[#EAEAEA] flex items-center justify-center text-[10px] md:text-[12px] text-[#CCC] tracking-[2px] uppercase">
                  Benua Item 01
                </div>
                <div className="product-info">
                  <h3 className="text-[16px] md:text-[18px] font-bold mb-1 md:mb-2">시그니처 에센스</h3>
                  <p className="text-venuea-gold font-bold text-[18px] md:text-[20px]">₩184,000</p>
                  <div className="text-[10px] md:text-[11px] mt-3 md:mt-4 uppercase tracking-[1px] text-[#AAA]">
                    무료 특급 배송
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Dynamic Featured Section */}
      <section className="relative py-20 md:py-32 bg-[#F9F9F9] overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-[60px]">
          <div className="mb-12 md:mb-16">
            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-[3px] text-venuea-gold mb-3 md:mb-4">Featured Selection</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-venuea-dark">이달의 추천 컬렉션</h3>
          </div>

          <div className="relative min-h-[500px] md:h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeatured}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center"
              >
                <div className="relative aspect-[4/3] overflow-hidden shadow-2xl">
                  <motion.img
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.2 }}
                    src={displayFeatured[activeFeatured].image}
                    alt={displayFeatured[activeFeatured].name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-4 md:space-y-6">
                  <motion.h4 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl md:text-4xl font-bold text-venuea-dark"
                  >
                    {displayFeatured[activeFeatured].name}
                  </motion.h4>
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-base md:text-lg text-venuea-muted leading-relaxed"
                  >
                    {displayFeatured[activeFeatured].description}
                  </motion.p>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap items-center gap-6"
                  >
                    <span className="text-xl md:text-2xl font-bold text-venuea-gold">{displayFeatured[activeFeatured].price}</span>
                    <Link to={`/product/${displayFeatured[activeFeatured].id}`} className="text-sm font-bold uppercase tracking-widest text-venuea-dark border-b-2 border-venuea-dark pb-1 hover:text-venuea-gold hover:border-venuea-gold transition-all">
                      자세히 보기
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Indicators */}
          <div className="flex justify-center mt-12 space-x-4">
            {displayFeatured.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveFeatured(i)}
                className={cn(
                  "w-12 h-[2px] transition-all duration-500",
                  activeFeatured === i ? "bg-venuea-gold" : "bg-venuea-dark/10"
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Grid Section */}
      <section className="py-20 md:py-32 px-6 md:px-[60px] bg-white">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:index-16 space-y-6 md:space-y-0">
            <div className="max-w-xl">
              <h3 className="text-3xl md:text-5xl font-bold text-venuea-dark mb-4 md:mb-6">
                편안함을 위한 공예
              </h3>
              <p className="text-sm md:text-base text-venuea-muted leading-relaxed">
                저희 컬렉션의 모든 제품은 품질, 지속 가능성, 그리고 집에 평온함을 가져다주는 능력을 기준으로 엄선되었습니다.
              </p>
            </div>
            <Link to="/shop" className="text-xs md:text-sm font-bold uppercase tracking-widest text-venuea-dark border-b border-venuea-dark pb-1 hover:text-venuea-gold hover:border-venuea-gold transition-all">
              모든 제품 보기
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {realProducts.length > 0 ? (
              realProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  whileHover={{ y: -10 }}
                  className="group"
                >
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="aspect-[3/4] overflow-hidden bg-[#F9F9F9] mb-6">
                      <img 
                        src={product.image_url || `https://picsum.photos/seed/venuea-${product.id}/800/1000`} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h4 className="text-lg font-bold text-venuea-dark mb-2 uppercase tracking-tight">{product.name}</h4>
                    <p className="text-xs text-venuea-muted uppercase tracking-widest mb-2">{product.category}</p>
                    <p className="text-venuea-gold font-bold">{formatPrice(product.price)}</p>
                  </Link>
                </motion.div>
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -10 }}
                  className="group"
                >
                  <Link to="/shop" className="block">
                    <div className="aspect-[3/4] overflow-hidden bg-[#F9F9F9] mb-6">
                      <img 
                        src={`https://picsum.photos/seed/venuea-${i}/800/1000`} 
                        alt="Product" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h4 className="text-lg font-bold text-venuea-dark mb-2 uppercase tracking-tight">아티저널 리빙 아이템 {i}</h4>
                    <p className="text-xs text-venuea-muted uppercase tracking-widest mb-2">리빙 / 데코</p>
                    <p className="text-venuea-gold font-bold">₩45,000</p>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 md:py-32 bg-venuea-dark text-white overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-[60px] grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="relative order-2 md:order-1">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1 }}
              className="aspect-square bg-venuea-gold/10 rounded-full absolute -top-5 -left-5 md:-top-10 md:-left-10 w-full h-full z-0"
            />
            <img 
              src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=1000" 
              alt="Philosophy" 
              className="relative z-10 w-full h-full object-cover shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-6 md:space-y-8 order-1 md:order-2">
            <h3 className="text-3xl md:text-6xl font-bold leading-tight tracking-tight">
              슬로우 리빙의 철학
            </h3>
            <p className="text-white/60 text-base md:text-lg leading-relaxed font-light">
              우리는 집이 안식처가 되어야 한다고 믿습니다. 멈추지 않는 세상 속에서, 베누아는 당신이 속도를 늦추고, 숨을 쉬며, 주변의 단순한 아름다움을 감상할 수 있도록 돕는 필수 아이템을 제공합니다.
            </p>
            <div className="grid grid-cols-2 gap-4 md:gap-8 pt-4 md:pt-8">
              <div>
                <h5 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-venuea-gold">내추럴</h5>
                <p className="text-[11px] md:text-sm text-white/40 uppercase tracking-wider">지속 가능한 소재의 사용.</p>
              </div>
              <div>
                <h5 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-venuea-gold">코지</h5>
                <p className="text-[11px] md:text-sm text-white/40 uppercase tracking-wider">최상의 편안함을 위한 디자인.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

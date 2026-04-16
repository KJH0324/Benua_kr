import { useState } from "react";
import { motion } from "motion/react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { formatPrice } from "../lib/utils";

const CATEGORIES = ["전체", "리빙", "키친", "데코", "침구", "욕실"];

const MOCK_PRODUCTS = [
  { id: "1", name: "리넨 소파 커버", category: "리빙", price: 85000, image: "https://picsum.photos/seed/sofa/800/1000" },
  { id: "2", name: "세라믹 커피 세트", category: "키친", price: 42000, image: "https://picsum.photos/seed/coffee/800/1000" },
  { id: "3", name: "오크 우드 미러", category: "데코", price: 120000, image: "https://picsum.photos/seed/mirror/800/1000" },
  { id: "4", name: "코튼 블랭킷", category: "침구", price: 55000, image: "https://picsum.photos/seed/blanket/800/1000" },
  { id: "5", name: "아로마 캔들", category: "데코", price: 28000, image: "https://picsum.photos/seed/candle/800/1000" },
  { id: "6", name: "대나무 욕실 매트", category: "욕실", price: 35000, image: "https://picsum.photos/seed/bath/800/1000" },
];

export default function Shop() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = MOCK_PRODUCTS.filter(p => 
    (selectedCategory === "전체" || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pt-32 pb-20 px-8 md:px-[60px]">
      <div className="max-w-[1440px] mx-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-venuea-dark mb-6 tracking-tight">컬렉션 스토어</h1>
          <p className="text-venuea-muted max-w-xl">
            프리미엄 커머스 경험을 위해 엄선된 베누아의 미니멀리즘 에센셜 컬렉션을 만나보세요.
          </p>
        </header>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 space-y-6 md:space-y-0 border-b border-venuea-dark/10 pb-8">
          <div className="flex items-center space-x-8 overflow-x-auto w-full md:w-auto no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-bold uppercase tracking-[2px] whitespace-nowrap transition-all ${
                  selectedCategory === cat ? "text-venuea-gold border-b-2 border-venuea-gold pb-1" : "text-venuea-dark/40 hover:text-venuea-dark"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-venuea-dark/30" size={16} />
            <input 
              type="text" 
              placeholder="상품 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F9F9F9] border border-venuea-dark/10 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-venuea-gold"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="aspect-[3/4] overflow-hidden bg-[#F9F9F9] mb-6 relative">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-venuea-dark/0 group-hover:bg-venuea-dark/5 transition-colors duration-500" />
                <button className="absolute bottom-4 left-4 right-4 bg-venuea-dark text-white py-3 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:bg-venuea-gold">
                  장바구니 담기
                </button>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-bold text-venuea-dark mb-1 uppercase tracking-tight">{product.name}</h4>
                  <p className="text-[10px] text-venuea-muted uppercase tracking-widest">{product.category}</p>
                </div>
                <p className="text-venuea-gold font-bold">{formatPrice(product.price)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-40 text-center">
            <p className="text-venuea-dark/40 font-serif italic text-2xl">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

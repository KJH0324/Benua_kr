import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/utils";
import type { Product } from "../types";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [banner, setBanner] = useState<{ image_url?: string; link_url?: string }>({});

  useEffect(() => {
    apiFetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const featured = data.filter((p) => p.show_on_main === 1);
          setProducts(featured.length > 0 ? featured : data.slice(0, 8));
        }
      })
      .catch(() => {});

    apiFetch("/api/display")
      .then((r) => r.json())
      .then((items) => {
        if (Array.isArray(items)) {
          const main = items.find((i) => i.id === "main-banner");
          if (main) setBanner(main);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="pt-[76px]">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[540px] bg-[#1A1A1B] overflow-hidden flex items-center px-6 md:px-[60px]">
        <img
          src={
            banner.image_url ||
            "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&q=80&w=1800"
          }
          alt="Benua Curated Objet"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="relative z-10 max-w-2xl text-white space-y-6">
          <span className="text-xs font-bold uppercase tracking-[0.35em] text-venuea-gold block">
            Curated Living Objet
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight">
            공간에 고요한 울림을 더하는 오브제
          </h1>
          <p className="text-sm md:text-base text-gray-200 font-light leading-relaxed">
            베뉴아는 단순한 소품을 넘어 공간의 인상을 정의하는 조형적 오브제를 선보입니다.
          </p>
          <Link
            to={banner.link_url || "/shop"}
            className="inline-flex items-center gap-3 bg-white text-venuea-dark px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold hover:text-white transition-all"
          >
            <span>컬렉션 탐색하기</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-24 px-6 md:px-[60px] max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-venuea-gold">
              Signature Selection
            </span>
            <h2 className="text-3xl font-serif font-bold text-venuea-dark mt-1">
              큐레이션 오브제
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs font-bold uppercase tracking-widest text-venuea-dark hover:text-venuea-gold"
          >
            전체보기 →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => {
            const finalPrice =
              product.discount_rate && product.discount_rate > 0
                ? product.price * (1 - product.discount_rate / 100)
                : product.price;
            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                className="group"
              >
                <Link to={`/product/${product.id}`} className="block space-y-3">
                  <div className="aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden relative">
                    <img
                      src={product.image_url || "https://picsum.photos/seed/benua/600/750"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.discount_rate && product.discount_rate > 0 ? (
                      <span className="absolute top-3 left-3 bg-venuea-dark text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        {product.discount_rate}% OFF
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[11px] text-venuea-muted">{product.category}</p>
                    <h3 className="text-sm font-bold text-venuea-dark mt-0.5">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-venuea-dark">
                        {formatPrice(finalPrice)}
                      </span>
                      {product.discount_rate && product.discount_rate > 0 ? (
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
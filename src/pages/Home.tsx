import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatPrice, FREE_SHIPPING_MIN } from "../lib/utils";
import ProductCard, { type CardProduct } from "../components/ProductCard";

type StoreProduct = CardProduct & { show_on_main?: number };

export default function Home() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
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

  const heroImage = banner.image_url || products[0]?.image_url;
  const wide = products.length >= 4;

  return (
    <div className="pt-[76px]">
      <section className="relative h-[60vh] min-h-[440px] bg-venuea-green overflow-hidden flex items-end px-6 md:px-[60px] pb-12">
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" />
        <div className="relative z-10 max-w-2xl text-white space-y-5">
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            문을 닫으면,
            <br />
            나만의 쉼이 시작됩니다
          </h1>
          <p className="text-sm md:text-base text-white/90 leading-relaxed">
            {formatPrice(FREE_SHIPPING_MIN)} 이상 무료배송
          </p>
          <Link
            to={banner.link_url || "/shop"}
            className="inline-flex items-center gap-2 bg-venuea-green text-white px-6 py-3.5 rounded-full text-sm font-bold hover:bg-[#2d4a2c] transition-colors"
          >
            <span>신상품 보기</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 md:px-[60px] py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px] text-venuea-brown text-center">
          <p>{formatPrice(FREE_SHIPPING_MIN)} 이상 무료배송</p>
          <p>수령 후 7일 이내 교환·반품</p>
          <p>문의 support@benua.shop</p>
        </div>
      </section>

      <section className="py-16 px-6 md:px-[60px] max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-venuea-dark">신상품</h2>
          <Link to="/shop" className="text-sm font-bold text-venuea-green">
            전체보기
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-venuea-muted">곧 새 상품을 올려둡니다.</p>
        ) : (
          <div className={wide ? "grid grid-cols-2 lg:grid-cols-4 gap-6" : "grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl"}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";
import ProductCard, { type CardProduct } from "../components/ProductCard";

export default function Shop() {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");

  useEffect(() => {
    apiFetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const categories = [
    "전체",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  const filtered =
    selectedCategory === "전체"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const wide = filtered.length >= 4;

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-venuea-dark">
          오브제 컬렉션
        </h1>
        <p className="text-sm text-venuea-muted mt-2">
          작은 공간을 위한 감성 소품과 수납용품.
        </p>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-bold transition-colors",
                selectedCategory === cat
                  ? "bg-venuea-green text-white"
                  : "bg-white text-venuea-dark hover:bg-white/70"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-sm text-venuea-muted">
            {products.length === 0
              ? "아직 올라온 상품이 없습니다."
              : "이 카테고리는 준비 중입니다."}
          </p>
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory("전체")}
              className="bg-venuea-green text-white px-5 py-3 rounded-full text-sm font-bold"
            >
              전체 보기
            </button>
          )}
        </div>
      ) : (
        <div className={wide ? "grid grid-cols-2 lg:grid-cols-4 gap-6" : "grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl"}>
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

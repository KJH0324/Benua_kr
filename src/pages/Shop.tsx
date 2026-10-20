import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";
import ProductCard, { salePrice, type CardProduct } from "../components/ProductCard";

export default function Shop() {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"new" | "price-asc" | "price-desc">("new");

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

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const list = products.filter((p) => {
      const inCategory = selectedCategory === "전체" || p.category === selectedCategory;
      const inName = !q || p.name.toLowerCase().includes(q);
      return inCategory && inName;
    });
    if (sort === "price-asc") return [...list].sort((a, b) => salePrice(a) - salePrice(b));
    if (sort === "price-desc") return [...list].sort((a, b) => salePrice(b) - salePrice(a));
    return list;
  }, [products, selectedCategory, keyword, sort]);

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
        <div className="flex flex-wrap gap-2 mb-4">
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

      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="상품명 검색"
          className="flex-1 min-w-0 px-4 py-3 bg-white border border-black/10 rounded-xl text-sm"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "new" | "price-asc" | "price-desc")}
          className="px-4 py-3 bg-white border border-black/10 rounded-xl text-sm font-bold"
        >
          <option value="new">신상품순</option>
          <option value="price-asc">낮은 가격순</option>
          <option value="price-desc">높은 가격순</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-sm text-venuea-muted">
            {products.length === 0
              ? "아직 올라온 상품이 없습니다."
              : keyword.trim()
              ? "찾는 상품이 없습니다."
              : "이 카테고리는 준비 중입니다."}
          </p>
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("전체");
                setKeyword("");
              }}
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

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";
import ProductCard, { salePrice, type CardProduct } from "../components/ProductCard";

export default function Shop() {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"new" | "price-asc" | "price-desc" | "popular" | "reviews" | "discount">("new");
  const [tag, setTag] = useState("전체");

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
      const soldOut = Number(p.stock) === 0 && p.sale_mode !== "preorder";
      const tags = String((p as any).tags || "")
        .split(/[#,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const inTag = tag === "전체" || tags.includes(tag.replace("#", ""));
      return inCategory && inName && inTag && !(hideSoldOut && soldOut);
    });
    if (sort === "price-asc") return [...list].sort((a, b) => salePrice(a) - salePrice(b));
    if (sort === "price-desc") return [...list].sort((a, b) => salePrice(b) - salePrice(a));
    if (sort === "popular") return [...list].sort((a, b) => Number((b as any).sold_count || 0) - Number((a as any).sold_count || 0));
    if (sort === "reviews") return [...list].sort((a, b) => Number(b.review_count || 0) - Number(a.review_count || 0));
    if (sort === "discount") return [...list].sort((a, b) => Number(b.discount_rate || 0) - Number(a.discount_rate || 0));
    return list;
  }, [products, selectedCategory, keyword, sort, hideSoldOut, tag]);

  const tags = ["전체", ...Array.from(new Set(products.flatMap((p) => String((p as any).tags || "").split(/[#,\s]+/).map((item) => item.trim()).filter(Boolean))))];

  const wide = filtered.length >= 4;

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-venuea-dark">
          오브제 컬렉션
        </h1>
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
                  : "bg-white text-venuea-dark"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {tags.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTag(item)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold",
                tag === item ? "bg-venuea-brown text-white" : "bg-white text-venuea-brown"
              )}
            >
              {item === "전체" ? "공간 전체" : `#${item}`}
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
          onChange={(e) => setSort(e.target.value as "new" | "price-asc" | "price-desc" | "popular" | "reviews" | "discount")}
          className="px-4 py-3 bg-white border border-black/10 rounded-xl text-sm font-bold"
        >
          <option value="new">신상품순</option>
          <option value="popular">인기순</option>
          <option value="reviews">리뷰많은순</option>
          <option value="discount">할인율순</option>
          <option value="price-asc">낮은 가격순</option>
          <option value="price-desc">높은 가격순</option>
        </select>
        <button
          type="button"
          onClick={() => setHideSoldOut((value) => !value)}
          className={cn(
            "px-4 py-3 rounded-xl text-sm font-bold",
            hideSoldOut ? "bg-venuea-green text-white" : "bg-white text-venuea-dark border border-black/10"
          )}
        >
          품절 제외
        </button>
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

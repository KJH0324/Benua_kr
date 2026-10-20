import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatPrice, cn } from "../lib/utils";
import type { Product } from "../types";

const CATEGORIES = ["전체", "오브제", "세라믹 오브제", "글래스 오브제", "아로마 오브제", "공간 오브제"];

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");

  useEffect(() => {
    apiFetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const filtered =
    selectedCategory === "전체"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="pt-[110px] pb-24 px-6 md:px-[60px] max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-venuea-dark">
          오브제 컬렉션
        </h1>
        <p className="text-sm text-venuea-muted mt-2">
          공간의 밀도를 높이는 베뉴아의 시그니처 오브제를 만나보세요.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold transition-colors",
              selectedCategory === cat
                ? "bg-venuea-dark text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filtered.map((product) => {
          const finalPrice =
            product.discount_rate && product.discount_rate > 0
              ? product.price * (1 - product.discount_rate / 100)
              : product.price;
          return (
            <Link key={product.id} to={`/product/${product.id}`} className="group block space-y-3">
              <div className="aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden relative">
                <img
                  src={product.image_url || "https://picsum.photos/seed/objet/600/750"}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div>
                <p className="text-[11px] text-venuea-muted">{product.category}</p>
                <h3 className="text-sm font-bold text-venuea-dark">{product.name}</h3>
                <p className="text-sm font-bold text-venuea-dark mt-1">
                  {formatPrice(finalPrice)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
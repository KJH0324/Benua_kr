import { Link } from "react-router-dom";
import { formatPrice } from "../lib/utils";

export type CardProduct = {
  id: string | number;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  discount_rate?: number;
  stock?: number;
  sale_mode?: string;
};

export function salePrice(product: { price: number; discount_rate?: number }) {
  const rate = Number(product.discount_rate) || 0;
  const base = Number(product.price) || 0;
  if (rate > 0 && rate < 100) return Math.round(base * (1 - rate / 100));
  return base;
}

export default function ProductCard({ product }: { product: CardProduct }) {
  const rate = Number(product.discount_rate) || 0;
  const finalPrice = salePrice(product);

  return (
    <Link to={`/product/${product.id}`} className="group block space-y-3">
      <div className="aspect-[4/5] bg-white rounded-2xl overflow-hidden relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-white" />
        )}
        {product.sale_mode === "preorder" ? (
          <div className="absolute inset-0 bg-[#faf2e7]/80 flex items-end p-3">
            <p className="text-xs font-bold text-venuea-dark">사전예약</p>
          </div>
        ) : Number(product.stock) === 0 ? (
          <div className="absolute inset-0 bg-[#faf2e7]/80 flex items-end p-3">
            <p className="text-xs font-bold text-venuea-dark">품절</p>
          </div>
        ) : null}
        {rate > 0 && (
          <span className="absolute top-3 left-3 bg-[#C0392B] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            {rate}%
          </span>
        )}
      </div>
      <div>
        {product.category ? (
          <p className="text-[13px] text-venuea-muted">{product.category}</p>
        ) : null}
        <h3 className="text-sm font-bold text-venuea-dark mt-0.5">{product.name}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
          {rate > 0 ? <span className="font-bold text-[#C0392B]">{rate}%</span> : null}
          <span className="font-bold text-venuea-dark">{formatPrice(finalPrice)}</span>
          {rate > 0 ? (
            <span className="text-venuea-muted line-through">{formatPrice(product.price)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

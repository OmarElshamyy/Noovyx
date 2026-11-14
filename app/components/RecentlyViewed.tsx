"use client";
import { useEffect, useState } from "react";
import type { Product } from "../../types";
import type { StorefrontConfig } from "../../storefrontConfig";

const STORAGE_KEY = 'kz_recently_viewed';
const MAX_ITEMS = 6;

export function useRecentlyViewed(allProducts: Product[]) {
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => { try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) setRecentIds(JSON.parse(stored)); } catch {} }, []);
  function trackView(productId: string) {
    setRecentIds(prev => {
      const next = [productId, ...prev.filter(id => id !== productId)].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  const recentProducts = recentIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as Product[];
  return { recentProducts, trackView };
}

export function RecentlyViewedSection({
  products,
  onViewProduct,
  config,
}: {
  products: Product[];
  onViewProduct: (p: Product) => void;
  config?: StorefrontConfig["recentlyViewed"];
}) {
  if (config?.enabled === false || products.length < 2) return null;
  const maxItems = Math.max(2, Number(config?.maxItems) || 6);
  const visibleProducts = products.slice(0, maxItems);
  const formatCurrency = (price: number) => `EGP${price.toLocaleString()}`;
  return (
    <section className="recently-viewed" aria-label="Recently viewed products">
      <div className="section-heading">
        <p className="category-label">{config?.kicker || "Your history"}</p>
        <h2>{config?.title || "Recently Viewed"}</h2>
      </div>
      <div className="recently-viewed-grid">
        {visibleProducts.map(p => (
          <button key={p.id} className="recently-viewed-card" onClick={() => onViewProduct(p)} aria-label={`View ${p.name}`}>
            <img src={p.imageUrl || p.imageUrls?.[0] || ''} alt={p.name} loading="lazy" decoding="async" className="recently-viewed-img" />
            <h4>{p.name}</h4><span>{formatCurrency(p.price)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
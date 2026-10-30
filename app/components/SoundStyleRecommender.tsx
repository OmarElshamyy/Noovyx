"use client";

import React, { useState } from "react";
import type { Product } from "../../types";
import { formatCurrency } from "../../products";
import {
  DEFAULT_STOREFRONT_CONFIG,
  sanitizeImageSrc,
  type StorefrontConfig,
} from "../../storefrontConfig";

export function SoundStyleRecommender({
  products,
  onViewProduct,
  onAddToCart,
  finderConfig = DEFAULT_STOREFRONT_CONFIG.soundFinder,
}: {
  products: Product[];
  onViewProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  finderConfig?: StorefrontConfig["soundFinder"];
}) {
  const styles =
    finderConfig.styles?.length > 0
      ? finderConfig.styles
      : DEFAULT_STOREFRONT_CONFIG.soundFinder.styles;

  const [selectedStyleId, setSelectedStyleId] = useState<string>(styles[0]?.id || "gaming");

  const currentStyle = styles.find((s) => s.id === selectedStyleId) || styles[0];

  const matchedProducts = React.useMemo(() => {
    if (!currentStyle) return [];
    // If admin pinned specific product IDs for this sound style, use them first
    if (Array.isArray(currentStyle.pinnedProductIds) && currentStyle.pinnedProductIds.length > 0) {
      const pinned = currentStyle.pinnedProductIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p));
      if (pinned.length > 0) return pinned.slice(0, 4);
    }

    const keywords = (currentStyle.matchKeywords || []).map((k) => k.toLowerCase());
    const cats = currentStyle.matchCategories || [];

    const filtered = products.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const hasKeyword = keywords.some((kw) => nameLower.includes(kw));
      const hasCat = cats.includes(p.category);
      if (keywords.length > 0 && cats.length > 0) {
        return hasKeyword || hasCat;
      }
      return hasKeyword || hasCat || true;
    });

    return (filtered.length > 0 ? filtered : products).slice(0, 4);
  }, [products, currentStyle]);

  if (!finderConfig.enabled || styles.length === 0) return null;

  return (
    <section className="kz-sound-finder-section" id="sound-finder" aria-label="Find Your Ideal Earphones">
      <div className="kz-section-container">
        <div className="kz-sound-finder-header">
          <div className="kz-sound-finder-title-group">
            <span className="kz-section-kicker">{finderConfig.kicker}</span>
            <h2 className="kz-section-title">{finderConfig.title}</h2>
            <p className="kz-section-subtitle">{finderConfig.subtitle}</p>
          </div>
        </div>

        <div className="kz-sound-style-3grid" role="tablist" aria-label="Earphone Sound Styles">
          {styles.map((style) => {
            const isSelected = style.id === currentStyle.id;
            return (
              <button
                key={style.id}
                type="button"
                className={`kz-style-card-3col ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedStyleId(style.id)}
                role="tab"
                aria-selected={isSelected}
              >
                <div
                  className="kz-style-card-bg"
                  style={{
                    backgroundImage: `url("${sanitizeImageSrc(style.image, "/styles/gamers.jpg")}")`,
                  }}
                />
                <div className="kz-style-card-overlay">
                  <span className="kz-style-card-tag">
                    {isSelected ? "● SELECTED PROFILE" : "SELECT PROFILE"}
                  </span>
                  <h3 className="kz-style-card-title">{style.name}</h3>
                  <div className="kz-style-card-bar" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="kz-sound-style-display">
          <div className="kz-sound-style-banner">
            <div className="kz-style-banner-info">
              <span className="kz-style-banner-badge">TUNED FOR {currentStyle.name.toUpperCase()}</span>
              <h3>{currentStyle.desc}</h3>
              <div className="kz-style-banner-tags">
                {(currentStyle.tags || []).map((t) => (
                  <span key={t} className="kz-style-tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="kz-sound-matched-grid">
            {matchedProducts.map((p) => {
              const origPrice = Math.round(p.price * 1.25);
              return (
                <div
                  key={p.id}
                  className="kz-matched-product-card"
                  onClick={() => onViewProduct(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onViewProduct(p);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${p.name}`}
                >
                  <div className="kz-matched-img-wrap" onClick={() => onViewProduct(p)}>
                    <img
                      src={p.imageUrl || p.imageUrls?.[0] || ""}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="kz-matched-badge">RECOMMENDED</span>
                  </div>

                  <div className="kz-matched-body">
                    <span className="kz-matched-cat">{p.category}</span>
                    <h4 className="kz-matched-title" onClick={() => onViewProduct(p)}>
                      {p.name}
                    </h4>

                    <div className="kz-matched-prices">
                      <span className="kz-matched-original">{formatCurrency(origPrice)}</span>
                      <span className="kz-matched-sale">{formatCurrency(p.price)}</span>
                    </div>

                    <div className="kz-matched-actions">
                      <button
                        type="button"
                        className="kz-matched-btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProduct(p);
                        }}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="kz-matched-btn-cart"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(p);
                        }}
                      >
                        + Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

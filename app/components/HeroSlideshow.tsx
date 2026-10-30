"use client";

import React, { useState, useEffect } from "react";
import {
  DEFAULT_STOREFRONT_CONFIG,
  sanitizeImageSrc,
  sanitizeUrl,
  type StorefrontConfig,
} from "../../storefrontConfig";

export function HeroSlideshow({
  onSelectCategory,
  heroConfig = DEFAULT_STOREFRONT_CONFIG.hero,
}: {
  onSelectCategory: (cat: string) => void;
  heroConfig?: StorefrontConfig["hero"];
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides =
    heroConfig.slides?.length > 0 ? heroConfig.slides : DEFAULT_STOREFRONT_CONFIG.hero.slides;
  const intervalMs = Math.max(2, Number(heroConfig.intervalSeconds) || 6) * 1000;

  useEffect(() => {
    if (isPaused || !heroConfig.autoPlay || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [heroConfig.autoPlay, intervalMs, isPaused, slides.length]);

  if (!heroConfig.enabled || slides.length === 0) return null;

  const safeIdx = currentSlide % slides.length;
  const slide = slides[safeIdx] || slides[0];
  const trustBadges = heroConfig.trustBadges || DEFAULT_STOREFRONT_CONFIG.hero.trustBadges;

  return (
    <section
      className="kz-hero-slideshow"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Featured Audio Gear Slideshow"
    >
      <div className="kz-hero-bg-grid" aria-hidden="true" />
      <div className="kz-hero-ambient-glow" aria-hidden="true" />

      <div className="kz-hero-inner">
        <div className="kz-hero-content">
          {slide.badge ? (
            <div className="kz-hero-badge">
              <span className="kz-badge-dot" />
              <span>{slide.badge}</span>
            </div>
          ) : null}

          {slide.tagline ? <p className="kz-hero-tagline">{slide.tagline}</p> : null}
          <h1 className="kz-hero-title">{slide.title}</h1>
          <p className="kz-hero-desc">{slide.desc}</p>

          {Array.isArray(slide.features) && slide.features.length > 0 && (
            <div className="kz-hero-features-row">
              {slide.features.map((feat) => (
                <span key={feat} className="kz-hero-pill">
                  ✓ {feat}
                </span>
              ))}
            </div>
          )}

          <div className="kz-hero-actions">
            {slide.primaryCtaText && (
              <a
                href={sanitizeUrl(slide.primaryCtaTarget, "#catalog")}
                className="kz-btn-primary"
                onClick={() => {
                  if (slide.targetCategory) {
                    onSelectCategory(slide.targetCategory);
                  } else if (slide.id === "castor" || slide.id === "zs10") {
                    onSelectCategory("IEMs");
                  } else if (slide.id === "wireless") {
                    onSelectCategory("Wireless");
                  }
                }}
              >
                <span>{slide.primaryCtaText}</span>
                <span className="kz-btn-arrow">→</span>
              </a>
            )}

            {slide.secondaryCtaText && (
              <a
                href={sanitizeUrl(slide.secondaryCtaTarget, "#catalog")}
                className="kz-btn-secondary"
              >
                {slide.secondaryCtaText}
              </a>
            )}
          </div>

          {trustBadges.length > 0 && (
            <div className="kz-hero-trust-bar">
              {trustBadges.map((badge, i) => (
                <React.Fragment key={badge + i}>
                  {i > 0 && <span className="kz-sep">•</span>}
                  <span>{badge}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="kz-hero-stage">
          <div className="kz-hero-image-wrap">
            <div className="kz-hero-glow-disc" />
            <div className="kz-hero-halo-ring" />
            {slides.map((s, idx) => (
              <img
                key={s.id + idx}
                src={sanitizeImageSrc(s.image, "/products/kz-castor-bass.png")}
                alt={s.title}
                className={`kz-hero-slide-img ${idx === safeIdx ? "active" : ""}`}
                loading={idx === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            ))}
            {heroConfig.topLeftTag && (
              <div className="kz-hero-floating-tag top-left">{heroConfig.topLeftTag}</div>
            )}
            {heroConfig.bottomRightTag && (
              <div className="kz-hero-floating-tag bottom-right">{heroConfig.bottomRightTag}</div>
            )}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="kz-hero-controls">
          <button
            type="button"
            className="kz-hero-nav-arrow"
            onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
            aria-label="Previous Slide"
          >
            ‹
          </button>

          <div className="kz-hero-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`kz-hero-dot ${i === safeIdx ? "active" : ""}`}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="kz-hero-nav-arrow"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            aria-label="Next Slide"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}

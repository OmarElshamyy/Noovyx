"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Product } from "../../types";
import { formatCurrency } from "../../products";
import { DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig } from "../../storefrontConfig";

export type MenuTab = "all" | "iems" | "wireless" | "cables" | "gamers" | "accessories" | "dacs";

interface SiteHeaderProps {
  cartCount: number;
  activeTab: MenuTab;
  onSelectTab: (tab: MenuTab) => void;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  catalogProducts: Product[];
  onViewProduct: (p: Product) => void;
  headerConfig?: StorefrontConfig["header"];
}

export function SiteHeader({
  cartCount,
  activeTab,
  onSelectTab,
  onOpenCart,
  searchQuery,
  onSearchChange,
  catalogProducts,
  onViewProduct,
  headerConfig = DEFAULT_STOREFRONT_CONFIG.header,
}: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSearchCat] = useState<string>("All");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return catalogProducts
      .filter((p) => {
        const matchesCat = selectedSearchCat === "All" || p.category === selectedSearchCat;
        const matchesQuery =
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      })
      .slice(0, 5);
  }, [catalogProducts, searchQuery, selectedSearchCat]);

  const navLinks = (headerConfig.navLinks || DEFAULT_STOREFRONT_CONFIG.header.navLinks).filter(
    (item) => item.visible !== false,
  );

  const drawerCategories = (
    headerConfig.drawerCategories || DEFAULT_STOREFRONT_CONFIG.header.drawerCategories
  ).filter((item) => item.visible !== false);

  const cleanWa = (headerConfig.whatsappNumber || "201000000000").replace(/[^0-9]/g, "");

  return (
    <header className="kz-header-wrapper">
      <div className="kz-header-main">
        <div className="kz-header-container">
          <button
            className={`kz-mobile-menu-btn ${isMenuOpen ? "open" : ""}`}
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={isMenuOpen}
          >
            <span className="kz-hamburger-icon">
              <span />
              <span />
              <span />
            </span>
          </button>

          <a className="kz-brand" href="#top" aria-label="Noovyx Home">
            <div className="kz-brand-icon">{headerConfig.brandMark || "NX"}</div>
            <div className="kz-brand-text">
              <span className="kz-brand-title">{headerConfig.brandTitle || "NOOVYX"}</span>
              <span className="kz-brand-sub">{headerConfig.brandSub || "PRO AUDIO // EGYPT"}</span>
            </div>
          </a>

          <nav className="kz-desktop-nav" aria-label="Primary Navigation">
            {navLinks.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`kz-nav-link ${isActive ? "active" : ""}`}
                  onClick={() => onSelectTab(item.id)}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="kz-nav-active-pill" />}
                </button>
              );
            })}
          </nav>

          <div className="kz-header-right">
            <div className="kz-search-wrapper" ref={searchContainerRef}>
              <div className="kz-search-bar">
                <span className="kz-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>

                <input
                  type="text"
                  className="kz-search-input"
                  placeholder={headerConfig.searchPlaceholder || "Search audio gear..."}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  aria-label="Search audio products"
                />

                {searchQuery ? (
                  <button
                    type="button"
                    className="kz-search-clear-btn"
                    onClick={() => onSearchChange("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div className="kz-search-dropdown" role="region" aria-label="Search Suggestions">
                  <div className="kz-search-dropdown-header">
                    <span>MATCHING PRODUCTS ({searchResults.length})</span>
                    <button type="button" onClick={() => setIsSearchFocused(false)}>
                      Close
                    </button>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="kz-search-results-list">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          className="kz-search-result-item"
                          onClick={() => {
                            onViewProduct(product);
                            setIsSearchFocused(false);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="kz-search-result-img">
                            <img
                              src={product.imageUrl || product.imageUrls?.[0] || ""}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="kz-search-result-info">
                            <span className="kz-search-result-cat">{product.category}</span>
                            <span className="kz-search-result-title">{product.name}</span>
                            <span className="kz-search-result-price">{formatCurrency(product.price)}</span>
                          </div>
                          <span className="kz-search-result-arrow">→</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="kz-search-no-results">
                      <p>No products found matching &quot;{searchQuery}&quot;</p>
                      <span className="kz-search-no-sub">Try searching for &quot;Castor&quot;, &quot;ZS10&quot;, &quot;Wireless&quot; or &quot;Cable&quot;</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="kz-mobile-search-btn"
              type="button"
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              aria-label="Toggle mobile search"
              aria-expanded={isMobileSearchOpen}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            <button
              className="kz-action-btn kz-cart-trigger"
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping cart, ${cartCount} items`}
            >
              <svg className="kz-action-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="kz-action-label hidden-mobile">Cart</span>
              <span className="kz-action-badge kz-cart-badge">{cartCount}</span>
            </button>
          </div>
        </div>
      </div>

      {isMobileSearchOpen && (
        <div className="kz-mobile-search-bar">
          <div className="kz-mobile-search-inner">
            <input
              type="search"
              className="kz-mobile-search-input"
              placeholder={headerConfig.searchPlaceholder || "Search audio gear..."}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="kz-search-clear-btn"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <button
              type="button"
              className="kz-mobile-search-close"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              Done
            </button>
          </div>
          {searchQuery.trim().length > 0 && (
            <div className="kz-mobile-search-results">
              {searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="kz-search-result-item"
                    onClick={() => {
                      onViewProduct(product);
                      setIsMobileSearchOpen(false);
                    }}
                  >
                    <div className="kz-search-result-img">
                      <img src={product.imageUrl || product.imageUrls?.[0] || ""} alt={product.name} loading="lazy" />
                    </div>
                    <div className="kz-search-result-info">
                      <span className="kz-search-result-cat">{product.category}</span>
                      <span className="kz-search-result-title">{product.name}</span>
                      <span className="kz-search-result-price">{formatCurrency(product.price)}</span>
                    </div>
                    <span className="kz-search-result-arrow">→</span>
                  </button>
                ))
              ) : (
                <div className="kz-search-no-results">
                  <p>No products found matching &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isMenuOpen && (
        <div className="kz-drawer-backdrop" onClick={() => setIsMenuOpen(false)}>
          <div className="kz-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="kz-drawer-header">
              <div className="kz-brand">
                <span className="kz-brand-icon">{headerConfig.brandMark || "NX"}</span>
                <span className="kz-brand-title">NOOVYX</span>
              </div>
              <button
                type="button"
                className="kz-drawer-close"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="kz-drawer-content">
              <div className="kz-drawer-group">
                <span className="kz-drawer-group-title">EXPLORE CATEGORIES</span>
                <ul className="kz-drawer-links">
                  {drawerCategories.map((item) => (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          setIsMenuOpen(false);
                        }}
                      >
                        <img src={item.image} alt="" className="kz-dropdown-thumb" loading="lazy" decoding="async" />
                        <span>{item.label}</span>
                        <span className="kz-drawer-arrow">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="kz-drawer-footer">
                <p className="kz-drawer-tagline">{headerConfig.drawerTagline}</p>
                <a
                  href={`https://wa.me/${cleanWa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kz-drawer-wa"
                >
                  WhatsApp Assistance →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

"use client";

import React, { useState } from "react";
import type { Product, ProductCategory } from "../../types";
import { PRODUCT_CATEGORIES, formatCurrency } from "../../products";
import {
  DEFAULT_STOREFRONT_CONFIG,
  mergeStorefrontConfig,
  type StorefrontConfig,
  type HeroSlideConfig,
  type SoundStyleConfig,
  type ReviewItemConfig,
  type TrustItemConfig,
  type BlogArticleConfig,
  type SupportStripItemConfig,
} from "../../storefrontConfig";
import type { MenuTab } from "./SiteHeader";

type CmsSubTab =
  | "overview"
  | "hero"
  | "header"
  | "sections"
  | "sound-finder"
  | "reviews"
  | "trust-blog"
  | "footer";

interface AdminHomepageEditorProps {
  config: StorefrontConfig;
  onChange: (next: StorefrontConfig) => void;
  onSave: (cfg?: StorefrontConfig) => Promise<void>;
  isSaving: boolean;
  products: Product[];
  onToggleProductFeatured: (product: Product) => Promise<void>;
  onToggleProductActive: (product: Product) => Promise<void>;
  onCompressImage: (file: File, removeWhiteBg?: boolean) => Promise<string>;
  showToast: (type: "success" | "error", text: string) => void;
}

const MENU_TAB_OPTIONS: { id: MenuTab; label: string }[] = [
  { id: "all", label: "All Products" },
  { id: "iems", label: "KZ IEMs" },
  { id: "wireless", label: "Wireless" },
  { id: "cables", label: "Cables" },
  { id: "gamers", label: "For Gamers" },
  { id: "dacs", label: "Hi-Fi DACs" },
  { id: "accessories", label: "Accessories" },
];

export function AdminHomepageEditor({
  config,
  onChange,
  onSave,
  isSaving,
  products,
  onToggleProductFeatured,
  onToggleProductActive,
  onCompressImage,
  showToast,
}: AdminHomepageEditorProps) {
  const [subTab, setSubTab] = useState<CmsSubTab>("overview");
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [activeStyleIdx, setActiveStyleIdx] = useState<number>(0);
  const [newAnnouncementMsg, setNewAnnouncementMsg] = useState("");
  const [newTrustBadge, setNewTrustBadge] = useState("");
  const [heroProductSearch, setHeroProductSearch] = useState("");

  // Helper to update a top-level section of StorefrontConfig
  function updateSection<K extends keyof StorefrontConfig>(
    section: K,
    patch: Partial<StorefrontConfig[K]>,
  ) {
    onChange({
      ...config,
      [section]: {
        ...config[section],
        ...patch,
      },
    });
  }

  // --- HERO SLIDE HELPERS ---
  const slides = config.hero.slides || [];
  const safeSlideIdx = Math.min(activeSlideIdx, Math.max(0, slides.length - 1));
  const currentSlide: HeroSlideConfig | undefined = slides[safeSlideIdx];

  function updateCurrentSlide(patch: Partial<HeroSlideConfig>) {
    if (!currentSlide) return;
    const nextSlides = slides.map((s, idx) => (idx === safeSlideIdx ? { ...s, ...patch } : s));
    updateSection("hero", { slides: nextSlides });
  }

  function addHeroSlide(fromProduct?: Product) {
    const newSlide: HeroSlideConfig = fromProduct
      ? {
          id: `slide-${Date.now()}`,
          badge: `FEATURED ${fromProduct.category.toUpperCase()} // 2026`,
          tagline: "PRECISION ACOUSTIC ENGINEERING",
          title: fromProduct.name.toUpperCase(),
          desc:
            fromProduct.description ||
            "High-resolution audio hardware tuned for competitive gaming and studio monitoring.",
          primaryCtaText: `SHOP ${fromProduct.name.split(" ").slice(0, 2).join(" ").toUpperCase()}`,
          primaryCtaTarget: "#catalog",
          secondaryCtaText: "EXPLORE SOUND",
          secondaryCtaTarget: "#sound-finder",
          image: fromProduct.imageUrl || fromProduct.imageUrls?.[0] || "/products/kz-castor-bass.png",
          features:
            fromProduct.specs?.length > 0
              ? fromProduct.specs.slice(0, 4)
              : ["High-Res Audio", " Ergonomic Shell", "Detachable Cable", "Verified Authentic"],
          targetCategory: fromProduct.category,
        }
      : {
          id: `slide-${Date.now()}`,
          badge: "NEW HARDWARE DROP // 2026",
          tagline: "NEXT-GEN SOUNDSTAGE",
          title: "NEW KZ FLAGSHIP MONITOR",
          desc: "Engineered for pinpoint positional cues, deep sub-bass extension, and zero-fatigue studio clarity.",
          primaryCtaText: "SHOP NOW",
          primaryCtaTarget: "#catalog",
          secondaryCtaText: "FIND YOUR SOUND",
          secondaryCtaTarget: "#sound-finder",
          image: "/products/kz-castor-bass.png",
          features: ["Hybrid Drivers", "Custom Crossover", "Noise Isolation", "2-Pin Detachable"],
          targetCategory: "IEMs",
        };

    const nextSlides = [...slides, newSlide];
    updateSection("hero", { slides: nextSlides });
    setActiveSlideIdx(nextSlides.length - 1);
    showToast("success", `Added slide "${newSlide.title}". Don't forget to Save!`);
  }

  function removeHeroSlide(index: number) {
    if (slides.length <= 1) {
      showToast("error", "Hero slideshow must have at least 1 slide.");
      return;
    }
    const nextSlides = slides.filter((_, i) => i !== index);
    updateSection("hero", { slides: nextSlides });
    setActiveSlideIdx(Math.max(0, index - 1));
  }

  function moveHeroSlide(index: number, dir: "up" | "down") {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;
    const nextSlides = [...slides];
    const temp = nextSlides[index];
    nextSlides[index] = nextSlides[target];
    nextSlides[target] = temp;
    updateSection("hero", { slides: nextSlides });
    setActiveSlideIdx(target);
  }

  // --- SOUND FINDER HELPERS ---
  const styles = config.soundFinder.styles || [];
  const safeStyleIdx = Math.min(activeStyleIdx, Math.max(0, styles.length - 1));
  const currentStyle: SoundStyleConfig | undefined = styles[safeStyleIdx];

  function updateCurrentStyle(patch: Partial<SoundStyleConfig>) {
    if (!currentStyle) return;
    const nextStyles = styles.map((s, idx) => (idx === safeStyleIdx ? { ...s, ...patch } : s));
    updateSection("soundFinder", { styles: nextStyles });
  }

  function addSoundStyle() {
    const newStyle: SoundStyleConfig = {
      id: `style-${Date.now()}`,
      name: "New Sound Profile",
      image: "/styles/gamers.jpg",
      desc: "Describe who this sound signature is tuned for and what acoustic traits stand out.",
      tags: ["Custom Tuning", "High Clarity", "Comfort Fit"],
      matchCategories: ["IEMs"],
      matchKeywords: ["kz"],
      pinnedProductIds: [],
    };
    const next = [...styles, newStyle];
    updateSection("soundFinder", { styles: next });
    setActiveStyleIdx(next.length - 1);
  }

  function removeSoundStyle(idx: number) {
    if (styles.length <= 1) {
      showToast("error", "Keep at least 1 sound profile.");
      return;
    }
    const next = styles.filter((_, i) => i !== idx);
    updateSection("soundFinder", { styles: next });
    setActiveStyleIdx(0);
  }

  // --- EXPORT / IMPORT CONFIG ---
  function exportCmsJson() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kz_homepage_config_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("success", "Exported Homepage CMS configuration to JSON.");
  }

  function handleImportCmsJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast("error", "Configuration JSON file exceeds the 1 MB maximum size limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || "{}")) as Record<string, unknown>;
        onChange(mergeStorefrontConfig(parsed));
        showToast("success", "Imported Homepage configuration! Click Save & Publish to apply.");
      } catch {
        showToast("error", "Invalid JSON configuration file.");
      }
    };
    reader.readAsText(file);
  }

  const cardStyle: React.CSSProperties = {
    background: "rgba(10, 16, 30, 0.75)",
    border: "1px solid rgba(0, 229, 255, 0.16)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    background: "rgba(5, 7, 13, 0.9)",
    border: "1px solid rgba(0, 229, 255, 0.22)",
    color: "#f4f8ff",
    fontSize: "0.88rem",
  };

  return (
    <section className="admin-card" style={{ padding: "24px" }}>
      {/* TOP STICKY ACTION BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(0, 229, 255, 0.12), rgba(139, 92, 246, 0.12))",
          border: "1px solid rgba(0, 229, 255, 0.35)",
          borderRadius: "12px",
          marginBottom: "22px",
        }}
      >
        <div>
          <span
            className="category-badge"
            style={{ color: "var(--cyan)", borderColor: "rgba(0, 229, 255, 0.4)", marginBottom: "6px" }}
          >
            🎛️ Full Storefront CMS & Visual Builder
          </span>
          <h2 style={{ fontSize: "1.35rem", margin: "2px 0", color: "white" }}>
            Homepage Control Center — Edit Everything Live
          </h2>
          <p className="field-help" style={{ margin: 0 }}>
            Customize every section, banner, text heading, navigation link, customer review, blog guide, and footer detail on the homepage.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="ghost-button"
            style={{ textDecoration: "none", fontSize: "0.84rem", padding: "8px 14px" }}
          >
            👁️ View Live Homepage ↗
          </a>

          <button
            type="button"
            className="ghost-button"
            style={{ fontSize: "0.84rem", padding: "8px 14px" }}
            onClick={exportCmsJson}
          >
            📥 Backup JSON
          </button>

          <label
            className="ghost-button"
            style={{ fontSize: "0.84rem", padding: "8px 14px", cursor: "pointer", margin: 0 }}
          >
            📤 Restore JSON
            <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImportCmsJson} />
          </label>

          <button
            type="button"
            className="ghost-button"
            style={{ fontSize: "0.84rem", padding: "8px 14px", color: "#f87171" }}
            onClick={() => {
              if (window.confirm("Reset all homepage texts, banners, and sections to factory defaults?")) {
                onChange(DEFAULT_STOREFRONT_CONFIG);
                onSave(DEFAULT_STOREFRONT_CONFIG);
              }
            }}
          >
            ↺ Reset Defaults
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={isSaving}
            onClick={() => onSave()}
            style={{ padding: "10px 20px", fontSize: "0.92rem", fontWeight: 800 }}
          >
            {isSaving ? "Publishing..." : "💾 Save & Publish All Changes"}
          </button>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS FOR EVERY HOMEPAGE AREA */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "14px",
        }}
      >
        {(
          [
            { id: "overview", label: "⚡ Section Switches & Overview" },
            { id: "hero", label: "🎬 Hero Slideshow & Banners" },
            { id: "header", label: "🧭 Top Bar, Header & Menu" },
            { id: "sections", label: "🔥 Best Sellers, New & Catalog" },
            { id: "sound-finder", label: "🎧 Sound Style Finder (3 Cats)" },
            { id: "reviews", label: "⭐ Customer Reviews" },
            { id: "trust-blog", label: "🛡️ Trust Badges & Guides" },
            { id: "footer", label: "🦶 Support Strip, CTA & Footer" },
          ] as { id: CmsSubTab; label: string }[]
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              style={{
                padding: "9px 15px",
                borderRadius: "8px",
                background: active ? "var(--cyan)" : "rgba(15, 23, 42, 0.85)",
                color: active ? "#020617" : "#e2e8f0",
                fontWeight: 700,
                fontSize: "0.83rem",
                border: active ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SUB-TAB 1: OVERVIEW & MASTER SECTION VISIBILITY SWITCHES
         ===================================================================== */}
      {subTab === "overview" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "var(--cyan)", fontSize: "1.1rem" }}>
              👁️ Master Homepage Section Visibility Switches
            </h3>
            <p className="field-help" style={{ marginBottom: "16px" }}>
              Instantly turn any section on the homepage ON or OFF, or jump directly to edit its content.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {[
                {
                  label: "Top Announcement Bar",
                  desc: `${config.announcement.messages.length} rotating messages`,
                  enabled: config.announcement.enabled,
                  onToggle: (v: boolean) => updateSection("announcement", { enabled: v }),
                  editTab: "header" as CmsSubTab,
                },
                {
                  label: "Hero Launch Slideshow",
                  desc: `${config.hero.slides.length} active slides (${config.hero.intervalSeconds}s timer)`,
                  enabled: config.hero.enabled,
                  onToggle: (v: boolean) => updateSection("hero", { enabled: v }),
                  editTab: "hero" as CmsSubTab,
                },
                {
                  label: "Best Sellers Section",
                  desc: `"${config.bestSellers.title}" (Up to ${config.bestSellers.maxItems} items)`,
                  enabled: config.bestSellers.enabled,
                  onToggle: (v: boolean) => updateSection("bestSellers", { enabled: v }),
                  editTab: "sections" as CmsSubTab,
                },
                {
                  label: "Find Your Ideal Earphones",
                  desc: `${config.soundFinder.styles.length} sound profiles`,
                  enabled: config.soundFinder.enabled,
                  onToggle: (v: boolean) => updateSection("soundFinder", { enabled: v }),
                  editTab: "sound-finder" as CmsSubTab,
                },
                {
                  label: "New Releases Section",
                  desc: `"${config.newReleases.title}" (Up to ${config.newReleases.maxItems} items)`,
                  enabled: config.newReleases.enabled,
                  onToggle: (v: boolean) => updateSection("newReleases", { enabled: v }),
                  editTab: "sections" as CmsSubTab,
                },
                {
                  label: "Customer Reviews Section",
                  desc: `${config.reviews.items.length} verified reviews (${config.reviews.overallRating})`,
                  enabled: config.reviews.enabled,
                  onToggle: (v: boolean) => updateSection("reviews", { enabled: v }),
                  editTab: "reviews" as CmsSubTab,
                },
                {
                  label: "Why Shop With Us (Trust)",
                  desc: `${config.trust.items.length} trust pillars`,
                  enabled: config.trust.enabled,
                  onToggle: (v: boolean) => updateSection("trust", { enabled: v }),
                  editTab: "trust-blog" as CmsSubTab,
                },
                {
                  label: "Guides & Resources (Blog)",
                  desc: `${config.blog.articles.length} audio guides`,
                  enabled: config.blog.enabled,
                  onToggle: (v: boolean) => updateSection("blog", { enabled: v }),
                  editTab: "trust-blog" as CmsSubTab,
                },
                {
                  label: "01-02-03 Support Strip",
                  desc: `${config.supportStrip.items.length} support highlights`,
                  enabled: config.supportStrip.enabled,
                  onToggle: (v: boolean) => updateSection("supportStrip", { enabled: v }),
                  editTab: "footer" as CmsSubTab,
                },
                {
                  label: "Final Call-To-Action Banner",
                  desc: `"${config.finalCta.title}"`,
                  enabled: config.finalCta.enabled,
                  onToggle: (v: boolean) => updateSection("finalCta", { enabled: v }),
                  editTab: "footer" as CmsSubTab,
                },
              ].map((sec) => (
                <div
                  key={sec.label}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    background: sec.enabled ? "rgba(0, 229, 255, 0.06)" : "rgba(15, 23, 42, 0.5)",
                    border: sec.enabled
                      ? "1px solid rgba(0, 229, 255, 0.3)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div>
                      <strong style={{ color: "white", fontSize: "0.94rem", display: "block" }}>
                        {sec.label}
                      </strong>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{sec.desc}</span>
                    </div>
                    <span
                      className={`stock-badge ${sec.enabled ? "in" : "out"}`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {sec.enabled ? "VISIBLE" : "HIDDEN"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="table-clone-btn"
                      style={{ flex: 1, fontSize: "0.78rem", padding: "6px 10px" }}
                      onClick={() => sec.onToggle(!sec.enabled)}
                    >
                      {sec.enabled ? "Hide Section" : "Show Section"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                      onClick={() => setSubTab(sec.editTab)}
                    >
                      ✏️ Edit Content →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: HERO SLIDESHOW & LAUNCH BANNER
         ===================================================================== */}
      {subTab === "hero" && (
        <div>
          {/* Global Hero Controls */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.1rem" }}>
                🎬 Hero Carousel Settings & Floating Badges
              </h3>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0, color: "white", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={config.hero.enabled}
                    onChange={(e) => updateSection("hero", { enabled: e.target.checked })}
                    style={{ width: "17px", height: "17px", accentColor: "var(--cyan)" }}
                  />
                  <span>Show Hero Section</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0, color: "white", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={config.hero.autoPlay}
                    onChange={(e) => updateSection("hero", { autoPlay: e.target.checked })}
                    style={{ width: "17px", height: "17px", accentColor: "var(--cyan)" }}
                  />
                  <span>Auto-Rotate Slides</span>
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Speed (sec):</span>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={config.hero.intervalSeconds}
                    onChange={(e) => updateSection("hero", { intervalSeconds: Number(e.target.value) || 6 })}
                    style={{ ...inputStyle, width: "68px", padding: "5px 8px" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
              <label style={{ color: "#cbd5e1", fontSize: "0.84rem" }}>
                Top-Left Floating Stage Tag
                <input
                  style={{ ...inputStyle, marginTop: "5px" }}
                  value={config.hero.topLeftTag}
                  onChange={(e) => updateSection("hero", { topLeftTag: e.target.value })}
                  placeholder="e.g. HYBRID DRIVERS"
                />
              </label>

              <label style={{ color: "#cbd5e1", fontSize: "0.84rem" }}>
                Bottom-Right Floating Stage Tag
                <input
                  style={{ ...inputStyle, marginTop: "5px" }}
                  value={config.hero.bottomRightTag}
                  onChange={(e) => updateSection("hero", { bottomRightTag: e.target.value })}
                  placeholder="e.g. HI-RES AUDIO"
                />
              </label>
            </div>

            {/* Hero Trust Badges Row */}
            <div>
              <span style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "8px" }}>
                Bottom Hero Trust Bar Items:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                {config.hero.trustBadges.map((tb, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      padding: "5px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    <input
                      value={tb}
                      onChange={(e) => {
                        const next = [...config.hero.trustBadges];
                        next[idx] = e.target.value;
                        updateSection("hero", { trustBadges: next });
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "white",
                        fontSize: "0.82rem",
                        width: "210px",
                      }}
                    />
                    <button
                      type="button"
                      className="copy-mini-btn"
                      style={{ color: "#f87171" }}
                      onClick={() => {
                        const next = config.hero.trustBadges.filter((_, i) => i !== idx);
                        updateSection("hero", { trustBadges: next });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px", maxWidth: "420px" }}>
                <input
                  style={inputStyle}
                  placeholder="Add hero trust item (e.g. 🇪🇬 Fast Delivery)..."
                  value={newTrustBadge}
                  onChange={(e) => setNewTrustBadge(e.target.value)}
                />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    if (!newTrustBadge.trim()) return;
                    updateSection("hero", {
                      trustBadges: [...config.hero.trustBadges, newTrustBadge.trim()],
                    });
                    setNewTrustBadge("");
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Slides Selector & Slide Editor */}
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", alignItems: "start" }}>
            {/* Left Column: Slide List & Quick Add from Catalog */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, color: "white", fontSize: "0.96rem" }}>
                  Slides ({slides.length})
                </h4>
                <button
                  type="button"
                  className="primary-button"
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                  onClick={() => addHeroSlide()}
                >
                  + Blank Slide
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {slides.map((s, idx) => {
                  const isSelected = idx === safeSlideIdx;
                  return (
                    <div
                      key={s.id + idx}
                      onClick={() => setActiveSlideIdx(idx)}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        background: isSelected ? "rgba(0, 229, 255, 0.14)" : "rgba(15, 23, 42, 0.7)",
                        border: isSelected ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.image}
                          alt=""
                          style={{ width: "38px", height: "38px", objectFit: "contain", flexShrink: 0 }}
                        />
                        <div style={{ overflow: "hidden" }}>
                          <strong
                            style={{
                              color: "white",
                              fontSize: "0.82rem",
                              display: "block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {idx + 1}. {s.title}
                          </strong>
                          <span style={{ fontSize: "0.7rem", color: "var(--cyan)" }}>{s.tagline}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "3px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="copy-mini-btn"
                          disabled={idx === 0}
                          onClick={() => moveHeroSlide(idx, "up")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="copy-mini-btn"
                          disabled={idx === slides.length - 1}
                          onClick={() => moveHeroSlide(idx, "down")}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="copy-mini-btn"
                          style={{ color: "#f87171" }}
                          onClick={() => removeHeroSlide(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <h4 style={{ fontSize: "0.86rem", color: "#cbd5e1", marginBottom: "8px" }}>
                ⚡ Generate Slide from Product
              </h4>
              <input
                style={{ ...inputStyle, marginBottom: "8px", padding: "6px 10px", fontSize: "0.8rem" }}
                placeholder="Search product to add as slide..."
                value={heroProductSearch}
                onChange={(e) => setHeroProductSearch(e.target.value)}
              />
              <div style={{ maxHeight: "230px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {products
                  .filter((p) => p.isActive !== false)
                  .filter((p) => !heroProductSearch.trim() || p.name.toLowerCase().includes(heroProductSearch.toLowerCase()))
                  .map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        background: "rgba(15, 23, 42, 0.5)",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <span style={{ color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                      <button
                        type="button"
                        className="copy-mini-btn"
                        onClick={() => addHeroSlide(p)}
                      >
                        + Slide
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right Column: Active Slide Full Form Editor */}
            {currentSlide && (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, color: "white", fontSize: "1.08rem" }}>
                    ✏️ Editing Slide #{safeSlideIdx + 1}: <span style={{ color: "var(--cyan)" }}>{currentSlide.title}</span>
                  </h3>
                </div>

                {/* Image Preview & Image Selector */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr",
                    gap: "18px",
                    padding: "14px",
                    background: "rgba(5, 7, 13, 0.85)",
                    borderRadius: "10px",
                    border: "1px solid rgba(0, 229, 255, 0.2)",
                    marginBottom: "18px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      height: "140px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "radial-gradient(circle, rgba(0,229,255,0.12), transparent 70%)",
                      borderRadius: "8px",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentSlide.image}
                      alt={currentSlide.title}
                      style={{ maxHeight: "125px", maxWidth: "160px", objectFit: "contain" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                      Slide Product Image URL / Path
                      <input
                        style={{ ...inputStyle, marginTop: "4px" }}
                        value={currentSlide.image}
                        onChange={(e) => updateCurrentSlide({ image: e.target.value })}
                        placeholder="/products/kz-castor-bass.png or https://..."
                      />
                    </label>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                      <label
                        className="ghost-button"
                        style={{ fontSize: "0.8rem", padding: "6px 12px", cursor: "pointer", margin: 0 }}
                      >
                        📁 Upload PNG (Keep Original Alpha)
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const dataUrl = await onCompressImage(f, false);
                            updateCurrentSlide({ image: dataUrl });
                            showToast("success", "Updated slide image!");
                          }}
                        />
                      </label>

                      <select
                        style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: "0.8rem" }}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) updateCurrentSlide({ image: e.target.value });
                        }}
                      >
                        <option value="">Quick Pick Product Image...</option>
                        {products
                          .filter((p) => p.isActive !== false && p.imageUrl)
                          .map((p) => (
                            <option key={p.id} value={p.imageUrl}>
                              {p.name} ({p.imageUrl})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Text Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Top Pill Badge
                    <input
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentSlide.badge}
                      onChange={(e) => updateCurrentSlide({ badge: e.target.value })}
                      placeholder="FLAGSHIP DUAL-DRIVER // 2026 DROP"
                    />
                  </label>

                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Cyan Kicker / Tagline
                    <input
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentSlide.tagline}
                      onChange={(e) => updateCurrentSlide({ tagline: e.target.value })}
                      placeholder="ACOUSTIC MASTERCLASS"
                    />
                  </label>
                </div>

                <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "14px" }}>
                  Main Headline Title
                  <input
                    style={{ ...inputStyle, marginTop: "4px", fontSize: "1rem", fontWeight: 700 }}
                    value={currentSlide.title}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    placeholder="KZ CASTOR BASS EDITION"
                  />
                </label>

                <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "14px" }}>
                  Supporting Description
                  <textarea
                    rows={3}
                    style={{ ...inputStyle, marginTop: "4px" }}
                    value={currentSlide.desc}
                    onChange={(e) => updateCurrentSlide({ desc: e.target.value })}
                  />
                </label>

                <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "14px" }}>
                  Feature Checkmark Pills (comma-separated)
                  <input
                    style={{ ...inputStyle, marginTop: "4px" }}
                    value={(currentSlide.features || []).join(", ")}
                    onChange={(e) =>
                      updateCurrentSlide({
                        features: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Dual Dynamic Drivers, 4 Tuning Switches, Sub-Bass Profile, 0.75mm 2-Pin"
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Primary Button Text
                    <input
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentSlide.primaryCtaText}
                      onChange={(e) => updateCurrentSlide({ primaryCtaText: e.target.value })}
                    />
                  </label>

                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Primary Target Anchor
                    <input
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentSlide.primaryCtaTarget}
                      onChange={(e) => updateCurrentSlide({ primaryCtaTarget: e.target.value })}
                      placeholder="#catalog"
                    />
                  </label>

                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Filter Category on Click
                    <select
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentSlide.targetCategory || "All"}
                      onChange={(e) => updateCurrentSlide({ targetCategory: e.target.value })}
                    >
                      <option value="All">All Products</option>
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Secondary Button Text
                    <input
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentSlide.secondaryCtaText}
                      onChange={(e) => updateCurrentSlide({ secondaryCtaText: e.target.value })}
                    />
                  </label>

                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Secondary Target Anchor
                    <input
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentSlide.secondaryCtaTarget}
                      onChange={(e) => updateCurrentSlide({ secondaryCtaTarget: e.target.value })}
                      placeholder="#sound-finder"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: TOP ANNOUNCEMENT BAR, HEADER & NAVIGATION MENU
         ===================================================================== */}
      {subTab === "header" && (
        <div>
          {/* Announcement Bar */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                📢 Top Promotional Announcement Bar
              </h3>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0, color: "white", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={config.announcement.enabled}
                    onChange={(e) => updateSection("announcement", { enabled: e.target.checked })}
                  />
                  <span>Show Announcement Bar</span>
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Speed (sec):</span>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    style={{ ...inputStyle, width: "65px", padding: "5px 8px" }}
                    value={config.announcement.intervalSeconds}
                    onChange={(e) =>
                      updateSection("announcement", { intervalSeconds: Number(e.target.value) || 4 })
                    }
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              {config.announcement.messages.map((msg, idx) => (
                <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--cyan)", fontWeight: 700, width: "24px" }}>#{idx + 1}</span>
                  <input
                    style={inputStyle}
                    value={msg}
                    onChange={(e) => {
                      const next = [...config.announcement.messages];
                      next[idx] = e.target.value;
                      updateSection("announcement", { messages: next });
                    }}
                  />
                  <button
                    type="button"
                    className="copy-mini-btn"
                    style={{ color: "#f87171", padding: "6px 10px" }}
                    onClick={() => {
                      const next = config.announcement.messages.filter((_, i) => i !== idx);
                      updateSection("announcement", { messages: next });
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                style={inputStyle}
                placeholder="Type a new promotional banner message..."
                value={newAnnouncementMsg}
                onChange={(e) => setNewAnnouncementMsg(e.target.value)}
              />
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  if (!newAnnouncementMsg.trim()) return;
                  updateSection("announcement", {
                    messages: [...config.announcement.messages, newAnnouncementMsg.trim()],
                  });
                  setNewAnnouncementMsg("");
                }}
              >
                + Add Message
              </button>
            </div>
          </div>

          {/* Brand Logo & Header Settings */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
              🏷️ Header Brand Identity, Search & WhatsApp Support
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "14px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Brand Icon Letters
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.header.brandMark}
                  onChange={(e) => updateSection("header", { brandMark: e.target.value })}
                />
              </label>

              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Brand Main Title
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.header.brandTitle}
                  onChange={(e) => updateSection("header", { brandTitle: e.target.value })}
                />
              </label>

              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Brand Subtitle
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.header.brandSub}
                  onChange={(e) => updateSection("header", { brandSub: e.target.value })}
                />
              </label>

              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Search Box Placeholder
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.header.searchPlaceholder}
                  onChange={(e) => updateSection("header", { searchPlaceholder: e.target.value })}
                />
              </label>

              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                WhatsApp Support Number (with country code)
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.header.whatsappNumber}
                  onChange={(e) => updateSection("header", { whatsappNumber: e.target.value })}
                  placeholder="201000000000"
                />
              </label>

              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Mobile Drawer Footer Tagline
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.header.drawerTagline}
                  onChange={(e) => updateSection("header", { drawerTagline: e.target.value })}
                />
              </label>
            </div>
          </div>

          {/* Desktop Navigation Bar Links */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
              🧭 Desktop Navigation Bar Links
            </h3>
            <p className="field-help">Rename or toggle visibility for the top navigation links.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
              {config.header.navLinks.map((link, idx) => (
                <div
                  key={link.id + idx}
                  style={{
                    padding: "10px 12px",
                    background: "rgba(15, 23, 42, 0.7)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={link.visible !== false}
                    onChange={(e) => {
                      const next = [...config.header.navLinks];
                      next[idx] = { ...link, visible: e.target.checked };
                      updateSection("header", { navLinks: next });
                    }}
                  />
                  <input
                    style={{ ...inputStyle, padding: "6px 10px" }}
                    value={link.label}
                    onChange={(e) => {
                      const next = [...config.header.navLinks];
                      next[idx] = { ...link, label: e.target.value };
                      updateSection("header", { navLinks: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Drawer Categories */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
              📱 Mobile Slide-Out Drawer Menu Items
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {config.header.drawerCategories.map((dc, idx) => (
                <div
                  key={dc.id + idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 44px 1fr 1fr auto",
                    gap: "10px",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(15, 23, 42, 0.65)",
                    borderRadius: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={dc.visible !== false}
                    onChange={(e) => {
                      const next = [...config.header.drawerCategories];
                      next[idx] = { ...dc, visible: e.target.checked };
                      updateSection("header", { drawerCategories: next });
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dc.image} alt="" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
                  <input
                    style={inputStyle}
                    value={dc.label}
                    onChange={(e) => {
                      const next = [...config.header.drawerCategories];
                      next[idx] = { ...dc, label: e.target.value };
                      updateSection("header", { drawerCategories: next });
                    }}
                    placeholder="Menu Label"
                  />
                  <input
                    style={inputStyle}
                    value={dc.image}
                    onChange={(e) => {
                      const next = [...config.header.drawerCategories];
                      next[idx] = { ...dc, image: e.target.value };
                      updateSection("header", { drawerCategories: next });
                    }}
                    placeholder="Thumbnail Image URL"
                  />
                  <select
                    style={{ ...inputStyle, width: "auto" }}
                    value={dc.id}
                    onChange={(e) => {
                      const next = [...config.header.drawerCategories];
                      next[idx] = { ...dc, id: e.target.value as MenuTab };
                      updateSection("header", { drawerCategories: next });
                    }}
                  >
                    {MENU_TAB_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: PRODUCT SECTIONS (BEST SELLERS, NEW RELEASES, CATALOG)
         ===================================================================== */}
      {subTab === "sections" && (
        <div>
          {/* Best Sellers */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                🔥 Best Sellers Section
              </h3>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={config.bestSellers.enabled}
                  onChange={(e) => updateSection("bestSellers", { enabled: e.target.checked })}
                />
                <span>Show Best Sellers Section</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Kicker
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.bestSellers.kicker}
                  onChange={(e) => updateSection("bestSellers", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Title
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.bestSellers.title}
                  onChange={(e) => updateSection("bestSellers", { title: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Action Link Text
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.bestSellers.ctaText}
                  onChange={(e) => updateSection("bestSellers", { ctaText: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Max Cards Shown
                <input
                  type="number"
                  min={1}
                  max={16}
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.bestSellers.maxItems}
                  onChange={(e) => updateSection("bestSellers", { maxItems: Number(e.target.value) || 4 })}
                />
              </label>
            </div>

            <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "16px" }}>
              Section Subtitle
              <input
                style={{ ...inputStyle, marginTop: "4px" }}
                value={config.bestSellers.subtitle}
                onChange={(e) => updateSection("bestSellers", { subtitle: e.target.value })}
              />
            </label>

            <div>
              <h4 style={{ fontSize: "0.9rem", color: "white", marginBottom: "8px" }}>
                ★ Choose Which Products Appear in Best Sellers (Click to Toggle Featured Status)
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
                {products
                  .filter((p) => p.isActive !== false)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onToggleProductFeatured(p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: p.featured ? "rgba(0, 229, 255, 0.14)" : "rgba(15, 23, 42, 0.65)",
                        border: p.featured ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                        color: "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: p.featured ? "var(--cyan)" : "#64748b" }}>
                          {p.featured ? "★ Featured Best Seller" : "Click to Feature"}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* New Releases */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                ✨ New Releases Section
              </h3>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={config.newReleases.enabled}
                  onChange={(e) => updateSection("newReleases", { enabled: e.target.checked })}
                />
                <span>Show New Releases Section</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Kicker
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.newReleases.kicker}
                  onChange={(e) => updateSection("newReleases", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Title
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.newReleases.title}
                  onChange={(e) => updateSection("newReleases", { title: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Action Link Text
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.newReleases.ctaText}
                  onChange={(e) => updateSection("newReleases", { ctaText: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Max Cards Shown
                <input
                  type="number"
                  min={1}
                  max={16}
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.newReleases.maxItems}
                  onChange={(e) => updateSection("newReleases", { maxItems: Number(e.target.value) || 4 })}
                />
              </label>
            </div>

            <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block" }}>
              Section Subtitle
              <input
                style={{ ...inputStyle, marginTop: "4px" }}
                value={config.newReleases.subtitle}
                onChange={(e) => updateSection("newReleases", { subtitle: e.target.value })}
              />
            </label>
          </div>

          {/* Main Catalog Heading */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
              🗂️ Main Catalog (&quot;Shop by Category&quot;) Section Heading
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Kicker Label
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.catalogSection.kicker}
                  onChange={(e) => updateSection("catalogSection", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Main Heading
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.catalogSection.title}
                  onChange={(e) => updateSection("catalogSection", { title: e.target.value })}
                />
              </label>
            </div>
            <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "16px" }}>
              Catalog Subtitle
              <input
                style={{ ...inputStyle, marginTop: "4px" }}
                value={config.catalogSection.subtitle}
                onChange={(e) => updateSection("catalogSection", { subtitle: e.target.value })}
              />
            </label>

            {/* Quick Product Visibility Manager */}
            <h4 style={{ fontSize: "0.9rem", color: "white", marginBottom: "8px" }}>
              👁️ Quick Homepage Product Visibility Toggle ({products.filter((p) => p.isActive).length} visible / {products.length} total)
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggleProductActive(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: p.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(15, 23, 42, 0.5)",
                    border: p.isActive ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                    color: p.isActive ? "white" : "#64748b",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: "0.76rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: p.isActive ? "#34d399" : "#94a3b8" }}>
                      {p.isActive ? "✓ Shown on Homepage" : "Hidden"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: SOUND STYLE FINDER ("FIND YOUR IDEAL EARPHONES")
         ===================================================================== */}
      {subTab === "sound-finder" && (
        <div>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                🎧 &quot;Find Your Ideal Earphones&quot; — Sound Style Recommender
              </h3>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={config.soundFinder.enabled}
                  onChange={(e) => updateSection("soundFinder", { enabled: e.target.checked })}
                />
                <span>Show Section</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Kicker
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.soundFinder.kicker}
                  onChange={(e) => updateSection("soundFinder", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Title
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.soundFinder.title}
                  onChange={(e) => updateSection("soundFinder", { title: e.target.value })}
                />
              </label>
            </div>
            <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block" }}>
              Section Subtitle
              <input
                style={{ ...inputStyle, marginTop: "4px" }}
                value={config.soundFinder.subtitle}
                onChange={(e) => updateSection("soundFinder", { subtitle: e.target.value })}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, color: "white" }}>Sound Profiles ({styles.length})</h4>
                <button type="button" className="copy-mini-btn" onClick={addSoundStyle}>
                  + Add Profile
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {styles.map((st, idx) => (
                  <div
                    key={st.id + idx}
                    onClick={() => setActiveStyleIdx(idx)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: idx === safeStyleIdx ? "rgba(0, 229, 255, 0.14)" : "rgba(15, 23, 42, 0.7)",
                      border: idx === safeStyleIdx ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ color: "white", fontSize: "0.86rem" }}>{st.name}</strong>
                    <button
                      type="button"
                      className="copy-mini-btn"
                      style={{ color: "#f87171" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSoundStyle(idx);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {currentStyle && (
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "white", fontSize: "1.05rem" }}>
                  Editing Profile: <span style={{ color: "var(--cyan)" }}>{currentStyle.name}</span>
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Profile Name
                    <input
                      style={{ ...inputStyle, marginTop: "4px" }}
                      value={currentStyle.name}
                      onChange={(e) => updateCurrentStyle({ name: e.target.value })}
                    />
                  </label>
                  <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                    Card Background Image URL
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <input
                        style={inputStyle}
                        value={currentStyle.image}
                        onChange={(e) => updateCurrentStyle({ image: e.target.value })}
                      />
                      <label className="ghost-button" style={{ padding: "6px 10px", cursor: "pointer", margin: 0, whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                        📁 Upload
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const url = await onCompressImage(f, false);
                            updateCurrentStyle({ image: url });
                          }}
                        />
                      </label>
                    </div>
                  </label>
                </div>

                <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "12px" }}>
                  Spotlight Description
                  <textarea
                    rows={2}
                    style={{ ...inputStyle, marginTop: "4px" }}
                    value={currentStyle.desc}
                    onChange={(e) => updateCurrentStyle({ desc: e.target.value })}
                  />
                </label>

                <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "16px" }}>
                  Acoustic Tags (comma-separated)
                  <input
                    style={{ ...inputStyle, marginTop: "4px" }}
                    value={(currentStyle.tags || []).join(", ")}
                    onChange={(e) =>
                      updateCurrentStyle({
                        tags: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>

                <h4 style={{ fontSize: "0.88rem", color: "white", marginBottom: "8px" }}>
                  📌 Pin Specific Recommended Products for &quot;{currentStyle.name}&quot; (up to 4)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
                  {products
                    .filter((p) => p.isActive !== false)
                    .map((p) => {
                      const pinned = currentStyle.pinnedProductIds || [];
                      const isPinned = pinned.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const nextPinned = isPinned
                              ? pinned.filter((id) => id !== p.id)
                              : [...pinned, p.id];
                            updateCurrentStyle({ pinnedProductIds: nextPinned });
                          }}
                          style={{
                            padding: "7px 10px",
                            borderRadius: "8px",
                            background: isPinned ? "rgba(0, 229, 255, 0.15)" : "rgba(15, 23, 42, 0.6)",
                            border: isPinned ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            textAlign: "left",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imageUrl} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                          <span style={{ fontSize: "0.76rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {isPinned ? "✓ " : ""}{p.name}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 6: CUSTOMER REVIEWS
         ===================================================================== */}
      {subTab === "reviews" && (
        <div>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                ⭐ Customer Reviews Section
              </h3>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={config.reviews.enabled}
                    onChange={(e) => updateSection("reviews", { enabled: e.target.checked })}
                  />
                  <span>Show Customer Reviews</span>
                </label>
                <button
                  type="button"
                  className="primary-button"
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  onClick={() => {
                    const newRev: ReviewItemConfig = {
                      id: `rev-${Date.now()}`,
                      author: "New Customer",
                      city: "Cairo, Egypt",
                      date: "October 2026",
                      product: "KZ Castor Bass Edition",
                      rating: 5,
                      headline: "Awesome soundstage and build quality",
                      text: "Fast delivery and authentic KZ packaging. Highly recommended!",
                      verified: true,
                    };
                    updateSection("reviews", { items: [newRev, ...config.reviews.items] });
                  }}
                >
                  + Add Review
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "18px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Kicker
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.reviews.kicker}
                  onChange={(e) => updateSection("reviews", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Title
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.reviews.title}
                  onChange={(e) => updateSection("reviews", { title: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Overall Score Text
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.reviews.overallRating}
                  onChange={(e) => updateSection("reviews", { overallRating: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Score Subtitle
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.reviews.overallSubtext}
                  onChange={(e) => updateSection("reviews", { overallSubtext: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
              {config.reviews.items.map((rev, idx) => (
                <div
                  key={rev.id + idx}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "var(--cyan)", fontSize: "0.85rem" }}>Review #{idx + 1}</strong>
                    <button
                      type="button"
                      className="copy-mini-btn"
                      style={{ color: "#f87171" }}
                      onClick={() => {
                        const next = config.reviews.items.filter((_, i) => i !== idx);
                        updateSection("reviews", { items: next });
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <input
                      style={inputStyle}
                      value={rev.author}
                      placeholder="Author Name"
                      onChange={(e) => {
                        const next = [...config.reviews.items];
                        next[idx] = { ...rev, author: e.target.value };
                        updateSection("reviews", { items: next });
                      }}
                    />
                    <input
                      style={inputStyle}
                      value={rev.city}
                      placeholder="City"
                      onChange={(e) => {
                        const next = [...config.reviews.items];
                        next[idx] = { ...rev, city: e.target.value };
                        updateSection("reviews", { items: next });
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "8px" }}>
                    <input
                      style={inputStyle}
                      value={rev.product}
                      placeholder="Product Name"
                      onChange={(e) => {
                        const next = [...config.reviews.items];
                        next[idx] = { ...rev, product: e.target.value };
                        updateSection("reviews", { items: next });
                      }}
                    />
                    <input
                      style={inputStyle}
                      value={rev.date}
                      placeholder="Date"
                      onChange={(e) => {
                        const next = [...config.reviews.items];
                        next[idx] = { ...rev, date: e.target.value };
                        updateSection("reviews", { items: next });
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={5}
                      style={inputStyle}
                      value={rev.rating}
                      onChange={(e) => {
                        const next = [...config.reviews.items];
                        next[idx] = { ...rev, rating: Number(e.target.value) || 5 };
                        updateSection("reviews", { items: next });
                      }}
                    />
                  </div>

                  <input
                    style={{ ...inputStyle, fontWeight: 700 }}
                    value={rev.headline}
                    placeholder="Review Headline"
                    onChange={(e) => {
                      const next = [...config.reviews.items];
                      next[idx] = { ...rev, headline: e.target.value };
                      updateSection("reviews", { items: next });
                    }}
                  />

                  <textarea
                    rows={3}
                    style={inputStyle}
                    value={rev.text}
                    placeholder="Review Body"
                    onChange={(e) => {
                      const next = [...config.reviews.items];
                      next[idx] = { ...rev, text: e.target.value };
                      updateSection("reviews", { items: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 7: WHY SHOP WITH US (TRUST) & GUIDES / BLOG
         ===================================================================== */}
      {subTab === "trust-blog" && (
        <div>
          {/* Trust Section */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                🛡️ &quot;Why Shop With Us&quot; Trust Pillars
              </h3>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={config.trust.enabled}
                    onChange={(e) => updateSection("trust", { enabled: e.target.checked })}
                  />
                  <span>Show Trust Section</span>
                </label>
                <button
                  type="button"
                  className="ghost-button"
                  style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                  onClick={() => {
                    const next: TrustItemConfig[] = [
                      ...config.trust.items,
                      { id: `t-${Date.now()}`, title: "New Trust Pillar", desc: "Describe your store guarantee." },
                    ];
                    updateSection("trust", { items: next });
                  }}
                >
                  + Add Pillar
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Kicker
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.trust.kicker}
                  onChange={(e) => updateSection("trust", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Section Title
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.trust.title}
                  onChange={(e) => updateSection("trust", { title: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
              {config.trust.items.map((item, idx) => (
                <div
                  key={item.id + idx}
                  style={{
                    padding: "12px",
                    background: "rgba(15, 23, 42, 0.7)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--cyan)", fontWeight: 700 }}>Pillar #{idx + 1}</span>
                    <button
                      type="button"
                      className="copy-mini-btn"
                      style={{ color: "#f87171" }}
                      onClick={() => {
                        const next = config.trust.items.filter((_, i) => i !== idx);
                        updateSection("trust", { items: next });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    style={{ ...inputStyle, fontWeight: 700 }}
                    value={item.title}
                    onChange={(e) => {
                      const next = [...config.trust.items];
                      next[idx] = { ...item, title: e.target.value };
                      updateSection("trust", { items: next });
                    }}
                  />
                  <textarea
                    rows={2}
                    style={inputStyle}
                    value={item.desc}
                    onChange={(e) => {
                      const next = [...config.trust.items];
                      next[idx] = { ...item, desc: e.target.value };
                      updateSection("trust", { items: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Blog / Audio Guides */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                📚 Guides & Resources (Blog Section)
              </h3>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={config.blog.enabled}
                    onChange={(e) => updateSection("blog", { enabled: e.target.checked })}
                  />
                  <span>Show Guides Section</span>
                </label>
                <button
                  type="button"
                  className="ghost-button"
                  style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                  onClick={() => {
                    const next: BlogArticleConfig[] = [
                      ...config.blog.articles,
                      {
                        id: `b-${Date.now()}`,
                        image: "/blog/blog-guitarists.png",
                        tag: "Audio Guide",
                        title: "New Audio Buying Guide",
                        excerpt: "Key tips for selecting your next in-ear monitor setup.",
                        readMoreText: "Read Guide →",
                      },
                    ];
                    updateSection("blog", { articles: next });
                  }}
                >
                  + Add Article
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Kicker
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.blog.kicker}
                  onChange={(e) => updateSection("blog", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Title
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.blog.title}
                  onChange={(e) => updateSection("blog", { title: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Subtitle
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.blog.subtitle}
                  onChange={(e) => updateSection("blog", { subtitle: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
              {config.blog.articles.map((art, idx) => (
                <div
                  key={art.id + idx}
                  style={{
                    padding: "14px",
                    background: "rgba(15, 23, 42, 0.7)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--cyan)", fontSize: "0.8rem", fontWeight: 700 }}>Guide #{idx + 1}</span>
                    <button
                      type="button"
                      className="copy-mini-btn"
                      style={{ color: "#f87171" }}
                      onClick={() => {
                        const next = config.blog.articles.filter((_, i) => i !== idx);
                        updateSection("blog", { articles: next });
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={art.image} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px" }} />
                    <input
                      style={inputStyle}
                      value={art.image}
                      placeholder="Image URL"
                      onChange={(e) => {
                        const next = [...config.blog.articles];
                        next[idx] = { ...art, image: e.target.value };
                        updateSection("blog", { articles: next });
                      }}
                    />
                    <label className="ghost-button" style={{ padding: "6px 10px", fontSize: "0.75rem", cursor: "pointer", margin: 0 }}>
                      📁
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await onCompressImage(f, false);
                          const next = [...config.blog.articles];
                          next[idx] = { ...art, image: url };
                          updateSection("blog", { articles: next });
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <input
                      style={inputStyle}
                      value={art.tag}
                      placeholder="Category Tag"
                      onChange={(e) => {
                        const next = [...config.blog.articles];
                        next[idx] = { ...art, tag: e.target.value };
                        updateSection("blog", { articles: next });
                      }}
                    />
                    <input
                      style={inputStyle}
                      value={art.readMoreText}
                      placeholder="Read Guide →"
                      onChange={(e) => {
                        const next = [...config.blog.articles];
                        next[idx] = { ...art, readMoreText: e.target.value };
                        updateSection("blog", { articles: next });
                      }}
                    />
                  </div>

                  <input
                    style={{ ...inputStyle, fontWeight: 700 }}
                    value={art.title}
                    placeholder="Article Title"
                    onChange={(e) => {
                      const next = [...config.blog.articles];
                      next[idx] = { ...art, title: e.target.value };
                      updateSection("blog", { articles: next });
                    }}
                  />

                  <textarea
                    rows={3}
                    style={inputStyle}
                    value={art.excerpt}
                    placeholder="Article Excerpt"
                    onChange={(e) => {
                      const next = [...config.blog.articles];
                      next[idx] = { ...art, excerpt: e.target.value };
                      updateSection("blog", { articles: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 8: SUPPORT STRIP, FINAL CTA & FOOTER
         ===================================================================== */}
      {subTab === "footer" && (
        <div>
          {/* 01-02-03 Support Strip */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                🔢 01-02-03 Support Strip
              </h3>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={config.supportStrip.enabled}
                  onChange={(e) => updateSection("supportStrip", { enabled: e.target.checked })}
                />
                <span>Show Support Strip</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
              {config.supportStrip.items.map((item: SupportStripItemConfig, idx: number) => (
                <div
                  key={item.id + idx}
                  style={{
                    padding: "12px",
                    background: "rgba(15, 23, 42, 0.7)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: "8px" }}>
                    <input
                      style={{ ...inputStyle, color: "var(--cyan)", fontWeight: 800 }}
                      value={item.num}
                      onChange={(e) => {
                        const next = [...config.supportStrip.items];
                        next[idx] = { ...item, num: e.target.value };
                        updateSection("supportStrip", { items: next });
                      }}
                    />
                    <input
                      style={{ ...inputStyle, fontWeight: 700 }}
                      value={item.title}
                      onChange={(e) => {
                        const next = [...config.supportStrip.items];
                        next[idx] = { ...item, title: e.target.value };
                        updateSection("supportStrip", { items: next });
                      }}
                    />
                  </div>
                  <textarea
                    rows={2}
                    style={inputStyle}
                    value={item.desc}
                    onChange={(e) => {
                      const next = [...config.supportStrip.items];
                      next[idx] = { ...item, desc: e.target.value };
                      updateSection("supportStrip", { items: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Final Call To Action */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
                🎯 Final Call-To-Action Banner
              </h3>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 700, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={config.finalCta.enabled}
                  onChange={(e) => updateSection("finalCta", { enabled: e.target.checked })}
                />
                <span>Show Final CTA Banner</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "12px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Kicker Label
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.finalCta.kicker}
                  onChange={(e) => updateSection("finalCta", { kicker: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Headline Text
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.finalCta.title}
                  onChange={(e) => updateSection("finalCta", { title: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Button Text
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.finalCta.buttonText}
                  onChange={(e) => updateSection("finalCta", { buttonText: e.target.value })}
                />
              </label>
            </div>
          </div>

          {/* Site Footer */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, color: "var(--cyan)", fontSize: "1.08rem" }}>
              🦶 Site Footer Content
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "12px", marginBottom: "12px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Brand Mark
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.footer.brandMark}
                  onChange={(e) => updateSection("footer", { brandMark: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Brand Name
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.footer.brandName}
                  onChange={(e) => updateSection("footer", { brandName: e.target.value })}
                />
              </label>
            </div>

            <label style={{ fontSize: "0.84rem", color: "#cbd5e1", display: "block", marginBottom: "12px" }}>
              Footer About / Description
              <textarea
                rows={2}
                style={{ ...inputStyle, marginTop: "4px" }}
                value={config.footer.description}
                onChange={(e) => updateSection("footer", { description: e.target.value })}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Copyright Text
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.footer.copyrightText}
                  onChange={(e) => updateSection("footer", { copyrightText: e.target.value })}
                />
              </label>
              <label style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                Bottom Disclaimer Text
                <input
                  style={{ ...inputStyle, marginTop: "4px" }}
                  value={config.footer.disclaimerText}
                  onChange={(e) => updateSection("footer", { disclaimerText: e.target.value })}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

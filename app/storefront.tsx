"use client";

import React, { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_CATEGORIES, formatCurrency, products as seedProducts } from "../products";
import { submitOrderInquiry } from "../orders";
import { getPublicProducts } from "../productService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { CartItem, Product, ProductCategory } from "../types";
import { AnnouncementBar } from "./components/AnnouncementBar";
import { SearchBar } from "./components/SearchBar";
import { useRecentlyViewed, RecentlyViewedSection } from "./components/RecentlyViewed";
import { TrustSection } from "./components/TrustSection";
import { BlogTeaser } from "./components/BlogTeaser";
import { Footer } from "./components/Footer";
import { SiteHeader, type MenuTab } from "./components/SiteHeader";
import { HeroSlideshow } from "./components/HeroSlideshow";
import { SoundStyleRecommender } from "./components/SoundStyleRecommender";
import { CustomerReviews } from "./components/CustomerReviews";
import {
  DEFAULT_STOREFRONT_CONFIG,
  STORAGE_KEY,
  getCachedStorefrontConfig,
  loadStorefrontConfig,
  type StorefrontConfig,
} from "../storefrontConfig";


type SubmitState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type CheckoutField = "customerName" | "contact" | "city" | "streetAddress";
type FormErrors = Partial<Record<CheckoutField, string>>;

type CheckoutForm = {
  customerName: string;
  contact: string;
  city: string;
  streetAddress: string;
  notes: string;
};

type SubmittedOrder = {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  customerName: string;
  contact: string;
  address: string;
  notes: string;
};

const emptyForm: CheckoutForm = {
  customerName: "",
  contact: "",
  city: "",
  streetAddress: "",
  notes: "",
};

const EGYPT_GOVERNORATES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Dakahlia (Mansoura)",
  "Gharbia (Tanta)",
  "Sharqia (Zagazig)",
  "Qalyubia (Banha / Shubra)",
  "Monufia (Shibin El Kom)",
  "Beheira (Damanhur)",
  "Port Said",
  "Suez",
  "Ismailia",
  "Damietta",
  "Kafr El Sheikh",
  "Fayoum",
  "Beni Suef",
  "Minya",
  "Asyut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Red Sea (Hurghada / Gouna)",
  "South Sinai (Sharm El Sheikh / Dahab)",
  "Matrouh (North Coast)",
  "New Valley",
];

/** Ref-counted body scroll lock so stacked overlays (product modal + checkout) never leave the page stuck. */
function lockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  const count = Number(body.dataset.kzScrollLocks || "0") + 1;
  body.dataset.kzScrollLocks = String(count);
  body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  const count = Math.max(0, Number(body.dataset.kzScrollLocks || "0") - 1);
  body.dataset.kzScrollLocks = String(count);
  if (count === 0) body.style.overflow = "";
}

export function Storefront() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("featured");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuTab>("all");
  const [cmsConfig, setCmsConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT_CONFIG);

  const [catalogProducts, setCatalogProducts] = useState<Product[]>(() => seedProducts.filter((product) => product.isActive !== false));
  const { recentProducts, trackView } = useRecentlyViewed(catalogProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [heroImages, setHeroImages] = useState<string[]>([
    "/products/kz-castor-bass.png",
    "/products/kz-zsn-pro-x.png",
    "/products/kz-zs10-pro-2.png",
    "/products/kz-az09-wireless.png",
    "/products/kz-am02-dac.png",
  ]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(true);
  const [shuffleInterval, setShuffleInterval] = useState(5000);
  const [heroImage, setHeroImage] = useState<string>("/products/kz-castor-bass.png");
  const [heroTitle, setHeroTitle] = useState<string>("KZ Flagship Audio");
  const [lastAddedProductId, setLastAddedProductId] = useState("");
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);
  const isSubmittingRef = useRef(false);

  function handleViewProduct(p: Product) {
    trackView(p.id);
    setSelectedProduct(p);
  }

  // Open a product directly when the page is loaded with a shareable #product-<slug> link
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (deepLinkHandledRef.current || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#product-")) {
      deepLinkHandledRef.current = true;
      return;
    }
    const key = decodeURIComponent(hash.slice("#product-".length));
    const match = catalogProducts.find((p) => p.slug === key || p.id === key);
    if (match) {
      deepLinkHandledRef.current = true;
      setSelectedProduct(match);
    }
  }, [catalogProducts]);


  const filteredProducts = useMemo(() => {
    let result = catalogProducts.filter((product) => product.isActive !== false);
    if (activeCategory !== "All") {
      result = result.filter((product) => product.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sortOrder === "price-asc") return a.price - b.price;
      if (sortOrder === "price-desc") return b.price - a.price;
      if (sortOrder === "name-asc") return a.name.localeCompare(b.name);
      return 0; // featured or default
    });
    return result;
  }, [activeCategory, catalogProducts, searchQuery, sortOrder]);

  const featuredProducts = useMemo(
    () => catalogProducts.filter((product) => product.isActive !== false && product.featured),
    [catalogProducts],
  );

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + item.product.price * item.quantity, 0),
    [cart],
  );

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );

  useEffect(() => {
    let isMounted = true;

    // Load full Storefront CMS Config from localStorage and Firestore
    setCmsConfig(getCachedStorefrontConfig());
    loadStorefrontConfig().then((loadedCfg) => {
      if (isMounted) setCmsConfig(loadedCfg);
    });

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === "kz_storefront_cms_config_v1") {
        setCmsConfig(getCachedStorefrontConfig());
      }
    };
    window.addEventListener("storage", handleStorageUpdate);

    // Load customized hero image & playlist from Firestore or localStorage
    if (typeof window !== "undefined") {
      const savedHero = localStorage.getItem("kz_hero_image");
      const savedTitle = localStorage.getItem("kz_hero_title");
      if (savedHero) setHeroImage(savedHero);
      if (savedTitle) setHeroTitle(savedTitle);
    }
    if (db) {
      getDoc(doc(db, "settings", "storefront"))
        .then((snap) => {
          if (snap.exists() && isMounted) {
            const data = snap.data();
            if (Array.isArray(data.heroImages) && data.heroImages.length > 0) {
              setHeroImages(data.heroImages);
            } else if (data.heroImage) {
              setHeroImages([data.heroImage]);
            }
            if (typeof data.shuffle === "boolean") {
              setIsShuffle(data.shuffle);
            }
            if (typeof data.intervalSeconds === "number") {
              setShuffleInterval(data.intervalSeconds * 1000);
            }
            if (data.heroImage) setHeroImage(data.heroImage);
            if (data.heroProductName) setHeroTitle(data.heroProductName);
          }
        })
        .catch(() => {});
    }

    getPublicProducts()
      .then((loadedProducts) => {
        if (isMounted) {
          setCatalogProducts(loadedProducts.filter((p) => p.isActive !== false));
        }
      })
      .catch(() => {
        if (isMounted) {
          setCatalogProducts(seedProducts.filter((p) => p.isActive !== false));
        }
      });

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  // Auto-shuffle / slideshow timer for top banner
  useEffect(() => {
    if (!isShuffle || heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, shuffleInterval);
    return () => clearInterval(timer);
  }, [isShuffle, heroImages.length, shuffleInterval]);

  function addToCart(product: Product, quantity = 1) {
    if (!product.inStock || product.stockQuantity < 1) {
      return;
    }

    const safeQuantity = Math.min(Math.max(Math.trunc(quantity), 1), product.stockQuantity);

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        const nextQuantity = Math.min(existing.quantity + safeQuantity, product.stockQuantity);

        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQuantity }
            : item,
        );
      }

      return [...current, { product, quantity: safeQuantity }];
    });
    setIsCartOpen(true);
    setLastAddedProductId(product.id);
    window.setTimeout(() => setLastAddedProductId(""), 900);
  }

  function validateCheckoutForm(): boolean {
    const nextErrors: FormErrors = {};

    const cleanName = form.customerName.trim();
    if (!cleanName) {
      nextErrors.customerName = "Please enter your full name.";
    } else if (cleanName.length < 2) {
      nextErrors.customerName = "Name must be at least 2 characters long.";
    }

    const cleanContact = form.contact.trim();
    if (!cleanContact) {
      nextErrors.contact = "Please enter your phone number or WhatsApp contact.";
    } else {
      const digitsOnly = cleanContact.replace(/\D/g, "");
      if (digitsOnly.length < 8) {
        nextErrors.contact = "Please enter a valid phone number (at least 8 digits).";
      }
    }

    const cleanCity = form.city.trim();
    if (!cleanCity) {
      nextErrors.city = "Please select or type your governorate or city.";
    }

    const cleanStreet = form.streetAddress.trim();
    if (!cleanStreet) {
      nextErrors.streetAddress = "Please enter your street address, building, or landmark.";
    } else if (cleanStreet.length < 3) {
      nextErrors.streetAddress = "Street address is too short.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function updateFormField(field: keyof CheckoutForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field in formErrors) {
      setFormErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) => {
      if (quantity < 1) {
        return current.filter((item) => item.product.id !== productId);
      }

      return current.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        return {
          ...item,
          quantity: Math.min(quantity, item.product.stockQuantity),
        };
      });
    });
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current || submitState.status === "loading") {
      return;
    }

    if (!validateCheckoutForm()) {
      setSubmitState({
        status: "error",
        message: "Please review the highlighted fields before placing your order request.",
      });
      return;
    }

    if (cart.length === 0) {
      setSubmitState({
        status: "error",
        message: "Add at least one product to your cart before sending an inquiry.",
      });
      return;
    }

    isSubmittingRef.current = true;
    setSubmitState({ status: "loading", message: "Creating your order request..." });

    const combinedAddress = `${form.city.trim()} - ${form.streetAddress.trim()}`.slice(0, 240);

    try {
      const orderId = await submitOrderInquiry({
        customerName: form.customerName.trim().slice(0, 80),
        contact: form.contact.trim().slice(0, 120),
        address: combinedAddress,
        notes: form.notes.trim().slice(0, 500),
        items: cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        subtotal,
      });

      setSubmittedOrder({
        orderId,
        items: [...cart],
        subtotal,
        customerName: form.customerName.trim(),
        contact: form.contact.trim(),
        address: combinedAddress,
        notes: form.notes.trim(),
      });

      setCart([]);
      setForm(emptyForm);
      setFormErrors({});
      setSubmitState({
        status: "success",
        message: "Order request submitted successfully.",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not submit the order. Please try again.",
      });
    } finally {
      isSubmittingRef.current = false;
    }
  }

  function handleCloseCheckout() {
    setIsCartOpen(false);
    if (submitState.status === "success") {
      // Clear submit state so reopening cart next time shows a clean state
      setSubmitState({ status: "idle", message: "" });
      setSubmittedOrder(null);
    }
  }

  function handleResetOrderSuccess() {
    setSubmitState({ status: "idle", message: "" });
    setSubmittedOrder(null);
    setIsCartOpen(false);
  }

  function handleSelectMenuTab(tab: MenuTab) {
    setActiveTab(tab);
    if (tab === "all") {
      setActiveCategory("All");
      setSearchQuery("");
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "iems") {
      setActiveCategory("IEMs");
      setSearchQuery("");
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "wireless") {
      setActiveCategory("Wireless");
      setSearchQuery("");
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "cables") {
      setActiveCategory("Cables");
      setSearchQuery("");
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "gamers") {
      setActiveCategory("IEMs");
      setSearchQuery("gaming");
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "accessories") {
      setActiveCategory("Ear tips");
      setSearchQuery("");
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "dacs") {
      setActiveCategory("DACs");
      setSearchQuery("");
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <>
      <AnnouncementBar config={cmsConfig.announcement} />
      <SiteHeader
        cartCount={cartCount}
        activeTab={activeTab}
        onSelectTab={handleSelectMenuTab}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        catalogProducts={catalogProducts}
        onViewProduct={handleViewProduct}
        headerConfig={cmsConfig.header}
      />

      <main className="storefront-shell">
        {/* 1. Hero Slideshow - Flagship Launch Carousel */}
        <HeroSlideshow
          heroConfig={cmsConfig.hero}
          onSelectCategory={(cat) => {
            setActiveCategory(cat as ProductCategory | "All");
            document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* 2. Best Sellers - Community Tested & Verified */}
        {cmsConfig.bestSellers.enabled && (
          <section className="section" id="bestsellers" aria-label="Best Sellers">
            <div className="kz-section-container">
              <div className="kz-section-header-row">
                <div>
                  <span className="kz-section-kicker">{cmsConfig.bestSellers.kicker}</span>
                  <h2 className="kz-section-title">{cmsConfig.bestSellers.title}</h2>
                  <p className="kz-section-subtitle">{cmsConfig.bestSellers.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="kz-section-action-link"
                  onClick={() => {
                    setActiveCategory("All");
                    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span>{cmsConfig.bestSellers.ctaText}</span>
                  <span className="kz-link-arrow">→</span>
                </button>
              </div>
              <div className="kz-products-grid">
                {(featuredProducts.length > 0 ? featuredProducts : catalogProducts)
                  .slice(0, Math.max(1, Number(cmsConfig.bestSellers.maxItems) || 4))
                  .map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onView={handleViewProduct}
                      isRecentlyAdded={lastAddedProductId === product.id}
                      onAddToCart={(p) => addToCart(p, 1)}
                    />
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* 3. Personalized Sound Style & Earphones Recommender */}
        <SoundStyleRecommender
          products={catalogProducts.filter((p) => p.isActive !== false)}
          onViewProduct={handleViewProduct}
          onAddToCart={(p) => addToCart(p, 1)}
          finderConfig={cmsConfig.soundFinder}
        />

        {/* 5. New Releases Section */}
        {cmsConfig.newReleases.enabled && (
          <section className="section" id="new-releases" aria-label="New Releases">
            <div className="kz-section-container">
              <div className="kz-section-header-row">
                <div>
                  <span className="kz-section-kicker">{cmsConfig.newReleases.kicker}</span>
                  <h2 className="kz-section-title">{cmsConfig.newReleases.title}</h2>
                  <p className="kz-section-subtitle">{cmsConfig.newReleases.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="kz-section-action-link"
                  onClick={() => {
                    setActiveCategory("IEMs");
                    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span>{cmsConfig.newReleases.ctaText}</span>
                  <span className="kz-link-arrow">→</span>
                </button>
              </div>
              <div className="kz-products-grid">
                {catalogProducts
                  .slice(0, Math.max(1, Number(cmsConfig.newReleases.maxItems) || 4))
                  .map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onView={handleViewProduct}
                      isRecentlyAdded={lastAddedProductId === product.id}
                      onAddToCart={(p) => addToCart(p, 1)}
                    />
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* 7. Full Arsenal Catalog with Filters & Search */}
        <section className="section catalog" id="catalog">
          <div className="kz-section-container">
            <div className="section-heading">
              <p className="category-label">{cmsConfig.catalogSection.kicker}</p>
              <h2>{cmsConfig.catalogSection.title}</h2>
              <p className="section-sub">{cmsConfig.catalogSection.subtitle}</p>
            </div>
            <div className="catalog-toolbar">
              <div className="filters" aria-label="Product filters">
                {(["All", ...PRODUCT_CATEGORIES] as (ProductCategory | "All")[]).map((category) => (
                  <button
                    className={activeCategory === category ? "active" : ""}
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="catalog-controls">
                <input
                  type="search"
                  placeholder="Filter products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="catalog-search-inline"
                  aria-label="Filter catalog products"
                />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="catalog-sort-select"
                  aria-label="Sort products"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>
            <div className="kz-products-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={handleViewProduct}
                  isRecentlyAdded={lastAddedProductId === product.id}
                  onAddToCart={(p) => addToCart(p, 1)}
                />
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="catalog-empty">
                <p>No products match your current filters.</p>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setActiveCategory("All");
                    setSearchQuery("");
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 8. Let Customers Speak For Us - Real Verified Reviews */}
        <CustomerReviews reviewsConfig={cmsConfig.reviews} />

        {/* 9. Why Shop With Us Trust Section */}
        <TrustSection trustConfig={cmsConfig.trust} />

        {/* 10. Educational Audio Guides & Articles */}
        <BlogTeaser blogConfig={cmsConfig.blog} />

        {/* 12. Recently Viewed Products History */}
        <RecentlyViewedSection
          products={recentProducts}
          onViewProduct={handleViewProduct}
        />

        {/* 13. Support Strip & Final Call to Action */}
        {cmsConfig.supportStrip.enabled && cmsConfig.supportStrip.items.length > 0 && (
          <section className="support-strip">
            {cmsConfig.supportStrip.items.map((item, idx) => (
              <div key={item.id + idx}>
                <span>{item.num}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </section>
        )}

        {cmsConfig.finalCta.enabled && (
          <section className="final-cta">
            <p className="category-label">{cmsConfig.finalCta.kicker}</p>
            <h2>{cmsConfig.finalCta.title}</h2>
            <button className="primary-button" type="button" onClick={() => setIsCartOpen(true)}>
              {cmsConfig.finalCta.buttonText}
            </button>
          </section>
        )}

        {/* 14. Multi-column High-Tech Footer */}
        <Footer footerConfig={cmsConfig.footer} />

        {/* 16. Checkout Experience Drawer */}
        <CheckoutExperience
          cart={cart}
          isOpen={isCartOpen}
          subtotal={subtotal}
          cartCount={cartCount}
          submitState={submitState}
          formErrors={formErrors}
          form={form}
          submittedOrder={submittedOrder}
          onClose={handleCloseCheckout}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onSubmit={handleSubmit}
          onFormFieldChange={updateFormField}
          onResetOrderSuccess={handleResetOrderSuccess}
        />

        {/* 17. Product Details Modal */}
        {selectedProduct ? (
          <ProductDetailsModal
            catalogProducts={catalogProducts}
            onAddToCart={addToCart}
            onClose={() => setSelectedProduct(null)}
            onViewProduct={handleViewProduct}
            product={selectedProduct}
          />
        ) : null}
      </main>
    </>
  );
}

function ProductCard({
  product,
  onView,
  isRecentlyAdded,
  onAddToCart,
}: {
  product: Product;
  onView: (product: Product) => void;
  isRecentlyAdded: boolean;
  onAddToCart?: (product: Product) => void;
}) {
  const images = useMemo(() => getProductImages(product), [product]);
  const mainImage = images[0] ?? "";
  const hoverImage = images[1] ?? "";
  const stockAlert = getStockAlert(product);

  const openProduct = () => onView(product);
  const openProductFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct();
    }
  };

  const originalPrice = Math.round(product.price * 1.25);

  return (
    <article
      aria-label={`View details for ${product.name}`}
      className={`kz-product-card ${isRecentlyAdded ? "added" : ""}`}
      onClick={openProduct}
      onKeyDown={openProductFromKeyboard}
      role="button"
      tabIndex={0}
    >
      <div className="kz-card-badge-row">
        {product.featured ? <span className="kz-card-badge sale">FEATURED</span> : null}
        {stockAlert ? (
          <span className={`kz-card-badge ${stockAlert.type === "low" ? "low" : "hot"}`}>
            {stockAlert.label}
          </span>
        ) : null}
      </div>

      <div className="kz-card-img-frame">
        {mainImage ? (
          <>
            <img
              alt={product.name}
              className={`img-primary ${hoverImage ? "has-second" : ""}`}
              loading="lazy"
              decoding="async"
              src={mainImage}
            />
            {hoverImage ? (
              <img
                alt=""
                aria-hidden="true"
                className="img-secondary"
                loading="lazy"
                decoding="async"
                src={hoverImage}
              />
            ) : null}
          </>
        ) : (
          <span>{product.image}</span>
        )}
        <span className="kz-card-quickview" aria-hidden="true">Quick view</span>
      </div>

      <div className="kz-card-body">
        <span className="kz-card-category">{product.category}</span>
        <h3 className="kz-card-title">{product.name}</h3>

        <div className="kz-card-rating">
          <span>★★★★★</span>
          <span className="kz-rating-count">(4.{8 + (product.name.length % 2)})</span>
        </div>

        <div className="kz-card-price-row">
          <span className="kz-card-original-price">{formatCurrency(originalPrice)}</span>
          <span className="kz-card-sale-price">{formatCurrency(product.price)}</span>
        </div>

        <div className="kz-card-actions">
          {onAddToCart ? (
            <button
              type="button"
              className="kz-card-details-btn"
              onClick={(e) => {
                e.stopPropagation();
                onView(product);
              }}
              aria-label={`View details for ${product.name}`}
            >
              Details
            </button>
          ) : null}
          <button
            type="button"
            className="kz-card-cart-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToCart) {
                onAddToCart(product);
              } else {
                onView(product);
              }
            }}
            disabled={!product.inStock}
          >
            {isRecentlyAdded ? "✓ Added" : product.inStock ? "+ Add to Cart" : "Out of Stock"}
          </button>
        </div>
      </div>
    </article>
  );
}

function getStockAlert(product: Product) {
  if (!product.inStock || product.stockQuantity < 1) {
    return { label: "Out of stock", type: "out" };
  }

  if (product.stockQuantity <= product.lowStockThreshold) {
    return { label: "Low stock", type: "low" };
  }

  return null;
}

function getProductImages(product: Product) {
  return product.imageUrls.length > 0
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];
}

function ProductCardGallery({ product }: { product: Product }) {
  const images = useMemo(() => getProductImages(product), [product]);
  const mainImage = images[0] ?? "";
  const hoverImage = images[1] ?? "";

  return (
    <div className={hoverImage ? "card-gallery has-hover-image" : "card-gallery"}>
      {mainImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={product.name} className="card-gallery-image main" loading="lazy" decoding="async" src={mainImage} />
          {hoverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" aria-hidden="true" className="card-gallery-image hover" loading="lazy" decoding="async" src={hoverImage} />
          ) : null}
        </>
      ) : (
        <span>{product.image}</span>
      )}
    </div>
  );
}

function ProductVisualFrame({
  product,
  imagePath,
  large = false,
}: {
  product: Product;
  imagePath: string;
  large?: boolean;
}) {
  return (
    <div className={large ? "product-visual large" : "product-visual"}>
      {imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={product.name} src={imagePath} />
      ) : (
        <span>{product.image}</span>
      )}
    </div>
  );
}

function ProductGallery({ product }: { product: Product }) {
  const images = useMemo(() => getProductImages(product), [product]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  const activeImage = images[activeIndex] ?? images[0] ?? "";

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    goPrev();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    goNext();
  };

  // Keyboard navigation for image gallery
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (images.length <= 1) return;
      if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, goPrev, goNext]);

  // Touch swipe (mobile) to move between images
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null || images.length <= 1) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  return (
    <div className="product-gallery">
      {/* Main visual with arrows (desktop), swipe + dots (mobile) and counter */}
      <div
        className="pdm-stage"
        style={{ position: "relative", width: "100%" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ProductVisualFrame product={product} imagePath={activeImage} large />
        {images.length > 1 ? (
          <>
            <button
              className="gallery-nav-btn prev"
              type="button"
              onClick={handlePrev}
              title="Previous image (Left Arrow)"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className="gallery-nav-btn next"
              type="button"
              onClick={handleNext}
              title="Next image (Right Arrow)"
              aria-label="Next image"
            >
              ›
            </button>
            <span className="gallery-counter-badge">
              {activeIndex + 1} / {images.length}
            </span>
            <div className="pdm-dots" aria-hidden="true">
              {images.map((imagePath, idx) => (
                <span key={imagePath + idx} className={idx === activeIndex ? "active" : ""} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Thumbnails row to move between images for the same product */}
      {images.length > 1 ? (
        <div className="gallery-thumbs" aria-label={`${product.name} images`}>
          {images.map((imagePath, idx) => (
            <button
              className={idx === activeIndex ? "active" : ""}
              key={imagePath + idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              title={`View angle ${idx + 1}`}
              aria-label={`View image ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={imagePath} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Product Details Modal (v2 UX)
 * - Smooth open / close animation (respects prefers-reduced-motion)
 * - Close with: ✕ button, "Back to shop" button, Escape key, clicking outside,
 *   or the phone / browser BACK button (history-aware)
 * - Sticky top bar so the exit is always reachable while scrolling
 * - Mobile: full-screen sheet with sticky bottom "Add to cart" bar and swipeable gallery
 * - Switching to a related product scrolls back to the top instantly
 * - Shareable deep link: /#product-<slug>
 */
function ProductDetailsModal({
  product,
  catalogProducts,
  onAddToCart,
  onViewProduct,
  onClose,
}: {
  product: Product;
  catalogProducts: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onViewProduct: (product: Product) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const historyPushedRef = useRef(false);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const stockAlert = getStockAlert(product);
  const relatedProducts = useMemo(
    () =>
      catalogProducts
        .filter((candidate) => candidate.category === product.category && candidate.id !== product.id)
        .slice(0, 4),
    [catalogProducts, product.category, product.id],
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Reset quantity and jump back to top whenever a different product is shown
  useEffect(() => {
    setQuantity(1);
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [product.id]);

  const finishClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    if (window.location.hash.startsWith("#product-")) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => onCloseRef.current(), reduceMotion ? 0 : 210);
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      window.history.back(); // popstate listener below finishes the close
      window.setTimeout(finishClose, 350); // safety net if popstate never fires
    } else {
      finishClose();
    }
  }, [finishClose]);

  // History integration: phone / browser Back button closes the product instead of leaving the site
  useEffect(() => {
    const url = `${window.location.pathname}${window.location.search}#product-${encodeURIComponent(product.slug || product.id)}`;
    if (!historyPushedRef.current) {
      window.history.pushState({ ...(window.history.state || {}), kzProductModal: true }, "", url);
      historyPushedRef.current = true;
    } else {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [product.id, product.slug]);

  useEffect(() => {
    const handlePopState = () => {
      historyPushedRef.current = false;
      finishClose();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [finishClose]);

  // Lock page scroll, move focus into the dialog, and restore focus on exit
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => {
      unlockBodyScroll();
      if (!document.querySelector(".checkout-modal-container")) {
        previouslyFocused?.focus?.({ preventScroll: true });
      }
    };
  }, []);

  // Escape to close + keep keyboard focus inside the dialog
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  function changeQuantity(nextQuantity: number) {
    setQuantity(Math.min(Math.max(nextQuantity, 1), Math.max(product.stockQuantity, 1)));
  }

  function addSelectedQuantity() {
    if (!product.inStock) return;
    onAddToCart(product, quantity);
    requestClose();
  }

  const addLabel = product.inStock ? "Add to cart" : "Out of stock";

  return (
    <div
      className={`modal-backdrop pdm-backdrop ${isClosing ? "is-closing" : ""}`}
      role="presentation"
      onClick={requestClose}
    >
      <section
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="pdm-product-title"
        className={`product-modal pdm-dialog ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Sticky top bar: exit is always one tap away */}
        <header className="pdm-topbar">
          <button className="pdm-back-btn" type="button" onClick={requestClose} aria-label="Back to shop">
            <span aria-hidden="true">←</span>
            <span className="pdm-back-label">Back to shop</span>
          </button>
          <span className="pdm-topbar-title">{product.name}</span>
          <button
            ref={closeBtnRef}
            aria-label="Close product details"
            className="pdm-close-btn"
            type="button"
            onClick={requestClose}
          >
            ✕
          </button>
        </header>

        <div className="pdm-scroll" ref={scrollRef}>
          <div className="product-modal-top">
            <ProductGallery product={product} />
            <div className="purchase-panel">
              <p className="category-label">{product.category}</p>
              <h2 id="pdm-product-title">{product.name}</h2>
              <strong className="detail-price">{formatCurrency(product.price)}</strong>
              <p className={stockAlert ? `detail-stock ${stockAlert.type}` : "detail-stock in"}>
                {stockAlert ? stockAlert.label : "In stock"}
              </p>
              <p className="detail-summary">{product.description}</p>
              <div className="detail-quantity">
                <span>Quantity</span>
                <div className="quantity-controls">
                  <button
                    aria-label={`Decrease ${product.name} quantity`}
                    type="button"
                    onClick={() => changeQuantity(quantity - 1)}
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button
                    aria-label={`Increase ${product.name} quantity`}
                    type="button"
                    onClick={() => changeQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                className="primary-button wide pdm-desktop-add"
                disabled={!product.inStock}
                type="button"
                onClick={addSelectedQuantity}
              >
                {addLabel}
              </button>
              <button className="pdm-continue-link" type="button" onClick={requestClose}>
                ← Continue shopping
              </button>
            </div>
          </div>

          <div className="product-detail-sections">
            <section className="product-overview">
              <p className="category-label">Product overview</p>
              <h3>What this gear is built for</h3>
              <p>{product.description}</p>
            </section>

            {product.specs.length > 0 ? (
              <section className="technical-specs">
                <p className="category-label">Technical specifications</p>
                <h3>Audio profile</h3>
                <div className="spec-grid">
                  {product.specs.map((spec, index) => (
                    <div key={spec + index}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{spec}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedProducts.length > 0 ? (
              <section className="related-products">
                <p className="category-label">Related products</p>
                <h3>Same category picks</h3>
                <div className="related-product-grid">
                  {relatedProducts.map((relatedProduct) => (
                    <ProductCard
                      isRecentlyAdded={false}
                      key={relatedProduct.id}
                      onView={onViewProduct}
                      product={relatedProduct}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        {/* Mobile sticky purchase bar */}
        <footer className="pdm-mobile-bar">
          <div className="pdm-mobile-price">
            <strong>{formatCurrency(product.price * quantity)}</strong>
            <small>
              {quantity} × {formatCurrency(product.price)}
            </small>
          </div>
          <div className="quantity-controls pdm-qty">
            <button aria-label="Decrease quantity" type="button" onClick={() => changeQuantity(quantity - 1)}>
              -
            </button>
            <span>{quantity}</span>
            <button aria-label="Increase quantity" type="button" onClick={() => changeQuantity(quantity + 1)}>
              +
            </button>
          </div>
          <button
            className="primary-button pdm-mobile-add"
            disabled={!product.inStock}
            type="button"
            onClick={addSelectedQuantity}
          >
            {addLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

/**
 * High-tech Checkout & Order Experience
 * Implements the UX structure from UX-CONTRACT.md (referencing Nyvrix checkout organization):
 * 1. Cart / Order Summary
 * 2. Customer Information
 * 3. Delivery Information
 * 4. Optional Order Notes
 * 5. Final Order Summary
 * 6. Place Order Request CTA
 * 7. Order Success / Confirmation
 * Retains 100% existing gaming-tech dark visual identity and backend schema.
 */
function CheckoutExperience({
  cart,
  isOpen,
  subtotal,
  cartCount,
  submitState,
  formErrors,
  form,
  submittedOrder,
  onClose,
  onUpdateQuantity,
  onRemove,
  onSubmit,
  onFormFieldChange,
  onResetOrderSuccess,
}: {
  cart: CartItem[];
  isOpen: boolean;
  subtotal: number;
  cartCount: number;
  submitState: SubmitState;
  formErrors: FormErrors;
  form: CheckoutForm;
  submittedOrder: SubmittedOrder | null;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormFieldChange: (field: keyof CheckoutForm, value: string) => void;
  onResetOrderSuccess: () => void;
}) {
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when checkout is open
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleCopyOrderId(orderId: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderId).then(() => {
        setCopiedOrderId(true);
        setTimeout(() => setCopiedOrderId(false), 2200);
      });
    }
  }

  return (
    <div className="checkout-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className="checkout-modal-container"
        id="order"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="checkout-top-header">
          <div className="checkout-header-branding">
            <span className="brand-mark">NX</span>
            <div>
              <p className="checkout-kicker">NOOVYX // CASH ON DELIVERY</p>
              <h2>Order Checkout</h2>
            </div>
          </div>
          <button
            aria-label="Close checkout"
            className="icon-button checkout-close-btn"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        {submitState.status === "success" && submittedOrder ? (
          <OrderConfirmationView
            order={submittedOrder}
            copiedOrderId={copiedOrderId}
            onCopyOrderId={handleCopyOrderId}
            onContinueShopping={onResetOrderSuccess}
          />
        ) : cart.length === 0 ? (
          <EmptyCartView onClose={onClose} />
        ) : (
          <div className="checkout-body-grid">
            {/* Mobile Collapsible Order Summary Bar */}
            <div className="mobile-order-summary-toggle">
              <button
                type="button"
                className="summary-toggle-btn"
                onClick={() => setIsMobileSummaryOpen((prev) => !prev)}
                aria-expanded={isMobileSummaryOpen}
              >
                <div className="summary-toggle-info">
                  <span className="summary-cart-icon">🛒</span>
                  <span>{isMobileSummaryOpen ? "Hide order loadout" : "Show order loadout"}</span>
                  <span className="summary-items-count">({cartCount} {cartCount === 1 ? "item" : "items"})</span>
                  <span className="summary-arrow">{isMobileSummaryOpen ? "▲" : "▼"}</span>
                </div>
                <strong className="summary-toggle-price">{formatCurrency(subtotal)}</strong>
              </button>

              {isMobileSummaryOpen ? (
                <div className="mobile-summary-dropdown">
                  <OrderItemsList
                    cart={cart}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemove}
                  />
                  <PricingBreakdown subtotal={subtotal} />
                </div>
              ) : null}
            </div>

            {/* Left Column: Form & Steps */}
            <section className="checkout-main-flow">
              <div className="checkout-steps-indicator" aria-label="Checkout Progression Steps">
                <span className="step-pill active">
                  <span className="step-num">01</span> Customer
                </span>
                <span className="step-arrow">›</span>
                <span className="step-pill active">
                  <span className="step-num">02</span> Delivery
                </span>
                <span className="step-arrow">›</span>
                <span className="step-pill">
                  <span className="step-num">03</span> Notes
                </span>
                <span className="step-arrow">›</span>
                <span className="step-pill">
                  <span className="step-num">04</span> Confirmation
                </span>
              </div>

              <form className="checkout-form" noValidate onSubmit={onSubmit}>
                {/* 01. Customer Information */}
                <fieldset className="checkout-fieldset">
                  <legend className="checkout-fieldset-legend">
                    <span className="legend-tag">01 //</span>
                    <span className="legend-title">Customer Information</span>
                  </legend>
                  <p className="fieldset-desc">
                    Enter your contact details so our command team can verify your loadout before dispatch.
                  </p>

                  <div className="form-field-group">
                    <label htmlFor="customerName">
                      Full name <span className="req-star" aria-hidden="true">*</span>
                    </label>
                    <input
                      autoComplete="name"
                      aria-describedby={formErrors.customerName ? "customerName-error" : undefined}
                      aria-invalid={Boolean(formErrors.customerName)}
                      id="customerName"
                      maxLength={80}
                      value={form.customerName}
                      onChange={(e) => onFormFieldChange("customerName", e.target.value)}
                      placeholder="e.g. Omar Tarek"
                      className={formErrors.customerName ? "input-error" : ""}
                    />
                    {formErrors.customerName ? (
                      <p className="field-error-text" id="customerName-error">
                        ⚠ {formErrors.customerName}
                      </p>
                    ) : null}
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="contact">
                      Phone Number / WhatsApp <span className="req-star" aria-hidden="true">*</span>
                    </label>
                    <input
                      autoComplete="tel"
                      aria-describedby={formErrors.contact ? "contact-error" : undefined}
                      aria-invalid={Boolean(formErrors.contact)}
                      id="contact"
                      maxLength={120}
                      value={form.contact}
                      onChange={(e) => onFormFieldChange("contact", e.target.value)}
                      placeholder="e.g. 01012345678 or +20..."
                      className={formErrors.contact ? "input-error" : ""}
                    />
                    <p className="field-hint-text">
                      We contact you on this number via WhatsApp or call to confirm stock, delivery address, and timing.
                    </p>
                    {formErrors.contact ? (
                      <p className="field-error-text" id="contact-error">
                        ⚠ {formErrors.contact}
                      </p>
                    ) : null}
                  </div>
                </fieldset>

                {/* 02. Delivery Information */}
                <fieldset className="checkout-fieldset">
                  <legend className="checkout-fieldset-legend">
                    <span className="legend-tag">02 //</span>
                    <span className="legend-title">Delivery Information</span>
                  </legend>
                  <p className="fieldset-desc">
                    Specify your delivery destination in Egypt. Delivery cost is confirmed after order review.
                  </p>

                  <div className="form-field-group">
                    <label htmlFor="city">
                      Governorate / City <span className="req-star" aria-hidden="true">*</span>
                    </label>
                    <input
                      list="egypt-governorates"
                      autoComplete="address-level1"
                      aria-describedby={formErrors.city ? "city-error" : undefined}
                      aria-invalid={Boolean(formErrors.city)}
                      id="city"
                      maxLength={80}
                      value={form.city}
                      onChange={(e) => onFormFieldChange("city", e.target.value)}
                      placeholder="Select or enter your governorate / city"
                      className={formErrors.city ? "input-error" : ""}
                    />
                    <datalist id="egypt-governorates">
                      {EGYPT_GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov} />
                      ))}
                    </datalist>
                    {formErrors.city ? (
                      <p className="field-error-text" id="city-error">
                        ⚠ {formErrors.city}
                      </p>
                    ) : null}
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="streetAddress">
                      Detailed Street Address & Landmarks <span className="req-star" aria-hidden="true">*</span>
                    </label>
                    <input
                      autoComplete="street-address"
                      aria-describedby={formErrors.streetAddress ? "streetAddress-error" : undefined}
                      aria-invalid={Boolean(formErrors.streetAddress)}
                      id="streetAddress"
                      maxLength={160}
                      value={form.streetAddress}
                      onChange={(e) => onFormFieldChange("streetAddress", e.target.value)}
                      placeholder="Street name, building number, apartment/floor, or landmark"
                      className={formErrors.streetAddress ? "input-error" : ""}
                    />
                    {formErrors.streetAddress ? (
                      <p className="field-error-text" id="streetAddress-error">
                        ⚠ {formErrors.streetAddress}
                      </p>
                    ) : null}
                  </div>
                </fieldset>

                {/* 03. Optional Order Notes */}
                <fieldset className="checkout-fieldset">
                  <legend className="checkout-fieldset-legend">
                    <span className="legend-tag">03 //</span>
                    <span className="legend-title">Order Notes & Preferences (Optional)</span>
                  </legend>
                  <div className="form-field-group">
                    <div className="label-with-count">
                      <label htmlFor="notes">Special requests or instructions</label>
                      <span className="char-counter">{form.notes.length} / 500</span>
                    </div>
                    <textarea
                      id="notes"
                      maxLength={500}
                      value={form.notes}
                      onChange={(e) => onFormFieldChange("notes", e.target.value)}
                      placeholder="e.g. Preferred cable termination (3.5mm / Type-C), ear tip size preference, delivery time instructions..."
                      rows={3}
                    />
                  </div>
                </fieldset>

                {/* Order Process Notice & Trust Badge */}
                <div className="checkout-guarantee-card">
                  <div className="guarantee-badge">
                    <span className="guarantee-shield">🛡️</span>
                    <div>
                      <strong>CASH ON DELIVERY // VERIFIED INQUIRY</strong>
                      <p>
                        Your order will be reviewed and confirmed with you before delivery and payment.
                        No advance online payment required. Pay only after inspection.
                      </p>
                    </div>
                  </div>
                </div>

                {submitState.message && submitState.status === "error" ? (
                  <div className="form-alert error" role="alert">
                    <span>⚠</span> {submitState.message}
                  </div>
                ) : null}

                {/* Submit Action */}
                <div className="checkout-action-row">
                  <button
                    className="primary-button checkout-submit-btn"
                    disabled={submitState.status === "loading" || cart.length === 0}
                    type="submit"
                  >
                    {submitState.status === "loading" ? (
                      <span className="btn-loading-content">
                        <span className="btn-spinner" aria-hidden="true" />
                        CREATING ORDER REQUEST...
                      </span>
                    ) : (
                      "PLACE ORDER REQUEST"
                    )}
                  </button>
                  <p className="checkout-sub-disclaimer">
                    Clicking &quot;Place Order Request&quot; notifies our operations team to verify physical stock and reserve your equipment.
                  </p>
                </div>
              </form>
            </section>

            {/* Right Column: Sticky Order Summary (Desktop) */}
            <aside className="checkout-summary-column" aria-label="Order Loadout Summary">
              <div className="summary-sticky-wrap">
                <div className="summary-card-header">
                  <div>
                    <p className="summary-tag">CURRENT ARSENAL</p>
                    <h3>Order Summary</h3>
                  </div>
                  <span className="summary-count-badge">
                    {cartCount} {cartCount === 1 ? "ITEM" : "ITEMS"}
                  </span>
                </div>

                <OrderItemsList
                  cart={cart}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                />

                <PricingBreakdown subtotal={subtotal} />

                <div className="summary-trust-bullets">
                  <div>
                    <span className="bullet-icon">⚡</span>
                    <span>100% Genuine KZ Acoustic Components</span>
                  </div>
                  <div>
                    <span className="bullet-icon">📦</span>
                    <span>Inspected & Tested Prior to Dispatch</span>
                  </div>
                  <div>
                    <span className="bullet-icon">💬</span>
                    <span>Direct WhatsApp Support for Inquiries</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderItemsList({
  cart,
  onUpdateQuantity,
  onRemove,
}: {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <div className="checkout-items-list" role="list">
      {cart.map((item) => (
        <article className="checkout-item-row" key={item.product.id} role="listitem">
          <ProductThumb product={item.product} />
          <div className="checkout-item-info">
            <div className="checkout-item-header">
              <h4 className="checkout-item-name">{item.product.name}</h4>
              <strong className="checkout-item-total">
                {formatCurrency(item.product.price * item.quantity)}
              </strong>
            </div>
            <div className="checkout-item-meta">
              <span className="checkout-item-cat">{item.product.category}</span>
              <span className="checkout-item-unit-price">
                {formatCurrency(item.product.price)} each
              </span>
            </div>
            <div className="checkout-item-actions">
              <div className="quantity-controls compact" aria-label={`Quantity for ${item.product.name}`}>
                <button
                  aria-label={`Decrease ${item.product.name} quantity`}
                  type="button"
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                >
                  -
                </button>
                <span className="qty-number">{item.quantity}</span>
                <button
                  aria-label={`Increase ${item.product.name} quantity`}
                  type="button"
                  disabled={item.quantity >= item.product.stockQuantity}
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                className="checkout-remove-btn"
                type="button"
                onClick={() => onRemove(item.product.id)}
              >
                Remove
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PricingBreakdown({ subtotal }: { subtotal: number }) {
  return (
    <div className="pricing-summary-card">
      <div className="pricing-row">
        <span>Subtotal</span>
        <strong>{formatCurrency(subtotal)}</strong>
      </div>
      <div className="pricing-row delivery-row">
        <div>
          <span>Delivery</span>
          <span className="delivery-info-tooltip">
            (Exact rate confirmed via WhatsApp before dispatch)
          </span>
        </div>
        <span className="delivery-status-text">Confirmed upon review</span>
      </div>
      <div className="pricing-divider" />
      <div className="pricing-row final-total-row">
        <div>
          <strong>Total</strong>
          <span className="total-currency-tag">EGP</span>
        </div>
        <strong className="final-total-amount">{formatCurrency(subtotal)}</strong>
      </div>
      <p className="pricing-footnote">
        * Final courier delivery fee will be communicated and confirmed with you during the order verification call/message.
      </p>
    </div>
  );
}

function OrderConfirmationView({
  order,
  copiedOrderId,
  onCopyOrderId,
  onContinueShopping,
}: {
  order: SubmittedOrder;
  copiedOrderId: boolean;
  onCopyOrderId: (orderId: string) => void;
  onContinueShopping: () => void;
}) {
  return (
    <section className="order-confirmation-screen" aria-label="Order Confirmation">
      <div className="confirmation-badge-row">
        <div className="celebrate-icon-box">✓</div>
        <p className="confirmation-tag">TRANSMISSION SECURED // REQUEST RECORDED</p>
        <h2>Order Request Received</h2>
        <p className="confirmation-lead">
          Thank you, <strong>{order.customerName}</strong>! Your gear loadout request has been securely logged into our command center queue.
        </p>
      </div>

      {/* Request ID Display */}
      <div className="request-id-card">
        <div className="request-id-details">
          <span className="id-label">ORDER REQUEST ID</span>
          <code className="id-code">#{order.orderId}</code>
        </div>
        <button
          className="ghost-button copy-id-btn"
          type="button"
          onClick={() => onCopyOrderId(order.orderId)}
        >
          {copiedOrderId ? "✓ Copied!" : "Copy ID"}
        </button>
      </div>

      {/* 3-Step Next Steps Progression */}
      <div className="next-steps-container">
        <h3 className="next-steps-heading">WHAT HAPPENS NEXT?</h3>
        <div className="next-steps-grid">
          <div className="next-step-card">
            <span className="step-card-num">01</span>
            <h4>Loadout Verification</h4>
            <p>Our team physically inspects warehouse stock, driver units, and accessories for your selected models.</p>
          </div>
          <div className="next-step-card highlight">
            <span className="step-card-num">02</span>
            <h4>WhatsApp / Phone Confirmation</h4>
            <p>We contact you at <strong>{order.contact}</strong> to confirm the delivery address and exact courier fee.</p>
          </div>
          <div className="next-step-card">
            <span className="step-card-num">03</span>
            <h4>Doorstep Delivery & COD</h4>
            <p>Your gear is dispatched in secure shockproof packaging. Inspect your items and pay cash upon arrival.</p>
          </div>
        </div>
      </div>

      {/* Summary of Submitted Order */}
      <div className="submitted-order-recap">
        <h3 className="recap-heading">Submitted Loadout Summary</h3>
        <div className="recap-details-grid">
          <div className="recap-info-block">
            <span className="recap-label">Recipient</span>
            <strong>{order.customerName}</strong>
            <span className="recap-contact">{order.contact}</span>
          </div>
          <div className="recap-info-block">
            <span className="recap-label">Destination</span>
            <strong>{order.address}</strong>
          </div>
          {order.notes ? (
            <div className="recap-info-block full-width">
              <span className="recap-label">Customer Notes</span>
              <p className="recap-notes-text">{order.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="recap-items-table">
          {order.items.map((item) => (
            <div className="recap-item-line" key={item.product.id}>
              <div className="recap-item-name-group">
                <ProductThumb product={item.product} />
                <div>
                  <strong>{item.product.name}</strong>
                  <span className="recap-item-qty">Qty: {item.quantity} × {formatCurrency(item.product.price)}</span>
                </div>
              </div>
              <strong className="recap-item-total">
                {formatCurrency(item.product.price * item.quantity)}
              </strong>
            </div>
          ))}
          <div className="recap-subtotal-line">
            <span>Subtotal</span>
            <strong>{formatCurrency(order.subtotal)}</strong>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="confirmation-actions">
        <button
          className="primary-button continue-shopping-btn"
          type="button"
          onClick={onContinueShopping}
        >
          CONTINUE SHOPPING
        </button>
        <a
          className="secondary-link whatsapp-support-link"
          href={`https://wa.me/?text=${encodeURIComponent(
            `Hi KZ Audio Store, I just submitted order request #${order.orderId} for ${order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}. Please confirm my order.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>💬 Chat on WhatsApp with Order ID</span>
        </a>
      </div>
    </section>
  );
}

function EmptyCartView({ onClose }: { onClose: () => void }) {
  return (
    <div className="empty-checkout-view">
      <div className="empty-cart-icon">🎧</div>
      <h3>Your Arsenal is Empty</h3>
      <p>
        Select from our battle-ready KZ in-ear monitors, cables, tips, and DAC adapters to assemble your audio loadout.
      </p>
      <button
        className="primary-button"
        type="button"
        onClick={() => {
          onClose();
          const catalogEl = document.getElementById("catalog");
          if (catalogEl) {
            catalogEl.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        BROWSE CATALOG
      </button>
    </div>
  );
}

function ProductThumb({ product }: { product: Product }) {
  const imagePath = getProductImages(product)[0] ?? "";

  return (
    <div className="product-thumb">
      {imagePath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={imagePath} />
      ) : (
        <span>{product.image}</span>
      )}
    </div>
  );
}

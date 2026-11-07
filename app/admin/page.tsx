"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import {
  deleteOrder,
  getAdminOrders,
  updateOrderStatus,
} from "../../orderService";
import { PRODUCT_CATEGORIES, formatCurrency, products as seedProducts } from "../../products";
import {
  deleteProduct,
  getAdminProducts,
  saveProduct,
  saveProductsBatch,
} from "../../productService";
import type { AdminOrder, OrderStatus, Product, ProductCategory } from "../../types";
import {
  DEFAULT_STOREFRONT_CONFIG,
  loadStorefrontConfig,
   sanitizeImageSrc,
  saveStorefrontConfig,
  type StorefrontConfig,
} from "../../storefrontConfig";
import { AdminHomepageEditor } from "../components/AdminHomepageEditor";

type AdminTab = "homepage" | "catalog" | "quick-add" | "bulk" | "orders";

type ToastMessage = {
  type: "idle" | "success" | "error";
  text: string;
};

type CategoryPreset = {
  category: ProductCategory;
  label: string;
  icon: string;
  initials: string;
  defaultPrice: number;
  defaultSpecs: string[];
  defaultDescription: string;
  stock: number;
  lowAlert: number;
};

const CATEGORY_PRESETS: Record<ProductCategory, CategoryPreset> = {
  IEMs: {
    category: "IEMs",
    label: "IEM Monitors",
    icon: "🎧",
    initials: "KZ",
    defaultPrice: 850,
    defaultSpecs: [
      "Dynamic driver architecture",
      "0.75mm 2-pin detachable cable",
      "Acoustic noise isolation",
      "3.5mm gold-plated jack",
    ],
    defaultDescription:
      "High-fidelity in-ear monitor tuned for clarity, strong staging, and immersive gaming audio.",
    stock: 18,
    lowAlert: 4,
  },
  Wireless: {
    category: "Wireless",
    label: "Wireless Gear",
    icon: "📡",
    initials: "WL",
    defaultPrice: 1250,
    defaultSpecs: [
      "Bluetooth 5.3 low-latency",
      "High-capacity charging case",
      "ENC clear voice pickup",
      "Ergonomic secure ear fit",
    ],
    defaultDescription:
      "True wireless audio solution engineered for low latency, clear calls, and long battery life.",
    stock: 15,
    lowAlert: 3,
  },
  Cables: {
    category: "Cables",
    label: "Upgrade Cables",
    icon: "🔌",
    initials: "CB",
    defaultPrice: 650,
    defaultSpecs: [
      "High-purity braided OFC conductors",
      "0.75mm / 0.78mm 2-pin fit",
      "3.5mm gold-plated plug",
      "Soft anti-tangle outer jacket",
    ],
    defaultDescription:
      "Audiophile braided upgrade cable designed for clean signal transmission and zero microphonics.",
    stock: 20,
    lowAlert: 4,
  },
  "Ear tips": {
    category: "Ear tips",
    label: "Acoustic Tips",
    icon: "🔘",
    initials: "ET",
    defaultPrice: 280,
    defaultSpecs: [
      "Medical-grade soft silicone",
      "S/M/L multi-size pack",
      "Enhanced acoustic seal",
      "Universal nozzle diameter",
    ],
    defaultDescription:
      "Premium replacement acoustic ear tips for enhanced comfort, sub-bass seal, and fatigue-free fit.",
    stock: 25,
    lowAlert: 5,
  },
  Cases: {
    category: "Cases",
    label: "Hard Cases",
    icon: "🧳",
    initials: "CS",
    defaultPrice: 380,
    defaultSpecs: [
      "Shockproof rigid protective shell",
      "Interior soft velvet lining",
      "Internal mesh cable organizer",
      "Compact pocket-friendly profile",
    ],
    defaultDescription:
      "Protective hard case engineered to keep in-ear monitors, cables, and adapters safe on the go.",
    stock: 15,
    lowAlert: 3,
  },
  DACs: {
    category: "DACs",
    label: "DAC Dongles",
    icon: "⚡",
    initials: "DC",
    defaultPrice: 950,
    defaultSpecs: [
      "High-performance decoding chipset",
      "32-bit / 384kHz PCM support",
      "Type-C universal input",
      "Low noise floor output",
    ],
    defaultDescription:
      "High-resolution portable DAC and headphone amplifier for powerful mobile audio decoding.",
    stock: 12,
    lowAlert: 3,
  },
};

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

const blankProduct: Product = {
  id: "",
  slug: "",
  name: "",
  category: "IEMs",
  price: 0,
  image: "KZ",
  imageUrl: "",
  imageUrls: [],
  description: "",
  specs: [],
  inStock: true,
  stockQuantity: 15,
  lowStockThreshold: 3,
  isActive: true,
  featured: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stockLabel(product: Product) {
  if (product.stockQuantity <= 0) return "Out";
  if (product.stockQuantity <= product.lowStockThreshold) return "Low";
  return "In";
}

function normalizeImagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://")) {
    return "";
  }
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return sanitizeImageSrc(trimmed);
  }
  return sanitizeImageSrc(`/products/${trimmed}`);
}

async function hasValidImageMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4) return false;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    // JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    // WEBP: "RIFF"...."WEBP"
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    return isPng || isJpeg || isWebp;
  } catch {
    return false;
  }
}

async function compressImageFile(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    throw new Error("Only PNG, JPEG, and WEBP raster images are allowed (SVG is blocked).");
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error("Image file exceeds the 5 MB maximum size limit.");
  }
  const magicValid = await hasValidImageMagicBytes(file);
  if (!magicValid) {
    throw new Error("Invalid image file header (magic-byte verification failed).");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 900;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable for safe image re-encoding."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image file."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [adminState, setAdminState] = useState<"checking" | "claim" | "document" | "unknown">("checking");
  const [activeTab, setActiveTab] = useState<AdminTab>("homepage");
  const [cmsConfig, setCmsConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT_CONFIG);
  const [isSavingCms, setIsSavingCms] = useState(false);
  const [isSyncingSeed, setIsSyncingSeed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product>(blankProduct);
  const [specText, setSpecText] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | ProductCategory>("All");
  const [stockFilter, setStockFilter] = useState<"All" | "Visible" | "Hidden" | "Featured" | "Low" | "Out">("All");
  const [orderFilter, setOrderFilter] = useState<"All" | OrderStatus>("All");
  const [orderSearch, setOrderSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage>({ type: "idle", text: "" });
  const [isDragging, setIsDragging] = useState(false);

  // Bulk state
  const [bulkText, setBulkText] = useState("");
  const [bulkParsed, setBulkParsed] = useState<Product[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // Top Banner Manager State
  const [bannerImages, setBannerImages] = useState<string[]>([
    "/products/kz-castor-bass.png",
    "/products/kz-zsn-pro-x.png",
    "/products/kz-zs10-pro-2.png",
    "/products/kz-az09-wireless.png",
    "/products/kz-am02-dac.png",
  ]);
  const [bannerTitles, setBannerTitles] = useState<string[]>([
    "KZ Castor Bass Edition",
    "KZ ZSN Pro X",
    "KZ ZS10 Pro 2",
    "KZ AZ09 Wireless",
    "KZ AM02 DAC",
  ]);
  const [bannerImage, setBannerImage] = useState<string>("/products/kz-castor-bass.png");
  const [bannerProductName, setBannerProductName] = useState<string>("KZ Castor Bass Edition");
  const [activePreviewIdx, setActivePreviewIdx] = useState<number>(0);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState<boolean>(true);
  const [shuffleIntervalSec, setShuffleIntervalSec] = useState<number>(5);
  const [customBannerUrl, setCustomBannerUrl] = useState<string>("");
  const [bannerSearch, setBannerSearch] = useState<string>("");
  const [isPublishingBanner, setIsPublishingBanner] = useState<boolean>(false);
  const [failedLoginCount, setFailedLoginCount] = useState<number>(0);
  const [loginLockedUntil, setLoginLockedUntil] = useState<number>(0);

  const hasAdminAccess = adminState === "claim" || adminState === "document";

  // Load full Homepage CMS configuration only after admin authorization, and sync to server/Firestore
  useEffect(() => {
    if (!user || !hasAdminAccess) return;
    loadStorefrontConfig()
      .then((loaded) => {
        setCmsConfig(loaded);
        void saveStorefrontConfig(loaded);
      })
      .catch(() => {});
  }, [hasAdminAccess, user]);

  async function handleSaveCmsConfig(nextConfig?: StorefrontConfig) {
    if (!hasAdminAccess) {
      showToast("error", "Unauthorized: Admin privileges required.");
      return;
    }
    const toSave = nextConfig || cmsConfig;
    setIsSavingCms(true);
    try {
      await saveStorefrontConfig(toSave);
      showToast("success", "Published all Homepage settings & content to Live Store!");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Saved locally, but Firestore sync failed."
      );
    } finally {
      setIsSavingCms(false);
    }
  }

  // Load Top Banner settings and playlist only after admin authorization
  useEffect(() => {
    if (!user || !hasAdminAccess) return;
    if (typeof window !== "undefined") {
      const savedHero = localStorage.getItem("kz_hero_image");
      const savedTitle = localStorage.getItem("kz_hero_title");
      if (savedHero) setBannerImage(savedHero);
      if (savedTitle) setBannerProductName(savedTitle);
    }
    if (db) {
      getDoc(doc(db, "settings", "storefront"))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.heroImages) && data.heroImages.length > 0) {
              setBannerImages(data.heroImages);
              if (Array.isArray(data.heroTitles) && data.heroTitles.length === data.heroImages.length) {
                setBannerTitles(data.heroTitles);
              }
            } else if (data.heroImage) {
              setBannerImages([data.heroImage]);
              setBannerTitles([data.heroProductName || "Featured Hardware"]);
            }
            if (typeof data.shuffle === "boolean") {
              setIsShuffleEnabled(data.shuffle);
            }
            if (typeof data.intervalSeconds === "number") {
              setShuffleIntervalSec(data.intervalSeconds);
            }
            if (data.heroImage) setBannerImage(data.heroImage);
            if (data.heroProductName) setBannerProductName(data.heroProductName);
          }
        })
        .catch(() => {});
    }
  }, [hasAdminAccess, user]);

  // Admin banner preview slideshow rotation
  useEffect(() => {
    if (!isShuffleEnabled || bannerImages.length <= 1) return;
    const timer = setInterval(() => {
      setActivePreviewIdx((prev) => (prev + 1) % bannerImages.length);
    }, shuffleIntervalSec * 1000);
    return () => clearInterval(timer);
  }, [isShuffleEnabled, bannerImages.length, shuffleIntervalSec]);

  function addImageToBanner(url: string, name?: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    const label = name || "Hardware Showcase";
    if (bannerImages.includes(trimmed)) {
      showToast("error", `"${label}" is already in the banner playlist.`);
      return;
    }
    setBannerImages((prev) => [...prev, trimmed]);
    setBannerTitles((prev) => [...prev, label]);
    showToast("success", `Added "${label}" to banner playlist.`);
  }

  function removeImageFromBanner(index: number) {
    if (bannerImages.length <= 1) {
      showToast("error", "The banner must have at least one image.");
      return;
    }
    setBannerImages((prev) => prev.filter((_, i) => i !== index));
    setBannerTitles((prev) => prev.filter((_, i) => i !== index));
    setActivePreviewIdx(0);
    showToast("success", "Removed image from banner playlist.");
  }

  function moveBannerImage(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bannerImages.length) return;
    const newImages = [...bannerImages];
    const newTitles = [...bannerTitles];
    const tempImg = newImages[index];
    const tempTitle = newTitles[index];
    newImages[index] = newImages[targetIndex];
    newTitles[index] = newTitles[targetIndex];
    newImages[targetIndex] = tempImg;
    newTitles[targetIndex] = tempTitle;
    setBannerImages(newImages);
    setBannerTitles(newTitles);
    setActivePreviewIdx(targetIndex);
  }

  async function handlePublishBannerPlaylist() {
    if (bannerImages.length === 0) {
      showToast("error", "Please add at least one image to the banner.");
      return;
    }
    setIsPublishingBanner(true);
    try {
      const primaryImage = bannerImages[0];
      const primaryTitle = bannerTitles[0] || "Flagship Showcase";
      if (typeof window !== "undefined") {
        localStorage.setItem("kz_hero_image", primaryImage);
        localStorage.setItem("kz_hero_title", primaryTitle);
      }
      if (db) {
        await setDoc(
          doc(db, "settings", "storefront"),
          {
            heroImages: bannerImages,
            heroTitles: bannerTitles,
            heroImage: primaryImage,
            heroProductName: primaryTitle,
            shuffle: isShuffleEnabled,
            intervalSeconds: shuffleIntervalSec,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }
      showToast("success", `Published ${bannerImages.length} banner images with shuffle to live store!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to publish banner settings";
      showToast("error", msg);
    } finally {
      setIsPublishingBanner(false);
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const cmsAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCmsConfigChange(nextConfig: StorefrontConfig) {
    setCmsConfig(nextConfig);
    if (cmsAutoSaveTimerRef.current) {
      clearTimeout(cmsAutoSaveTimerRef.current);
    }
    cmsAutoSaveTimerRef.current = setTimeout(() => {
      void saveStorefrontConfig(nextConfig);
    }, 350);
  }

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev.text === text ? { type: "idle", text: "" } : prev));
    }, 4000);
  }, []);

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.isActive).length,
      low: products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length,
      out: products.filter((p) => p.stockQuantity <= 0).length,
    }),
    [products],
  );

  const orderStats = useMemo(
    () => ({
      total: orders.length,
      new: orders.filter((o) => o.status === "new").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      fulfilled: orders.filter((o) => o.status === "fulfilled").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      revenue: orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + (o.subtotal || 0), 0),
    }),
    [orders],
  );

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search) ||
        p.slug.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search);
      const matchCat = categoryFilter === "All" || p.category === categoryFilter;
      const matchStock =
        stockFilter === "All" ||
        (stockFilter === "Visible" && p.isActive) ||
        (stockFilter === "Hidden" && !p.isActive) ||
        (stockFilter === "Featured" && p.featured) ||
        (stockFilter === "Low" && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold) ||
        (stockFilter === "Out" && p.stockQuantity <= 0);

      return matchSearch && matchCat && matchStock;
    });
  }, [categoryFilter, productSearch, products, stockFilter]);

  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      const matchFilter = orderFilter === "All" || o.status === orderFilter;
      const matchSearch =
        !search ||
        o.customerName.toLowerCase().includes(search) ||
        o.contact.toLowerCase().includes(search) ||
        o.address.toLowerCase().includes(search) ||
        o.items.some((i) => i.name.toLowerCase().includes(search));
      return matchFilter && matchSearch;
    });
  }, [orderFilter, orderSearch, orders]);

  const refreshProducts = useCallback(async () => {
    try {
      const loadedProducts = await getAdminProducts();
      if (loadedProducts.length > 0) {
        setProducts(loadedProducts);
      } else {
        setProducts(seedProducts);
      }
    } catch (error) {
      setProducts(seedProducts);
      showToast(
        "error",
        error instanceof Error ? error.message : "Loaded local catalog fallback.",
      );
    }
  }, [showToast]);

  async function handleSyncSeedCatalog() {
    if (!window.confirm("Sync all current catalog products & visibility settings to Firestore?")) return;
    setIsSyncingSeed(true);
    try {
      const listToSync = products.length > 0 ? products : seedProducts;
      await saveProductsBatch(listToSync);
      for (const item of listToSync) {
        await saveProduct(item);
      }
      await refreshProducts();
      showToast("success", `Synced ${listToSync.length} products to live store!`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to sync catalog.");
    } finally {
      setIsSyncingSeed(false);
    }
  }

  async function handleBulkVisibility(makeActive: boolean) {
    const targets = filteredProducts.filter((p) => p.isActive !== makeActive);
    if (targets.length === 0) {
      showToast("success", `All listed products are already ${makeActive ? "visible" : "hidden"}.`);
      return;
    }
    const updatedList = targets.map((p) => ({ ...p, isActive: makeActive }));
    const targetIds = new Set(targets.map((p) => p.id));
    setProducts((prev) =>
      prev.map((p) => (targetIds.has(p.id) ? { ...p, isActive: makeActive } : p)),
    );
    try {
      await saveProductsBatch(updatedList);
      showToast(
        "success",
        `${makeActive ? "Shown" : "Hidden"} ${updatedList.length} product(s) on the website homepage.`,
      );
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to update visibility.");
    }
  }

  const refreshOrders = useCallback(async () => {
    try {
      const loadedOrders = await getAdminOrders();
      setOrders(loadedOrders);
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Could not load orders. Check permissions.",
      );
    }
  }, [showToast]);

  const refreshAdminData = useCallback(async () => {
    await Promise.all([refreshProducts(), refreshOrders()]);
  }, [refreshOrders, refreshProducts]);

  const refreshAdminState = useCallback(async (currentUser: User) => {
    try {
      const token = await getIdTokenResult(currentUser, true);
      if (token.claims.admin === true) {
        setAdminState("claim");
        return;
      }
      if (ADMIN_UIDS.includes(currentUser.uid)) {
        setAdminState("document");
        return;
      }
      if (db) {
        const adminDoc = await getDoc(doc(db, "admins", currentUser.uid));
        setAdminState(adminDoc.exists() ? "document" : "unknown");
        return;
      }
      setAdminState("unknown");
    } catch {
      setAdminState("unknown");
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      showToast("error", "Firebase Auth is not configured.");
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        refreshAdminState(nextUser);
      } else {
        setAdminState("checking");
      }
      setIsLoading(false);
    });
  }, [refreshAdminState, showToast]);

  useEffect(() => {
    if (!user || !hasAdminAccess) return;
    refreshAdminData();
  }, [hasAdminAccess, refreshAdminData, user]);

  async function handleAdminSignOut() {
    try {
      await fetch("/api/admin-gate", { method: "DELETE" });
    } catch {}
    if (auth) {
      await signOut(auth);
    }
    window.location.href = "/";
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;

    const now = Date.now();
    if (loginLockedUntil > now) {
      const waitSec = Math.ceil((loginLockedUntil - now) / 1000);
      showToast("error", `Too many failed attempts. Please wait ${waitSec}s before trying again.`);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
      setFailedLoginCount(0);
      setLoginLockedUntil(0);
      showToast("success", "Signed in successfully.");
    } catch {
      const nextCount = failedLoginCount + 1;
      setFailedLoginCount(nextCount);
      if (nextCount >= 5) {
        setLoginLockedUntil(Date.now() + 60_000);
        showToast("error", "Too many failed sign-in attempts. Locked for 60 seconds.");
      } else {
        showToast("error", "Invalid email or password.");
      }
    }
  }

  // --- Product Editing & Quick Add helpers ---

  function applyPreset(category: ProductCategory) {
    const preset = CATEGORY_PRESETS[category];
    if (!preset) return;

    setEditingProduct((prev) => ({
      ...prev,
      category,
      image: preset.initials,
      price: prev.price > 0 ? prev.price : preset.defaultPrice,
      stockQuantity: prev.stockQuantity > 0 ? prev.stockQuantity : preset.stock,
      lowStockThreshold: preset.lowAlert,
      description: prev.description || preset.defaultDescription,
      specs: prev.specs.length > 0 ? prev.specs : preset.defaultSpecs,
    }));

    if (specText.trim() === "") {
      setSpecText(preset.defaultSpecs.join("\n"));
    }
  }

  function startNewProduct(category: ProductCategory = "IEMs") {
    const preset = CATEGORY_PRESETS[category];
    setEditingProduct({
      ...blankProduct,
      category,
      image: preset.initials,
      price: preset.defaultPrice,
      stockQuantity: preset.stock,
      lowStockThreshold: preset.lowAlert,
      description: preset.defaultDescription,
      specs: preset.defaultSpecs,
    });
    setSpecText(preset.defaultSpecs.join("\n"));
    setUrlDraft("");
    setActiveTab("quick-add");
  }

  function cloneProduct(product: Product) {
    const copyName = `${product.name} (Copy)`;
    const copySlug = slugify(`${product.slug}-copy-${Date.now().toString().slice(-4)}`);
    setEditingProduct({
      ...product,
      id: copySlug,
      slug: copySlug,
      name: copyName,
      stockQuantity: Math.max(1, product.stockQuantity),
      featured: false,
    });
    setSpecText(product.specs.join("\n"));
    setUrlDraft("");
    setActiveTab("quick-add");
    showToast("success", `Cloned "${product.name}". Edit details and click Save.`);
  }

  function selectForEdit(product: Product) {
    setEditingProduct(product);
    setSpecText(product.specs.join("\n"));
    setUrlDraft("");
    setActiveTab("quick-add");
  }

  function updateField<K extends keyof Product>(field: K, value: Product[K]) {
    setEditingProduct((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && (!current.id || current.id === current.slug)) {
        next.slug = slugify(String(value));
        next.id = next.slug;
      }
      return next;
    });
  }

  // --- Image Handling ---

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await compressImageFile(file);
        newUrls.push(dataUrl);
      }

      if (newUrls.length > 0) {
        setEditingProduct((prev) => {
          const combined = Array.from(new Set([...prev.imageUrls, ...newUrls])).slice(0, 8);
          return {
            ...prev,
            imageUrl: prev.imageUrl || combined[0] || "",
            imageUrls: combined,
          };
        });
        showToast("success", `Added ${newUrls.length} image(s).`);
      }
    } catch {
      showToast("error", "Error processing image file.");
    }
  }

  function addUrlImage() {
    const normalized = normalizeImagePath(urlDraft);
    if (!normalized) return;

    setEditingProduct((prev) => {
      const combined = Array.from(new Set([...prev.imageUrls, normalized])).slice(0, 8);
      return {
        ...prev,
        imageUrl: prev.imageUrl || normalized,
        imageUrls: combined,
      };
    });

    setUrlDraft("");
    showToast("success", "Image URL added.");
  }

  function setMainImage(url: string) {
    setEditingProduct((prev) => {
      const filtered = prev.imageUrls.filter((u) => u !== url);
      return {
        ...prev,
        imageUrl: url,
        imageUrls: [url, ...filtered],
      };
    });
  }

  function removeImage(url: string) {
    setEditingProduct((prev) => {
      const nextUrls = prev.imageUrls.filter((u) => u !== url);
      return {
        ...prev,
        imageUrl: prev.imageUrl === url ? nextUrls[0] || "" : prev.imageUrl,
        imageUrls: nextUrls,
      };
    });
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  }

  // --- Save & Delete ---

  async function handleSaveProduct(e?: FormEvent) {
    if (e) e.preventDefault();
    const productId = editingProduct.id || slugify(editingProduct.slug || editingProduct.name);

    if (!productId || !editingProduct.name.trim()) {
      showToast("error", "Product name and slug are required.");
      return;
    }

    try {
      setIsSaving(true);
      const parsedSpecs = specText.split("\n").map((s) => s.trim()).filter(Boolean);
      const finalImage = editingProduct.imageUrl || editingProduct.imageUrls[0] || "";
      const finalUrls = editingProduct.imageUrls.length > 0 ? editingProduct.imageUrls : finalImage ? [finalImage] : [];

      const payload: Product = {
        ...editingProduct,
        id: productId,
        slug: productId,
        price: Math.max(0, Number(editingProduct.price)),
        stockQuantity: Math.max(0, Math.trunc(editingProduct.stockQuantity)),
        lowStockThreshold: Math.max(0, Math.trunc(editingProduct.lowStockThreshold || 3)),
        inStock: editingProduct.stockQuantity > 0,
        imageUrl: finalImage,
        imageUrls: finalUrls,
        specs: parsedSpecs,
      };

      await saveProduct(payload);
      await refreshProducts();
      setIsSaving(false);
      showToast("success", `Saved "${payload.name}" successfully.`);
      setActiveTab("catalog");
    } catch (error) {
      setIsSaving(false);
      showToast("error", error instanceof Error ? error.message : "Could not save product.");
    }
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    if (!window.confirm(`Delete "${productName}"? This cannot be undone.`)) return;

    try {
      await deleteProduct(productId);
      await refreshProducts();
      showToast("success", `Deleted "${productName}".`);
      if (editingProduct.id === productId) {
        startNewProduct();
      }
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Could not delete product.");
    }
  }

  // In-table quick updates
  async function toggleActive(product: Product) {
    const nextActive = !product.isActive;
    const updated: Product = { ...product, isActive: nextActive };
    // Optimistically update state so UI responds immediately
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? updated : p)),
    );
    if (editingProduct.id === product.id) {
      setEditingProduct((prev) => ({ ...prev, isActive: nextActive }));
    }
    try {
      await saveProduct(updated);
      showToast(
        "success",
        `"${product.name}" is now ${nextActive ? "VISIBLE on the website" : "HIDDEN from the website"}.`,
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Saved locally, but cloud sync encountered an error.",
      );
    }
  }

  async function toggleFeatured(product: Product) {
    const nextFeatured = !product.featured;
    const updated: Product = { ...product, featured: nextFeatured };
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? updated : p)),
    );
    if (editingProduct.id === product.id) {
      setEditingProduct((prev) => ({ ...prev, featured: nextFeatured }));
    }
    try {
      await saveProduct(updated);
      showToast(
        "success",
        `"${product.name}" ${nextFeatured ? "added to Best Sellers (Featured)" : "set to Normal (removed from Best Sellers)"}.`,
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Saved locally, but cloud sync encountered an error.",
      );
    }
  }

  async function adjustStock(product: Product, delta: number) {
    const nextStock = Math.max(0, product.stockQuantity + delta);
    try {
      await saveProduct({
        ...product,
        stockQuantity: nextStock,
        inStock: nextStock > 0,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, stockQuantity: nextStock, inStock: nextStock > 0 } : p,
        ),
      );
    } catch {
      showToast("error", "Failed to update stock.");
    }
  }

  // --- Orders helpers ---

  async function handleOrderStatus(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      showToast("success", `Order status updated to ${status}.`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Could not update order.");
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!window.confirm("Delete this order? This cannot be undone.")) return;
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast("success", "Order deleted.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Could not delete order.");
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast("success", `${label} copied to clipboard.`);
  }

  // --- Bulk Import & Export ---

  function sanitizeCsvCell(value: string): string {
    const clean = value.replace(/"/g, '""');
    const trimmed = clean.trimStart();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `"'${clean}"`;
    }
    return `"${clean}"`;
  }

  function parseBulkContent(text: string) {
    if (text.length > 500_000) {
      showToast("error", "Bulk input exceeds maximum size of 500 KB.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      setBulkParsed([]);
      return;
    }

    // Try parsing as JSON first
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const raw = JSON.parse(trimmed);
        if (Array.isArray(raw)) {
          const items: Product[] = raw.slice(0, 200).map((item, idx) => {
            const name = String(item.name || `Item ${idx + 1}`).trim().slice(0, 160);
            const slug = slugify(item.slug || name).slice(0, 100);
            const category: ProductCategory = PRODUCT_CATEGORIES.includes(item.category)
              ? item.category
              : "IEMs";
            const price = Math.max(0, Math.round(Number(item.price) || 0));
            const stock = Math.max(0, Math.trunc(Number(item.stockQuantity) || 15));
            const img = normalizeImagePath(String(item.imageUrl || item.imageUrls?.[0] || ""));
            const safeUrls = Array.isArray(item.imageUrls)
              ? item.imageUrls.map((u: unknown) => normalizeImagePath(String(u))).filter(Boolean).slice(0, 8)
              : img
                ? [img]
                : [];
            return {
              id: slug,
              slug,
              name,
              category,
              price,
              image: String(item.image || "KZ").slice(0, 4).toUpperCase(),
              imageUrl: img,
              imageUrls: safeUrls,
              description: String(item.description || "").trim().slice(0, 2000),
              specs: Array.isArray(item.specs)
                ? item.specs.map((s: unknown) => String(s).trim().slice(0, 200)).filter(Boolean).slice(0, 8)
                : [],
              inStock: stock > 0,
              stockQuantity: stock,
              lowStockThreshold: Math.max(0, Math.trunc(Number(item.lowStockThreshold) || 3)),
              isActive: item.isActive !== false,
              featured: Boolean(item.featured),
            };
          });
          setBulkParsed(items);
          showToast("success", `Parsed ${items.length} product(s) from JSON.`);
          return;
        }
      } catch {
        // Fall through to CSV parser
      }
    }

    // Parse as CSV: Name, Category, Price, Stock, ImageUrl, Description, Specs
    const lines = trimmed.split(/\r?\n/).filter(Boolean).slice(0, 201);
    const parsed: Product[] = [];

    // Check if line 0 is a header
    const startIndex = lines[0]?.toLowerCase().includes("name") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted CSV fields
      const matches = line.match(/(".*?"|[^",\t]+)(?=\s*[,\\t]|\s*$)/g) || line.split(",");
      const cleanCols = matches.map((m) => m.replace(/^"(.*)"$/, "$1").trim());

      const name = (cleanCols[0] || `Imported Product ${i}`).slice(0, 160);
      const catInput = cleanCols[1] || "IEMs";
      const category: ProductCategory = PRODUCT_CATEGORIES.includes(catInput as ProductCategory)
        ? (catInput as ProductCategory)
        : "IEMs";
      const price = Math.max(0, Math.round(Number(cleanCols[2]) || 500));
      const stock = Math.max(0, Math.trunc(Number(cleanCols[3]) || 15));
      const imgUrl = normalizeImagePath(cleanCols[4] || "");
      const desc = (cleanCols[5] || `High-performance ${name} audio equipment.`).slice(0, 2000);
      const rawSpecs = cleanCols[6]
        ? cleanCols[6].split(";").map((s) => s.trim().slice(0, 200)).filter(Boolean).slice(0, 8)
        : [];

      const slug = slugify(name).slice(0, 100);
      parsed.push({
        id: slug,
        slug,
        name,
        category,
        price,
        image: category.slice(0, 2).toUpperCase(),
        imageUrl: imgUrl,
        imageUrls: imgUrl ? [imgUrl] : [],
        description: desc,
        specs: rawSpecs.length > 0 ? rawSpecs : CATEGORY_PRESETS[category].defaultSpecs,
        inStock: stock > 0,
        stockQuantity: stock,
        lowStockThreshold: 3,
        isActive: true,
        featured: false,
      });
    }

    setBulkParsed(parsed);
    if (parsed.length > 0) {
      showToast("success", `Parsed ${parsed.length} product(s) from CSV.`);
    } else {
      showToast("error", "No valid products found in pasted text.");
    }
  }

  function handleBulkFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Bulk import file exceeds the 2 MB maximum size limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkText(text);
      parseBulkContent(text);
    };
    reader.readAsText(file);
  }

  async function executeBulkUpload() {
    if (bulkParsed.length === 0) {
      showToast("error", "No parsed products to upload.");
      return;
    }

    try {
      setIsBulkUploading(true);
      let count = 0;
      for (const prod of bulkParsed) {
        await saveProduct(prod);
        count++;
      }
      await refreshProducts();
      setIsBulkUploading(false);
      setBulkParsed([]);
      setBulkText("");
      showToast("success", `Successfully uploaded ${count} products to Firestore!`);
      setActiveTab("catalog");
    } catch (error) {
      setIsBulkUploading(false);
      showToast("error", error instanceof Error ? error.message : "Error during bulk upload.");
    }
  }

  function downloadCsvTemplate() {
    const header = "Name,Category,Price,Stock,ImageUrl,Description,Specs";
    const sampleRows = [
      '"KZ Castor Pro","IEMs",850,15,"https://example.com/castor.jpg","Dual dynamic driver monitor with tuning switches","Dual dynamic drivers; 4 tuning switches; 0.75mm 2-pin"',
      '"KZ AZ15 Wireless Hooks","Wireless",1450,10,"https://example.com/az15.jpg","Qualcomm aptX Adaptive Bluetooth earhooks","Bluetooth 5.2; aptX Adaptive; 30h battery"',
      '"KZ 8-Core Silver Cable","Cables",450,20,"https://example.com/cable.jpg","High-purity silver-plated braided replacement cable","8-core silver-plated; 3.5mm plug; 0.75mm 2-pin"',
    ];
    const csvContent = [header, ...sampleRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "products_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "Downloaded sample CSV template.");
  }

  function exportCatalogCsv() {
    const header = "Name,Category,Price,Stock,ImageUrl,Description,Specs";
    const rows = products.map((p) => {
      const cleanName = sanitizeCsvCell(p.name);
      const cleanDesc = sanitizeCsvCell(p.description);
      const cleanSpecs = sanitizeCsvCell(p.specs.join("; "));
      const cleanImg = sanitizeCsvCell(p.imageUrl || "");
      return [cleanName, p.category, p.price, p.stockQuantity, cleanImg, cleanDesc, cleanSpecs].join(
        ",",
      );
    });
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `catalog_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", `Exported ${products.length} products to CSV.`);
  }

  function exportCatalogJson() {
    const jsonStr = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `catalog_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", `Exported ${products.length} products to JSON.`);
  }

  // --- Auth Guards ---

  if (isLoading) {
    return <main className="admin-shell">Loading admin...</main>;
  }

  if (!user) {
    return (
      <main className="admin-login">
        <section className="admin-login-panel">
          <p className="category-label">Noovyx Admin</p>
          <h1>Noovyx Command Center</h1>
          <form className="admin-form" noValidate onSubmit={handleLogin}>
            <label>
              Email
              <input
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="primary-button wide" type="submit">
              Sign In
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (adminState === "checking") {
    return <main className="admin-shell">Verifying administrator privileges...</main>;
  }

  if (!hasAdminAccess) {
    return (
      <main className="admin-login">
        <section className="admin-login-panel">
          <p className="category-label">403 // Access Denied</p>
          <h1>Insufficient Privileges</h1>
          <p className="table-muted" style={{ marginBottom: "16px" }}>
            Signed in as <strong>{user.email}</strong>, but this account does not have administrator privileges.
          </p>
          <button
            className="primary-button wide"
            type="button"
            onClick={handleAdminSignOut}
          >
            Sign Out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      {/* Toast Notification */}
      {toast.type !== "idle" && (
        <aside className={`admin-toast ${toast.type}`} role="status" aria-live="polite">
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.text}</span>
        </aside>
      )}

      {/* Header */}
      <header className="admin-header">
        <div>
          <p className="category-label">Noovyx Admin</p>
          <h1>Noovyx Storefront CMS, Product & Order Control Center</h1>
          <span>{user.email}</span>
          <span className="table-muted">
            Access:{" "}
            {adminState === "claim"
              ? "Verified Admin (Custom Claim)"
              : "Verified Admin (Database Document)"}
          </span>
        </div>
        <div className="admin-header-actions">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="ghost-button"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            🌐 View Live Homepage ↗
          </a>
          <button
            className="ghost-button"
            type="button"
            onClick={() => startNewProduct("IEMs")}
          >
            + Quick Add Product
          </button>
          <button className="ghost-button" type="button" onClick={refreshAdminData}>
            Refresh Data
          </button>
          <button className="primary-button" type="button" onClick={handleAdminSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs" aria-label="Admin panels">
        <button
          className={`admin-nav-tab ${activeTab === "homepage" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("homepage")}
        >
          🎛️ Homepage Builder & CMS
        </button>
        <button
          className={`admin-nav-tab ${activeTab === "catalog" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("catalog")}
        >
          📦 Catalog Inventory <span className="tab-badge">{stats.total}</span>
        </button>
        <button
          className={`admin-nav-tab ${activeTab === "quick-add" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("quick-add")}
        >
          ⚡ {editingProduct.id ? "Edit Product" : "Quick Add Product"}
        </button>
        <button
          className={`admin-nav-tab ${activeTab === "bulk" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("bulk")}
        >
          🚀 Bulk Upload & CSV
        </button>
        <button
          className={`admin-nav-tab ${activeTab === "orders" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("orders")}
        >
          📋 Orders <span className="tab-badge">{orderStats.new > 0 ? `${orderStats.new} new` : orderStats.total}</span>
        </button>
      </nav>

      {/* Stats Ribbon */}
      <section className="admin-stats">
        {activeTab === "orders" ? (
          <>
            <div>
              <span>Total Orders</span>
              <strong>{orderStats.total}</strong>
            </div>
            <div>
              <span>New</span>
              <strong>{orderStats.new}</strong>
            </div>
            <div>
              <span>Confirmed</span>
              <strong>{orderStats.confirmed}</strong>
            </div>
            <div>
              <span>Fulfilled Revenue</span>
              <strong>{formatCurrency(orderStats.revenue)}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>Total Products</span>
              <strong>{stats.total}</strong>
            </div>
            <div>
              <span>Active</span>
              <strong>{stats.active}</strong>
            </div>
            <div>
              <span>Low Stock</span>
              <strong>{stats.low}</strong>
            </div>
            <div>
              <span>Out of Stock</span>
              <strong>{stats.out}</strong>
            </div>
          </>
        )}
      </section>

      {/* TAB 1: CATALOG INVENTORY */}
      {activeTab === "catalog" && (
        <section className="admin-table-wrap">
          <div className="admin-toolbar">
            <label>
              Search Catalog
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search name, category, or slug..."
              />
            </label>
            <label>
              Category
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              >
                <option value="All">All Categories</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Visibility &amp; Stock Filter
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              >
                <option value="All">All Products ({products.length})</option>
                <option value="Visible">👁️ Visible on Website ({stats.active})</option>
                <option value="Hidden">🚫 Hidden from Website ({products.length - stats.active})</option>
                <option value="Featured">★ Featured (Best Sellers)</option>
                <option value="Low">Low Stock Alerts</option>
                <option value="Out">Out of Stock</option>
              </select>
            </label>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", flexWrap: "wrap" }}>
              <button
                className="ghost-button"
                type="button"
                onClick={() => handleBulkVisibility(true)}
                title="Show all currently filtered products on the website"
              >
                👁️ Show Filtered
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => handleBulkVisibility(false)}
                title="Hide all currently filtered products from the website"
                style={{ color: "#f87171" }}
              >
                🚫 Hide Filtered
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={isSyncingSeed}
                onClick={handleSyncSeedCatalog}
                title="Push all catalog products and visibility settings to Firestore"
              >
                {isSyncingSeed ? "Syncing..." : "☁️ Sync Catalog to DB"}
              </button>
            </div>
          </div>

          {/* Quick Visibility Filter Pills */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              padding: "0 16px 14px 16px",
              alignItems: "center",
            }}
          >
            {(
              [
                { id: "All", label: `All Products (${products.length})` },
                { id: "Visible", label: `👁️ Visible on Website (${stats.active})` },
                { id: "Hidden", label: `🚫 Hidden from Website (${products.length - stats.active})` },
                { id: "Featured", label: `★ In Best Sellers (${products.filter((p) => p.featured).length})` },
              ] as const
            ).map((pill) => {
              const active = stockFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStockFilter(pill.id)}
                  style={{
                    padding: "6px 13px",
                    borderRadius: "999px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: active ? "var(--cyan)" : "rgba(15, 23, 42, 0.75)",
                    color: active ? "#020617" : "#cbd5e1",
                    border: active ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Website Visibility</th>
                <th>Best Sellers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    style={{
                      opacity: product.isActive ? 1 : 0.58,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    <td>
                      <div className="table-product-row">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="table-product-thumb" src={product.imageUrl} />
                        ) : (
                          <span className="table-product-avatar">{product.image}</span>
                        )}
                        <div className="table-product-info">
                          <strong className="table-product-name">{product.name}</strong>
                          <span className="table-product-slug">{product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>
                      <div className="table-stock-stepper">
                        <button
                          type="button"
                          onClick={() => adjustStock(product, -1)}
                          title="Reduce stock by 1"
                        >
                          -
                        </button>
                        <span className={`stock-chip ${stockLabel(product).toLowerCase()}`}>
                          {product.stockQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustStock(product, 1)}
                          title="Increase stock by 1"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      <button
                        className={`table-quick-toggle ${product.isActive ? "is-active" : ""}`}
                        type="button"
                        onClick={() => toggleActive(product)}
                        title={product.isActive ? "Click to HIDE this product from the website" : "Click to SHOW this product on the website"}
                        style={{
                          borderColor: product.isActive ? "rgba(16, 185, 129, 0.5)" : "rgba(248, 113, 113, 0.45)",
                          color: product.isActive ? "#34d399" : "#f87171",
                          background: product.isActive ? "rgba(16, 185, 129, 0.12)" : "rgba(248, 113, 113, 0.12)",
                          fontWeight: 700,
                        }}
                      >
                        {product.isActive ? "👁️ Visible" : "🚫 Hidden"}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`table-quick-toggle ${product.featured ? "is-featured" : ""}`}
                        type="button"
                        onClick={() => toggleFeatured(product)}
                        title={product.featured ? "Click to remove from Best Sellers (set to Normal)" : "Click to feature in Best Sellers"}
                      >
                        {product.featured ? "★ Featured" : "☆ Normal"}
                      </button>
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          className="table-clone-btn"
                          type="button"
                          onClick={() => toggleActive(product)}
                          title={product.isActive ? "Hide product from website" : "Show product on website"}
                          style={{
                            color: product.isActive ? "#fbbf24" : "#34d399",
                            borderColor: product.isActive ? "rgba(251, 191, 36, 0.35)" : "rgba(52, 211, 153, 0.35)",
                          }}
                        >
                          {product.isActive ? "Hide" : "Show"}
                        </button>
                        <button
                          className="table-edit-btn"
                          type="button"
                          onClick={() => selectForEdit(product)}
                          title="Edit product details"
                        >
                          ✏ Edit
                        </button>
                        <button
                          className="table-clone-btn"
                          type="button"
                          onClick={() => cloneProduct(product)}
                          title="Clone as new product"
                        >
                          Clone
                        </button>
                        <button
                          className="table-delete-btn"
                          type="button"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          title="Delete product"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <span className="table-muted">No products match these filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* TAB 2: QUICK ADD & SMART FORM */}
      {activeTab === "quick-add" && (
        <section className="quick-add-grid">
          <div className="admin-card">
            <div className="editor-heading" style={{ marginBottom: "18px" }}>
              <div>
                <p className="category-label">Product Creator</p>
                <h2>{editingProduct.id ? `Edit: ${editingProduct.name}` : "Fast Product Creator"}</h2>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => startNewProduct("IEMs")}
              >
                Reset to Blank
              </button>
            </div>

            {/* Smart Category Presets */}
            <p className="field-help" style={{ marginBottom: "8px" }}>
              Select a category to pre-fill smart audio specs and attributes:
            </p>
            <div className="preset-selector">
              {PRODUCT_CATEGORIES.map((cat) => {
                const preset = CATEGORY_PRESETS[cat];
                return (
                  <button
                    key={cat}
                    className={`preset-chip ${editingProduct.category === cat ? "active" : ""}`}
                    type="button"
                    onClick={() => applyPreset(cat)}
                  >
                    <span className="preset-icon">{preset.icon}</span>
                    <span className="preset-title">{preset.label}</span>
                    <span className="preset-sub">~{formatCurrency(preset.defaultPrice)}</span>
                  </button>
                );
              })}
            </div>

            <form className="admin-form" noValidate onSubmit={handleSaveProduct}>
              {/* Product Core Info */}
              <div className="form-row">
                <label style={{ gridColumn: "span 2" }}>
                  Product Name
                  <input
                    value={editingProduct.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. KZ Castor Pro"
                    required
                  />
                </label>
                <label>
                  Price in EGP
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => updateField("price", Number(e.target.value))}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Category
                  <select
                    value={editingProduct.category}
                    onChange={(e) => applyPreset(e.target.value as ProductCategory)}
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Stock Quantity
                  <input
                    min="0"
                    type="number"
                    value={editingProduct.stockQuantity}
                    onChange={(e) => updateField("stockQuantity", Number(e.target.value))}
                    required
                  />
                </label>
                <label>
                  Low Stock Alert
                  <input
                    min="0"
                    type="number"
                    value={editingProduct.lowStockThreshold}
                    onChange={(e) => updateField("lowStockThreshold", Number(e.target.value))}
                    required
                  />
                </label>
              </div>

              {/* Simplified Image Uploader / Dropzone */}
              <div>
                <label style={{ marginBottom: "8px" }}>Product Images</label>
                <div
                  className={`image-dropzone ${isDragging ? "drag-active" : ""}`}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="dropzone-icon">📷</span>
                  <span className="dropzone-title">Drop image files here, or click to browse</span>
                  <span className="dropzone-sub">
                    Accepts PNG, JPG, WEBP. Local images are automatically compressed.
                  </span>
                  <input
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    type="file"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                </div>

                {/* Paste URL Option */}
                <div className="image-url-row">
                  <input
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    placeholder="Or paste an image URL (https://...)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addUrlImage();
                      }
                    }}
                  />
                  <button className="ghost-button" type="button" onClick={addUrlImage}>
                    Add URL
                  </button>
                </div>

                {/* Visual Image Cards */}
                {editingProduct.imageUrls.length > 0 && (
                  <div className="images-preview-strip">
                    {editingProduct.imageUrls.map((url, idx) => {
                      const isMain = url === editingProduct.imageUrl || (idx === 0 && !editingProduct.imageUrl);
                      return (
                        <div key={url} className={`image-preview-card ${isMain ? "is-main" : ""}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt="" src={url} />
                          {isMain && <span className="badge-main">Main</span>}
                          <div className="preview-actions">
                            {!isMain && (
                              <button
                                className="ghost-button"
                                type="button"
                                onClick={() => setMainImage(url)}
                              >
                                Set Main
                              </button>
                            )}
                            <button
                              className="text-button"
                              style={{ color: "#fca5a5" }}
                              type="button"
                              onClick={() => removeImage(url)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Description & Specs */}
              <label>
                Description (Simple & Sharp)
                <textarea
                  className="resize-none"
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="One concise line describing acoustic performance..."
                  required
                />
              </label>

              <label>
                Specs (One bullet per line)
                <textarea
                  className="resize-none"
                  rows={3}
                  value={specText}
                  onChange={(e) => {
                    setSpecText(e.target.value);
                    updateField(
                      "specs",
                      e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    );
                  }}
                  placeholder={"Dual dynamic drivers\n4 tuning switches\n0.75mm 2-pin"}
                />
              </label>

              <div className="toggle-row">
                <label>
                  <input
                    checked={editingProduct.isActive}
                    type="checkbox"
                    onChange={(e) => updateField("isActive", e.target.checked)}
                  />
                  Active on Storefront
                </label>
                <label>
                  <input
                    checked={editingProduct.featured}
                    type="checkbox"
                    onChange={(e) => updateField("featured", e.target.checked)}
                  />
                  Featured in Hero Showcase
                </label>
              </div>

              <button className="primary-button wide" disabled={isSaving} type="submit">
                {isSaving ? "Saving to Store..." : editingProduct.id ? "Update Product" : "Save Product to Store"}
              </button>
            </form>
          </div>

          {/* Realtime Live Store Preview Card */}
          <aside className="live-mockup-card">
            <span className="live-mockup-badge">✦ Live Store Preview</span>
            <div className="mockup-image-frame">
              {editingProduct.imageUrl || editingProduct.imageUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={editingProduct.name}
                  src={editingProduct.imageUrl || editingProduct.imageUrls[0]}
                />
              ) : (
                <span>{editingProduct.image || "KZ"}</span>
              )}
            </div>
            <div className="mockup-details">
              <span className="category-label">{editingProduct.category}</span>
              <h3>{editingProduct.name || "Product Name"}</h3>
              <span className="mockup-price">{formatCurrency(editingProduct.price || 0)}</span>
              <p>{editingProduct.description || "Product description preview will appear here."}</p>
            </div>
            <span className={`stock-chip ${stockLabel(editingProduct).toLowerCase()}`}>
              {stockLabel(editingProduct)}: {editingProduct.stockQuantity} in stock
            </span>
          </aside>
        </section>
      )}

      {/* TAB 3: BULK IMPORT & EXPORT */}
      {activeTab === "bulk" && (
        <section className="admin-card bulk-panel">
          <div className="bulk-actions-bar">
            <div>
              <h2>Bulk Upload & Catalog Tools</h2>
              <p className="field-help">
                Quickly add 10, 20, or 50 products at once using CSV or JSON.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="bulk-template-btn"
                type="button"
                onClick={downloadCsvTemplate}
              >
                ⬇ Download CSV Template
              </button>
              <button className="ghost-button" type="button" onClick={exportCatalogCsv}>
                Export Catalog (CSV)
              </button>
              <button className="ghost-button" type="button" onClick={exportCatalogJson}>
                Export Catalog (JSON)
              </button>
            </div>
          </div>

          <div>
            <label style={{ marginBottom: "8px" }}>
              Option A: Upload a CSV or JSON file
            </label>
            <input
              ref={bulkFileRef}
              accept=".csv, .json, .txt"
              type="file"
              onChange={handleBulkFile}
            />
          </div>

          <div>
            <label style={{ marginBottom: "8px" }}>
              Option B: Paste CSV or JSON directly
            </label>
            <textarea
              className="resize-none"
              rows={6}
              value={bulkText}
              onChange={(e) => {
                setBulkText(e.target.value);
                parseBulkContent(e.target.value);
              }}
              placeholder={
                'Name, Category, Price, Stock, ImageUrl, Description, Specs\n"KZ Castor Pro","IEMs",850,15,"https://...","Dual dynamic driver IEM with tuning switches","Dual dynamic drivers; 0.75mm 2-pin"\n"KZ AZ15","Wireless",1450,10,"https://...","Wireless Bluetooth earhooks","aptX; 30h battery"'
              }
            />
          </div>

          {bulkParsed.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "12px 0",
                }}
              >
                <strong>Preview: {bulkParsed.length} product(s) detected</strong>
                <button
                  className="primary-button"
                  disabled={isBulkUploading}
                  type="button"
                  onClick={executeBulkUpload}
                >
                  {isBulkUploading
                    ? "Uploading batch..."
                    : `Upload All ${bulkParsed.length} Products`}
                </button>
              </div>

              <div className="bulk-preview-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkParsed.map((p, idx) => (
                      <tr key={`bulk-${idx}`}>
                        <td>
                          <strong>{p.name}</strong>
                          <span className="table-muted">{p.slug}</span>
                        </td>
                        <td>{p.category}</td>
                        <td>{formatCurrency(p.price)}</td>
                        <td>{p.stockQuantity}</td>
                        <td style={{ maxWidth: "260px" }}>{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: ORDERS MANAGEMENT */}
      {activeTab === "orders" && (
        <section className="admin-table-wrap">
          <div className="admin-toolbar" style={{ gridTemplateColumns: "1fr auto" }}>
            <label>
              Search Orders
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search customer, phone, address, or item..."
              />
            </label>
            <div className="order-filter-bar" style={{ margin: "0", alignSelf: "end" }}>
              {(["All", "new", "confirmed", "fulfilled", "cancelled"] as const).map((st) => (
                <button
                  key={st}
                  className={`order-filter-pill ${orderFilter === st ? "active" : ""}`}
                  type="button"
                  onClick={() => setOrderFilter(st)}
                >
                  {st.toUpperCase()}{" "}
                  {st !== "All" && (
                    <span>
                      ({orders.filter((o) => o.status === st).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <table className="admin-table orders-table">
            <thead>
              <tr>
                <th>Customer & Delivery</th>
                <th>Items Ordered</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.customerName}</strong>
                      <span className="table-muted">
                        📞 {order.contact}
                        <button
                          className="copy-mini-btn"
                          type="button"
                          onClick={() => copyToClipboard(order.contact, "Phone")}
                        >
                          Copy
                        </button>
                      </span>
                      <span className="table-muted">
                        📍 {order.address}
                        <button
                          className="copy-mini-btn"
                          type="button"
                          onClick={() => copyToClipboard(order.address, "Address")}
                        >
                          Copy
                        </button>
                      </span>
                      {order.notes && (
                        <span className="table-muted">📝 Note: {order.notes}</span>
                      )}
                    </td>
                    <td>
                      <ul className="order-items">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.productId}`}>
                            {item.quantity} × {item.name} ({formatCurrency(item.unitPrice)})
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <strong style={{ color: "var(--cyan)", fontSize: "1.05rem" }}>
                        {formatCurrency(order.subtotal)}
                      </strong>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={order.status}
                        onChange={(e) =>
                          handleOrderStatus(order.id, e.target.value as OrderStatus)
                        }
                      >
                        <option value="new">New</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      {order.createdAt
                        ? order.createdAt.toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent"}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <span className="table-muted">No orders match these criteria.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
      {/* TAB: FULL HOMEPAGE BUILDER & CMS */}
      {activeTab === "homepage" && (
        <AdminHomepageEditor
          config={cmsConfig}
          onChange={handleCmsConfigChange}
          onSave={(cfg) => handleSaveCmsConfig(cfg || cmsConfig)}
          isSaving={isSavingCms}
          products={products}
          onToggleProductFeatured={toggleFeatured}
          onToggleProductActive={toggleActive}
          onCompressImage={compressImageFile}
          showToast={showToast}
        />
      )}
    </main>
  );
}

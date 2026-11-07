import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { MenuTab } from "./app/components/SiteHeader";

export interface HeroSlideConfig {
  id: string;
  badge: string;
  tagline: string;
  title: string;
  desc: string;
  primaryCtaText: string;
  primaryCtaTarget: string;
  secondaryCtaText: string;
  secondaryCtaTarget: string;
  image: string;
  features: string[];
  targetCategory?: string;
}

export interface SoundStyleConfig {
  id: string;
  name: string;
  image: string;
  desc: string;
  tags: string[];
  matchKeywords: string[];
  matchCategories: string[];
  pinnedProductIds?: string[];
}

export interface ReviewItemConfig {
  id: string;
  author: string;
  city: string;
  date: string;
  product: string;
  rating: number;
  headline: string;
  text: string;
  verified: boolean;
}

export interface TrustItemConfig {
  id: string;
  title: string;
  desc: string;
}

export interface BlogArticleConfig {
  id: string;
  image: string;
  tag: string;
  title: string;
  excerpt: string;
  readMoreText: string;
}

export interface SupportStripItemConfig {
  id: string;
  num: string;
  title: string;
  desc: string;
}

export interface NavLinkConfig {
  id: MenuTab;
  label: string;
  visible: boolean;
}

export interface CatalogCategoryItemConfig {
  id: string;
  label: string;
  filterValue: string;
  visible: boolean;
}

export interface DrawerCategoryConfig {
  id: MenuTab;
  label: string;
  image: string;
  visible: boolean;
}

export interface StorefrontConfig {
  announcement: {
    enabled: boolean;
    intervalSeconds: number;
    messages: string[];
  };
  header: {
    brandMark: string;
    brandTitle: string;
    brandSub: string;
    searchPlaceholder: string;
    whatsappNumber: string;
    drawerTagline: string;
    navLinks: NavLinkConfig[];
    drawerCategories: DrawerCategoryConfig[];
  };
  hero: {
    enabled: boolean;
    autoPlay: boolean;
    intervalSeconds: number;
    topLeftTag: string;
    bottomRightTag: string;
    trustBadges: string[];
    slides: HeroSlideConfig[];
  };
  bestSellers: {
    enabled: boolean;
    kicker: string;
    title: string;
    subtitle: string;
    ctaText: string;
    maxItems: number;
  };
  soundFinder: {
    enabled: boolean;
    kicker: string;
    title: string;
    subtitle: string;
    styles: SoundStyleConfig[];
  };
  newReleases: {
    enabled: boolean;
    kicker: string;
    title: string;
    subtitle: string;
    ctaText: string;
    maxItems: number;
  };
  catalogSection: {
    enabled: boolean;
    kicker: string;
    title: string;
    subtitle: string;
    discountMultiplier: number;
    categories: CatalogCategoryItemConfig[];
  };
  reviews: {
    enabled: boolean;
    kicker: string;
    title: string;
    overallRating: string;
    overallSubtext: string;
    items: ReviewItemConfig[];
  };
  trust: {
    enabled: boolean;
    kicker: string;
    title: string;
    items: TrustItemConfig[];
  };
  blog: {
    enabled: boolean;
    kicker: string;
    title: string;
    subtitle: string;
    articles: BlogArticleConfig[];
  };
  supportStrip: {
    enabled: boolean;
    items: SupportStripItemConfig[];
  };
  finalCta: {
    enabled: boolean;
    kicker: string;
    title: string;
    buttonText: string;
  };
  footer: {
    brandMark: string;
    brandName: string;
    description: string;
    copyrightText: string;
    disclaimerText: string;
  };
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  announcement: {
    enabled: true,
    intervalSeconds: 4,
    messages: [
      "🎧 AUTHENTIC KZ & AUDIO GEAR — DIRECT TO YOUR DOOR",
      "🔥 NEW DROPS ADDED — SHOP THE LATEST IEM RELEASES",
      "⚡ CASH ON DELIVERY AVAILABLE ACROSS EGYPT",
      "🎮 GAMING AUDIO OPTIMIZED FOR COMPETITIVE PLAY",
      "🔊 VERIFIED KZ DRIVERS · CABLES · DACS · WIRELESS ADAPTERS",
    ],
  },
  header: {
    brandMark: "NX",
    brandTitle: "NOOVYX",
    brandSub: "PRO AUDIO // EGYPT",
    searchPlaceholder: "Search audio gear...",
    whatsappNumber: "201000000000",
    drawerTagline: "Authentic IEMs & Pro Audio Direct across Egypt. Cash On Delivery.",
    navLinks: [
      { id: "all", label: "All Gear", visible: true },
      { id: "iems", label: "KZ IEMs", visible: true },
      { id: "wireless", label: "Wireless", visible: true },
      { id: "cables", label: "Cables", visible: true },
      { id: "dacs", label: "Hi-Fi DACs", visible: true },
      { id: "accessories", label: "Accessories", visible: true },
    ],
    drawerCategories: [
      { id: "all", label: "All Products", image: "/products/kz-castor-bass.png", visible: true },
      { id: "iems", label: "KZ Earphones & IEMs", image: "/products/kz-zs10-pro-2.png", visible: true },
      { id: "wireless", label: "Bluetooth Adapters", image: "/products/kz-az09-wireless.png", visible: true },
      { id: "cables", label: "Upgrade Audio Cables", image: "/products/kz-t8-silver-cable.png", visible: true },
      { id: "gamers", label: "KZ For Gamers", image: "/products/kz-zsn-pro-x.png", visible: true },
      { id: "dacs", label: "Hi-Fi Portable DACs", image: "/products/kz-am02-dac.png", visible: true },
      { id: "accessories", label: "Ear Tips & Accessories", image: "/products/kz-ls01-tips.png", visible: true },
    ],
  },
  hero: {
    enabled: true,
    autoPlay: true,
    intervalSeconds: 6,
    topLeftTag: "HYBRID DRIVERS",
    bottomRightTag: "HI-RES AUDIO",
    trustBadges: [
      "🇪🇬 Local Fast Delivery Across Egypt",
      "💵 Cash On Delivery Available",
      "✓ Quality Inspected",
    ],
    slides: [
      {
        id: "castor",
        badge: "FLAGSHIP DUAL-DRIVER // 2026 DROP",
        tagline: "ACOUSTIC MASTERCLASS",
        title: "KZ CASTOR BASS EDITION",
        desc: "Dual dynamic drivers with 4-stage electronic switches. Engineered for sub-bass rumble, holographic separation, and competitive audio cues.",
        primaryCtaText: "SHOP CASTOR",
        primaryCtaTarget: "#catalog",
        secondaryCtaText: "EXPLORE SOUND",
        secondaryCtaTarget: "#sound-finder",
        image: "/products/kz-castor-bass.png",
        features: ["Dual Dynamic Drivers", "4 Tuning Switches", "Sub-Bass Profile", "0.75mm 2-Pin"],
        targetCategory: "IEMs",
      },
      {
        id: "zs10",
        badge: "10-DRIVER HYBRID ARSENAL",
        tagline: "PRO STAGE & GAMING",
        title: "KZ ZS10 PRO 2 HYBRID",
        desc: "1DD + 4BA hybrid architecture with 3-way electronic crossover. Hear footstep distance, weapon reloads, and micro-nuances before anyone else.",
        primaryCtaText: "EXPLORE IEMS",
        primaryCtaTarget: "#bestsellers",
        secondaryCtaText: "BROWSE CATALOG",
        secondaryCtaTarget: "#catalog",
        image: "/products/kz-zs10-pro-2.png",
        features: ["1DD + 4BA Architecture", "3-Way Crossover", "Stainless Faceplate", "32-Bit Clarity"],
        targetCategory: "IEMs",
      },
      {
        id: "wireless",
        badge: "TRUE WIRELESS FREEDOM",
        tagline: "CABLE-FREE PERFORMANCE",
        title: "KZ AZ09 BLUETOOTH ADAPTER",
        desc: "Convert your detachable KZ IEMs into low-latency true wireless earbuds with AAC/SBC transmission, gaming mode, and 6-hour battery life.",
        primaryCtaText: "SHOP WIRELESS",
        primaryCtaTarget: "#catalog",
        secondaryCtaText: "VIEW CATEGORIES",
        secondaryCtaTarget: "#catalog",
        image: "/products/kz-az09-wireless.png",
        features: ["Bluetooth 5.2", "Low Latency Game Mode", "AAC/SBC Codec", "Comfort Earhook"],
        targetCategory: "Wireless",
      },
    ],
  },
  bestSellers: {
    enabled: true,
    kicker: "COMMUNITY TESTED & VERIFIED",
    title: "Best Sellers",
    subtitle: "Battle-ready audio picks for detail, imaging, and impact across Egypt.",
    ctaText: "View All Gear",
    maxItems: 4,
  },
  soundFinder: {
    enabled: true,
    kicker: "PERSONALIZED SOUND PROFILES",
    title: "Find Your Ideal Earphones",
    subtitle: "Every driver configuration delivers a unique soundstage. Select a sound style to explore tuned audio gear.",
    styles: [
      {
        id: "gaming",
        name: "Competitive Gaming",
        image: "/styles/gamers.jpg",
        desc: "Positional 3D imaging, footstep separation, and explosive transient bass tuned for competitive gaming and esports.",
        tags: ["Positional Audio", "Footstep Imaging", "Low-Latency Game Mode"],
        matchCategories: ["IEMs", "DACs"],
        matchKeywords: ["castor", "zsn", "gale", "krila"],
      },
      {
        id: "studio",
        name: "Stage & Studio Monitoring",
        image: "/styles/singers.webp",
        desc: "Forward vocal clarity, multi-armature instrument separation, and transparent acoustic resolution for performers and mixing.",
        tags: ["Vocal Presence", "Balanced Armatures", "Stage Isolation"],
        matchCategories: ["IEMs"],
        matchKeywords: ["zs10", "pro", "as16", "pr3", "symphony"],
      },
      {
        id: "everyday",
        name: "Wireless & Everyday Listening",
        image: "/styles/sound-style.webp",
        desc: "Visceral sub-bass rumble, cable-free Bluetooth earhook convenience, and dual-driver tuning switches for versatile daily sound.",
        tags: ["Bluetooth Freedom", "Sub-Bass Punch", "Tuning Switches"],
        matchCategories: ["Wireless", "IEMs"],
        matchKeywords: ["az09", "carol", "an01", "xz10", "sora", "castor"],
      },
    ],
  },
  newReleases: {
    enabled: true,
    kicker: "FRESH DROPS 2026",
    title: "New Releases",
    subtitle: "The latest acoustic driver tunings and precision adapters straight from the factory.",
    ctaText: "Shop New IEMs",
    maxItems: 4,
  },
  catalogSection: {
    enabled: true,
    kicker: "Shop by Category",
    title: "Select Category & Audio Loadout",
    subtitle: "Filter our verified in-ear monitors, upgrade cables, DAC dongles, and wireless adapters.",
    discountMultiplier: 1.25,
    categories: [
      { id: "all", label: "All", filterValue: "All", visible: true },
      { id: "iems", label: "IEMs", filterValue: "IEMs", visible: true },
      { id: "wireless", label: "Wireless", filterValue: "Wireless", visible: true },
      { id: "cables", label: "Cables", filterValue: "Cables", visible: true },
      { id: "eartips", label: "Ear tips", filterValue: "Ear tips", visible: true },
      { id: "cases", label: "Cases", filterValue: "Cases", visible: true },
      { id: "dacs", label: "DACs", filterValue: "DACs", visible: true },
    ],
  },
  reviews: {
    enabled: true,
    kicker: "VERIFIED COMMUNITY FEEDBACK",
    title: "Let Customers Speak For Us",
    overallRating: "4.9 / 5.0 Rating",
    overallSubtext: "from verified listeners in Egypt",
    items: [
      {
        id: "r1",
        author: "Tarek Fathy",
        city: "Cairo, Egypt",
        date: "October 12, 2026",
        product: "KZ Castor Bass Edition",
        rating: 5,
        headline: "Unreal sub-bass texture and gaming clarity",
        text: "I play competitive CS2 and Valorant. The soundstage separation on the Castor with the sub-bass switches engaged lets you pinpoint footstep depth accurately. Fast COD delivery to Nasr City in 48 hours.",
        verified: true,
      },
      {
        id: "r2",
        author: "Mina Youssef",
        city: "Alexandria, Egypt",
        date: "October 09, 2026",
        product: "KZ ZS10 Pro 2 Hybrid",
        rating: 5,
        headline: "Stage monitoring performance at an honest price",
        text: "Used these on stage for our live band set last weekend. The 4 balanced armatures handle vocals and synth highs without harsh sibilance, and the seal blocked the stage monitors cleanly.",
        verified: true,
      },
      {
        id: "r3",
        author: "Ziad El-Shamy",
        city: "Giza, Egypt",
        date: "September 28, 2026",
        product: "KZ AZ09 Wireless Earhooks",
        rating: 5,
        headline: "Turned my favorite IEMs into wireless daily drivers",
        text: "Zero cable clutter during workouts and walking around. Connects instantly to my phone with low audio lag when watching videos. Very comfortable earhook loop.",
        verified: true,
      },
      {
        id: "r4",
        author: "Karim Mostafa",
        city: "Mansoura, Egypt",
        date: "September 19, 2026",
        product: "KZ AM02 Type-C DAC Dongle",
        rating: 5,
        headline: "Clean background with zero hiss",
        text: "Plugging this DAC into my phone removed all electronic noise floor. Driving the ZSN Pro X with punchier bass dynamics. The metal housing feels ultra durable.",
        verified: true,
      },
    ],
  },
  trust: {
    enabled: true,
    kicker: "Our commitment",
    title: "Why Shop With Us",
    items: [
      {
        id: "t1",
        title: "Authentic Products",
        desc: "Every product is sourced directly and verified before it reaches your door.",
      },
      {
        id: "t2",
        title: "Quality Checked",
        desc: "Drivers, cables, and connections inspected for acoustic purity before dispatch.",
      },
      {
        id: "t3",
        title: "Fast Dispatch",
        desc: "Inquiries confirmed promptly with door-to-door courier service across Egypt.",
      },
      {
        id: "t4",
        title: "Simple Order Process",
        desc: "No complicated checkout accounts. Submit your loadout request and pay on delivery.",
      },
      {
        id: "t5",
        title: "WhatsApp Assistance",
        desc: "Direct support for cable compatibility, driver sound advice, and tracking.",
      },
    ],
  },
  blog: {
    enabled: true,
    kicker: "Audio knowledge",
    title: "Guides & Resources",
    subtitle: "Learn before you buy. Real audio benchmarks, driver breakdowns, and setups.",
    articles: [
      {
        id: "b1",
        image: "/blog/blog-guitarists.png",
        tag: "IEM Guide",
        title: "Best KZ Earphones for Guitarists & Stage in 2026",
        excerpt: "Driver type, impedance, and acoustic isolation: the three essentials when choosing your first professional in-ear monitor.",
        readMoreText: "Read Guide →",
      },
      {
        id: "b2",
        image: "/blog/blog-producers.png",
        tag: "Studio & Mixing",
        title: "Best KZ In-Ear Monitors for Music Production and Mixing",
        excerpt: "Micro-detail separation, flat tuning, and why dedicated hybrid multi-driver IEMs beat conventional studio headphones for pinpoint stereo positioning.",
        readMoreText: "Read Guide →",
      },
      {
        id: "b3",
        image: "/blog/blog-live-stage.png",
        tag: "Live Monitoring",
        title: "Best Value KZ Earphones for Live Stage Monitoring",
        excerpt: "High acoustic pressure headroom, stage noise attenuation, and reliable sweat-resistant 2-pin cables for intense live sets.",
        readMoreText: "Read Guide →",
      },
    ],
  },
  supportStrip: {
    enabled: true,
    items: [
      {
        id: "s1",
        num: "01",
        title: "Confirmed orders",
        desc: "Every inquiry is checked before payment or delivery is arranged.",
      },
      {
        id: "s2",
        num: "02",
        title: "Loadout matching",
        desc: "Ask for cable, tip, and adapter compatibility in the order notes.",
      },
      {
        id: "s3",
        num: "03",
        title: "KZ-first arsenal",
        desc: "The store is focused around IEMs and portable audio essentials.",
      },
    ],
  },
  finalCta: {
    enabled: true,
    kicker: "Ready check",
    title: "Lock in your next audio loadout.",
    buttonText: "Open cart",
  },
  footer: {
    brandMark: "NX",
    brandName: "Noovyx",
    description: "Egypt's premium IEM and portable audio gear store. Authentic products, quality-checked, delivered cash on delivery.",
    copyrightText: "Noovyx Egypt (noovyx.com). All rights reserved.",
    disclaimerText: "Noovyx is an independent audio store offering authentic KZ and multi-brand Hi-Fi audio gear.",
  },
};

export const STORAGE_KEY = "noovyx_storefront_cms_config_v2";

const SAFE_RASTER_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Sanitizes navigation/CTA targets to block javascript:, data:, vbscript:, http://, and // open redirects.
 */
export function sanitizeUrl(value: unknown, fallback = "#catalog"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("#")) {
    return /^#[a-zA-Z0-9_-]*$/.test(trimmed) ? trimmed : fallback;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("..")) {
    return trimmed;
  }

  if (trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:") return parsed.toString();
    } catch {
      return fallback;
    }
  }

  return fallback;
}

/**
 * Sanitizes image sources to allow only safe relative paths, https:// URLs, or raster base64 data URLs.
 * Explicitly blocks javascript:, data:image/svg+xml, data:text/html, and insecure http:// mixed content.
 */
export function sanitizeImageSrc(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("..")) {
    return trimmed.replace(/["'()\\]/g, "");
  }

  if (trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:") return parsed.toString();
    } catch {
      return fallback;
    }
  }

  if (SAFE_RASTER_DATA_URL_RE.test(trimmed) && trimmed.length <= 750000) {
    return trimmed;
  }

  return fallback;
}

function stripProtoKeys<T extends Record<string, unknown>>(obj: T | null | undefined): Partial<T> {
  if (!obj || typeof obj !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    result[k] = v;
  }
  return result as Partial<T>;
}

export function mergeStorefrontConfig(raw: Record<string, unknown> | null | undefined): StorefrontConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_STOREFRONT_CONFIG;
  const r = stripProtoKeys(raw) as Partial<StorefrontConfig>;

  const rawDrawerCategories =
    Array.isArray(r.header?.drawerCategories) && r.header.drawerCategories.length > 0
      ? r.header.drawerCategories.slice(0, 12)
      : DEFAULT_STOREFRONT_CONFIG.header.drawerCategories;

  const rawSlides =
    Array.isArray(r.hero?.slides) && r.hero.slides.length > 0
      ? r.hero.slides.slice(0, 10)
      : DEFAULT_STOREFRONT_CONFIG.hero.slides;

  const rawStyles =
    Array.isArray(r.soundFinder?.styles) && r.soundFinder.styles.length > 0
      ? r.soundFinder.styles.slice(0, 8)
      : DEFAULT_STOREFRONT_CONFIG.soundFinder.styles;

  const rawArticles =
    Array.isArray(r.blog?.articles) && r.blog.articles.length > 0
      ? r.blog.articles.slice(0, 12)
      : DEFAULT_STOREFRONT_CONFIG.blog.articles;

  return {
    announcement: {
      ...DEFAULT_STOREFRONT_CONFIG.announcement,
      ...stripProtoKeys(r.announcement as Record<string, unknown>),
      messages:
        Array.isArray(r.announcement?.messages) && r.announcement.messages.length > 0
          ? r.announcement.messages.slice(0, 10).map((m) => String(m).slice(0, 200))
          : DEFAULT_STOREFRONT_CONFIG.announcement.messages,
    },
    header: {
      ...DEFAULT_STOREFRONT_CONFIG.header,
      ...stripProtoKeys(r.header as Record<string, unknown>),
      brandMark:
        !r.header?.brandMark || r.header.brandMark === "KZ"
          ? DEFAULT_STOREFRONT_CONFIG.header.brandMark
          : r.header.brandMark,
      brandTitle:
        !r.header?.brandTitle || r.header.brandTitle === "AUDIO STORE"
          ? DEFAULT_STOREFRONT_CONFIG.header.brandTitle
          : r.header.brandTitle,
      brandSub:
        !r.header?.brandSub || r.header.brandSub === "OFFICIAL ARSENAL // EGYPT"
          ? DEFAULT_STOREFRONT_CONFIG.header.brandSub
          : r.header.brandSub,
      drawerTagline:
        !r.header?.drawerTagline ||
        r.header.drawerTagline === "Authentic KZ Audio Direct across Egypt. Cash On Delivery."
          ? DEFAULT_STOREFRONT_CONFIG.header.drawerTagline
          : r.header.drawerTagline,
      navLinks:
        Array.isArray(r.header?.navLinks) && r.header.navLinks.length > 0
          ? r.header.navLinks.slice(0, 10)
          : DEFAULT_STOREFRONT_CONFIG.header.navLinks,
      drawerCategories: rawDrawerCategories.map((cat) => ({
        ...cat,
        image: sanitizeImageSrc(cat.image, "/products/kz-castor-bass.png"),
      })),
    },
    hero: {
      ...DEFAULT_STOREFRONT_CONFIG.hero,
      ...stripProtoKeys(r.hero as Record<string, unknown>),
      trustBadges:
        Array.isArray(r.hero?.trustBadges) && r.hero.trustBadges.length > 0
          ? r.hero.trustBadges.slice(0, 8).map((b) => String(b).slice(0, 120))
          : DEFAULT_STOREFRONT_CONFIG.hero.trustBadges,
      slides: rawSlides.map((slide) => ({
        ...slide,
        image: sanitizeImageSrc(slide.image, "/products/kz-castor-bass.png"),
        primaryCtaTarget: sanitizeUrl(slide.primaryCtaTarget, "#catalog"),
        secondaryCtaTarget: sanitizeUrl(slide.secondaryCtaTarget, "#catalog"),
      })),
    },
    bestSellers: {
      ...DEFAULT_STOREFRONT_CONFIG.bestSellers,
      ...stripProtoKeys(r.bestSellers as Record<string, unknown>),
    },
    soundFinder: {
      ...DEFAULT_STOREFRONT_CONFIG.soundFinder,
      ...stripProtoKeys(r.soundFinder as Record<string, unknown>),
      styles: rawStyles.map((st) => ({
        ...st,
        image: sanitizeImageSrc(st.image, "/styles/gamers.jpg"),
      })),
    },
    newReleases: {
      ...DEFAULT_STOREFRONT_CONFIG.newReleases,
      ...stripProtoKeys(r.newReleases as Record<string, unknown>),
    },
    catalogSection: {
      ...DEFAULT_STOREFRONT_CONFIG.catalogSection,
      ...stripProtoKeys(r.catalogSection as Record<string, unknown>),
      enabled: r.catalogSection?.enabled !== false,
      categories:
        Array.isArray(r.catalogSection?.categories) && r.catalogSection.categories.length > 0
          ? r.catalogSection.categories.slice(0, 24).map((c, idx) => ({
              id: String(c?.id || `cat-${idx}`),
              label: String(c?.label || c?.filterValue || "Category").slice(0, 60),
              filterValue: String(c?.filterValue || c?.label || "All").slice(0, 60),
              visible: c?.visible !== false,
            }))
          : DEFAULT_STOREFRONT_CONFIG.catalogSection.categories,
    },
    reviews: {
      ...DEFAULT_STOREFRONT_CONFIG.reviews,
      ...stripProtoKeys(r.reviews as Record<string, unknown>),
      items:
        Array.isArray(r.reviews?.items) && r.reviews.items.length > 0
          ? r.reviews.items.slice(0, 20)
          : DEFAULT_STOREFRONT_CONFIG.reviews.items,
    },
    trust: {
      ...DEFAULT_STOREFRONT_CONFIG.trust,
      ...stripProtoKeys(r.trust as Record<string, unknown>),
      items:
        Array.isArray(r.trust?.items) && r.trust.items.length > 0
          ? r.trust.items.slice(0, 10)
          : DEFAULT_STOREFRONT_CONFIG.trust.items,
    },
    blog: {
      ...DEFAULT_STOREFRONT_CONFIG.blog,
      ...stripProtoKeys(r.blog as Record<string, unknown>),
      articles: rawArticles.map((art) => ({
        ...art,
        image: sanitizeImageSrc(art.image, "/blog/blog-guitarists.png"),
      })),
    },
    supportStrip: {
      ...DEFAULT_STOREFRONT_CONFIG.supportStrip,
      ...stripProtoKeys(r.supportStrip as Record<string, unknown>),
      items:
        Array.isArray(r.supportStrip?.items) && r.supportStrip.items.length > 0
          ? r.supportStrip.items.slice(0, 8)
          : DEFAULT_STOREFRONT_CONFIG.supportStrip.items,
    },
    finalCta: {
      ...DEFAULT_STOREFRONT_CONFIG.finalCta,
      ...stripProtoKeys(r.finalCta as Record<string, unknown>),
    },
    footer: {
      ...DEFAULT_STOREFRONT_CONFIG.footer,
      ...stripProtoKeys(r.footer as Record<string, unknown>),
      brandMark:
        !r.footer?.brandMark || r.footer.brandMark === "KZ"
          ? DEFAULT_STOREFRONT_CONFIG.footer.brandMark
          : r.footer.brandMark,
      brandName:
        !r.footer?.brandName || r.footer.brandName === "Audio Store"
          ? DEFAULT_STOREFRONT_CONFIG.footer.brandName
          : r.footer.brandName,
      copyrightText:
        !r.footer?.copyrightText ||
        r.footer.copyrightText === "KZ Audio Store Egypt. All rights reserved."
          ? DEFAULT_STOREFRONT_CONFIG.footer.copyrightText
          : r.footer.copyrightText,
      disclaimerText:
        !r.footer?.disclaimerText ||
        r.footer.disclaimerText ===
          "This is an independent store. We sell authentic KZ and multi-brand audio products."
          ? DEFAULT_STOREFRONT_CONFIG.footer.disclaimerText
          : r.footer.disclaimerText,
    },
  };
}

export function getCachedStorefrontConfig(): StorefrontConfig {
  if (typeof window === "undefined") return DEFAULT_STOREFRONT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STOREFRONT_CONFIG;
    return mergeStorefrontConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_STOREFRONT_CONFIG;
  }
}

export const CMS_FIRESTORE_PRODUCT_DOC_ID = "__noovyx_cms_config__";

export async function loadStorefrontConfig(): Promise<StorefrontConfig> {
  const cached = getCachedStorefrontConfig();
  let hasLocalSaved = false;
  if (typeof window !== "undefined") {
    try {
      hasLocalSaved = Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {}
  }

  // 1. Try local server state (/api/local-catalog) so Private/Incognito windows get CMS section changes
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/local-catalog", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { cmsConfig?: Record<string, unknown> };
        if (data.cmsConfig && typeof data.cmsConfig === "object") {
          const merged = mergeStorefrontConfig(data.cmsConfig);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }
      }
    } catch {
      // Ignore and try Firestore fallback
    }
  }

  if (!db) return cached;

  // 2. Read from Firestore products/__noovyx_cms_config__ (publicly readable by all Private/Incognito windows)
  try {
    const cmsProductSnap = await getDoc(doc(db, "products", CMS_FIRESTORE_PRODUCT_DOC_ID));
    if (cmsProductSnap.exists()) {
      const pData = cmsProductSnap.data();
      const rawJson = typeof pData.imageUrl === "string" ? pData.imageUrl : "";
      if (rawJson.startsWith("{")) {
        const parsed = JSON.parse(rawJson) as Record<string, unknown>;
        const merged = mergeStorefrontConfig(parsed);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
        }
        return merged;
      }
    }
  } catch {
    // Ignore and try settings/storefront fallback
  }

  // 3. Fallback to settings/storefront if accessible
  try {
    const snap = await getDoc(doc(db, "settings", "storefront"));
    if (snap.exists()) {
      const data = snap.data();
      const merged = mergeStorefrontConfig((data.cmsConfig as Record<string, unknown>) || data);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    }
  } catch {
    // Fallback to cached or default
  }

  // If the admin's open browser already has saved CMS settings in localStorage, push them to the server automatically
  if (hasLocalSaved && typeof window !== "undefined") {
    void saveStorefrontConfig(cached);
  }

  return cached;
}

export async function saveStorefrontConfig(config: StorefrontConfig): Promise<void> {
  const sanitized = mergeStorefrontConfig(config as unknown as Record<string, unknown>);
  if (typeof window !== "undefined") {
    try {
      const serialized = JSON.stringify(sanitized);
      localStorage.setItem(STORAGE_KEY, serialized);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: serialized,
        }),
      );
    } catch {}
    try {
      await fetch("/api/local-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmsConfig: sanitized }),
      });
    } catch {}
  }

  if (db) {
    const serializedCms = JSON.stringify(sanitized).slice(0, 740000);
    await Promise.allSettled([
      // Save inside products/__noovyx_cms_config__ so public Private/Incognito windows can always read it
      setDoc(
        doc(db, "products", CMS_FIRESTORE_PRODUCT_DOC_ID),
        {
          slug: CMS_FIRESTORE_PRODUCT_DOC_ID,
          name: "Noovyx Storefront CMS Config",
          category: "IEMs",
          price: 0,
          image: "NX",
          imageUrl: serializedCms,
          imageUrls: [],
          description: "Storefront CMS Configuration Document",
          specs: [],
          inStock: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
          isActive: true,
          featured: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(
        doc(db, "settings", "storefront"),
        {
          cmsConfig: sanitized,
          heroImages: sanitized.hero.slides.map((s) => s.image),
          heroTitles: sanitized.hero.slides.map((s) => s.title),
          heroImage: sanitized.hero.slides[0]?.image || "/products/kz-castor-bass.png",
          heroProductName: sanitized.hero.slides[0]?.title || "KZ Flagship Audio",
          shuffle: sanitized.hero.autoPlay,
          intervalSeconds: sanitized.hero.intervalSeconds,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    ]);
  }
}

import { createClient } from "@supabase/supabase-js";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getSupabaseBrowserClient } from "./lib/supabase/client";
import { getDataBackendMode, getSupabasePublishableKey, getSupabaseUrl } from "./lib/supabase/env";
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
    enabled?: boolean;
    showSearch?: boolean;
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
  recentlyViewed?: {
    enabled: boolean;
    kicker: string;
    title: string;
    maxItems: number;
  };
  finalCta: {
    enabled: boolean;
    kicker: string;
    title: string;
    buttonText: string;
  };
  footer: {
    enabled?: boolean;
    brandMark: string;
    brandName: string;
    description: string;
    copyrightText: string;
    disclaimerText: string;
  };
  commerce?: {
    shippingEnabled: boolean;
    freeShippingThreshold: number;
    cairoGizaShippingFee: number;
    otherGovernoratesShippingFee: number;
    codFee: number;
  };
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  announcement: {
    enabled: true,
    intervalSeconds: 5,
    messages: [
      "Authentic KZ & Hi-Fi audio gear delivered across Egypt",
      "Cash on delivery on all in-ear monitors, DACs, and cables",
      "Every unit inspected for driver balance before dispatch",
      "Need pairing advice? Message our audio team on WhatsApp",
    ],
  },
  header: {
    enabled: true,
    showSearch: true,
    brandMark: "NX",
    brandTitle: "NOOVYX",
    brandSub: "Pro Audio · Egypt",
    searchPlaceholder: "Search gear",
    whatsappNumber: "201000000000",
    drawerTagline: "Authentic IEMs, portable DACs, and upgrade cables across Egypt. Cash on delivery.",
    navLinks: [
      { id: "all", label: "All gear", visible: true },
      { id: "iems", label: "KZ IEMs", visible: true },
      { id: "wireless", label: "Wireless", visible: true },
      { id: "cables", label: "Cables", visible: true },
      { id: "dacs", label: "Hi-Fi DACs", visible: true },
      { id: "accessories", label: "Accessories", visible: true },
    ],
    drawerCategories: [
      { id: "all", label: "All products", image: "/products/kz-castor-bass.png", visible: true },
      { id: "iems", label: "KZ earphones & IEMs", image: "/products/kz-zs10-pro-2.png", visible: true },
      { id: "wireless", label: "Bluetooth adapters", image: "/products/kz-az09-wireless.png", visible: true },
      { id: "cables", label: "Upgrade audio cables", image: "/products/kz-t8-silver-cable.png", visible: true },
      { id: "gamers", label: "Gaming IEMs", image: "/products/kz-zsn-pro-x.png", visible: true },
      { id: "dacs", label: "Portable USB-C DACs", image: "/products/kz-am02-dac.png", visible: true },
      { id: "accessories", label: "Ear tips & cases", image: "/products/kz-ls01-tips.png", visible: true },
    ],
  },
  hero: {
    enabled: true,
    autoPlay: true,
    intervalSeconds: 6,
    topLeftTag: "Dual-driver acoustic shell",
    bottomRightTag: "0.75mm 2-pin detachable",
    trustBadges: [
      "Fast delivery across Egypt",
      "Cash on delivery",
      "Driver-checked before dispatch",
    ],
    slides: [
      {
        id: "castor",
        badge: "Flagship dual-driver IEM",
        tagline: "Tunable sub-bass & studio separation",
        title: "KZ Castor Bass Edition",
        desc: "Dual dynamic drivers with 4-stage acoustic tuning switches. Built for deep sub-bass extension, clear vocal midrange, and accurate positional cues in games.",
        primaryCtaText: "Shop Castor",
        primaryCtaTarget: "#catalog",
        secondaryCtaText: "Explore sound profiles",
        secondaryCtaTarget: "#sound-finder",
        image: "/products/kz-castor-bass.png",
        features: ["2DD coaxial architecture", "4 tuning switches", "20Hz–40kHz response", "0.75mm 2-pin"],
        targetCategory: "IEMs",
      },
      {
        id: "zs10",
        badge: "5-driver hybrid monitor",
        tagline: "Stage monitoring & competitive gaming",
        title: "KZ ZS10 Pro 2 Hybrid",
        desc: "10mm dynamic driver paired with dual balanced armatures and a 3-way electronic crossover. Delivers pinpoint imaging for footsteps, instruments, and studio mixes.",
        primaryCtaText: "Shop ZS10 Pro 2",
        primaryCtaTarget: "#bestsellers",
        secondaryCtaText: "Browse catalog",
        secondaryCtaTarget: "#catalog",
        image: "/products/kz-zs10-pro-2.png",
        features: ["1DD + 4BA hybrid", "3-way crossover", "Alloy faceplate", "4-level tuning switch"],
        targetCategory: "IEMs",
      },
      {
        id: "wireless",
        badge: "True wireless earhook module",
        tagline: "Detachable Bluetooth 5.2 upgrade",
        title: "KZ AZ09 Wireless Adapter",
        desc: "Convert any 2-pin KZ in-ear monitor into low-latency wireless earphones with AAC transmission, dedicated game mode, and a charging case.",
        primaryCtaText: "Shop wireless",
        primaryCtaTarget: "#catalog",
        secondaryCtaText: "View categories",
        secondaryCtaTarget: "#catalog",
        image: "/products/kz-az09-wireless.png",
        features: ["Bluetooth 5.2", "Low-latency mode", "AAC / SBC codec", "0.75mm C-pin"],
        targetCategory: "Wireless",
      },
    ],
  },
  bestSellers: {
    enabled: true,
    kicker: "Most requested in Egypt",
    title: "Best sellers",
    subtitle: "Proven in-ear monitors and portable DACs chosen by musicians, gamers, and daily listeners.",
    ctaText: "View all gear",
    maxItems: 4,
  },
  soundFinder: {
    enabled: true,
    kicker: "Acoustic profile matcher",
    title: "Find your sound signature",
    subtitle: "Each driver layout shapes the stage differently. Pick how you listen to filter matching hardware.",
    styles: [
      {
        id: "gaming",
        name: "Competitive gaming",
        image: "/styles/gamers.jpg",
        desc: "Accurate directional imaging, clean footstep separation, and controlled sub-bass that never muddies voice comms.",
        tags: ["Directional imaging", "Footstep clarity", "Low-latency ready"],
        matchCategories: ["IEMs", "DACs"],
        matchKeywords: ["castor", "zsn", "gale", "krila"],
      },
      {
        id: "studio",
        name: "Stage & studio monitoring",
        image: "/styles/singers.webp",
        desc: "Forward vocal presence, multi-armature instrument separation, and passive noise isolation for live sets and mixing.",
        tags: ["Balanced armatures", "Vocal clarity", "26dB passive isolation"],
        matchCategories: ["IEMs"],
        matchKeywords: ["zs10", "pro", "as16", "pr3", "symphony"],
      },
      {
        id: "everyday",
        name: "Wireless & daily listening",
        image: "/styles/sound-style.webp",
        desc: "Deep sub-bass punch, Bluetooth earhook convenience, and hardware switches to tailor the tuning on the go.",
        tags: ["Bluetooth 5.2", "Sub-bass extension", "Tuning switches"],
        matchCategories: ["Wireless", "IEMs"],
        matchKeywords: ["az09", "carol", "an01", "xz10", "sora", "castor"],
      },
    ],
  },
  newReleases: {
    enabled: true,
    kicker: "Latest arrivals",
    title: "New releases",
    subtitle: "Recent multi-driver monitors, planar units, and USB-C DAC dongles now in stock.",
    ctaText: "Browse new arrivals",
    maxItems: 4,
  },
  catalogSection: {
    enabled: true,
    kicker: "Full catalog",
    title: "Shop by category",
    subtitle: "Filter in-ear monitors, detachable cables, USB-C DACs, wireless adapters, and ear tips.",
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
    kicker: "Customer feedback",
    title: "Verified listener reviews",
    overallRating: "4.9 / 5.0",
    overallSubtext: "from verified buyers across Egypt",
    items: [
      {
        id: "r1",
        author: "Tarek Fathy",
        city: "Cairo",
        date: "Oct 12, 2026",
        product: "KZ Castor Bass Edition",
        rating: 5,
        headline: "Pinpoint footstep depth and clean sub-bass",
        text: "I play CS2 and Valorant daily. With switches 1 and 2 up on the Castor, sub-bass stays tight without bleeding into footsteps. Delivered cash on delivery to Nasr City in 48 hours.",
        verified: true,
      },
      {
        id: "r2",
        author: "Mina Youssef",
        city: "Alexandria",
        date: "Oct 9, 2026",
        product: "KZ ZS10 Pro 2 Hybrid",
        rating: 5,
        headline: "Reliable stage monitoring for live sets",
        text: "Used these for our live band set last weekend. The balanced armatures keep vocals and keys distinct without harshness, and the shell seal blocks stage noise well.",
        verified: true,
      },
      {
        id: "r3",
        author: "Ziad El-Shamy",
        city: "Giza",
        date: "Sep 28, 2026",
        product: "KZ AZ09 Wireless Earhooks",
        rating: 5,
        headline: "Turned my wired IEMs into daily wireless monitors",
        text: "No cable snagging during commutes or workouts. Pairs quickly with my phone and keeps latency low on video playback. Comfortable earhook shape.",
        verified: true,
      },
      {
        id: "r4",
        author: "Karim Mostafa",
        city: "Mansoura",
        date: "Sep 19, 2026",
        product: "KZ AM02 Type-C DAC Dongle",
        rating: 5,
        headline: "Silent noise floor and stronger headroom",
        text: "Plugging this DAC into my phone removed the background hiss completely and gave my ZSN Pro X noticeably tighter low-end control.",
        verified: true,
      },
    ],
  },
  trust: {
    enabled: true,
    kicker: "How we work",
    title: "Why order from Noovyx",
    items: [
      {
        id: "t1",
        title: "Authentic hardware",
        desc: "Sourced directly with original factory packaging, cables, and serial verification.",
      },
      {
        id: "t2",
        title: "Driver-checked in Cairo",
        desc: "Every unit is inspected for left/right channel balance and connector fit before dispatch.",
      },
      {
        id: "t3",
        title: "48-hour courier dispatch",
        desc: "Orders are confirmed by phone or WhatsApp and shipped door-to-door across all governorates.",
      },
      {
        id: "t4",
        title: "Cash on delivery",
        desc: "No account required. Place your order request online and pay the courier upon receipt.",
      },
      {
        id: "t5",
        title: "Pin & DAC pairing help",
        desc: "Unsure whether your IEM uses 0.75mm C-pin or B-pin? Ask our team on WhatsApp before ordering.",
      },
    ],
  },
  blog: {
    enabled: true,
    kicker: "Technical guides",
    title: "Audio guides & setup notes",
    subtitle: "Practical notes on driver architectures, impedance matching, and stage monitoring.",
    articles: [
      {
        id: "b1",
        image: "/blog/blog-guitarists.png",
        tag: "Stage guide",
        title: "Choosing in-ear monitors for guitarists and live stage use",
        excerpt: "Driver configuration, passive isolation ratings, and why 2-pin detachable cables matter on stage.",
        readMoreText: "Read guide →",
      },
      {
        id: "b2",
        image: "/blog/blog-producers.png",
        tag: "Studio & mixing",
        title: "Hybrid multi-driver IEMs for mixing and reference checks",
        excerpt: "How dynamic + balanced armature crossovers handle sub-bass translation and stereo imaging.",
        readMoreText: "Read guide →",
      },
      {
        id: "b3",
        image: "/blog/blog-live-stage.png",
        tag: "Hardware care",
        title: "Matching USB-C DAC dongles and ear tips to your IEMs",
        excerpt: "Why a dedicated DAC lowers output impedance and how bore size affects treble and seal.",
        readMoreText: "Read guide →",
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
        desc: "Every order request is verified via WhatsApp or phone before courier dispatch.",
      },
      {
        id: "s2",
        num: "02",
        title: "Connector matching",
        desc: "Add your IEM model in the checkout notes and we will verify cable and adapter fit.",
      },
      {
        id: "s3",
        num: "03",
        title: "Curated audio catalog",
        desc: "Focused on high-value in-ear monitors, portable DACs, and replacement parts.",
      },
    ],
  },
  finalCta: {
    enabled: true,
    kicker: "Ready to order",
    title: "Review your audio selection",
    buttonText: "Open cart",
  },
  recentlyViewed: {
    enabled: true,
    kicker: "Your history",
    title: "Recently Viewed",
    maxItems: 6,
  },
  footer: {
    enabled: true,
    brandMark: "NX",
    brandName: "NOOVYX",
    description: "In-ear monitors, portable DACs, and upgrade cables in Egypt. Inspected before dispatch and delivered with cash on delivery.",
    copyrightText: "Noovyx Egypt (noovyx.com). All rights reserved.",
    disclaimerText: "Independent audio store supplying authentic KZ and multi-brand Hi-Fi equipment across Egypt.",
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

  if (trimmed.startsWith("https://") || trimmed.startsWith("http://127.0.0.1") || trimmed.startsWith("http://localhost")) {
    try {
      const parsed = new URL(trimmed);
      const isLocalLoopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
      if (parsed.protocol === "https:" || (parsed.protocol === "http:" && isLocalLoopback)) {
        return parsed.toString();
      }
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

  if (trimmed.startsWith("https://") || trimmed.startsWith("http://127.0.0.1") || trimmed.startsWith("http://localhost")) {
    try {
      const parsed = new URL(trimmed);
      const isLocalLoopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
      if (parsed.protocol === "https:" || (parsed.protocol === "http:" && isLocalLoopback)) {
        return parsed.toString();
      }
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
    Array.isArray(r.hero?.slides) &&
    r.hero.slides.length > 0 &&
    r.hero.slides[0]?.badge !== "FLAGSHIP DUAL-DRIVER // 2026 DROP"
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
        Array.isArray(r.announcement?.messages) &&
        r.announcement.messages.length > 0 &&
        !String(r.announcement.messages[0]).includes("🎧 AUTHENTIC KZ")
          ? r.announcement.messages.slice(0, 10).map((m) => String(m).slice(0, 200))
          : DEFAULT_STOREFRONT_CONFIG.announcement.messages,
    },
    header: {
      ...DEFAULT_STOREFRONT_CONFIG.header,
      ...stripProtoKeys(r.header as Record<string, unknown>),
      enabled: r.header?.enabled !== false,
      showSearch: r.header?.showSearch !== false,
      brandMark:
        !r.header?.brandMark || r.header.brandMark === "KZ"
          ? DEFAULT_STOREFRONT_CONFIG.header.brandMark
          : r.header.brandMark,
      brandTitle:
        !r.header?.brandTitle || r.header.brandTitle === "AUDIO STORE" || r.header.brandTitle === "Noovyx"
          ? DEFAULT_STOREFRONT_CONFIG.header.brandTitle
          : r.header.brandTitle,
      brandSub:
        !r.header?.brandSub ||
        r.header.brandSub === "OFFICIAL ARSENAL // EGYPT" ||
        r.header.brandSub === "PRO AUDIO // EGYPT"
          ? DEFAULT_STOREFRONT_CONFIG.header.brandSub
          : r.header.brandSub,
      searchPlaceholder:
        !r.header?.searchPlaceholder || r.header.searchPlaceholder === "Search audio gear..."
          ? DEFAULT_STOREFRONT_CONFIG.header.searchPlaceholder
          : r.header.searchPlaceholder,
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
      topLeftTag:
        !r.hero?.topLeftTag || r.hero.topLeftTag === "HYBRID DRIVERS"
          ? DEFAULT_STOREFRONT_CONFIG.hero.topLeftTag
          : r.hero.topLeftTag,
      bottomRightTag:
        !r.hero?.bottomRightTag || r.hero.bottomRightTag === "HI-RES AUDIO"
          ? DEFAULT_STOREFRONT_CONFIG.hero.bottomRightTag
          : r.hero.bottomRightTag,
      trustBadges:
        Array.isArray(r.hero?.trustBadges) &&
        r.hero.trustBadges.length > 0 &&
        !String(r.hero.trustBadges[0]).includes("🇪🇬")
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
    recentlyViewed: {
      enabled: r.recentlyViewed?.enabled !== false,
      kicker:
        typeof r.recentlyViewed?.kicker === "string" && r.recentlyViewed.kicker.trim()
          ? r.recentlyViewed.kicker.slice(0, 80)
          : DEFAULT_STOREFRONT_CONFIG.recentlyViewed!.kicker,
      title:
        typeof r.recentlyViewed?.title === "string" && r.recentlyViewed.title.trim()
          ? r.recentlyViewed.title.slice(0, 120)
          : DEFAULT_STOREFRONT_CONFIG.recentlyViewed!.title,
      maxItems: Math.max(2, Math.min(12, Number(r.recentlyViewed?.maxItems) || 6)),
    },
    footer: {
      ...DEFAULT_STOREFRONT_CONFIG.footer,
      ...stripProtoKeys(r.footer as Record<string, unknown>),
      enabled: r.footer?.enabled !== false,
      brandMark:
        !r.footer?.brandMark || r.footer.brandMark === "KZ"
          ? DEFAULT_STOREFRONT_CONFIG.footer.brandMark
          : r.footer.brandMark,
      brandName:
        !r.footer?.brandName || r.footer.brandName === "Audio Store" || r.footer.brandName === "Noovyx"
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

export const CMS_FIRESTORE_PRODUCT_DOC_ID = "noovyx-cms-config-v2";
export const STORAGE_UPDATED_AT_KEY = "noovyx_storefront_cms_updated_at_v2";

function encodeCmsPayloadForImageUrl(config: StorefrontConfig, updatedAt: number): string {
  const payloadObj = { ...config, _updatedAt: updatedAt };
  const json = JSON.stringify(payloadObj);
  try {
    if (typeof btoa === "function") {
      const b64 = btoa(unescape(encodeURIComponent(json)));
      return `data:image/png;base64,${b64}`;
    }
  } catch {
    // Fallback to raw JSON
  }
  return json;
}

function decodeCmsPayloadFromImageUrl(raw: unknown): { config: StorefrontConfig; updatedAt: number } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();
  try {
    let jsonStr = trimmed;
    const prefix = "data:image/png;base64,";
    if (trimmed.startsWith(prefix) && typeof atob === "function") {
      const b64 = trimmed.slice(prefix.length);
      jsonStr = decodeURIComponent(escape(atob(b64)));
    }
    if (!jsonStr.startsWith("{")) return null;
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const updatedAt = typeof parsed._updatedAt === "number" ? parsed._updatedAt : 0;
    return {
      config: mergeStorefrontConfig(parsed),
      updatedAt,
    };
  } catch {
    return null;
  }
}

function getSupabaseCmsReadClient() {
  if (typeof window !== "undefined") {
    return getSupabaseBrowserClient();
  }
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function loadStorefrontConfig(): Promise<StorefrontConfig> {
  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseCmsReadClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("storefront_config")
          .select("config, updated_at")
          .eq("id", 1)
          .maybeSingle();

        if (!error && data?.config && typeof data.config === "object") {
          const merged = mergeStorefrontConfig(data.config as Record<string, unknown>);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              if (data.updated_at) {
                localStorage.setItem(STORAGE_UPDATED_AT_KEY, String(Date.parse(data.updated_at) || Date.now()));
              }
            } catch {}
          }
          return merged;
        }
      } catch {
        if (mode === "supabase") {
          return getCachedStorefrontConfig();
        }
      }
    }
    if (mode === "supabase") {
      return getCachedStorefrontConfig();
    }
  }

  const cached = getCachedStorefrontConfig();
  let hasLocalSaved = false;
  let localUpdatedAt = 0;
  if (typeof window !== "undefined") {
    try {
      hasLocalSaved = Boolean(localStorage.getItem(STORAGE_KEY));
      localUpdatedAt = Number(localStorage.getItem(STORAGE_UPDATED_AT_KEY) || "0") || 0;
    } catch {}
  }

  let bestConfig: StorefrontConfig | null = null;
  let bestUpdatedAt = 0;

  // 1. Try local server state (/api/local-catalog) so Private/Incognito windows on localhost get CMS changes
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/local-catalog", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          cmsConfig?: Record<string, unknown>;
          cmsUpdatedAt?: number;
        };
        if (data.cmsConfig && typeof data.cmsConfig === "object") {
          bestConfig = mergeStorefrontConfig(data.cmsConfig);
          bestUpdatedAt = typeof data.cmsUpdatedAt === "number" ? data.cmsUpdatedAt : 1;
        }
      }
    } catch {
      // Ignore and try Firestore
    }
  }

  // 2. Read from Firestore products/noovyx-cms-config-v2 (publicly readable by all Private Windows & devices)
  if (db) {
    try {
      const cmsProductSnap = await getDoc(doc(db, "products", CMS_FIRESTORE_PRODUCT_DOC_ID));
      if (cmsProductSnap.exists()) {
        const pData = cmsProductSnap.data();
        const decoded = decodeCmsPayloadFromImageUrl(pData.imageUrl);
        if (decoded) {
          const remoteTs =
            decoded.updatedAt ||
            (typeof pData.updatedAt?.seconds === "number" ? pData.updatedAt.seconds * 1000 : 2);
          if (!bestConfig || remoteTs >= bestUpdatedAt) {
            bestConfig = decoded.config;
            bestUpdatedAt = remoteTs;
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // If the current browser has a newer local edit that hasn't been synced to remote yet, keep it and push to remote
  if (hasLocalSaved && (!bestConfig || localUpdatedAt > bestUpdatedAt)) {
    void saveStorefrontConfig(cached);
    return cached;
  }

  if (bestConfig) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bestConfig));
        if (bestUpdatedAt > 0) {
          localStorage.setItem(STORAGE_UPDATED_AT_KEY, String(bestUpdatedAt));
        }
      } catch {}
    }
    return bestConfig;
  }

  return cached;
}

export async function saveStorefrontConfig(config: StorefrontConfig): Promise<void> {
  const sanitized = mergeStorefrontConfig(config as unknown as Record<string, unknown>);
  const now = Date.now();
  const mode = getDataBackendMode();

  if (typeof window !== "undefined") {
    try {
      const serialized = JSON.stringify(sanitized);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(STORAGE_UPDATED_AT_KEY, String(now));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: serialized,
        }),
      );
    } catch {}
  }

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      if (mode === "supabase") {
        throw new Error("Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and key.");
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("storefront_config")
        .upsert(
          {
            id: 1,
            config: sanitized,
            updated_by: userData.user?.id ?? null,
          },
          { onConflict: "id" },
        )
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to publish CMS config to Supabase: ${error.message}`);
      }

      if (typeof window !== "undefined") {
        fetch("/api/revalidate", { method: "POST" }).catch(() => {});
      }

      if (mode === "supabase") {
        return;
      }
    }
  }

  if (typeof window !== "undefined") {
    try {
      await fetch("/api/local-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmsConfig: sanitized }),
      });
    } catch {}
  }

  if (db) {
    const firestoreDb = db;
    const encodedImageUrl = encodeCmsPayloadForImageUrl(sanitized, now).slice(0, 740000);
    const cmsDocRef = doc(firestoreDb, "products", CMS_FIRESTORE_PRODUCT_DOC_ID);
    const cmsProductPayload = {
      slug: CMS_FIRESTORE_PRODUCT_DOC_ID,
      name: "Noovyx Storefront CMS Config",
      category: "IEMs",
      price: 100,
      image: "NX",
      imageUrl: encodedImageUrl,
      imageUrls: ["/products/kz-castor-bass.png"],
      description: "Storefront CMS Configuration Document",
      specs: ["CMS"],
      inStock: true,
      stockQuantity: 10,
      lowStockThreshold: 2,
      isActive: true,
      featured: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const writeCmsProductDoc = async () => {
      try {
        // First write exact 16 keys (without merge so no legacy keys violate hasOnly)
        await setDoc(cmsDocRef, cmsProductPayload);
      } catch {
        // Fallback including 'id' in case live rules require 17 keys
        await setDoc(cmsDocRef, { ...cmsProductPayload, id: CMS_FIRESTORE_PRODUCT_DOC_ID });
      }
    };

    const writeSettingsDoc = async () => {
      try {
        await setDoc(
          doc(firestoreDb, "settings", "storefront"),
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
        );
      } catch {
        // Ignore if settings/storefront is restricted
      }
    };

    await Promise.all([writeCmsProductDoc(), writeSettingsDoc()]);
  }
}

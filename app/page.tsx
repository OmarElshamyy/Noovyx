import type { Metadata } from "next";
import { Storefront } from "./storefront";
import { products as defaultProducts } from "../products";
import { getPublicProducts } from "../productService";
import {
  DEFAULT_STOREFRONT_CONFIG,
  loadStorefrontConfig,
  type ReviewItemConfig,
} from "../storefrontConfig";
import type { Product } from "../types";

export const dynamic = "force-dynamic";

async function resolveActiveProducts(): Promise<Product[]> {
  const fallbackProducts = defaultProducts.filter((p) => p.isActive !== false);
  const live = await getPublicProducts().catch(() => fallbackProducts);
  const active = live.filter((p) => p.isActive !== false);
  return active.length > 0 ? active : fallbackProducts;
}

export async function generateMetadata(): Promise<Metadata> {
  const activeProducts = await resolveActiveProducts();
  const topNames = activeProducts
    .slice(0, 6)
    .map((p) => p.name.replace(/\s*\([^)]*\)\s*/g, " ").trim());

  const dynamicList = topNames.slice(0, 4).join(", ");
  const rawDescription = dynamicList
    ? `Buy authentic KZ & Hi-Fi In-Ear Monitors (IEMs) in Egypt: ${dynamicList}. Inspected in Cairo with fast Cash on Delivery.`
    : "Buy authentic KZ & Hi-Fi In-Ear Monitors (IEMs), Type-C DAC dongles, and upgrade cables in Egypt. Inspected in Cairo with fast Cash on Delivery.";
  const description =
    rawDescription.length > 155 ? `${rawDescription.slice(0, 152)}...` : rawDescription;

  const dynamicKeywords = activeProducts.flatMap((p) => {
    const clean = p.name.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    return [
      p.name,
      clean,
      `${clean} Egypt`,
      `${clean} price in Egypt`,
      `سماعة ${clean} مصر`,
    ];
  });

  return {
    title: "Noovyx | Pro Audio, KZ IEMs & Hi-Fi DAC Store Egypt",
    description,
    keywords: [
      "Noovyx",
      "noovyx.com",
      "Noovyx Egypt",
      "IEM Egypt",
      "In-Ear Monitors Egypt",
      "KZ Audio Egypt",
      "KZ IEM Egypt",
      ...dynamicKeywords,
      "KZ Duonic Bass Edition Egypt",
      "KZ Dounic Bass Edition Egypt",
      "سماعات KZ مصر",
      "سماعات IEM مصر",
      "متجر سماعات مصر",
      "نوفيكس",
    ],
    alternates: {
      canonical: "https://noovyx.com",
    },
    openGraph: {
      type: "website",
      url: "https://noovyx.com",
      siteName: "Noovyx",
      title: "Noovyx | Pro Audio, KZ IEMs & Hi-Fi DAC Store Egypt",
      description,
      locale: "en_EG",
      alternateLocale: ["ar_EG", "en_US"],
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Noovyx — Pro Audio & IEM Store Egypt (noovyx.com)",
        },
      ],
    },
  };
}

function buildStructuredData(liveProducts: Product[], visibleReviews: ReviewItemConfig[]) {
  const baseUrl = "https://noovyx.com";
  const activeProducts =
    liveProducts.filter((p) => p.isActive !== false).length > 0
      ? liveProducts.filter((p) => p.isActive !== false)
      : defaultProducts;

  const onlineStoreSchema = {
    "@type": ["OnlineStore", "Organization"],
    "@id": `${baseUrl}/#organization`,
    name: "Noovyx",
    alternateName: ["Noovyx Egypt", "Noovyx Pro Audio", "noovyx.com", "نوفيكس"],
    url: baseUrl,
    logo: `${baseUrl}/icon`,
    image: `${baseUrl}/opengraph-image`,
    description:
      "Egypt's destination for authentic In-Ear Monitors (IEMs), Hi-Fi portable DACs, upgrade audio cables, and wireless audio gear with Cash on Delivery across all Egyptian governorates.",
    areaServed: {
      "@type": "Country",
      name: "EG",
    },
    currenciesAccepted: "EGP",
    paymentAccepted: "Cash on Delivery",
    priceRange: "EGP 160 - EGP 3250",
  };

  const websiteSchema = {
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: "Noovyx | Pro Audio, KZ IEMs & Hi-Fi DAC Store Egypt",
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
    inLanguage: "en-EG",
  };

  const itemListSchema = {
    "@type": "ItemList",
    "@id": `${baseUrl}/#catalog-list`,
    name: "Noovyx Pro Audio & IEM Catalog Egypt",
    numberOfItems: activeProducts.length,
    itemListElement: activeProducts.map((product, index) => {
      const slug = product.slug || product.id;
      const productUrl = `${baseUrl}/products/${encodeURIComponent(slug)}`;
      const rawImg = product.imageUrl || product.imageUrls?.[0] || "/products/kz-castor-bass.png";
      const absImg = rawImg.startsWith("http")
        ? rawImg
        : `${baseUrl}${rawImg.startsWith("/") ? "" : "/"}${rawImg}`;
      const brandName = product.name.split(" ")[0] || "KZ";

      const matchingReviews = visibleReviews.filter(
        (r) =>
          r.product.toLowerCase().includes(product.name.toLowerCase()) ||
          product.name.toLowerCase().includes(r.product.toLowerCase()),
      );

      const reviewProps =
        matchingReviews.length > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: String(
                  (
                    matchingReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) /
                    matchingReviews.length
                  ).toFixed(1),
                ),
                reviewCount: String(matchingReviews.length),
                bestRating: "5",
                worstRating: "1",
              },
              review: matchingReviews.map((r) => ({
                "@type": "Review",
                author: {
                  "@type": "Person",
                  name: r.author,
                },
                name: r.headline,
                reviewBody: r.text,
                reviewRating: {
                  "@type": "Rating",
                  ratingValue: String(r.rating),
                  bestRating: "5",
                  worstRating: "1",
                },
              })),
            }
          : {};

      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          "@id": `${productUrl}#product`,
          url: productUrl,
          name: product.name,
          description: product.description,
          image: absImg,
          sku: product.id,
          category: product.category,
          brand: {
            "@type": "Brand",
            name: brandName,
          },
          ...reviewProps,
          offers: {
            "@type": "Offer",
            url: productUrl,
            priceCurrency: "EGP",
            price: String(product.price),
            availability: product.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: {
              "@id": `${baseUrl}/#organization`,
            },
          },
        },
      };
    }),
  };

  const faqSchema = {
    "@type": "FAQPage",
    "@id": `${baseUrl}/#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: "Does Noovyx offer Cash on Delivery (COD) across Egypt?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Noovyx delivers to all Egyptian governorates (including Cairo, Giza, Alexandria, Mansoura, Tanta, Zagazig, and Upper Egypt) with Cash on Delivery (COD). No online credit card is required.",
        },
      },
      {
        "@type": "Question",
        name: "How fast is shipping within Egypt?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Orders are confirmed via phone or WhatsApp and typically delivered within 24 to 72 hours across Cairo, Giza, Alexandria, and Delta governorates.",
        },
      },
      {
        "@type": "Question",
        name: "Are all KZ and Hi-Fi In-Ear Monitors on Noovyx 100% authentic?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every IEM, upgrade cable, Bluetooth adapter, and Type-C DAC sold on Noovyx (noovyx.com) is sourced directly, factory-sealed, and quality-checked for driver channel balance before dispatch.",
        },
      },
      {
        "@type": "Question",
        name: "Which IEMs are best for competitive gaming and studio music monitoring?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "For competitive gaming (Valorant, CS2, Call of Duty), dual-driver and hybrid models like the KZ Castor Pro 2, KZ AS16 Pro X, KZ Duonic Bass Edition, and KZ Gale Type-C provide pinpoint 3D footstep imaging and zero-latency wired response.",
        },
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [onlineStoreSchema, websiteSchema, itemListSchema, faqSchema],
  };
}

export default async function Home() {
  const [initialCmsConfig, activeProducts] = await Promise.all([
    loadStorefrontConfig().catch(() => DEFAULT_STOREFRONT_CONFIG),
    resolveActiveProducts(),
  ]);
  const visibleReviews =
    initialCmsConfig.reviews?.enabled !== false
      ? initialCmsConfig.reviews?.items || DEFAULT_STOREFRONT_CONFIG.reviews.items
      : [];
  const jsonLd = buildStructuredData(activeProducts, visibleReviews);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Storefront initialCmsConfig={initialCmsConfig} initialProducts={activeProducts} />
    </>
  );
}

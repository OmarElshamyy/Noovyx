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

function buildStructuredData(liveProducts: Product[], visibleReviews: ReviewItemConfig[]) {
  const baseUrl = "https://noovyx.com";
  const activeProducts =
    liveProducts.filter((p) => p.isActive !== false).length > 1
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
          text: "For competitive gaming (Valorant, CS2, Call of Duty), dual-driver and hybrid models like the KZ Castor Bass Edition, KZ ZSN Pro X, and KZ ZS10 Pro 2 provide pinpoint 3D footstep imaging and zero-latency wired response.",
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
  const fallbackProducts = defaultProducts.filter((p) => p.isActive !== false);
  const [initialCmsConfig, initialProducts] = await Promise.all([
    loadStorefrontConfig().catch(() => DEFAULT_STOREFRONT_CONFIG),
    getPublicProducts().catch(() => fallbackProducts),
  ]);
  const activeProducts =
    initialProducts.filter((p) => p.isActive !== false).length > 1
      ? initialProducts.filter((p) => p.isActive !== false)
      : fallbackProducts;
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

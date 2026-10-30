import { Storefront } from "./storefront";
import { products as defaultProducts } from "../products";

function buildStructuredData() {
  const baseUrl = "https://noovyx.com";
  const activeProducts = defaultProducts.filter((p) => p.isActive !== false);

  const onlineStoreSchema = {
    "@type": ["OnlineStore", "Organization"],
    "@id": `${baseUrl}/#organization`,
    name: "Noovyx",
    alternateName: ["Noovyx Egypt", "Noovyx Pro Audio", "noovyx.com"],
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
    priceRange: "EGP 250 - EGP 4500",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "120",
      bestRating: "5",
      worstRating: "1",
    },
  };

  const websiteSchema = {
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: "Noovyx | Pro Audio & IEM Store Egypt",
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
      const rawImg = product.imageUrl || product.imageUrls?.[0] || "/products/kz-castor-bass.png";
      const absImg = rawImg.startsWith("http")
        ? rawImg
        : `${baseUrl}${rawImg.startsWith("/") ? "" : "/"}${rawImg}`;
      const brandName = product.name.split(" ")[0] || "KZ";

      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          "@id": `${baseUrl}/#product-${product.slug || product.id}`,
          name: product.name,
          description: product.description,
          image: absImg,
          sku: product.id,
          category: product.category,
          brand: {
            "@type": "Brand",
            name: brandName,
          },
          offers: {
            "@type": "Offer",
            url: `${baseUrl}/#product-${product.slug || product.id}`,
            priceCurrency: "EGP",
            price: String(product.price),
            availability: product.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: {
              "@type": "Organization",
              name: "Noovyx",
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
          text: "Yes. Every IEM, upgrade cable, Bluetooth adapter, and Type-C DAC sold on Noovyx (noovyx.com) is sourced directly, factory-sealed, and quality-checked before dispatch.",
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

export default function Home() {
  const jsonLd = buildStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Storefront />
    </>
  );
}

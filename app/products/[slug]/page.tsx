import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency, products as defaultProducts } from "../../../products";
import { getPublicProducts } from "../../../productService";
import { DEFAULT_STOREFRONT_CONFIG, loadStorefrontConfig } from "../../../storefrontConfig";
import type { Product } from "../../../types";

export const dynamic = "force-dynamic";

async function resolveCatalog(): Promise<Product[]> {
  const live = await getPublicProducts().catch(() => defaultProducts);
  const active = live.filter((p) => p.isActive !== false);
  return active.length > 1 ? active : defaultProducts;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await resolveCatalog();
  const product = catalog.find((p) => p.slug === slug || p.id === slug);
  if (!product) {
    return { title: "Product Not Found" };
  }

  const canonicalUrl = `https://noovyx.com/products/${encodeURIComponent(product.slug || product.id)}`;
  const priceText = formatCurrency(product.price);
  const rawDesc = `${product.name} (${priceText}) in Egypt. ${product.description} Fast Cash on Delivery across Cairo, Giza & all governorates.`;
  const description = rawDesc.length > 152 ? `${rawDesc.slice(0, 149)}...` : rawDesc;
  const primaryImage = product.imageUrl || product.imageUrls?.[0] || "/products/kz-castor-bass.png";

  return {
    title: `${product.name} Price in Egypt (${priceText}) — Buy ${product.category}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: `${product.name} (${priceText}) | Noovyx Egypt`,
      description,
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 800,
          alt: `${product.name} — Authentic ${product.category} at Noovyx Egypt`,
        },
      ],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [catalog, cmsConfig] = await Promise.all([
    resolveCatalog(),
    loadStorefrontConfig().catch(() => DEFAULT_STOREFRONT_CONFIG),
  ]);

  const product = catalog.find((p) => p.slug === slug || p.id === slug);
  if (!product) {
    notFound();
  }

  const baseUrl = "https://noovyx.com";
  const productSlug = product.slug || product.id;
  const canonicalUrl = `${baseUrl}/products/${encodeURIComponent(productSlug)}`;
  const images =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : ["/products/kz-castor-bass.png"];
  const absImages = images.map((img) =>
    img.startsWith("http") ? img : `${baseUrl}${img.startsWith("/") ? "" : "/"}${img}`,
  );
  const brandName = product.name.split(" ")[0] || "KZ";

  const matchingReviews = (cmsConfig.reviews?.items || []).filter(
    (r) =>
      r.product.toLowerCase().includes(product.name.toLowerCase()) ||
      product.name.toLowerCase().includes(r.product.toLowerCase()),
  );

  const relatedProducts = catalog
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Noovyx Egypt",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: product.category,
            item: `${baseUrl}/#catalog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        url: canonicalUrl,
        name: product.name,
        description: product.description,
        image: absImages,
        sku: product.id,
        category: product.category,
        brand: {
          "@type": "Brand",
          name: brandName,
        },
        ...(matchingReviews.length > 0
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
                author: { "@type": "Person", name: r.author },
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
          : {}),
        offers: {
          "@type": "Offer",
          url: canonicalUrl,
          priceCurrency: "EGP",
          price: String(product.price),
          availability: product.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: "Noovyx",
            url: baseUrl,
          },
        },
      },
    ],
  };

  return (
    <main className="storefront-shell" style={{ maxWidth: "1180px", margin: "0 auto", padding: "36px 20px 72px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <nav aria-label="Breadcrumb" style={{ marginBottom: "24px", fontSize: "0.88rem", color: "#9fb0cf" }}>
        <Link href="/" style={{ color: "#00e5ff" }}>Noovyx Egypt</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <Link href="/#catalog" style={{ color: "#9fb0cf" }}>{product.category}</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "#f4f8ff" }}>{product.name}</span>
      </nav>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "32px",
          background: "rgba(16, 25, 43, 0.78)",
          border: "1px solid rgba(0, 229, 255, 0.18)",
          borderRadius: "8px",
          padding: "28px",
        }}
      >
        <div>
          <img
            src={images[0]}
            alt={`${product.name} — ${product.category} in Egypt`}
            width={560}
            height={560}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "8px",
              background: "#05070d",
              border: "1px solid rgba(0, 229, 255, 0.14)",
            }}
          />
        </div>

        <div>
          <p className="category-label" style={{ color: "#00e5ff", textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.12em" }}>
            {product.category} · Authentic Stock in Egypt
          </p>
          <h1 style={{ fontSize: "2rem", margin: "8px 0 12px", color: "#f4f8ff" }}>{product.name}</h1>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#00e5ff", margin: "0 0 12px" }}>
            {formatCurrency(product.price)}
          </p>
          <p style={{ color: product.inStock ? "#34d399" : "#f87171", fontWeight: 600, marginBottom: "16px" }}>
            {product.inStock ? "In stock in Cairo — Cash on Delivery across Egypt" : "Currently out of stock"}
          </p>
          <p style={{ color: "#e5eefc", lineHeight: 1.65, marginBottom: "20px" }}>{product.description}</p>

          {product.specs && product.specs.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1rem", color: "#f4f8ff", marginBottom: "10px" }}>Technical Specifications</h2>
              <ul style={{ paddingLeft: "18px", color: "#9fb0cf", lineHeight: 1.7 }}>
                {product.specs.map((spec) => (
                  <li key={spec}>{spec}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <a
              href={`/#product-${encodeURIComponent(productSlug)}`}
              className="kz-btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 22px",
                borderRadius: "8px",
                background: "#00e5ff",
                color: "#05070d",
                fontWeight: 700,
              }}
            >
              Order with Cash on Delivery →
            </a>
            <Link
              href="/#catalog"
              className="kz-btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 18px",
                borderRadius: "8px",
                border: "1px solid rgba(0, 229, 255, 0.28)",
                color: "#f4f8ff",
              }}
            >
              Browse Full Catalog
            </Link>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section style={{ marginTop: "48px" }} aria-label="Related products">
          <h2 style={{ fontSize: "1.35rem", marginBottom: "16px", color: "#f4f8ff" }}>
            Related {product.category} in Egypt
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {relatedProducts.map((rel) => (
              <a
                key={rel.id}
                href={`/products/${encodeURIComponent(rel.slug || rel.id)}`}
                style={{
                  display: "block",
                  background: "rgba(16, 25, 43, 0.72)",
                  border: "1px solid rgba(0, 229, 255, 0.18)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <img
                  src={rel.imageUrl || rel.imageUrls?.[0] || "/products/kz-castor-bass.png"}
                  alt={rel.name}
                  width={260}
                  height={260}
                  loading="lazy"
                  style={{ width: "100%", height: "auto", borderRadius: "6px", marginBottom: "10px" }}
                />
                <h3 style={{ fontSize: "1rem", color: "#f4f8ff", margin: "0 0 6px" }}>{rel.name}</h3>
                <p style={{ fontSize: "0.95rem", color: "#00e5ff", fontWeight: 700, margin: 0 }}>
                  {formatCurrency(rel.price)}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

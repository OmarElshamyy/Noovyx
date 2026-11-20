import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuideBySlug, SEO_GUIDES } from "../../../lib/seoGuides";
import { formatCurrency, products as defaultProducts } from "../../../products";

export async function generateStaticParams() {
  return SEO_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return { title: "Guide Not Found" };
  }
  const canonicalUrl = `https://noovyx.com/guides/${encodeURIComponent(guide.slug)}`;

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: guide.metaTitle,
      description: guide.metaDescription,
      images: [
        {
          url: guide.image,
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    notFound();
  }

  const baseUrl = "https://noovyx.com";
  const canonicalUrl = `${baseUrl}/guides/${encodeURIComponent(guide.slug)}`;
  const recommendedProducts = defaultProducts.filter((p) =>
    guide.recommendedProductSlugs.includes(p.slug || p.id),
  );

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
            name: "Audio Guides",
            item: `${baseUrl}/#guides`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: guide.title,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        headline: guide.title,
        description: guide.metaDescription,
        image: `${baseUrl}${guide.image}`,
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt,
        author: {
          "@type": "Organization",
          "@id": `${baseUrl}/#organization`,
          name: "Noovyx Audio Team",
          url: baseUrl,
        },
        publisher: {
          "@type": "Organization",
          "@id": `${baseUrl}/#organization`,
          name: "Noovyx",
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/icon`,
          },
        },
        mainEntityOfPage: canonicalUrl,
      },
    ],
  };

  return (
    <main className="storefront-shell" style={{ maxWidth: "920px", margin: "0 auto", padding: "36px 20px 72px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <nav aria-label="Breadcrumb" style={{ marginBottom: "24px", fontSize: "0.88rem", color: "#9fb0cf" }}>
        <Link href="/" style={{ color: "#00e5ff" }}>Noovyx Egypt</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "#f4f8ff" }}>{guide.tag}</span>
      </nav>

      <article
        style={{
          background: "rgba(16, 25, 43, 0.78)",
          border: "1px solid rgba(0, 229, 255, 0.18)",
          borderRadius: "8px",
          padding: "32px 28px",
        }}
      >
        <p style={{ color: "#00e5ff", textTransform: "uppercase", fontSize: "0.78rem", letterSpacing: "0.12em", margin: 0 }}>
          {guide.tag} · {guide.readingTime}
        </p>
        <h1 style={{ fontSize: "2.1rem", color: "#f4f8ff", margin: "10px 0 16px", lineHeight: 1.25 }}>
          {guide.title}
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#9fb0cf", lineHeight: 1.65, marginBottom: "24px" }}>
          {guide.excerpt}
        </p>

        {guide.sections.map((sec) => (
          <section key={sec.heading} style={{ marginTop: "28px" }}>
            <h2 style={{ fontSize: "1.35rem", color: "#f4f8ff", marginBottom: "12px" }}>{sec.heading}</h2>
            {sec.paragraphs.map((p, idx) => (
              <p key={idx} style={{ color: "#e5eefc", lineHeight: 1.7, marginBottom: "14px" }}>
                {p}
              </p>
            ))}
            {sec.bullets && sec.bullets.length > 0 && (
              <ul style={{ paddingLeft: "20px", color: "#9fb0cf", lineHeight: 1.75 }}>
                {sec.bullets.map((b) => (
                  <li key={b} style={{ marginBottom: "6px" }}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      {recommendedProducts.length > 0 && (
        <section style={{ marginTop: "40px" }} aria-label="Recommended hardware">
          <h2 style={{ fontSize: "1.3rem", color: "#f4f8ff", marginBottom: "16px" }}>
            Recommended Gear Available in Egypt (Cash on Delivery)
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "16px",
            }}
          >
            {recommendedProducts.map((product) => (
              <a
                key={product.id}
                href={`/products/${encodeURIComponent(product.slug || product.id)}`}
                style={{
                  display: "block",
                  background: "rgba(16, 25, 43, 0.72)",
                  border: "1px solid rgba(0, 229, 255, 0.18)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <h3 style={{ fontSize: "1rem", color: "#f4f8ff", margin: "0 0 6px" }}>{product.name}</h3>
                <p style={{ fontSize: "0.86rem", color: "#9fb0cf", margin: "0 0 10px" }}>{product.category}</p>
                <p style={{ fontSize: "0.95rem", color: "#00e5ff", fontWeight: 700, margin: 0 }}>
                  {formatCurrency(product.price)}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

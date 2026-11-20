import type { MetadataRoute } from "next";
import { products as defaultProducts } from "../products";
import { getPublicProducts } from "../productService";
import { SEO_GUIDES } from "../lib/seoGuides";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://noovyx.com";
  const lastModified = new Date();

  const liveProducts = await getPublicProducts().catch(() => defaultProducts);
  const activeProducts =
    liveProducts.filter((p) => p.isActive !== false).length > 1
      ? liveProducts.filter((p) => p.isActive !== false)
      : defaultProducts;

  const productEntries: MetadataRoute.Sitemap = activeProducts.map((product) => ({
    url: `${baseUrl}/products/${encodeURIComponent(product.slug || product.id)}`,
    lastModified,
    changeFrequency: "weekly",
    priority: product.featured ? 0.9 : 0.8,
  }));

  const guideEntries: MetadataRoute.Sitemap = SEO_GUIDES.map((guide) => ({
    url: `${baseUrl}/guides/${encodeURIComponent(guide.slug)}`,
    lastModified: new Date(guide.updatedAt),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...productEntries,
    ...guideEntries,
  ];
}

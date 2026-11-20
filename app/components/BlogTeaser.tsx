"use client";

import React from "react";
import { DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig } from "../../storefrontConfig";
import { getGuideByIdOrIndex } from "../../lib/seoGuides";

export function BlogTeaser({
  blogConfig = DEFAULT_STOREFRONT_CONFIG.blog,
}: {
  blogConfig?: StorefrontConfig["blog"];
}) {
  const articles =
    blogConfig.articles?.length > 0
      ? blogConfig.articles
      : DEFAULT_STOREFRONT_CONFIG.blog.articles;

  if (!blogConfig.enabled || articles.length === 0) return null;

  return (
    <section className="blog-teaser" id="guides" aria-label="Audio guides">
      <div className="section-heading">
        <p className="category-label">{blogConfig.kicker}</p>
        <h2>{blogConfig.title}</h2>
        <p className="section-sub">{blogConfig.subtitle}</p>
      </div>

      <div className="blog-grid">
        {articles.map((a, idx) => {
          const matchedGuide = getGuideByIdOrIndex(a.id, idx);
          const href = `/guides/${encodeURIComponent(matchedGuide.slug)}`;
          return (
            <article key={a.id + idx} className="blog-card">
              <a href={href} className="blog-card-img-wrap" style={{ display: "block" }}>
                <img
                  src={a.image}
                  alt={a.title}
                  width={600}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  className="blog-card-img"
                />
              </a>
              <div className="blog-card-content">
                <span className="blog-card-tag">{a.tag}</span>
                <h3>
                  <a href={href}>{a.title}</a>
                </h3>
                <p>{a.excerpt}</p>
                <a href={href} className="blog-card-read-more">
                  {a.readMoreText || "Read Guide →"}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

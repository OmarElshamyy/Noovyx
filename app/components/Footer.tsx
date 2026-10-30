"use client";

import React from "react";
import { DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig } from "../../storefrontConfig";

export function Footer({
  footerConfig = DEFAULT_STOREFRONT_CONFIG.footer,
}: {
  footerConfig?: StorefrontConfig["footer"];
}) {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-inner">
        <div className="footer-brand-col">
          <div className="footer-brand">
            <span className="brand-mark">{footerConfig.brandMark || "NX"}</span>
            <span>{footerConfig.brandName || "Noovyx"}</span>
          </div>
          <p className="footer-brand-desc">{footerConfig.description}</p>
        </div>
        <div className="footer-links-col">
          <h4>Shop</h4>
          <ul>
            <li><a href="#bestsellers">Best Sellers</a></li>
            <li><a href="#catalog">All Products</a></li>
            <li><a href="#sound-finder">Find Ideal Earphones</a></li>
          </ul>
        </div>
        <div className="footer-links-col">
          <h4>Categories</h4>
          <ul>
            <li><a href="#catalog">IEMs</a></li>
            <li><a href="#catalog">Wireless</a></li>
            <li><a href="#catalog">Cables</a></li>
            <li><a href="#catalog">Ear Tips</a></li>
            <li><a href="#catalog">Cases</a></li>
            <li><a href="#catalog">DACs</a></li>
          </ul>
        </div>
        <div className="footer-links-col">
          <h4>Information</h4>
          <ul>
            <li><a href="#top">About the Store</a></li>
            <li><a href="#catalog">How to Order</a></li>
            <li><a href="#catalog">Cash on Delivery</a></li>
            <li><a href="/admin">Admin Portal</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {currentYear} {footerConfig.copyrightText}</p>
        <p className="footer-disclaimer">{footerConfig.disclaimerText}</p>
      </div>
    </footer>
  );
}

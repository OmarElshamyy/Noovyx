"use client";

import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig } from "../../storefrontConfig";

export function Footer({
  footerConfig = DEFAULT_STOREFRONT_CONFIG.footer,
}: {
  footerConfig?: StorefrontConfig["footer"];
}) {
  const currentYear = new Date().getFullYear();
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [gateError, setGateError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hidden keyboard shortcut: Ctrl + Shift + K (or Ctrl + Alt + A)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "k") ||
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a")
      ) {
        e.preventDefault();
        setGateError("");
        setAccessKey("");
        setIsGateOpen(true);
      } else if (e.key === "Escape" && isGateOpen) {
        setIsGateOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGateOpen]);

  useEffect(() => {
    if (isGateOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isGateOpen]);

  function handleSecretBrandTap() {
    tapCountRef.current += 1;
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setGateError("");
      setAccessKey("");
      setIsGateOpen(true);
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1800);
  }

  async function handleUnlockGate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessKey.trim() || isVerifying) return;
    setIsVerifying(true);
    setGateError("");

    try {
      const res = await fetch("/api/admin-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setGateError(data.error || "Access denied.");
        setIsVerifying(false);
        return;
      }

      setAccessKey("");
      setIsGateOpen(false);
      window.location.href = data.redirectTo || "/admin";
    } catch {
      setGateError("Network error while verifying key.");
      setIsVerifying(false);
    }
  }

  const showFooter = footerConfig.enabled !== false;

  return (
    <>
      {showFooter && (
        <footer className="site-footer" aria-label="Site footer">
      <div className="footer-inner">
        <div className="footer-brand-col">
          <div className="footer-brand">
            <span
              className="brand-mark"
              onClick={handleSecretBrandTap}
              style={{ userSelect: "none", cursor: "default" }}
            >
              {footerConfig.brandMark || "NX"}
            </span>
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
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {currentYear} {footerConfig.copyrightText}</p>
        <p className="footer-disclaimer">{footerConfig.disclaimerText}</p>
      </div>
        </footer>
      )}

      {isGateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Operator Security Gate"
          onClick={() => setIsGateOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(3, 6, 14, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleUnlockGate}
            style={{
              width: "100%",
              maxWidth: "380px",
              background: "#0a101e",
              border: "1px solid rgba(0, 229, 255, 0.28)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: "#00e5ff", fontWeight: 700 }}>
                OPERATOR SECURITY GATE
              </span>
              <button
                type="button"
                onClick={() => setIsGateOpen(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#94a3b8", marginBottom: "14px" }}>
              Enter your server access passkey to unlock the command portal session.
            </p>
            <input
              ref={inputRef}
              type="password"
              autoComplete="off"
              placeholder="Enter ADMIN_ACCESS_KEY..."
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#05070d",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                marginBottom: "10px",
              }}
              required
            />
            {gateError && (
              <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "10px" }}>
                ⚠ {gateError}
              </p>
            )}
            <button
              type="submit"
              className="primary-button wide"
              disabled={isVerifying}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {isVerifying ? "Verifying..." : "Unlock Command Portal"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

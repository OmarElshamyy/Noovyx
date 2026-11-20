"use client";

import React from "react";

export const STOREFRONT_FAQS = [
  {
    question: "Does Noovyx offer Cash on Delivery (COD) across Egypt?",
    answer:
      "Yes. Noovyx delivers to all Egyptian governorates (including Cairo, Giza, Alexandria, Mansoura, Tanta, Zagazig, and Upper Egypt) with Cash on Delivery (COD). No online credit card is required.",
  },
  {
    question: "How fast is shipping within Egypt?",
    answer:
      "Orders are confirmed via phone or WhatsApp and typically delivered within 24 to 72 hours across Cairo, Giza, Alexandria, and Delta governorates.",
  },
  {
    question: "Are all KZ and Hi-Fi In-Ear Monitors on Noovyx 100% authentic?",
    answer:
      "Yes. Every IEM, upgrade cable, Bluetooth adapter, and Type-C DAC sold on Noovyx (noovyx.com) is sourced directly, factory-sealed, and quality-checked for driver channel balance before dispatch.",
  },
  {
    question: "Which IEMs are best for competitive gaming and studio music monitoring?",
    answer:
      "For competitive gaming (Valorant, CS2, Call of Duty), dual-driver and hybrid models like the KZ Castor Bass Edition, KZ ZSN Pro X, and KZ ZS10 Pro 2 provide pinpoint 3D footstep imaging and zero-latency wired response.",
  },
];

export function FaqSection() {
  return (
    <section className="section faq-section" id="faq" aria-label="Frequently Asked Questions">
      <div className="kz-section-container">
        <div className="section-heading">
          <p className="category-label">Answers &amp; ordering guide</p>
          <h2>Frequently asked questions</h2>
          <p className="section-sub">
            Ordering authentic In-Ear Monitors (IEMs), Type-C DACs, and upgrade cables in Egypt with Cash on Delivery.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          {STOREFRONT_FAQS.map((item, idx) => (
            <article
              key={idx}
              style={{
                background: "rgba(16, 25, 43, 0.72)",
                border: "1px solid rgba(0, 229, 255, 0.18)",
                borderRadius: "8px",
                padding: "20px 22px",
              }}
            >
              <h3 style={{ fontSize: "1.02rem", fontWeight: 700, color: "#f4f8ff", marginBottom: "10px" }}>
                {item.question}
              </h3>
              <p style={{ fontSize: "0.92rem", color: "#9fb0cf", lineHeight: 1.6, margin: 0 }}>
                {item.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

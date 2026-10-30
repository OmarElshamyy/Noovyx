import { ImageResponse } from "next/og";

export const alt = "Noovyx | Pro Audio & IEM Store Egypt (noovyx.com)";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #05070d 0%, #09152b 55%, #0c0720 100%)",
          color: "#f4f8ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "14px",
              background: "rgba(0, 229, 255, 0.12)",
              border: "2px solid #00e5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00e5ff",
              fontSize: "28px",
              fontWeight: 900,
            }}
          >
            NX
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "34px", fontWeight: 900, letterSpacing: "0.08em", color: "#ffffff" }}>
              NOOVYX
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.22em", color: "#00e5ff" }}>
              PRO AUDIO // EGYPT | NOOVYX.COM
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "920px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "999px",
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid rgba(0, 229, 255, 0.35)",
              color: "#00e5ff",
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              alignSelf: "flex-start",
            }}
          >
            AUTHENTIC IEMS | HI-FI DACS | GAMING & STUDIO GEAR
          </div>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 900,
              lineHeight: 1.08,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            Precision In-Ear Monitors & Portable Audio in Egypt
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              lineHeight: 1.4,
            }}
          >
            KZ Castor | ZS10 Pro 2 | ZSN Pro X | Wireless Earhooks | Type-C DACs | Upgrade Cables
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid rgba(0, 229, 255, 0.2)",
            fontSize: "20px",
            fontWeight: 700,
            color: "#cbd5e1",
          }}
        >
          <span>EGYPT-WIDE DOOR-TO-DOOR DELIVERY</span>
          <span style={{ color: "#00e5ff" }}>CASH ON DELIVERY AVAILABLE</span>
          <span>4.9 / 5.0 VERIFIED RATING</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

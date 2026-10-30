import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #05070d 0%, #0b162c 100%)",
          border: "2px solid #00e5ff",
          borderRadius: "7px",
          color: "#00e5ff",
          fontSize: 14,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          fontFamily: "sans-serif",
        }}
      >
        NX
      </div>
    ),
    {
      ...size,
    }
  );
}

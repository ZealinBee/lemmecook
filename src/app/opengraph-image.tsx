import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: hands-free, voice-guided cooking`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#faf9f5",
          color: "#141413",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 4, color: "#d97757", textTransform: "uppercase" }}>{SITE_NAME}</div>
        <div style={{ marginTop: 24, fontSize: 88, lineHeight: 1.05, fontWeight: 600 }}>Cook hands-free, one step at a time</div>
        <div style={{ marginTop: 32, fontSize: 36, color: "#73726c" }}>
          Say “next”, set timers and hear recipes read aloud.
        </div>
      </div>
    ),
    size,
  );
}

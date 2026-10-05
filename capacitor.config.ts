import type { CapacitorConfig } from "@capacitor/cli";

// The app is a native shell around the live site: API routes, Stripe webhooks and auth all need the
// Next.js server, so the WebView loads the deployed origin instead of a bundled export.
const serverUrl = process.env.CAP_SERVER_URL;
if (!serverUrl) throw new Error("Set CAP_SERVER_URL to the production origin, e.g. CAP_SERVER_URL=https://lemmecook.app npx cap sync");

const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID ?? "app.lemmecook",
  appName: "Lemme Cook",
  // Only shown if the site can't be reached at all.
  webDir: "capacitor/www",
  server: {
    url: serverUrl,
    // Keep Supabase and Google sign-in pages from replacing the app; they open in a Custom Tab instead.
    allowNavigation: [new URL(serverUrl).host],
    errorPath: "offline.html",
  },
  android: {
    // Vosk's WASM recognizer and modern CSS need a reasonably recent Chrome WebView.
    minWebViewVersion: 100,
  },
};

export default config;

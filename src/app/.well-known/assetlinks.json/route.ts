import { PLAY_PACKAGE_NAME } from "@/lib/google-play";

/**
 * Digital Asset Links: lets Android open this site's sign-in links in the app.
 * ANDROID_CERT_SHA256 is a comma-separated list of signing-cert fingerprints
 * (Play Console → App integrity → App signing, plus your upload/debug key for local builds).
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: PLAY_PACKAGE_NAME, sha256_cert_fingerprints: fingerprints },
    },
  ]);
}

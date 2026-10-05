This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Android app

`android/` is a [Capacitor](https://capacitorjs.com) shell whose WebView loads the deployed site, so API
routes, auth and billing keep running on the Next.js server. Native plugins cover what Android's WebView lacks:
keep-screen-on, text to speech, Google Play Billing, and Custom Tabs for Google sign-in.

Requirements: Android Studio (with its bundled JDK 21) and the Android SDK.

```bash
export CAP_SERVER_URL=https://your-domain   # production origin; also used for App Links
npm run android:sync                         # after changing plugins or capacitor.config.ts
npm run android:open                         # build, run and bundle (.aab) from Android Studio
```

Release signing: copy `android/keystore.properties.example` to `android/keystore.properties` and fill it in.

### One-time setup

- **Play Console**: create the app `app.lemmecook` and a subscription product `premium` with base plans
  `monthly` and `yearly` (IDs live in `src/lib/plans.ts`). Add license testers so test purchases are free.
- **Service account**: in Google Cloud, enable the Google Play Android Developer API and create a service account
  with a JSON key. In Play Console → Users and permissions, invite it with "View financial data" and
  "Manage orders and subscriptions".
- **Real-time notifications**: create a Pub/Sub topic, grant `google-play-developer-notifications@system.gserviceaccount.com`
  the Publisher role, and set it in Play Console → Monetization setup. Add a push subscription to
  `https://your-domain/api/play/rtdn?secret=$PLAY_RTDN_SECRET`.
- **Supabase**: run the migrations, and add `app.lemmecook://auth` to Auth → URL Configuration → Redirect URLs.
- **Server env vars**:
  - `GOOGLE_PLAY_SERVICE_ACCOUNT`: the service account's JSON key, as one line
  - `GOOGLE_PLAY_PACKAGE_NAME`: optional, defaults to `app.lemmecook`
  - `PLAY_RTDN_SECRET`: a long random string, matching the push URL
  - `ANDROID_CERT_SHA256`: comma-separated SHA-256 signing fingerprints (Play Console → App integrity, plus
    your local debug key) for `/.well-known/assetlinks.json`, so email sign-in links open the app

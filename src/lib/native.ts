"use client";

import { Capacitor } from "@capacitor/core";

/** True inside the Android app shell (the native bridge is injected into the WebView); false on the web. */
export const isAndroidApp = () => Capacitor.getPlatform() === "android";

/** Custom-scheme URL Google sign-in returns to, since Google blocks OAuth inside WebViews. */
export const NATIVE_AUTH_CALLBACK = "app.lemmecook://auth";

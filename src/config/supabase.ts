import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    "Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const timeoutMs = 15000;
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : undefined;

  const timeout = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  try {
    return await fetch(input, {
      ...init,
      signal: controller?.signal ?? init?.signal,
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://example.supabase.co",
  supabasePublishableKey ?? "missing-publishable-key",
  {
    global: {
      fetch: fetchWithTimeout,
    },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

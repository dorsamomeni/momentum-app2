import type { User } from "@supabase/supabase-js";

import { supabase } from "../config/supabase";

export type MomentumUser = {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  metadata?: {
    creationTime?: string;
  };
};

type AuthListener = (user: MomentumUser | null) => void;

const listeners = new Set<AuthListener>();

const toMomentumUser = (user: User | null): MomentumUser | null => {
  if (!user) return null;

  return {
    uid: user.id,
    id: user.id,
    email: user.email ?? null,
    displayName:
      (user.user_metadata?.display_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      null,
    metadata: {
      creationTime: user.created_at,
    },
  };
};

const notify = (user: MomentumUser | null) => {
  auth.currentUser = user;
  listeners.forEach((listener) => listener(user));
};

export const auth = {
  currentUser: null as MomentumUser | null,
  onAuthStateChanged(listener: AuthListener) {
    listeners.add(listener);
    listener(this.currentUser);

    return () => {
      listeners.delete(listener);
    };
  },
};

supabase.auth.getSession().then(({ data }) => {
  notify(toMomentumUser(data.session?.user ?? null));
});

supabase.auth.onAuthStateChange((_event, session) => {
  notify(toMomentumUser(session?.user ?? null));
});

export const db = {
  provider: "supabase",
} as const;

export const setCurrentUser = (user: User | null) => {
  notify(toMomentumUser(user));
};

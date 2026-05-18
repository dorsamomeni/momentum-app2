import { supabase } from "../config/supabase";
import { auth, setCurrentUser, type MomentumUser } from "./firebase";

export const getAuth = () => auth;

export const signInWithEmailAndPassword = async (
  _auth: typeof auth,
  email: string,
  password: string,
) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw { code: "auth/wrong-password", message: error.message };
  }

  setCurrentUser(data.user);
  return { user: auth.currentUser as MomentumUser };
};

export const createUserWithEmailAndPassword = async (
  _auth: typeof auth,
  email: string,
  password: string,
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    const code = error.message.toLowerCase().includes("registered")
      ? "auth/email-already-in-use"
      : "auth/unknown";
    throw { code, message: error.message };
  }

  setCurrentUser(data.user);
  return { user: auth.currentUser as MomentumUser };
};

export const updateProfile = async (
  user: MomentumUser,
  profile: { displayName?: string },
) => {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: profile.displayName,
      full_name: profile.displayName,
    },
  });

  if (error) {
    throw { code: "auth/update-profile-failed", message: error.message };
  }

  setCurrentUser(data.user);
  return user;
};

export const signOut = async (_auth: typeof auth) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw { code: "auth/sign-out-failed", message: error.message };
  }

  setCurrentUser(null);
};

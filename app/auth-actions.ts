"use server";

import { signIn, signOut } from "@/auth";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = formData.get("callbackUrl");
  await signIn("google", {
    redirectTo: getSafeRedirectPath(typeof callbackUrl === "string" ? callbackUrl : undefined),
  });
}

export async function signOutCurrentUser() {
  await signOut({ redirectTo: "/" });
}
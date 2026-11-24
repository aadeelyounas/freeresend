"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPageClient() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if user is already logged in
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  // The form is in the server HTML: waiting for the sign-in check before showing it cost over a second on a slow phone.
  // Don't show login form if user is authenticated (they'll be redirected)
  if (user) {
    return null;
  }

  return <LoginForm />;
}
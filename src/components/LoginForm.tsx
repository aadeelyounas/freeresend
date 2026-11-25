"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { inputClass, labelClass, primaryButton } from "./ui/styles";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read from the form: a password manager can fill it before React is ready, so state would miss the values.
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError("");

    try {
      await login(String(form.get("email")), String(form.get("password")));
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">Sign in to FreeResend</h1>
          <p className="mt-2 text-center text-sm text-gray-600">Your self-hosted email service</p>
        </div>
        {/* post: a submit before React is ready must not put the password in the address */}
        <form method="post" className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={`mt-1 ${inputClass}`}
            />
          </div>

          {error && (
            <p role="alert" className="text-center text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className={`w-full ${primaryButton}`}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

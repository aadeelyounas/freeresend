import React from "react";
import { secondaryButton } from "./styles";

export function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-16 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-white px-4 py-8 text-center">
      <p className="text-sm text-gray-900">Could not load {what}.</p>
      <button type="button" onClick={onRetry} className={`${secondaryButton} mt-4`}>
        Try again
      </button>
    </div>
  );
}

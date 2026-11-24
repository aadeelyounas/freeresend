import React from "react";
import { X } from "lucide-react";

export interface NoticeState {
  type: "success" | "error";
  text: string;
}

export const errorNotice = (error: unknown, fallback: string): NoticeState => ({
  type: "error",
  text: (error as { message?: string })?.message || fallback,
});

/** The result of an action. The live region stays mounted, so screen readers announce what is put in it. */
export default function Notice({ notice, onDismiss }: { notice: NoticeState | null; onDismiss: () => void }) {
  const error = notice?.type === "error";
  return (
    <div aria-live={error ? "assertive" : "polite"}>
      {notice && (
        <div
          className={`flex items-start justify-between gap-4 rounded-md border p-4 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <p className="min-w-0 break-words">
            <strong>{error ? "Error: " : "Done: "}</strong>
            {notice.text}
          </p>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={onDismiss}
            className="rounded-md p-1 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

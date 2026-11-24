"use client";

import React, { useId, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}

/** A native modal dialog: the browser traps focus, closes on Escape and returns focus to the opener. */
export default function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    // Closed before it leaves the page, so that focus goes back to the opener.
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`m-auto w-11/12 overflow-y-auto rounded-lg bg-white p-4 text-gray-900 shadow-lg backdrop:bg-gray-900/50 sm:p-6 ${
        wide ? "max-w-4xl" : "max-w-2xl"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 id={titleId} className="min-w-0 text-lg font-medium break-words">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-md p-1 text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {children}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">{footer}</div>
    </dialog>
  );
}

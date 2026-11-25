"use client";

import React from "react";
import Modal from "./ui/Modal";
import StatusBadge from "./ui/StatusBadge";
import { secondaryButton } from "./ui/styles";
import type { EmailLog } from "./EmailLogsTab";

export default function EmailDetailDialog({ email, onClose }: { email: EmailLog; onClose: () => void }) {
  return (
    <Modal
      title="Email details"
      wide
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={secondaryButton}>
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-gray-700">From</dt>
            <dd className="mt-1 break-words">{email.from_email}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={email.status} />
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">To</dt>
            <dd className="mt-1 break-words">{email.to_emails.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Created</dt>
            <dd className="mt-1">{new Date(email.created_at).toLocaleString()}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-700">Subject</dt>
            <dd className="mt-1 break-words">{email.subject || "(No subject)"}</dd>
          </div>
          {email.error_message && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-red-700">Error</dt>
              <dd className="mt-1 break-words text-red-700">{email.error_message}</dd>
            </div>
          )}
        </dl>

        {email.html_content && (
          <section>
            <h3 className="font-medium text-gray-700">HTML content</h3>
            {/* Sandboxed: the email's HTML is not ours, and its scripts would otherwise run in the dashboard's origin,
                where the admin token is stored. */}
            <iframe
              sandbox=""
              srcDoc={email.html_content}
              className="mt-1 h-64 w-full rounded border border-gray-200 bg-white"
              title="Email HTML content"
            />
          </section>
        )}

        {email.text_content && (
          <section>
            <h3 className="font-medium text-gray-700">Text content</h3>
            <div
              role="region"
              aria-label="Text content"
              tabIndex={0}
              className="mt-1 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 break-words whitespace-pre-wrap focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              {email.text_content}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

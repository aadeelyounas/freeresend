"use client";

import React from "react";
import Modal from "./ui/Modal";
import Notice, { type NoticeState } from "./ui/Notice";
import { dangerButton, secondaryButton } from "./ui/styles";
import type { Domain } from "./DomainsTab";

interface SmtpDialogProps {
  domain: Domain;
  credentials: NonNullable<Domain["smtp_credentials"]>;
  notice: NoticeState | null;
  onDismissNotice: () => void;
  deleting: boolean;
  onDelete: () => void;
  onClose: () => void;
}

export default function SmtpDialog({
  domain,
  credentials,
  notice,
  onDismissNotice,
  deleting,
  onDelete,
  onClose,
}: SmtpDialogProps) {
  const rows: [string, string | number][] = [
    ["Server", credentials.server],
    ["Port", credentials.port],
    ["Username", credentials.username],
    ["Password", credentials.password],
  ];

  return (
    <Modal
      title={`SMTP credentials for ${domain.domain}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onDelete} disabled={deleting} className={dangerButton}>
            {deleting ? "Deleting..." : "Delete Credentials"}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            Close
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Notice notice={notice} onDismiss={onDismissNotice} />
        <p className="text-sm text-gray-600">Use these credentials to send emails via SMTP:</p>
        <dl className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
          {rows.map(([name, value]) => (
            <div key={name}>
              <dt className="font-medium text-gray-700">{name}</dt>
              <dd className="mt-1 rounded border border-gray-200 bg-white p-2 font-mono text-xs break-all">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>Keep these private.</strong> Anyone with them can send email from this domain.
        </p>
      </div>
    </Modal>
  );
}

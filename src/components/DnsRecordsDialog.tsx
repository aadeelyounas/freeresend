"use client";

import React from "react";
import Modal from "./ui/Modal";
import Notice, { type NoticeState } from "./ui/Notice";
import { primaryButton, secondaryButton } from "./ui/styles";
import type { Domain } from "./DomainsTab";

interface DnsRecordsDialogProps {
  domain: Domain;
  notice: NoticeState | null;
  onDismissNotice: () => void;
  syncing: boolean;
  onSync: () => void;
  onVerify: () => void;
  onClose: () => void;
}

export default function DnsRecordsDialog({
  domain,
  notice,
  onDismissNotice,
  syncing,
  onSync,
  onVerify,
  onClose,
}: DnsRecordsDialogProps) {
  return (
    <Modal
      title={`DNS records for ${domain.domain}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>
            Close
          </button>
          <button type="button" onClick={onSync} disabled={syncing} className={secondaryButton}>
            {syncing ? "Syncing..." : "Sync to DigitalOcean"}
          </button>
          <button type="button" onClick={onVerify} className={primaryButton}>
            Check Verification
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Notice notice={notice} onDismiss={onDismissNotice} />
        <p className="text-sm text-gray-600">
          Add these DNS records to your domain provider to verify ownership and enable email sending:
        </p>
        <ul className="space-y-4">
          {domain.dns_records?.map((record, index) => (
            <li key={index} className="rounded-lg bg-gray-50 p-4">
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-[4rem_1fr_1fr]">
                <div>
                  <dt className="font-medium text-gray-700">Type</dt>
                  <dd className="mt-1">{record.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Name</dt>
                  <dd className="mt-1 break-all">{record.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Value</dt>
                  <dd className="mt-1 rounded border border-gray-200 bg-white p-2 font-mono text-xs break-all">
                    {record.value}
                  </dd>
                </div>
              </dl>
              {record.description && <p className="mt-2 text-xs text-gray-600">{record.description}</p>}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

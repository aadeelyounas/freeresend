"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import DnsRecordsDialog from "./DnsRecordsDialog";
import SmtpDialog from "./SmtpDialog";
import { ListSkeleton, LoadError } from "./ui/LoadState";
import Notice, { errorNotice, type NoticeState } from "./ui/Notice";
import StatusBadge from "./ui/StatusBadge";
import { dangerLinkButton, inputClass, labelClass, linkButton, primaryButton } from "./ui/styles";

export interface Domain {
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed";
  dns_records: Array<{
    type: string;
    name: string;
    value: string;
    ttl?: number;
    description?: string;
  }>;
  smtp_credentials?: {
    username: string;
    password: string;
    server: string;
    port: number;
  };
  created_at: string;
}

export default function DomainsTab() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [showDNSModal, setShowDNSModal] = useState<Domain | null>(null);
  const [syncingToDO, setSyncingToDO] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState<Domain | null>(null);
  const [generatingSmtp, setGeneratingSmtp] = useState<string | null>(null);
  const [deletingSmtp, setDeletingSmtp] = useState(false);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const response = await api.getDomains();
      setDomains(response.data.domains);
      setLoadFailed(false);
    } catch (error) {
      console.error("Failed to load domains:", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setNotice(null);
    setAddingDomain(true);
    try {
      const response = await api.addDomain(newDomain.trim());
      setDomains([response.data.domain, ...domains]);
      setNewDomain("");
      setShowDNSModal(response.data.domain);
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to add domain"));
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await api.verifyDomain(domainId);
      await loadDomains(); // Refresh domains list
      setNotice({ type: "success", text: response.message });
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to verify domain"));
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;

    try {
      await api.deleteDomain(domainId);
      setDomains(domains.filter((d) => d.id !== domainId));
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to delete domain"));
    }
  };

  const handleSyncToDigitalOcean = async (domainId: string) => {
    if (
      !confirm(
        "This will create DNS records in your DigitalOcean account. Continue?"
      )
    )
      return;

    setNotice(null);
    setSyncingToDO(true);
    try {
      const response = await api.retryDigitalOceanDNS(domainId);
      setNotice({ type: "success", text: response.message });
      // Optionally refresh domains to show updated status
      await loadDomains();
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to sync to DigitalOcean"));
    } finally {
      setSyncingToDO(false);
    }
  };

  const handleGenerateSmtp = async (domainId: string) => {
    setNotice(null);
    setGeneratingSmtp(domainId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/domains/${domainId}/smtp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate SMTP credentials");
      }

      await loadDomains();
      const updatedDomain = domains.find((d) => d.id === domainId);
      if (updatedDomain) {
        setShowSmtpModal({ ...updatedDomain, smtp_credentials: data.credentials });
      }
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to generate SMTP credentials"));
    } finally {
      setGeneratingSmtp(null);
    }
  };

  const handleDeleteSmtp = async (domainId: string) => {
    if (!confirm("Are you sure you want to delete these SMTP credentials? This will remove the IAM user from AWS.")) return;

    setNotice(null);
    setDeletingSmtp(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/domains/${domainId}/smtp`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete SMTP credentials");
      }

      await loadDomains();
      setShowSmtpModal(null);
      setNotice({ type: "success", text: "SMTP credentials deleted" });
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to delete SMTP credentials"));
    } finally {
      setDeletingSmtp(false);
    }
  };

  const openDns = (domain: Domain | null) => {
    setNotice(null);
    setShowDNSModal(domain);
  };

  const openSmtp = (domain: Domain | null) => {
    setNotice(null);
    setShowSmtpModal(domain);
  };

  const dismissNotice = () => setNotice(null);

  if (loading) {
    return <ListSkeleton label="Loading domains..." />;
  }

  // A failed refresh keeps the list that is already shown.
  if (loadFailed && domains.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Domains</h1>
        <LoadError
          what="domains"
          onRetry={() => {
            setLoading(true);
            loadDomains();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Domains</h1>
          <p className="mt-2 text-sm text-gray-700">
            Add and manage your email domains. Domains must be verified before
            you can send emails.
          </p>
        </div>
      </div>

      {!showDNSModal && !showSmtpModal && <Notice notice={notice} onDismiss={dismissNotice} />}

      {/* Add Domain Form */}
      <section className="rounded-lg border border-gray-200 bg-white px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900">Add New Domain</h2>
        <form onSubmit={handleAddDomain} className="mt-4 gap-3 sm:flex sm:items-end">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="new-domain" className={labelClass}>
              Domain you want to send emails from
            </label>
            <input
              id="new-domain"
              type="text"
              autoComplete="off"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className={`mt-1 ${inputClass}`}
              disabled={addingDomain}
            />
          </div>
          <button
            type="submit"
            disabled={addingDomain || !newDomain.trim()}
            className={`mt-3 w-full sm:mt-0 sm:w-auto ${primaryButton}`}
          >
            {addingDomain ? "Adding..." : "Add Domain"}
          </button>
        </form>
      </section>

      {/* Domains List */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {domains.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-600">
            No domains added yet. Add your first domain to get started.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <li
                key={domain.id}
                className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <StatusBadge status={domain.status} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium break-words text-gray-900">{domain.domain}</div>
                    <div className="text-sm text-gray-600">
                      Added {new Date(domain.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {domain.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openDns(domain)}
                        aria-label={`View DNS Records for ${domain.domain}`}
                        className={linkButton}
                      >
                        View DNS Records
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyDomain(domain.id)}
                        aria-label={`Check Verification of ${domain.domain}`}
                        className={linkButton}
                      >
                        Check Verification
                      </button>
                    </>
                  )}
                  {domain.status === "verified" &&
                    (domain.smtp_credentials ? (
                      <button
                        type="button"
                        onClick={() => openSmtp(domain)}
                        aria-label={`View SMTP credentials for ${domain.domain}`}
                        className={linkButton}
                      >
                        View SMTP
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGenerateSmtp(domain.id)}
                        disabled={generatingSmtp !== null}
                        aria-label={`Generate SMTP credentials for ${domain.domain}`}
                        className={linkButton}
                      >
                        {generatingSmtp === domain.id ? "Generating..." : "Generate SMTP"}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => handleDeleteDomain(domain.id)}
                    aria-label={`Delete ${domain.domain}`}
                    className={dangerLinkButton}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showDNSModal && (
        <DnsRecordsDialog
          domain={showDNSModal}
          notice={notice}
          onDismissNotice={dismissNotice}
          syncing={syncingToDO}
          onSync={() => handleSyncToDigitalOcean(showDNSModal.id)}
          onVerify={() => {
            handleVerifyDomain(showDNSModal.id);
            openDns(null);
          }}
          onClose={() => openDns(null)}
        />
      )}

      {showSmtpModal?.smtp_credentials && (
        <SmtpDialog
          domain={showSmtpModal}
          credentials={showSmtpModal.smtp_credentials}
          notice={notice}
          onDismissNotice={dismissNotice}
          deleting={deletingSmtp}
          onDelete={() => handleDeleteSmtp(showSmtpModal.id)}
          onClose={() => openSmtp(null)}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import EmailDetailDialog from "./EmailDetailDialog";
import { ListSkeleton, LoadError } from "./ui/LoadState";
import Notice, { errorNotice, type NoticeState } from "./ui/Notice";
import StatusBadge from "./ui/StatusBadge";
import { inputClass, labelClass, secondaryButton } from "./ui/styles";

export interface EmailLog {
  id: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  status:
    | "pending"
    | "sent"
    | "failed"
    | "delivered"
    | "bounced"
    | "complained";
  created_at: string;
  domains?: { domain: string };
  api_keys?: { key_name: string };
  html_content?: string;
  text_content?: string;
  error_message?: string;
}

interface Domain {
  id: string;
  domain: string;
}

export default function EmailLogsTab() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const latestRequest = useRef(0);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [filters, setFilters] = useState({
    domain_id: "",
    status: "",
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const loadDomains = async () => {
    try {
      const response = await api.getDomains();
      setDomains(response.data.domains);
    } catch (error) {
      console.error("Failed to load domains:", error);
    }
  };

  const loadEmails = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== "")
      );
      const response = await api.getEmailLogs(params);
      // A slower answer for older filters must not replace this one.
      if (request !== latestRequest.current) return;
      setEmails(response.data.emails);
      setPagination(response.data.pagination);
      setLoaded(true);
      setLoadFailed(false);
    } catch (error) {
      if (request !== latestRequest.current) return;
      console.error("Failed to load emails:", error);
      setLoadFailed(true);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const handleEmailClick = async (emailId: string) => {
    setNotice(null);
    try {
      const response = await api.getEmail(emailId);
      setSelectedEmail(response.data.email);
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to load email details"));
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const filtered = filters.domain_id !== "" || filters.status !== "";

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Email Logs</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and monitor all emails sent through your FreeResend instance.
          </p>
        </div>
      </div>

      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="domain-filter"
                className={labelClass}
              >
                Domain
              </label>
              <select
                id="domain-filter"
                value={filters.domain_id}
                onChange={(e) =>
                  setFilters({ ...filters, domain_id: e.target.value, page: 1 })
                }
                className={`mt-1 ${inputClass}`}
              >
                <option value="">All domains</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className={labelClass}
              >
                Status
              </label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value, page: 1 })
                }
                className={`mt-1 ${inputClass}`}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
                <option value="complained">Complained</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="limit-filter"
                className={labelClass}
              >
                Per Page
              </label>
              <select
                id="limit-filter"
                value={filters.limit}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    limit: parseInt(e.target.value),
                    page: 1,
                  })
                }
                className={`mt-1 ${inputClass}`}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Email List: kept on screen while a refresh runs */}
      {loadFailed ? (
        <LoadError what="email logs" onRetry={loadEmails} />
      ) : !loaded ? (
        <ListSkeleton label="Loading email logs..." />
      ) : (
        <div aria-busy={loading} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <p role="status" className="sr-only">
            {loading ? "Loading email logs..." : `${pagination.total} emails`}
          </p>
          {emails.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-600">
              {filtered
                ? "No emails match these filters."
                : "No emails found. Start sending emails to see them here."}
            </p>
          ) : (
            <ul className={`divide-y divide-gray-200 ${loading ? "opacity-60" : ""}`}>
              {emails.map((email) => (
                <li key={email.id} className="hover:bg-gray-50">
                  <button
                    type="button"
                    onClick={() => handleEmailClick(email.id)}
                    className="block w-full px-4 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:px-6"
                  >
                    <span className="flex items-center justify-between gap-4">
                      <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                        {email.subject || "(No subject)"}
                      </span>
                      <StatusBadge status={email.status} />
                    </span>
                    <span className="mt-1 block text-sm break-words text-gray-600">From: {email.from_email}</span>
                    <span className="block text-sm break-words text-gray-600">To: {email.to_emails.join(", ")}</span>
                    <span className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-600">
                      <span>{email.domains?.domain}</span>
                      <span>{email.api_keys?.key_name}</span>
                      <span>{new Date(email.created_at).toLocaleString()}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav
              aria-label="Email log pages"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:px-6"
            >
              <p className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} emails)
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={loading || pagination.page <= 1}
                  className={secondaryButton}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={loading || pagination.page >= pagination.totalPages}
                  className={secondaryButton}
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </div>
      )}

      {selectedEmail && <EmailDetailDialog email={selectedEmail} onClose={() => setSelectedEmail(null)} />}
    </div>
  );
}

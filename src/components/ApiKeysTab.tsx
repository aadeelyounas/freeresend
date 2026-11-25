"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ListSkeleton, LoadError } from "./ui/LoadState";
import Notice, { errorNotice, type NoticeState } from "./ui/Notice";
import { dangerLinkButton, inputClass, labelClass, linkButton, primaryButton, secondaryButton } from "./ui/styles";

interface Domain {
  id: string;
  domain: string;
  status: string;
}

interface ApiKey {
  id: string;
  domain_id: string;
  key_name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at?: string;
  created_at: string;
  domains?: { domain: string };
}

export default function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState({
    domainId: "",
    keyName: "",
    permissions: ["send"],
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [apiKeysResponse, domainsResponse] = await Promise.all([
        api.getApiKeys(),
        api.getDomains(),
      ]);
      setApiKeys(apiKeysResponse.data.apiKeys);
      setDomains(
        domainsResponse.data.domains.filter(
          (d: Domain) => d.status === "verified"
        )
      );
      setLoadFailed(false);
    } catch (error) {
      console.error("Failed to load data:", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.domainId || !newKey.keyName.trim()) return;

    setNotice(null);
    setCreating(true);
    try {
      const response = await api.createApiKey(
        newKey.domainId,
        newKey.keyName.trim(),
        newKey.permissions
      );
      setApiKeys([response.data.apiKey, ...apiKeys]);
      setCreatedKey(response.data.apiKey.key);
      setNewKey({ domainId: "", keyName: "", permissions: ["send"] });
      setShowCreateForm(false);
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to create API key"));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this API key? This action cannot be undone."
      )
    )
      return;

    try {
      await api.deleteApiKey(keyId);
      setApiKeys(apiKeys.filter((k) => k.id !== keyId));
    } catch (error: unknown) {
      setNotice(errorNotice(error, "Failed to delete API key"));
    }
  };

  const maskApiKey = (keyPrefix: string) => {
    return `${keyPrefix}_${"*".repeat(32)}`;
  };

  const copyCreatedKey = async () => {
    try {
      await navigator.clipboard.writeText(createdKey!);
      setNotice({ type: "success", text: "API key copied to clipboard" });
    } catch {
      setNotice({ type: "error", text: "Could not copy. Select the key and copy it." });
    }
  };

  if (loading) {
    return <ListSkeleton label="Loading API keys..." />;
  }

  if (loadFailed) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">API Keys</h1>
        <LoadError
          what="API keys"
          onRetry={() => {
            setLoading(true);
            loadData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">API Keys</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage API keys for sending emails through your verified
            domains.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            disabled={domains.length === 0}
            aria-expanded={showCreateForm}
            className={primaryButton}
          >
            Create API Key
          </button>
        </div>
      </div>

      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      {domains.length === 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <h2 className="font-medium">No verified domains</h2>
          <p className="mt-2">You need to add and verify at least one domain before creating API keys.</p>
        </div>
      )}

      {/* Create API Key Form */}
      {showCreateForm && domains.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Create New API Key</h2>
          <form onSubmit={handleCreateKey} className="mt-5 space-y-4">
            <div>
              <label htmlFor="domain" className={labelClass}>
                Domain
              </label>
              <select
                id="domain"
                autoFocus
                value={newKey.domainId}
                onChange={(e) => setNewKey({ ...newKey, domainId: e.target.value })}
                className={`mt-1 ${inputClass}`}
                required
              >
                <option value="">Select a domain</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="keyName" className={labelClass}>
                Key Name
              </label>
              <input
                type="text"
                id="keyName"
                value={newKey.keyName}
                onChange={(e) => setNewKey({ ...newKey, keyName: e.target.value })}
                placeholder="e.g., Production Key, Development Key"
                className={`mt-1 ${inputClass}`}
                required
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setShowCreateForm(false)} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={creating} className={primaryButton}>
                {creating ? "Creating..." : "Create Key"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Created API Key Display */}
      {createdKey && (
        <section role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <h2 className="font-medium">API key created</h2>
          <p className="mt-2">Save this API key now. It will not be shown again:</p>
          <div className="mt-2 rounded border border-gray-200 bg-white p-3 font-mono break-all text-gray-900">
            {createdKey}
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <button type="button" onClick={copyCreatedKey} className={linkButton}>
              Copy to clipboard
            </button>
            <button type="button" onClick={() => setCreatedKey(null)} className={linkButton}>
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* API Keys List */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {apiKeys.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-600">
            No API keys created yet. Create your first API key to start sending emails.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {apiKeys.map((key) => (
              <li
                key={key.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium break-words text-gray-900">{key.key_name}</div>
                  <div className="text-sm break-words text-gray-600">
                    Domain:{" "}
                    {key.domains?.domain || domains.find((d) => d.id === key.domain_id)?.domain || "Unknown"}
                  </div>
                  <div className="font-mono text-xs break-all text-gray-600">{maskApiKey(key.key_prefix)}</div>
                  <div className="text-xs text-gray-600">
                    Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && <span> • Last used {new Date(key.last_used_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {key.permissions.join(", ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(key.id)}
                    aria-label={`Delete API key ${key.key_name}`}
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
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DomainsTab from "./DomainsTab";
import ApiKeysTab from "./ApiKeysTab";
import EmailLogsTab from "./EmailLogsTab";
import { linkButton } from "./ui/styles";

type Tab = "domains" | "apikeys" | "logs";

const tabs: { id: Tab; name: string }[] = [
  { id: "domains", name: "Domains" },
  { id: "apikeys", name: "API Keys" },
  { id: "logs", name: "Email Logs" },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  // Only rendered in the browser, after sign-in, so the address is there to read. A refresh keeps the tab.
  const [activeTab, setActiveTab] = useState<Tab>(
    () => tabs.find((tab) => `#${tab.id}` === window.location.hash)?.id ?? "domains"
  );

  const openTab = (tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4 sm:py-6">
            <div className="flex items-center">
              <p className="text-2xl font-bold text-gray-900 sm:text-3xl">FreeResend</p>
              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Self-hosted
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
              <span className="min-w-0 text-sm break-words text-gray-700">{user?.email}</span>
              <button type="button" onClick={logout} className={linkButton}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav aria-label="Dashboard" className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 sm:gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => openTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`py-4 px-1 border-b-2 font-medium text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === "domains" && <DomainsTab />}
          {activeTab === "apikeys" && <ApiKeysTab />}
          {activeTab === "logs" && <EmailLogsTab />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <div>
              <span>Built by </span>
              <a
                href="https://x.com/eibrahim"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 font-medium underline"
              >
                Emad Ibrahim
              </a>
              <span aria-hidden="true" className="mx-2">•</span>
              <a
                href="https://www.frontendweekly.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 font-medium underline"
              >
                Frontend Weekly
              </a>
              <span aria-hidden="true" className="mx-2">•</span>
              <a
                href="https://www.elitesaas.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 font-medium underline"
              >
                EliteSaaS
              </a>
            </div>
            <div className="text-xs">
              <span>Powered by EliteCoders - </span>
              <a
                href="https://elitecoders.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 underline"
              >
                Get in touch
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

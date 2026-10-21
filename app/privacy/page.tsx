"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight border-b border-white/10 pb-6">
          Privacy Policy
        </h1>

        <section className="mb-8">
          <h2 className="text-2xl font-medium mb-4">Information We Collect</h2>
          <p className="text-white/60 leading-relaxed">
            When you use TX RetailOS, we collect information necessary to operate the
            retail management platform and provide your account functionality. This includes
            your account credentials (name, email) collected during registration, and
            transaction/inventory data (products, sales, stock levels, customer information)
            stored to power the core retail workflow.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-medium mb-4">Authentication and Sessions</h2>
          <p className="text-white/60 leading-relaxed">
            TX RetailOS uses a session-based authentication system. When you log in, a
            same-origin session cookie is set by the Next.js server proxy, associating your
            browser with your account on the Flask backend. The /auth/me endpoint verifies
            your session on protected pages, while /auth/login and /auth/logout handle
            credential verification and session termination. Public pages (home, demo,
            login, register) render without requiring an active session, and sessions are
            refreshed automatically during navigation.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-medium mb-4">Analytics and Third-Party Services</h2>
          <p className="text-white/60 leading-relaxed">
            TX RetailOS does not use Google Analytics, Facebook Pixel, or any other third-party
            analytics or tracking services. The only data transmission occurs via same-origin
            API calls necessary for core functionality (authentication, inventory, sales, and
            reports). No visitor behavior is monitored, logged, or shared with external
            services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-medium mb-4">Data Retention and User Rights</h2>
          <p className="text-white/60 leading-relaxed">
            Data retention periods are determined by the backend system (Flask API) and your
            account activity. Transaction history, sales records, inventory counts, and customer
            records are retained for as long as your account remains active and as needed to
            provide the retail management functionality. If you wish to request access to your
            personal data or request deletion, please contact us using the information below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-medium mb-4">Contact Us</h2>
          <p className="text-white/60 leading-relaxed">
            If you have questions or concerns about this Privacy Policy or how your personal
            information is handled, contact us at: <a href="mailto:support.trexave@gmail.com"
              className="text-orange-400 hover:text-orange-300 underline">
              support.trexave@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium mb-4">Cookies and Local Storage</h2>
          <p className="text-white/60 leading-relaxed">
            TX RetailOS uses browser storage for functional purposes only:
          </p>
          <ul className="list-disc pl-5 text-white/60 space-y-2">
            <li>
              <strong>Tour persistence:</strong> Progress through the in-app welcome tour is
              stored in localStorage under the key retailos:tour:v1:user-id. This holds
              only chapter IDs and step numbers, is per account per browser, and is not synced
              across devices. No personal identifiable information is stored in tour data.
            </li>
            <li>
              <strong>Pending sale idempotency:</strong> A pending sale ID may be stored in
              localStorage under retailos-pending-sale-id to support idempotent retry of
              cash-first checkout operations. This is temporary and cleared upon successful
              completion or logout.
            </li>
          </ul>
          <p className="text-white/60 leading-relaxed mt-4">
            The app does not use marketing cookies, tracking pixels, or embedded third-party
            scripts. All storage is strictly functional and related to the operation of the
            retail management platform.
          </p>
        </section>

        <section className="mt-8 pt-8 border-t border-white/10">
          <p className="text-xs text-white/40">
            This Privacy Policy was last updated on {new Date().toLocaleDateString()}.
            Changes will be posted on this page and your continued use of TX RetailOS after
            such changes constitutes acceptance. We do not claim GDPR compliance merely
            because this page exists.
          </p>
        </section>
      </div>
    </main>
  );
}

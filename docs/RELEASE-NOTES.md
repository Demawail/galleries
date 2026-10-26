# Open-source preview

October 26, 2026. Prepared from sanitized kit 0.6.3, with a new README, MIT licensing and a fictional sample assignment. Initial public source preview. Fresh-account acceptance remains pending.

# Galleries Kit 0.6.3 release candidate
Original kit baseline: October 15, 2026. This open-source preview is distributed free under MIT.

Includes current private galleries, public portfolio and editor, client records, usage reporting, source for Lightroom Classic integration, gateway/email adapters, and assistant-led setup guides. Optional Stripe monetization for a studio's own offers requires separate implementation.

This update adds bounded three-photograph prefetch for background ZIP preparation and fixes long-running ZIP download streams, and includes verified live background preparation in the seller installation. Your cloud setup remains required. It adds client-created named collections with editing and scoped sharing. Background single-ZIP preparation and a separate Cloudflare Queue worker are included but disabled until you connect and verifies them; existing small-part downloads remain active. Read galleries/archive-worker/README.md for setup and remaining acceptance. It also links Stats shared-pin counts directly to the owner gallery’s shared client selections, separate from photographer favorites. It includes owner email notifications after clients submit pin selections, with receipt-based deduplication and configurable alerts. It also includes a private Stats dashboard: customer activity, durable upload history, saved weekly reviews, connected-bucket inventory, and connected storage checks. Manual provider-reading controls have been removed. Billing APIs and combined hosting telemetry are not connected. Collection-only sharing and wrapping navigation remain included.

This candidate includes a single build command and reproducible archive timestamps. Each bundled file is listed with SHA-256 in MANIFEST.json. Keep the ZIP and its manifest together as your source baseline; keep your own subsequent edits in Git.

Release validation still requires deployment on a clean customer account and a native Lightroom publish/republish/retrieve loop. Independent Claude/Cloudflare hosting requires authentication adaptation. Third-party fees and paid setup help are separate.

# Studio Stats

The private /stats workspace contains Overview, Customer activity, Uploads & additions, Weekly reports, and Costs & hosting. It follows the existing Sites workspace access boundary and is not exposed by the public gallery gateway.

Customer activity reuses the evidence-grounded usage report and links to named client histories. Missing telemetry is unknown, not zero; a browser download receipt is not proof of a file saved to disk. Dates use Pacific time. Weekly reviews save prose, fixes, recommendations, limitations and a captured usage snapshot. The same reporting period updates in place.

Migration 0011 creates stats_records and studio_events. New gallery creation, photograph addition/republishing and collection reassignment are journaled in the same guarded transaction as workspace changes. Failed stale writes add no events. This ledger starts at this release; older retained gallery activity (100 entries per gallery) and portfolio creation dates remain separate, partial evidence. The current inventory is not a historical snapshot.

Connected storage can be scanned at most once per hour through this UI. R2 scans require bucket-list permission and stop after 20 pages; partial scans are labeled lower bounds. Stored bytes include renditions and retained objects. They are not account-wide GB-month or a bill. The storage scenario uses Standard R2 pricing before shared free allowance and operations.

Cloudflare billing and combined ChatGPT Sites telemetry are not automatically connected. Costs & hosting shows connected storage and a clear availability note. Manual provider entry and its prompts have been removed; existing historical provider records are preserved in storage. R2 charges above its free allowance, rather than automatically changing plan tiers.

Weekly research automation should save its completed review here without modifying client data or sending messages. Runtime reports and provider records are excluded from the downloadable source kit.

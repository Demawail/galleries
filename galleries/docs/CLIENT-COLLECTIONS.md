# Client collections and single-ZIP preparation

## Available now

Clients select photographs, choose Create collection, name it and save. Collections appear with a photograph count in their review navigation. Edit collection selects its current membership; clients can switch to All photographs to add others, deselect to remove, and save. Add selected photographs appends to an existing personal collection. These are references to original photo IDs, not moved or duplicated images, and do not change shared retouching pins or notes.

Only the creating review identity can edit a collection. Existing verified-account restoration and private resume links restore that review; a matching display name never grants ownership. Other recipients see only collections explicitly shared with them. Share this collection creates a forwardable no-password link restricted to its current photo membership, intersected with every ancestor's access. A recipient can make a narrower collection. The photographer's existing link manager displays client collection names and can disable links.

All access checks apply to state, images, pin/note mutations, downloads and nested links. Collection updates use versions to reject stale writes. Deleting a collection disables its links and descendants; original photos remain. Gallery expiry, download settings and parent-link revocation continue to apply. Collections have up to 1,000 photo references, 80-character names, eight link levels and a bounded per-gallery record budget. Removed records are retained privately rather than purged.

## Built, awaiting Cloudflare activation

Background ZIP preparation is implemented behind `HAS_ZIP_ENABLED`. It is **not active in production**. Existing small-part downloads remain available, including from a client-created collection. See `archive-worker/README.md` for worker/queue/private bucket setup and hosted acceptance gates.

The optional service prepares one ZIP64 in an independent Queue consumer, streams it to temporary private R2 storage, and provides a native browser download link. Clients can close the page and return to Downloads. Limits, retry behavior, range support and access rechecks are documented alongside the worker. No completion email or proven disk-save acknowledgement is claimed.

## Verification

Disposable Worker tests cover ownership, retries, stale edits, nested scopes, removal, unchanged originals, queue-job isolation and leases, Range forwarding, downloads-disabled enforcement, and request-only history. ZIP64 tests verify 1,000 entries plus a UTF-8 filename with Python CRC checks, bounded multipart buffers and aborted source reads. Local browser checks cover collection creation, editing, sharing and phone-width layout. Hosted queue/bucket integration, a page-closed job, real lifecycle cleanup, a physical phone download and an 891-photo job remain to be tested after Cloudflare connection.

Large ZIP delivery uses an authorized redirect to the download worker. The worker validates the job ticket and current source-link access before serving private R2 bytes. Links remain revocable and expire with the job/gallery. Range requests use the same access checks. Download transfer does not keep a Sites proxy response open.

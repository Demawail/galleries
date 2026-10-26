# Background ZIP worker

Client collections work without this optional service. Background ZIP controls appear only after `HAS_ZIP_ENABLED=true` and both worker connection settings exist. Keep disabled until the hosted acceptance below passes.

## Deployment

Use a Cloudflare Workers Paid account for the configured CPU and subrequest budget. This is separate from R2 storage pricing; confirm the account plan and any incremental cost with the owner before activating it.

1. Create a dedicated **private** R2 bucket for temporary downloads. Apply a lifecycle rule deleting `archives/` objects after one day and aborting incomplete multipart uploads after one day. No public bucket access or custom public domain.
2. Create the `gallery-zips` Queue. Copy `wrangler.example.json` to a local, untracked configuration and set the bucket and gallery origin. Consumer batches are one job, with two consumers maximum, three retries, five minutes CPU and a twelve-minute preparation timeout. Failed preparations restart from source; file download supports Range resumption.
3. Generate a separate strong `ZIP_WORKER_TOKEN`. Store it as a worker secret, alongside `GALLERY_SERVICE_TOKEN`, the narrowly retained server service credential for the private Galleries Site. Never put these into source or a browser. Set `GALLERY_ORIGIN` to the private gallery application origin.
4. Deploy with Wrangler from this directory. Set Galleries runtime secrets `HAS_ZIP_WORKER_TOKEN` to the same token and `HAS_ZIP_WORKER_URL` to the worker HTTPS origin. The Sites migration `0012_download_jobs.sql` must have run. Enable `HAS_ZIP_ENABLED=true` only for acceptance, and disable it if acceptance fails.
5. Exercise a disposable gallery end to end: queue a ZIP, close the page, return after processing, verify ZIP CRCs/file count/filenames and original bytes, test partial Range download, retry an interrupted request, and revoke the parent link before downloading again. Confirm all temporary objects expire and multipart uploads are cleaned up. Do not mark the service live until this succeeds.

## Design and boundaries

Galleries stores scoped immutable download manifests and reviewer-owned history in D1. A queue consumer claims a time-limited lease, reads only job photographs through the private authenticated API and streams ZIP64 into private R2 multipart upload with an 8 MiB buffer. Completion commits only for the active lease. Every photo read and final download rechecks gallery expiry, downloads policy and inherited collection scope. Changing collection membership can invalidate an earlier ZIP; clients prepare a new one. No image data or service credentials go into queue messages.

Limits: 1,000 photographs / 20 GiB estimated source bytes, 21 GiB actual archive ceiling, twenty new jobs per gallery per hour, availability up to 24 hours or gallery closing, whichever is sooner. The browser downloads directly without loading the whole ZIP into JavaScript memory. Native file downloads do not provide a reliable completed-download acknowledgement; history records the request, not a confirmed disk save or owner receipt alert.

Local Worker tests are required. A hosted Cloudflare deployment, real queue consumption with the page closed, lifecycle cleanup, phone download and a representative 891-photo archive remain acceptance gates until explicitly recorded.

Provider references: https://developers.cloudflare.com/queues/platform/limits/ and https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/ .

## Installation evidence, October 15
Photographer installation connected. Live 24 MiB disposable-gallery preparation, original-byte/CRC checks, Range and revocation passed. One-day lifecycle rules verified; actual time-based deletion and physical-phone acceptance not yet observed. Buyer installations remain disabled until independently configured and tested.

Large-gallery correction: source streams prefetch up to three photographs to overlap network latency, retaining ordered ZIP entries and the 8 MiB multipart buffer. The initial sequential 891-photo run hit its 12-minute deadline; acceptance must be repeated before claiming that scale.

Prepared downloads use `/download/<job>/<lease>?ticket=<capability>`. The application issues this link only after validating the original client link and ticket. The worker rechecks the ticket and current gallery policy through the authenticated application on every GET, including Range requests. It then streams directly from private R2. Never log ticket query strings. This avoids sending multi-gigabyte archives through the Sites proxy.

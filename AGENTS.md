# Kit instructions
Read START-HERE.md, docs/ARCHITECTURE.md, docs/SETUP.md and docs/VALIDATION.md first.
This is a NEW installation. Neither hosting manifest contains a project_id. Create new Sites only when the owner authorizes deployment, persist returned IDs, and preserve the new identity thereafter. Never discover or attach the original HAS sites.
Keep Galleries owner-private. UI personas and reviewer query parameters are not authentication. Public clients use only capability-scoped website gateways. Do not publish the owner application directly to an unprotected Worker.
No real client images are bundled. Start with your own test photographs. Preserve source IDs, client authorization, private notes, pin quotas and immutable submissions. Never weaken access to fix a deployment.
Use runtime secrets for HAS_GALLERY_SERVICE_TOKEN, RESEND_API_KEY and optional HAS_R2_* variables. Never place them in source, brand.json, client bundles or prompts. Keep .env files out of Git and ZIPs.
The newsletter sends a notification to the configured owner, it does not enroll a mailing-list audience or send campaigns. Build and test the public client bundle after any client changes.
Report observed verification honestly. A build passing does not verify authentication, a clean deployment or Lightroom.

For a first-use demo, read sample-gallery/README.md and gallery.json. Upload the bundled synthetic photos through the normal authenticated workflow. Do not inject sample records into a live database or reuse predefined client tokens. Keep the DEMO label and synthetic-image disclosure.

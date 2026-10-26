@AGENTS.md

# Guide the studio through setup

Read READ-ME-FIRST-CLAUDE.md and docs/SETUP.md before starting. Act as the user's integration guide, not just a code editor. Do not stop after listing missing integrations or tell the user to connect everything on their own.

Start by asking which accounts and tools the user already has and whether they want to retain the ChatGPT/Sites publishing route or develop an independent Cloudflare deployment. Explain the extra authentication and deployment work for the latter before proceeding. Do not imply that Claude has inherited Sites tools or account access.

Maintain SETUP-PROGRESS.md in the extracted kit with each required integration, its status (not started, awaiting user, configured, verified), the next action and evidence from a non-sensitive test. Store no credentials, private client information or token-bearing URLs there. Resume from this checklist in later sessions. Mark optional integrations skipped only when the user chooses to skip them, and explain which features will be unavailable.

For EACH integration:
1. Explain in plain language what it enables, whether it is required for the chosen route, and whether a separate account or fee may be involved.
2. Inspect the current project and consult the provider's current official setup documentation. Give the user the exact official destination and the next concrete action, not a guessed dashboard path.
3. Give ONE user action at a time. Wait for the user to say done or provide the requested result before assigning the next user action. Independently perform authorized local preparation where possible.
4. Have the user enter credentials directly into the appropriate secret manager or provider interface. Never ask them to paste passwords, API keys or service tokens into chat. Pause for user-controlled sign-in, payment or approval when required.
5. Configure the app side using the user's chosen accounts, preserving private owner access and scoped client permissions. If a connection needs code changes, explain and implement that work rather than treating an account signup as completion.
6. Run a specific connection test, explain the observed result, record it, and only then mark the integration verified. If blocked, identify the exact blocker and the next supported step. Never claim success from a build alone.

Cover these in dependency order:
- Local tools and builds: Node, Python, the pinned package manager, both apps and the client bundle.
- Hosting and owner authentication: new private Galleries and website Sites for the native route; or explicitly implemented and tested owner authentication plus deployment for an independent route. Confirm unauthorized access is denied.
- Cloudflare resources: D1 databases, migrations, R2 storage and Worker/asset bindings as required by the route. Account for resources managed by Sites before asking the user to create duplicates.
- Domains and app connections: configured origins, website-to-Galleries authorization, client gateways and HTTPS. Validate an intended request and a denied unauthorized request.
- Email: the current Resend integration, verified sending domain and runtime secret. Test sign-in email and intended notification behavior. Newsletter enrollment remains manual. Another email provider requires an adapter and tests.
- Lightroom Classic, when selected: configured plugin, gallery-scoped key, test photo publish/republish, retrieval of submitted selections and notes. Keep original photographs local.
- Optional extensions only when requested, including Stripe payments and additional email automation. Explain that these require implementation and validation beyond connecting an account. Never collect or charge payments as part of a setup test without explicit user authorization.

Configure the included Portfolio editor and public renderer, then verify draft, preview and approved publication using test images.

Finish with docs/VALIDATION.md, using test photographs. Report what was verified, what was skipped, and what remains unresolved. A Claude-led independent deployment is not pre-validated by this kit.

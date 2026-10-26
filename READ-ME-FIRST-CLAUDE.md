# Start here with Claude Code

Galleries Kit 0.6.3. Built for the ChatGPT/Codex and Sites workflow, with source that can be adapted using Claude Code. A complete Claude-led deployment has not been validated. This guide explains the handoff and the remaining engineering work.

## 1. Open the extracted folder

Unzip the download into a permanent working folder. Install Claude Code using Anthropic’s official setup instructions and sign in with your own account. Open a terminal in `photography-ecosystem-kit`, then run `claude`. Keep the whole folder together, including website, galleries, lightroom and docs. A normal Claude chat can discuss files, but uploading the ZIP there does not provision or run this application.

## 2. Give Claude the project instructions

The included `CLAUDE.md` imports `AGENTS.md` and instructs Claude to guide you through each required integration, one action at a time. It should explain each service, direct you to current official setup pages, wait for you to complete account steps, configure the application side and verify the connection. It maintains a non-sensitive `SETUP-PROGRESS.md` so you can resume later. Optional services are connected only when you choose them. Ask Claude to read `START-HERE.md`, this guide, `docs/ARCHITECTURE.md`, `docs/SETUP.md` and `docs/VALIDATION.md`. Confirm that it understands the private owner app and the separate public website gateway. Your previous ChatGPT conversation and connected accounts are not part of this download.

Suggested first prompt:

> Read the kit instructions and READ-ME-FIRST-CLAUDE.md. Inspect both applications and identify every dependency on Sites hosting and authentication. Explain the existing deployment route and the work needed for an independent Cloudflare deployment. Help me choose a route before editing deployment or access control. Then work one step at a time. Preserve private owner notes, scoped client access, source IDs and pins. Never put credentials in source or prompts. Do not publish an unprotected owner app.

## 3. Configure and build locally

Follow docs/SETUP.md for Node 22+, Python 3 and the package manager pinned in galleries/package.json. Edit brand.json, run configure.py once, install dependencies and build both apps and the shared client bundle. Ask Claude to explain each command before you run it. A successful build confirms compilation, not a functioning private hosted service.

## 4. Choose the deployment route

**Keep the native route:** use Claude Code to edit the local source, then use an authorized ChatGPT/Codex environment with the Sites workflow to provision and publish your own two Sites. Claude Code does not inherit Sites tools, authentication or your connected accounts just by opening the folder. Follow docs/SETUP.md and verify access to the required tools on your own account.

**Adapt for independent Cloudflare hosting:** this requires additional development, not an import switch. Have Claude inspect the Sites build integration, owner identity checks and service-to-service authorization. Replace those dependencies with a supported authenticated owner boundary and a protected gateway-to-Galleries connection. Create your own Workers, D1 databases, R2 buckets, asset bindings, migration process, domains and runtime secret configuration. Replace placeholder resource IDs in generated deployment configuration through maintained source/build configuration. Keep public client routes scoped to their gallery tokens. Do not trust user-supplied identity headers or remove owner checks to get a deployment working.

You must configure your own email provider and verified sender, origins and service credentials, and Lightroom plugin endpoints and gallery-scoped keys. Existing Sites project identities and account secrets are deliberately excluded. Hosting, storage, assistant, email and Lightroom charges are separate.

## 5. Verify before client use

Run docs/VALIDATION.md on the actual target host. Test anonymous owner-access denial, cross-gallery denial, private-note isolation, revoked/expired links, uploads, downloads, shared pin limits, immutable submissions and email sign-in. Complete a real Lightroom publish, republish and selects/notes retrieval using test photographs. Record results and unresolved issues. Neither this guide nor a passing build certifies the independent Cloudflare route.

## Official references

- Claude Code setup and starting in a project folder: https://code.claude.com/docs/en/quickstart
- Claude project instructions and file imports: https://code.claude.com/docs/en/memory
- Codex app features: https://learn.chatgpt.com/docs/features

Documentation checked October 11, 2026. Interface labels and account availability can change.

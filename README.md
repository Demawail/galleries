# Galleries

A photography portfolio and client delivery system you can own, run and change with a coding assistant.

Built by photographer Josh Rose for his own working studio, now shared as an open-source preview. The repository brings together a private photographer workspace, public client delivery, a portfolio editor and a Lightroom Classic plugin. The source is free, with no Galleries subscription.

## What you can do

- Organize galleries, set delivery deadlines and keep private shoot notes.
- Share scoped client links, collect shared selections and retouching notes, and retain submission history.
- Let clients organize selections into collections and download photographs.
- Build and publish a portfolio from the same photo workflow.
- Connect Lightroom Classic for publishing and retrieving selections.
- Review gallery activity, upload history and connected storage inventory.

## Read this before installing

This is an early source release for people comfortable working with a coding assistant and configuring online services. The native route uses ChatGPT/Codex with Sites. Access to those tools must be confirmed on your own account. Claude Code can edit the project, but an independent Cloudflare deployment requires additional authentication and deployment work. Opening this folder in an AI chat does not install a hosted service.

A complete fresh-account deployment and native Lightroom round trip remain unverified. Start with the included fictional sample assignment and complete the [validation checklist](docs/VALIDATION.md) before using client photographs.

## Getting started

Open the whole repository in your coding assistant and ask:

> Read START-HERE.md, AGENTS.md and docs/SETUP.md. Inspect the project and help me choose a supported deployment route. Explain the accounts and costs I need, then guide me one step at a time. Start with the fictional sample gallery. Keep the photographer workspace private and verify client access before using real work.

The setup guide covers branding, pinned dependencies, building both applications, database migrations, storage, email and deployment. Claude users should also read [READ-ME-FIRST-CLAUDE.md](READ-ME-FIRST-CLAUDE.md).

## What you are running

| Folder | Role |
| --- | --- |
| `galleries/` | Private photographer workspace, gallery data and portfolio editor |
| `website/` | Public portfolio and scoped client gateways |
| `lightroom/` | Lightroom Classic plugin |
| `sample-gallery/` | Fictional assignment and AI-generated example images |
| `docs/` | Architecture, setup and acceptance checks |

The owner app relies on Sites authentication. Keep it private. The public website connects through a runtime service credential, and clients receive narrower gallery-scoped access. See [architecture](docs/ARCHITECTURE.md).

## Costs and maintenance

There is no fee or subscription for this source code. Your AI tools, hosting, storage, domain, email and Lightroom may have their own fees or subscriptions. Background ZIP preparation uses an optional separately configured Cloudflare worker and queue. Provider pricing and availability can change; check them before deploying.

You operate your installation, including security, backups, updates and costs. Git backs up code, not uploaded photographs or live databases. AI-assisted changes still need review and testing. The project does not include a guaranteed support response or maintenance schedule.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Reproducible setup reports are especially useful at this stage. Never include real client photos, private gallery links or credentials in issues.

## License

Original project source is available under [MIT](LICENSE). You may use, modify and redistribute it, including commercially, while preserving the license notice. Bundled third-party components retain their own notices; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

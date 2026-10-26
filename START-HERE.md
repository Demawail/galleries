# Galleries
Open-source preview, based on kit 0.6.3.
Includes the private Stats workspace, durable upload ledger, weekly review archive and automatic connected storage checks. Billing APIs are not connected.

Give this folder to your coding assistant and ask: “Read START-HERE.md and AGENTS.md, inspect this kit, then help me configure and deploy my own photography website and private Galleries workspace. Work one step at a time. Ask for missing decisions. Never reuse someone else’s accounts or credentials.”

ChatGPT/Codex and Sites are the native workflow. For Claude Code, read READ-ME-FIRST-CLAUDE.md first. Claude can edit the source; independent hosting and authentication require adaptation and validation. The included CLAUDE.md loads the shared instructions.

## What is here
- website/: public portfolio renderer, newsletter notifications, public gallery and Lightroom gateways.
- galleries/: adapted Galleries application source, shared client pins, private owner notes, scoped client links, downloads, Lightroom support and storage adapters. Starts empty.
- lightroom/: Lightroom Classic plugin source. Configure domains before installing.
- brand.json and configure.py: initial identity and domain replacement.
- docs/: architecture, setup, validation and scope.

The Portfolio editor lets you publish your own images, galleries and contact page. This installation starts with an empty portfolio and empty client galleries. It does not contain client data or account credentials. The gallery owner app depends on Sites authentication and owner-private access. Raw public Cloudflare deployment requires a separately implemented authentication boundary before use.

## Start
Read docs/SETUP.md together, then edit brand.json. This is a technical source kit, with an assistant-guided setup, not a one-click hosted service. You need your own hosting, email and Lightroom accounts as applicable. Their ongoing charges are separate.

## Pilot limits
A full new-account deployment and native Lightroom round trip have not yet been completed. See docs/VALIDATION.md. Original project code is available under the MIT license in LICENSE. Dependencies retain their own licenses. Hosting and maintenance are your responsibility. No ongoing support or update schedule is promised.

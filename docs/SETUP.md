# Setup checklist
Work through with your assistant, one step at a time.
1. Install Node 22 or newer, Python 3 and the pinned package manager. Read package.json. Keep this repository together; the two apps have separate deployment identities.
2. Choose your domains, owner name and verified newsletter email. Edit brand.json, run python3 configure.py, review remaining generic photographer labels and Lightroom plugin identifiers. Brand config is applied once; restart from a fresh kit to reconfigure.
3. Install Galleries dependencies: inside galleries run pnpm install --frozen-lockfile using the pinned pnpm version in package.json. This is a fresh install; no dependencies are bundled.
4. From the kit root run node build.mjs. This checks types, builds Galleries, rebuilds both browser renderers, and builds website in order. Use the private Portfolio editor to add your own images and publish the public portfolio after deployment. Before first publication the public portfolio is intentionally empty.
5. With the Sites workflow, register TWO NEW sites. Persist their returned IDs into their own .openai/hosting.json. Keep Galleries owner-private and website public only when ready. Both use DB and BUCKET bindings. Apply included Galleries AND website migrations through the supported workflow. The website client sign-in rate limit needs its client_account_limits table.
6. Configure the new private Galleries service token only in website runtime as HAS_GALLERY_SERVICE_TOKEN. Both source origins must match your actual domains. Register no original HAS account or ID.
7. Configure your own RESEND_API_KEY and verified sender. Signup notifications go to the owner address in source. Test consent, rejection and delivery. Manual mailing-list enrollment remains required.
8. Use platform-managed R2 initially or configure your own HAS_R2_ACCOUNT_ID, HAS_R2_BUCKET, HAS_R2_ACCESS_KEY_ID and HAS_R2_SECRET_ACCESS_KEY privately. Verify bucket ownership, export and deletion before client work.
9. Install the configured Lightroom plugin, connect a scoped key from your new gallery app and run the validation checklist.

The Sites build integration is included in source. A direct Cloudflare deployment needs an authentication adaptation, resource provisioning and deployment configuration; do not bypass this by exposing the owner app publicly.

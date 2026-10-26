# Architecture
Lightroom Classic → website /gallery-bridge/lightroom → private galleries /api/lightroom → D1 + R2.
Client scoped link → website /galleries/<token> → private galleries /api/client/<token>.
Owner → authenticated private Galleries Site → create galleries, publish keys and client links.
Website/Galleries newsletter form → website /newsletter-api → Resend → configured owner for manual enrollment.
Local instructions + sources → coding assistant → review → build → separate Sites deployments on Cloudflare infrastructure.

The website alone holds the Galleries service token. Client and Lightroom credentials have narrower scope and are checked inside Galleries. Never expose service tokens to browsers. Galleries uses one private workspace per installation; this is not a multi-tenant SaaS.

The bundled website has no proposal rooms, games, source documents, live media or original portfolio database. Gallery source is adapted from the October 12 workspace, including the Portfolio editor, client records and usage reporting. Third-party dependencies retain their upstream licenses.

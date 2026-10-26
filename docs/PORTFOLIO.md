# Public portfolio, version 0.6.3
The private Portfolio tab manages your name, optional tagline, featured-image slideshow, gallery pages, image order/descriptions, contact portrait, bio, public email, phone, Instagram, representation and licensing text. Home / contact / gallery pages use one restrained editorial format. A portrait-heavy collection uses offset pairs; landscape collections mix wide frames and pairs. Maximum two across, with preserved proportions.

Add individual photographs, a selection or favorites from a delivery gallery using Add to Portfolio. Images are independent web copies and do not expire with the client gallery. Upload JPEGs directly in Portfolio if preferred. Images stay private until explicitly published; only references in the published snapshot can be read by the public gateway. Unpublish removes public endpoint access, but cannot recall copies visitors already saved.

Save draft, preview, then publish after confirming public-use permission. Owner and public Sites remain separate; the website root redirects to /portfolio/. The public gateway must use the new installation's private service token. Configure placeholder origins via brand.json and configure.py before deployment. Rebuild the public renderer from galleries with node scripts/build-portfolio.mjs whenever changing it, then build/deploy website. No photographs, names, biographies or production credentials are bundled.

Settings support 24 pages, 300 photographs per page and 20 featured frames. Uploaded JPEGs are resized in the browser to 2400px; originals stay local. This is a single-studio source kit, not a multi-tenant hosted SaaS. Custom domains are configured through your hosting provider, not through the Portfolio editor.

New private D1 migrations are required along with website migrations for email alerts. Client records and signup/signin/download alert controls use Resend; sender domain and runtime key must be configured independently. Private notes stay private. No automatic newsletter enrollment or campaigns.

Isolated backend and browser checks cover this feature. Fresh-account deployment and native Lightroom validation remain required; do not describe those as completed.

## October 13, 2026: submitted-pin email

Client Submit selections now sends the configured owner a notification with the subject “[client name] has completed their pin request”, gallery title, shared pin count, submission time and a private Studio link. Submission alerts default on, preserving older alert settings; Clients > Email alerts can disable them. Only a successful persisted submission creates notification metadata; the public gateway strips it and sends through Resend. Receipt-based deduplication prevents repeat alerts for an unchanged submission. Reopen and resubmit creates a new receipt and alert. No inactivity or pin-click email. Existing provider retries apply; actual inbox delivery remains a separate acceptance check.


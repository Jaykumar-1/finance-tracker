# Finance Tracker cloud data security

## What changed

`firestore.rules` now requires Firebase Authentication for cloud ledger access and requires the authenticated Firebase UID to match the ledger's `ownerUid`. A ledger ID or shared URL alone no longer grants read/write access. The JSON ledger structure, transaction storage functions, login code, and realtime listener code are unchanged.

## IMPORTANT: verify ownership before deploying the new rules

The existing app supports legacy ledgers without `ownerUid` and previously tried to claim them after reading. Strict rules intentionally block reading an unowned ledger, because allowing any signed-in account to read/claim it would expose your financial data.

Before deploying the new rules:

1. Open Firebase Console for the project configured in `firebase-applet-config.json`.
2. Go to **Authentication → Users** and identify the UID for the account you use in the Finance Tracker.
3. Go to **Firestore Database → Data → ledgers**.
4. Inspect the document(s) you actually use (for example, `main` and your active ledger ID). Do not edit or delete the `transactions` array.
5. If a ledger already has `ownerUid`, verify it exactly matches your Firebase Authentication UID. If it is missing, add only the `ownerUid` string field with your UID after verifying that this is your ledger. Do not claim a ledger belonging to another account.
6. If `main` and a custom ledger both exist and the app syncs both, verify ownership of both documents before proceeding.
7. Back up the ledger document(s) first using Firestore export or a trusted JSON backup.

If you cannot confidently identify the owner of a ledger, stop and do not deploy these rules until ownership is resolved. Do not temporarily make ledger reads public to perform the migration.

## Deploying the rules

GitHub Pages deployment does **not** automatically deploy Firestore rules. In Firebase Console, open **Firestore Database → Rules**, paste the contents of `firestore.rules`, and publish them only after the ownership checks above. Alternatively, deploy using the Firebase CLI from this project after confirming the correct Firebase project is selected.

## Expected behaviour after deployment

- The same Firebase account can access its own ledger on another device after signing in.
- A person who only downloads the public GitHub repository cannot read Firestore transaction data merely by knowing the ledger ID or URL.
- Other accounts are denied access to the ledger.
- Public username lookup remains available for the existing username-login flow; keep those documents limited to minimal username/email/UID mapping data.
- Browser localStorage remains a local cache on each device. It is not a public GitHub JSON file unless you manually commit/export it into the repository.

## Limitations and cautions

- If you intentionally use a ledger URL to share one ledger with a different Firebase account, this owner-only rule set blocks that sharing. Do not weaken these rules to public access; a proper share feature needs explicit per-user ACLs or a trusted backend.
- Firebase web configuration (including the API key) is visible in client code by design. Security must be enforced by Firestore rules and Firebase Authentication, not by hiding the client config.
- Review your GitHub repository history and deployed `dist` output for any real transaction exports or secrets accidentally committed. Tightening Firestore rules cannot remove data that was already committed publicly; remove exposed files and rotate any genuinely secret credentials.

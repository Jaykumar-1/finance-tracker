<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/235e2560-7f24-472d-acc3-6299dc322b02

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Version 6 security/authentication update
- Requires explicit username/email + password authentication after every page load/reload.
- Firebase Authentication remains the password authority; passwords are never stored in JSON/Firestore.
- Non-secret credential metadata is stored separately in `credentials/{uid}`.
- Cloud ledger documents are owner-bound to the authenticated Firebase UID.
- A ledger/shareable URL alone no longer grants access to financial data.
- Legacy unowned ledgers can be claimed by the first authenticated owner.
- Forgot-password recovery uses the registered recovery email through Firebase Authentication.

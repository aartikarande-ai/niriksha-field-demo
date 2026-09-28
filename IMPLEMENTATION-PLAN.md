# Niriksha Android app implementation plan

## Current baseline

- The Render service at `https://niriksha-field-demo.onrender.com` serves both the frontend and the Node API over HTTPS. GitHub Pages is not the preferred runtime.
- The app copy in this folder retains the existing HTML/CSS/JS screens and backend workflow.
- The API base is configurable in `config.js`: browser use stays same-origin, and a packaged Capacitor Android app points to Render. The saved backend copy allows the Capacitor Android origin; that backend change still needs deployment before an APK can connect.
- Records are still held in a JSON file on the Render service. This is not a persistent database; file contents can disappear on restart or redeploy unless a persistent disk is explicitly configured.
- Login is still demo-only: shared password, fixed OTP, in-memory sessions, and no user directory or verified destination. No authentication provider credentials or verified operator enrollment details were supplied, so real OTP cannot be activated safely in this code-only step.
- Outcome classification remains simulated. The UI labels outcomes as simulated and says no image analysis is performed. Keep those labels in every app view and demo.
- Image bytes are not uploaded; only an image digest is included in the demo record. The current digest is not a digital signature or chain-of-custody proof.

## Recommended hackathon scope

Build an installable Android demo with the present simulated workflow, make all demo labels prominent, and do not use real case or personal data. If real operator authentication is required for the event, complete the provider and account setup below before calling the login real.

## Ordered work

1. **Confirm service configuration.** Keep Render as the API and frontend host. Set `CORS_ORIGINS` on Render to any additional exact web origins that need access; Android `https://localhost` is already allowed. Keep secrets on the server. Verify the deployed version after the backend changes are deployed.
2. **Choose and configure authentication.** Recommended path: managed phone OTP through an identity provider, with operator enrollment and verified numbers. Add provider credentials as Render environment secrets, validate provider-issued tokens in Node, and remove the shared password/fixed OTP only after the new flow works. Until then, the only honest label is demo authentication. Provider account, SMS setup, and operator enrollment are external prerequisites.
3. **Move records to durable storage.** Provision PostgreSQL (for example, a managed database), add schema/migrations and server-side authorization, then move reads/writes off `records.json`. Keep the JSON adapter only for local demonstration if useful. A Render persistent disk can retain a file, but it is not a substitute for the multi-user database/backup/access controls expected for real field records.
4. **Set up Capacitor.** Add Capacitor core/CLI and Android platform to this folder, set app ID/name to Niriksha, bundle these web assets, and preserve `config.js` with the Render API URL. Add camera/location plugins only if native APIs are needed; current file input and browser geolocation can be evaluated first.
5. **Build and verify on Android.** Generate a debug APK, install on a physical Android device, and check login, cookie/session continuity, new record, history, verification, image selection/camera, and location. Test denied permissions, app restart, expired session, and network loss. Keep offline behavior explicit because records require the backend.
6. **Release scope.** Add an app icon/splash, versioning, and a signed release build only after the service, auth, and device checks are ready. Do not describe the demo as production-ready while classification, persistence, auth, and record signing remain incomplete.

## Gate before APK distribution

- Decide and label the build as a hackathon demo or production field tool.
- For a demo APK: the current simulated classification and demo login must remain visibly labeled; use synthetic records only.
- For a real field tool: managed authentication, durable database and backup policy, validated classification data/model, image-retention policy, record signing, privacy review, and operational monitoring are prerequisites.

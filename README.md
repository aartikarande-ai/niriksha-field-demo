# Niriksha backend-connected prototype

## Run locally

1. Install Node.js 20 or later.
2. Double-click `Start-Niriksha.bat`, or open a terminal in this folder and run `npm start`.
3. Open `http://localhost:8080` in a browser. Do not open `index.html` directly.
4. Sign in with demo ID `OP-104`, password `demo1234`, and the demo OTP shown by the app (`246810`).

New demo records are submitted to `/api/records` and written to `data/records.json`. They are scoped to the entered demo operator ID. The image is not uploaded; only its browser-calculated SHA-256 digest is saved. Demo sample history remains illustrative.

## API overview

- `GET /api/health` — backend status
- `POST /api/auth/login` — validates demo credentials and starts a short-lived OTP challenge
- `POST /api/auth/verify-otp` — checks the demo OTP and issues an HttpOnly session cookie
- `GET /api/auth/me`, `POST /api/auth/logout` — session status and sign-out
- `GET /api/records`, `POST /api/records` — read/write operator-scoped demo records
- `POST /api/records/verify` — checks the saved server-side demo digest

## Prototype limits

This is a real local backend service, but it is **not safe for real case records or public production use**. The demo password and OTP are shared/fixed, accounts and roles are not managed, OTP is not delivered to a verified phone/email, sessions are held in server memory, and the JSON file is not encrypted or backed up. The server digest is not a digital signature or legal chain-of-custody control. Classification is still simulated and the reference-card model is not implemented.

The existing Netlify Drop deployment serves static files only. It will not run this Node server. To make a public hosted version use the backend, deploy the server to a Node-capable host, provision durable database storage and real identity/MFA, and configure the frontend to call the deployed API over HTTPS with appropriate CORS and cookie settings. Never place server secrets in browser JavaScript.

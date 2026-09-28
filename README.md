# Niriksha Android app preparation

This folder preserves the existing Niriksha HTML/CSS/JS app and Node backend while preparing it for Capacitor. It is not an APK yet.

## Current API setup

`config.js` keeps browser use same-origin (so Render and local Node both serve their own API) and points a packaged Capacitor Android app at `https://niriksha-field-demo.onrender.com`. Keep the API URL public; never place service credentials or signing secrets in this file. The backend copy permits Capacitor's default Android origins (`https://localhost` and `capacitor://localhost`) for credentialed API requests. Those backend changes must be deployed before an APK can connect.

If another browser-hosted origin must call the API, add its exact origin to the Render environment variable `CORS_ORIGINS`, as a comma-separated list, then deploy the server update. Do not use a wildcard for credentialed requests.

## Run a local server

1. Install Node.js 20 or later.
2. Run `npm start` in this folder or use `Start-Niriksha.bat`.
3. Open `http://localhost:8080`.
4. Demo credentials are `OP-104` / `demo1234`; the OTP is fixed at `246810`.

The current fixed OTP and shared password are demo authentication only. The backend stores records in a JSON file and does not provide durable database storage. Classification is simulated; the image is not analyzed or uploaded. Do not use real case or personal data.

## Next steps

Follow [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) for the ordered auth, database, Capacitor, and Android-device work. Real OTP requires a configured identity/SMS provider and enrolled, verified operators. No APK packaging or Render deployment has been performed in this preparation step.

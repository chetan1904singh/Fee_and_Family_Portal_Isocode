# Saarthi deployment and reviewer guide

## Current status

The source repository is intended to be published at https://github.com/chetan1904singh/Fee_and_Family_Portal_Isocode. The app has **not** been deployed to a public hosting provider; add the live URL to the Technical Design Document after deployment. Do not treat the sample credentials or mock services as production-ready.

## Run locally (Windows)

1. Install Node.js 20+ and MongoDB Community Server, or create an accessible MongoDB database.
2. Start the MongoDB service (for a local instance, the default database is `saarthi_fee_tracker`).
3. In the project root, copy `.env.example` to `.env`. Set `MONGODB_URI` to the local or hosted connection string. Replace `JWT_SECRET` with a random value at least 32 characters long. Keep `.env` out of source control.
4. In PowerShell, run:

   ```powershell
   npm install
   npm run seed
   npm run dev
   ```

5. Open the Vite URL (normally `http://localhost:5173`). The Express API runs on port 4000 and Vite proxies `/api` requests to it.
6. To run the production frontend build locally, use `npm run build` and `npm start`; Express serves `dist` and the API from the same origin.

The API seeds sample data at first startup if the student collection is empty. `npm run seed` can also be run explicitly; it does not overwrite existing student records.

## Demo logins

- **Centre accounts:** `accounts@companya.demo` / `Demo@123`
- **Parent portal:** select Parent portal, enter a sample guardian phone below, confirm the consent checkbox, and use OTP `123456` in development.
  - Aarav Meena — `9876500101`
  - Ishita Sharma — `9876500102`
  - Mohit Gurjar — `9876500103`

The OTP is a local-only mock. In production, parent OTP endpoints are disabled until a real SMS provider and verifiable-consent process are configured. The sample records, phone numbers, payments, reminders, and test/attendance data are synthetic.

## Deployment shape

The app is designed to deploy as one Node web service: build the React app during deployment, run the Express server, and connect it to a managed MongoDB database. The hosting platform should provide HTTPS, protect environment variables, and restrict network access to MongoDB. Configure an explicit frontend origin before starting in production. No deployment has been performed for this submission.

### Environment variable names

| Name | Purpose |
|---|---|
| `PORT` | Express listening port |
| `NODE_ENV` | Runtime environment |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Session-signing key (minimum 32 characters) |
| `CLIENT_ORIGIN` | Allowed browser origin(s), comma-separated |
| `DEMO_OTP_CODE` | Local-only mock parent OTP |
| `SEED_ACCOUNT_PASSWORD` | Password assigned when the demo accounts user is first created |

Never put production values in the repository. Production startup requires `JWT_SECRET`, `CLIENT_ORIGIN`, and `SEED_ACCOUNT_PASSWORD`; parent OTP remains disabled in production until real delivery is implemented.

## Validation

Run `npm test` for the refund/deadline, reminder, payment-allocation, ledger, risk-flag, authentication-guard, validation, and API-health tests. Run `npm run build` to validate the production frontend bundle.

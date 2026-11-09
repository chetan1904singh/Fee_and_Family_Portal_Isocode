# Saarthi — coaching fee & parent portal

A Node.js + Express, React, and MongoDB prototype for Company A's coaching-fee workflow. It includes a parent OTP demo, centre accounts workspace, instalment ledger, mock payments, Hindi/English reminder automation, a pro-rata refund review queue, Tally-ready CSV export, academic CSV import, and a transparent counsellor-support risk flag.

## Run locally

1. Use Node.js 20 or newer and have MongoDB running locally, or prepare a MongoDB connection string.
2. Copy `.env.example` to `.env`; configure `MONGODB_URI` and replace `JWT_SECRET` with a random value of at least 32 characters.
3. Run `npm install`, then `npm run seed` once to load the sample students and demo accounts.
4. Run `npm run dev`. Open the URL printed by Vite (normally `http://localhost:5173`).
5. Reviewer credentials and deployment notes are in [deployment.md](./deployment.md).

## Useful commands

- `npm run dev` — Vite frontend and Express API.
- `npm run build` — production frontend build.
- `npm start` — Express API and built frontend (requires MongoDB and `.env`).
- `npm run seed` — idempotently adds sample students and demo accounts to an empty database.
- `npm test` — business-rule and API-access tests.

The server also seeds sample data on first startup. Payments, OTP delivery, and outbound reminders are intentionally mocked. Do not use this prototype as a production fee or tax system without replacing those integrations and reviewing the stated assumptions.

## Submission

- [Technical-Design-Document.docx](./Technical-Design-Document.docx)
- [deployment.md](./deployment.md)
- [Saarthi-submission.zip](./Saarthi-submission.zip) — contains the two requested reviewer files.

No public GitHub repository or hosted app URL was supplied or created from this workspace. The TDD calls this out; replace its placeholder before submitting publicly.

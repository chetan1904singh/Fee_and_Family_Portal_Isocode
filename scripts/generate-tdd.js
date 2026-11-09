import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { writeFile } from 'node:fs/promises';

const text = (value, options = {}) => new Paragraph({
  spacing: { after: 120, line: 280 },
  children: [new TextRun({ text: value, ...options })],
});
const heading = (value, level = HeadingLevel.HEADING_1) => new Paragraph({
  text: value,
  heading: level,
  spacing: { before: 240, after: 110 },
});
const bullet = (value) => new Paragraph({
  text: value,
  bullet: { level: 0 },
  spacing: { after: 70, line: 260 },
});

const children = [
  text('GitHub URL: Not published yet — add the public GitHub URL before submission.'),
  text('Live app: Not deployed.'),
  new Paragraph({ text: 'Saarthi', heading: HeadingLevel.TITLE, spacing: { after: 80 } }),
  new Paragraph({ text: 'Coaching Institute Fee Tracking System', heading: HeadingLevel.HEADING_2, spacing: { after: 220 } }),
  text('Technical Design Document · 9 November 2026'),

  heading('1. Product and scope'),
  text('Saarthi is a responsive prototype for the brief’s core workflow: centre accounts staff can see fee plans and ageing across seeded centres, while a parent can check the next amount and date, review learning progress and receipts, and make a mock payment. Reminder automation and a human-reviewed refund estimate complete the main operational loop.'),
  text('Roles are accounts executive and parent. Access is separated by role; a parent token is linked to exactly one student record. The demo has three synthetic sample students rather than the client’s full 2,600-student population.'),

  heading('2. Architecture and rationale'),
  bullet('Frontend: React 19 and Vite, with a responsive CSS design system and small inline icon set. A client-rendered app keeps the parent’s next payment visible on low-end mobile screens without requiring a separate page load for each feature.'),
  bullet('Backend: Node.js 20+ and Express 5 expose JSON APIs, role checks, validation, and mock integrations. In development Vite proxies /api; in production Express serves the built frontend and API together.'),
  bullet('Database: MongoDB with Mongoose models. Student fee plan, payments, attendance, and test results are stored together as an auditable student record; users, reminder deliveries, refund requests, and counsellor tasks have separate collections.'),
  bullet('Security: bcrypt password hashes, eight-hour signed bearer tokens, server-side role/ownership checks, Zod request validation, auth rate limiting, Helmet headers, restricted body size, and environment-only deployment secrets.'),
  text('Local setup and environment-variable names are in deployment.md. The project requires an accessible MongoDB instance; this workspace did not include a running database or hosting credentials.'),

  heading('3. Data model'),
  bullet('Student: student ID, name, centre, batch, course dates, annual fee, discount, guardian name/phone/language/consent timestamp, scheduled instalments, payment receipts, attendance, and test scores.'),
  bullet('Instalment: label, due date, and amount. Outstanding amount and days overdue are derived from matched payment records and the current date; balances are not independently edited.'),
  bullet('Payment: instalment reference, amount, unique mock receipt reference, paid timestamp, and mock-gateway source. A successful mock checkout records the exact remaining balance against that instalment.'),
  bullet('User: accounts or parent role, display name, hashed accounts password, and (for a parent) one linked student ID.'),
  bullet('Reminder: unique student/instalment/stage key, language, message text, amount due, and queue timestamp. RefundRequest stores the policy estimate and review status. CounsellorTask stores risk reasons and an open/false-flag/completed state.'),

  heading('4. Main flows'),
  heading('4.1 Accounts sign-in and fee ledger', HeadingLevel.HEADING_2),
  text('An accounts executive signs in with the seeded demo credential. The overview rolls up billed, collected, outstanding, overdue, and 30-day due amounts; charts and tables group dues by centre and batch and show 1–30, 31–60, and 61+ day ageing. The searchable ledger opens an individual instalment drawer with payment allocation, discount, due dates, receipts, attendance, and scores. The Tally action downloads a UTF-8 CSV.'),
  heading('4.2 Parent access and payment', HeadingLevel.HEADING_2),
  text('A parent confirms the consent checkbox, requests a demo OTP for the registered guardian phone, and verifies the local-only code. The parent portal prioritizes the amount due, due date, and pay action, followed by the plan, attendance, test results, and GST-displaying receipts. Successful mock checkout immediately writes a receipt and recomputes the balance; later reminder runs skip fully paid instalments.'),
  heading('4.3 Reminders and academic uploads', HeadingLevel.HEADING_2),
  text('A scheduler runs reminder evaluation at server startup and every 24 hours; accounts can also run it manually. It checks open instalments at three days before, on the due date, and weekly after the due date. A unique delivery key prevents repeat messages within a reminder period. Messages use the guardian’s English or Hindi preference and are mocked, not sent to SMS/WhatsApp. Accounts can upload attendance and scores using the provided CSV template. Rows are validated and checked against the student’s batch before writes.'),
  heading('4.4 Refund calculation and review', HeadingLevel.HEADING_2),
  text('Accounts selects a student and cancellation date. The backend validates that the leaving date is inside the course period, calculates the estimate and a due-by date 10 calendar days after leaving, and saves it in a review queue. Late entries remain visible as overdue. Approve/decline only updates review status; it never creates a disbursement.'),

  heading('5. AI / automation and handling mistakes'),
  text('The “dropout-risk” function is a deterministic, explainable support heuristic, not a trained machine-learning model. It adds 40 points for an overdue unpaid instalment, 35 for attendance below 75%, and 25 for a fall of at least 10 points between the two latest test scores. A combined score of 50 or more creates a counsellor call task with reasons. The interface labels this as a support signal.'),
  text('A counsellor can mark a false flag; the task is then suppressed from the active list. A flag never changes a fee, sends a parent message, blocks a student, or initiates payment. New/uncertain cases have no automatic financial or parent-facing consequence.'),

  heading('6. UI and design decisions'),
  bullet('Overview: restrained forest-green palette, warm off-white canvas, compact metric cards, and centre/batch summaries make the accounts view useful without adding decoration unrelated to a task.'),
  bullet('Fee ledger: search, centre/batch filters, a dense but readable table, and a focused detail drawer keep individual ledger actions close to the matching record.'),
  bullet('Parent portal: the next amount, date, and single primary Pay now button are the dominant panel. English/Hindi labels follow the guardian’s selected language; supporting receipts and learning data are secondary. Parent screens reflow to one column on narrow displays.'),
  bullet('Reminders and refunds: each explains its timing or calculation before presenting operational history. Refund estimates show that they require staff review.'),
  bullet('Mobile access: responsive layout, large touch targets, system fonts, accessible labels, visible loading/error/empty states, and no required remote font/image requests.'),

  heading('7. Assumptions (explicit)'),
  bullet('The sample rows and stated current date (9 November 2026) take precedence over their stale relative-status text. Thus 10 October is calculated as 30 days overdue, not 23; balances are calculated from dates and payment entries.'),
  bullet('Aarav and Ishita’s ₹30,000 first instalment implies four ₹30,000 instalments and a ₹1,20,000 yearly fee. Mohit’s ₹40,000 sample instalment is represented as four ₹40,000 instalments (₹1,60,000 annual fee), even though the brief’s average is ₹1,20,000.'),
  bullet('Unspecified future due dates are quarterly demo dates; course dates are 1 April 2026 through 31 March 2027. Seed discounts are zero but the ledger supports a discount value.'),
  bullet('Refund estimate is paid tuition × unused calendar course days ÷ total calendar course days, capped at paid amount and net fee. The prototype tracks a deadline of 10 calendar days after leaving; overdue requests remain visible for accounts instead of being blocked. There is no processing deduction. This is a declared demo interpretation, not legal advice or a substitute for the client’s approved written policy.'),
  bullet('GST is displayed using an illustrative 18% rate on the sample payment amount. Confirm actual GST classification, rate, invoice fields, and whether amounts are tax-inclusive before issuing legal receipts.'),
  bullet('Guardian consent is captured as a demo confirmation and timestamp; this does not establish production-grade verifiable parental consent under DPDP. A real verification provider and consent evidence flow are required.'),
  bullet('OTP, payment checkout, messages, and payment matching are mocked. No payment gateway or SMS/WhatsApp provider is connected; unmatched external payments are therefore not imported or auto-marked paid.'),
  bullet('Risk thresholds and sample attendance/test values are illustrative assumptions intended to demonstrate the task-only safety behavior, not a validated prediction.'),
  bullet('The seed contains only three fictional sample records, not four operational centres, 2,600 students, or actual personal/financial data.'),

  heading('8. What is cut and what comes next'),
  text('Cut from this prototype: real OTP/SMS delivery and verifiable consent evidence; production payment gateway and settlement reconciliation; unmatched-payment accounts queue; real Tally integration (CSV only); GST/legal receipt certification; multi-user centre permissions, bulk student migration, audit/retention tooling, and a deployed public app. Video lessons, timetables, and admissions CRM remain out of scope as requested.'),
  text('Next: confirm the institute’s signed fee and refund policies with counsel/accounts; implement consent verification and messaging/payment provider webhooks with idempotent reconciliation; add immutable audit events, data-retention controls, centre-level access, production monitoring, and load tests against representative data; validate the risk heuristic with counsellors and monitor false positives; then deploy to a secured managed MongoDB and HTTPS host.'),

  heading('9. Verification'),
  text('`npm test` runs 13 focused unit/API tests for calendar calculations, instalment allocation, reminder stages and language, refund boundaries, dropout-risk signals, ledger status, health response, input validation, and access-control guards. `npm run build` validates the production React bundle. Live MongoDB integration could not be exercised in this workspace because no MongoDB service or connection was supplied.'),
];

const doc = new Document({
  creator: 'Saarthi project team',
  title: 'Saarthi Technical Design Document',
  description: 'Technical design for the coaching institute fee tracking system prototype.',
  sections: [{
    properties: {
      page: {
        margin: { top: 850, right: 900, bottom: 850, left: 900 },
      },
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
await writeFile(new URL('../Technical-Design-Document.docx', import.meta.url), buffer);

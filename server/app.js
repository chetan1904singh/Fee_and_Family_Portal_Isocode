import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  calculateDropoutRisk, calculateProRataRefund, createReminderMessage,
  formatStudent, getInstallmentPaid, getReminderStage,
} from './domain.js';
import { CounsellorTask, RefundRequest, Reminder, Student, User } from './models.js';
import {
  accountLoginSchema, otpRequestSchema, otpVerifySchema, paymentSchema,
  academicUploadSchema, refundSchema, studentQuerySchema,
} from './validation.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jwtSecret = process.env.JWT_SECRET ?? (
  process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(32).toString('hex')
);
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN is required in production.');
}

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, result.error.issues.map((issue) => issue.message).join('; '));
  }
  return result.data;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function issueToken(user) {
  return jwt.sign({
    sub: String(user._id),
    role: user.role,
    studentId: user.studentId,
    displayName: user.displayName,
  }, jwtSecret, { expiresIn: '8h', issuer: 'saarthi-fee-tracker' });
}

function authenticate(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new HttpError(401, 'Please sign in to continue.'));
  try {
    req.user = jwt.verify(token, jwtSecret, { issuer: 'saarthi-fee-tracker' });
    return next();
  } catch {
    return next(new HttpError(401, 'Your session expired. Please sign in again.'));
  }
}

function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have access to this action.'));
    return next();
  };
}

async function findOwnedStudent(req, studentId) {
  if (req.user.role === 'parent' && req.user.studentId !== studentId) {
    throw new HttpError(403, 'This student is not linked to your parent account.');
  }
  const student = await Student.findOne({ studentId });
  if (!student) throw new HttpError(404, 'Student record not found.');
  return student;
}

function asStudent(student) {
  const result = formatStudent(student);
  result.receipts = result.receipts.map((receipt) => ({
    ...receipt,
    gstAmount: Math.round(receipt.amount * 0.18),
    totalWithGst: Math.round(receipt.amount * 1.18),
  }));
  return result;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Saarthi' }));

app.post('/api/auth/accounts', asyncRoute(async (req, res) => {
  const input = parse(accountLoginSchema, req.body);
  const user = await User.findOne({ email: input.email.toLowerCase(), role: 'accounts' });
  if (!user || !await bcrypt.compare(input.password, user.passwordHash)) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  res.json({
    token: issueToken(user),
    user: { displayName: user.displayName, role: user.role },
  });
}));

app.post('/api/auth/parent/request-otp', asyncRoute(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'Parent OTP delivery is not configured for production.');
  }
  const input = parse(otpRequestSchema, req.body);
  const student = await Student.findOne({ 'parent.phone': input.phone });
  if (!student) throw new HttpError(404, 'No parent account is linked to that phone number.');
  student.parent.consentAt = new Date();
  student.parent.language = input.language;
  await student.save();
  const response = { message: 'A one-time code was sent to your registered phone.' };
  if (process.env.NODE_ENV !== 'production') response.demoCode = process.env.DEMO_OTP_CODE ?? '123456';
  res.json(response);
}));

app.post('/api/auth/parent/verify', asyncRoute(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'Parent OTP verification is not configured for production.');
  }
  const input = parse(otpVerifySchema, req.body);
  const expectedCode = process.env.DEMO_OTP_CODE ?? '123456';
  if (input.code !== expectedCode) throw new HttpError(401, 'That one-time code is not valid.');
  const student = await Student.findOne({ 'parent.phone': input.phone, 'parent.consentAt': { $ne: null } });
  if (!student) throw new HttpError(401, 'No verified parent account was found for this number.');
  const user = await User.findOne({ role: 'parent', studentId: student.studentId });
  if (!user) throw new HttpError(404, 'Parent account has not been provisioned.');
  res.json({ token: issueToken(user), user: { displayName: user.displayName, role: user.role } });
}));

app.get('/api/me', authenticate, asyncRoute(async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.json({ displayName: req.user.displayName, role: req.user.role });
  }
  const student = await findOwnedStudent(req, req.user.studentId);
  return res.json({
    displayName: req.user.displayName,
    role: req.user.role,
    student: asStudent(student),
  });
}));

app.get('/api/students', authenticate, allowRoles('accounts'), asyncRoute(async (req, res) => {
  const query = parse(studentQuerySchema, req.query);
  const filter = {};
  if (query.centre) filter.centre = query.centre;
  if (query.batch) filter.batch = query.batch;
  if (query.q) {
    const safeQuery = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: safeQuery, $options: 'i' } },
      { studentId: { $regex: safeQuery, $options: 'i' } },
      { batch: { $regex: safeQuery, $options: 'i' } },
    ];
  }
  const students = await Student.find(filter).sort({ name: 1 });
  res.json({ students: students.map(asStudent) });
}));

app.get('/api/students/:studentId', authenticate, asyncRoute(async (req, res) => {
  if (req.user.role === 'parent' && req.user.studentId !== req.params.studentId) {
    throw new HttpError(403, 'This student is not linked to your parent account.');
  }
  const student = await findOwnedStudent(req, req.params.studentId);
  res.json({ student: asStudent(student) });
}));

app.get('/api/dashboard', authenticate, allowRoles('accounts'), asyncRoute(async (_req, res) => {
  const now = new Date();
  const students = await Student.find();
  const formatted = students.map(asStudent);
  const billed = formatted.reduce((sum, student) => sum + student.feeTotal, 0);
  const collected = formatted.reduce((sum, student) => sum + student.paidTotal, 0);
  const outstanding = formatted.reduce((sum, student) => sum + student.balance, 0);
  const overdue = formatted.reduce((sum, student) => sum + student.installments
    .filter((installment) => installment.daysOverdue > 0)
    .reduce((balance, installment) => balance + installment.balance, 0), 0);
  const dueSoon = formatted.reduce((sum, student) => sum + student.installments
    .filter((installment) => installment.balance > 0
      && new Date(installment.dueDate) >= new Date(now.toISOString().slice(0, 10))
      && new Date(installment.dueDate) <= new Date(now.getTime() + 30 * 86_400_000))
    .reduce((balance, installment) => balance + installment.balance, 0), 0);
  const centreMap = new Map();
  for (const student of formatted) {
    const centre = centreMap.get(student.centre) ?? { centre: student.centre, billed: 0, collected: 0, overdue: 0 };
    centre.billed += student.feeTotal;
    centre.collected += student.paidTotal;
    centre.overdue += student.installments.filter((item) => item.daysOverdue > 0)
      .reduce((sum, item) => sum + item.balance, 0);
    centreMap.set(student.centre, centre);
  }
  const ageing = { '1–30 days': 0, '31–60 days': 0, '61+ days': 0 };
  for (const student of formatted) {
    for (const installment of student.installments) {
      if (installment.daysOverdue > 0 && installment.balance > 0) {
        const bucket = installment.daysOverdue <= 30 ? '1–30 days'
          : installment.daysOverdue <= 60 ? '31–60 days' : '61+ days';
        ageing[bucket] += installment.balance;
      }
    }
  }
  const batches = [...new Set(formatted.map((student) => student.batch))].map((batch) => {
    const rows = formatted.filter((student) => student.batch === batch);
    return {
      batch,
      students: rows.length,
      outstanding: rows.reduce((sum, student) => sum + student.balance, 0),
      overdue: rows.reduce((sum, student) => sum + student.installments
        .filter((item) => item.daysOverdue > 0)
        .reduce((total, item) => total + item.balance, 0), 0),
    };
  });
  res.json({
    stats: {
      students: formatted.length, billed, collected, outstanding, overdue, dueSoon,
      collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
    },
    centres: [...centreMap.values()],
    batches,
    ageing,
    students: formatted,
  });
}));

app.post('/api/payments/mock', authenticate, asyncRoute(async (req, res) => {
  const input = parse(paymentSchema, req.body);
  const student = await findOwnedStudent(req, input.studentId);
  const installment = student.installments.id(input.installmentId);
  if (!installment) throw new HttpError(404, 'Instalment not found.');
  const paid = getInstallmentPaid(installment, student.payments);
  const remaining = Math.max(0, installment.amount - paid);
  if (remaining === 0) throw new HttpError(409, 'This instalment is already paid.');
  const payment = {
    installmentId: installment._id,
    amount: remaining,
    reference: `MOCK-${student.studentId}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    paidAt: new Date(),
    source: 'mock-gateway',
  };
  student.payments.push(payment);
  await student.save();
  res.status(201).json({
    message: 'Mock payment successful. The fee ledger has been updated.',
    receipt: { amount: remaining, reference: payment.reference, paidAt: payment.paidAt, gstRate: 18 },
    student: asStudent(student),
  });
}));

app.get('/api/reminders', authenticate, allowRoles('accounts'), asyncRoute(async (_req, res) => {
  const reminders = await Reminder.find().sort({ sentAt: -1 }).limit(50);
  res.json({ reminders });
}));

export async function runReminders() {
  const students = await Student.find();
  const now = new Date();
  const sent = [];
  for (const student of students) {
    for (const installment of student.installments) {
      const paid = getInstallmentPaid(installment, student.payments);
      const stage = getReminderStage(installment.dueDate, installment.amount - paid, now);
      if (!stage) continue;
      const key = `${student.studentId}:${installment.id}:${stage}`;
      try {
        const reminder = await Reminder.create({
          key,
          studentId: student.studentId,
          studentName: student.name,
          installmentLabel: installment.label,
          amountDue: installment.amount - paid,
          language: student.parent.language,
          stage,
          message: createReminderMessage({
            studentName: student.name,
            amountDue: installment.amount - paid,
            dueDate: installment.dueDate,
            stage,
            language: student.parent.language,
          }),
          sentAt: now,
        });
        sent.push(reminder);
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
  }
  return sent;
}

app.post('/api/reminders/run', authenticate, allowRoles('accounts'), asyncRoute(async (_req, res) => {
  const sent = await runReminders();
  res.json({
    sent: sent.length,
    reminders: sent,
    message: sent.length ? `${sent.length} reminder${sent.length === 1 ? '' : 's'} queued.` : 'No reminders due. Paid instalments are skipped.',
  });
}));

app.post('/api/bulk/academic', authenticate, allowRoles('accounts'), asyncRoute(async (req, res) => {
  const input = parse(academicUploadSchema, req.body);
  const rows = [...input.attendance, ...input.scores];
  const studentIds = [...new Set(rows.map((row) => row.studentId))];
  const students = await Student.find({ studentId: { $in: studentIds } });
  const byId = new Map(students.map((student) => [student.studentId, student]));
  for (const row of rows) {
    const student = byId.get(row.studentId);
    if (!student) throw new HttpError(404, `Student ${row.studentId} was not found.`);
    if (student.batch !== row.batch) {
      throw new HttpError(400, `Batch does not match ${row.studentId}. No records were imported.`);
    }
  }
  for (const row of input.attendance) {
    byId.get(row.studentId).attendance.push({ date: new Date(`${row.date}T00:00:00.000Z`), present: row.present });
  }
  for (const row of input.scores) {
    byId.get(row.studentId).scores.push({
      test: row.test, date: new Date(`${row.date}T00:00:00.000Z`), score: row.score,
    });
  }
  await Promise.all(students.map((student) => student.save()));
  res.status(201).json({ attendanceAdded: input.attendance.length, scoresAdded: input.scores.length });
}));

app.get('/api/refunds', authenticate, allowRoles('accounts'), asyncRoute(async (_req, res) => {
  const refunds = await RefundRequest.find().sort({ requestedAt: -1 }).limit(100);
  const now = new Date();
  res.json({
    refunds: refunds.map((refund) => ({
      ...refund.toObject(),
      isOverdue: refund.status === 'review' && refund.dueBy < now,
    })),
  });
}));

app.post('/api/refunds', authenticate, allowRoles('accounts'), asyncRoute(async (req, res) => {
  const input = parse(refundSchema, req.body);
  const student = await Student.findOne({ studentId: input.studentId });
  if (!student) throw new HttpError(404, 'Student record not found.');
  const result = calculateProRataRefund({
    paidAmount: student.payments.reduce((sum, payment) => sum + payment.amount, 0),
    netCourseFee: Math.max(0, student.annualFee - student.discount),
    courseStart: student.courseStart,
    courseEnd: student.courseEnd,
    cancellationDate: input.cancellationDate,
  });
  const refund = await RefundRequest.create({
    studentId: student.studentId,
    studentName: student.name,
    centre: student.centre,
    batch: student.batch,
    cancellationDate: new Date(`${input.cancellationDate}T00:00:00.000Z`),
    requestedAt: new Date(),
    dueBy: result.dueBy,
    amount: result.amount,
    formula: result.formula,
  });
  res.status(201).json({
    message: 'Estimate saved for accounts review; no payment was initiated.',
    refund,
    calculation: result,
  });
}));

app.patch('/api/refunds/:id', authenticate, allowRoles('accounts'), asyncRoute(async (req, res) => {
  const decision = parse(z.object({ status: z.enum(['approved', 'rejected']) }), req.body);
  const refund = await RefundRequest.findByIdAndUpdate(
    req.params.id,
    { status: decision.status },
    { new: true, runValidators: true },
  );
  if (!refund) throw new HttpError(404, 'Refund request not found.');
  res.json({ refund });
}));

app.get('/api/risks', authenticate, allowRoles('accounts'), asyncRoute(async (_req, res) => {
  const students = await Student.find();
  const rows = [];
  for (const student of students) {
    const risk = calculateDropoutRisk(student);
    if (!risk.flagged) continue;
    let task = await CounsellorTask.findOne({ studentId: student.studentId });
    if (!task) {
      task = await CounsellorTask.create({
        studentId: student.studentId,
        studentName: student.name,
        centre: student.centre,
        score: risk.score,
        reasons: risk.reasons,
        status: 'open',
        createdAt: new Date(),
      });
    }
    rows.push({ ...risk, studentId: student.studentId, studentName: student.name, batch: student.batch, taskId: String(task._id), taskStatus: task.status });
  }
  res.json({ risks: rows });
}));

app.patch('/api/risks/:taskId/false-flag', authenticate, allowRoles('accounts'), asyncRoute(async (req, res) => {
  const task = await CounsellorTask.findByIdAndUpdate(
    req.params.taskId,
    { status: 'false_flag' },
    { new: true, runValidators: true },
  );
  if (!task) throw new HttpError(404, 'Counsellor task not found.');
  res.json({ message: 'Flag marked as incorrect. No fee or parent action was taken.', task });
}));

app.patch('/api/risks/:taskId/complete', authenticate, allowRoles('accounts'), asyncRoute(async (req, res) => {
  const task = await CounsellorTask.findOneAndUpdate(
    { _id: req.params.taskId, status: 'open' },
    { status: 'completed' },
    { new: true, runValidators: true },
  );
  if (!task) throw new HttpError(404, 'Open counsellor task not found.');
  res.json({ message: 'Counsellor call task marked complete. No fee or parent action was taken.', task });
}));

app.get('/api/exports/tally.csv', authenticate, allowRoles('accounts'), asyncRoute(async (_req, res) => {
  const students = await Student.find().sort({ centre: 1, batch: 1, name: 1 });
  const lines = [['Student ID', 'Student', 'Centre', 'Batch', 'Fee plan', 'Discount INR', 'Paid INR', 'Balance INR', 'Overdue INR']];
  for (const student of students) {
    const formatted = asStudent(student);
    const overdue = formatted.installments.filter((item) => item.daysOverdue > 0)
      .reduce((sum, item) => sum + item.balance, 0);
    lines.push([
      formatted.id, formatted.name, formatted.centre, formatted.batch,
      formatted.feeTotal, formatted.discount, formatted.paidTotal, formatted.balance, overdue,
    ]);
  }
  const csv = lines.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="saarthi-tally-export.csv"');
  res.send(`\uFEFF${csv}`);
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

const indexHtml = path.resolve(__dirname, '../dist/index.html');
app.use(express.static(path.resolve(__dirname, '../dist')));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(indexHtml, (error) => error && next(error));
});

app.use((error, _req, res, _next) => {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid record identifier.' });
  if (error?.name === 'ValidationError') return res.status(400).json({ error: error.message });
  console.error('Unhandled API error:', error);
  return res.status(500).json({ error: 'Something went wrong. Please try again or contact accounts.' });
});

export { app };

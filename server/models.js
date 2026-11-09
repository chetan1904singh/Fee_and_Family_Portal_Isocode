import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema({
  label: { type: String, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
});

const paymentSchema = new mongoose.Schema({
  installmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 1 },
  reference: { type: String, required: true, unique: true },
  paidAt: { type: Date, required: true },
  source: { type: String, enum: ['mock-gateway'], default: 'mock-gateway' },
});

const Student = mongoose.model('Student', new mongoose.Schema({
  studentId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  batch: { type: String, required: true },
  centre: { type: String, required: true },
  course: { type: String, required: true },
  courseStart: { type: Date, required: true },
  courseEnd: { type: Date, required: true },
  annualFee: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  parent: {
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    consentAt: { type: Date, default: null },
  },
  installments: { type: [installmentSchema], default: [] },
  payments: { type: [paymentSchema], default: [] },
  attendance: [{
    date: { type: Date, required: true },
    present: { type: Boolean, required: true },
  }],
  scores: [{
    test: { type: String, required: true },
    date: { type: Date, required: true },
    score: { type: Number, min: 0, max: 100, required: true },
  }],
}, { timestamps: true }));

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  passwordHash: String,
  role: { type: String, enum: ['accounts', 'parent'], required: true },
  displayName: { type: String, required: true },
  studentId: String,
}, { timestamps: true }));

const Reminder = mongoose.model('Reminder', new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  installmentLabel: { type: String, required: true },
  amountDue: { type: Number, required: true },
  language: { type: String, enum: ['en', 'hi'], required: true },
  stage: { type: String, required: true },
  message: { type: String, required: true },
  sentAt: { type: Date, required: true },
}, { timestamps: true }));

const RefundRequest = mongoose.model('RefundRequest', new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  centre: { type: String, required: true },
  batch: { type: String, required: true },
  cancellationDate: { type: Date, required: true },
  requestedAt: { type: Date, required: true },
  dueBy: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['review', 'approved', 'rejected'], default: 'review' },
  formula: { type: String, required: true },
}, { timestamps: true }));

const CounsellorTask = mongoose.model('CounsellorTask', new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  centre: { type: String, required: true },
  score: { type: Number, required: true },
  reasons: { type: [String], default: [] },
  status: { type: String, enum: ['open', 'false_flag', 'completed'], default: 'open' },
  createdAt: { type: Date, required: true },
}, { timestamps: true }));

export { CounsellorTask, RefundRequest, Reminder, Student, User };

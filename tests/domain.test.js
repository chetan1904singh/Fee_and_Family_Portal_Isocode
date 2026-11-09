import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDropoutRisk, calculateProRataRefund, createReminderMessage,
  daysBetween, formatStudent, getInstallmentPaid, getReminderStage,
} from '../server/domain.js';

const now = new Date('2026-11-09T12:00:00.000Z');

test('calendar-day differences do not drift with clock time', () => {
  assert.equal(daysBetween('2026-10-10', now), 30);
  assert.equal(daysBetween(now, '2026-11-12'), 3);
});

test('installment payment totals only match the selected installment', () => {
  const installment = { _id: 'inst-1' };
  const payments = [
    { installmentId: 'inst-1', amount: 15000 },
    { installmentId: 'inst-2', amount: 30000 },
  ];
  assert.equal(getInstallmentPaid(installment, payments), 15000);
});

test('reminder cadence covers upcoming, due, and weekly overdue; paid balances stop', () => {
  assert.equal(getReminderStage('2026-11-12', 5000, now), 'before-3');
  assert.equal(getReminderStage('2026-11-09', 5000, now), 'due-today');
  assert.equal(getReminderStage('2026-10-10', 15000, now), 'overdue-29');
  assert.equal(getReminderStage('2026-10-10', 0, now), null);
});

test('reminder text respects the family language and includes amount and date', () => {
  const message = createReminderMessage({
    studentName: 'Ishita Sharma',
    amountDue: 15000,
    dueDate: '2026-10-10',
    stage: 'overdue-29',
    language: 'hi',
  });
  assert.match(message, /Ishita Sharma/);
  assert.match(message, /₹15,000/);
  assert.match(message, /अक्तू/);
});

test('pro-rata refund uses unused course days and caps at fees paid', () => {
  const result = calculateProRataRefund({
    paidAmount: 30000,
    netCourseFee: 120000,
    courseStart: '2026-04-01',
    courseEnd: '2027-03-31',
    cancellationDate: '2026-07-01',
    requestedAt: '2026-07-05',
  });
  assert.equal(result.amount, 22500);
  assert.equal(result.usedDays + result.unusedDays, result.totalDays);
  assert.match(result.formula, /unused days/);
});

test('refund due date is ten calendar days after leaving and late requests remain visible', () => {
  const common = {
    paidAmount: 30000,
    netCourseFee: 120000,
    courseStart: '2026-04-01',
    courseEnd: '2027-03-31',
    cancellationDate: '2026-07-01',
  };
  const day10 = calculateProRataRefund({ ...common, requestedAt: '2026-07-11' });
  assert.equal(day10.daysUntilDeadline, 0);
  assert.equal(day10.isOverdue, false);
  const day11 = calculateProRataRefund({ ...common, requestedAt: '2026-07-12' });
  assert.equal(day11.daysUntilDeadline, -1);
  assert.equal(day11.isOverdue, true);
  assert.throws(() => calculateProRataRefund({ ...common, cancellationDate: '2026-03-31', requestedAt: '2026-04-01' }), /within the course/);
  assert.throws(() => calculateProRataRefund({ ...common, requestedAt: '2026-06-30' }), /future/);
});

test('dropout flag requires combined signals and produces human-readable reasons', () => {
  const student = {
    installments: [{ _id: 'inst-1', dueDate: new Date('2026-10-10'), amount: 30000 }],
    payments: [{ installmentId: 'inst-1', amount: 15000 }],
    attendance: Array.from({ length: 20 }, (_, index) => ({ present: index < 13 })),
    scores: [
      { date: new Date('2026-09-10'), score: 67 },
      { date: new Date('2026-10-10'), score: 48 },
    ],
  };
  const risk = calculateDropoutRisk(student, now);
  assert.equal(risk.flagged, true);
  assert.equal(risk.score, 100);
  assert.equal(risk.attendanceRate, 65);
  assert.equal(risk.reasons.length, 3);

  const stable = calculateDropoutRisk({
    installments: [{ _id: 'inst-2', dueDate: new Date('2026-12-10'), amount: 30000 }],
    payments: [],
    attendance: [{ present: true }, { present: true }],
    scores: [{ date: new Date('2026-10-10'), score: 75 }],
  }, now);
  assert.equal(stable.flagged, false);
});

test('fee ledger reports part-paid overdue instalments and GST-ready receipts', () => {
  const student = {
    studentId: 'STU-0587',
    name: 'Ishita Sharma',
    batch: 'JEE 2027 Evening',
    centre: 'Jaipur North',
    annualFee: 120000,
    discount: 0,
    parent: { name: 'Rakesh Sharma', phone: '9876500102', language: 'hi' },
    installments: [{ _id: 'inst-1', label: 'Instalment 1', dueDate: new Date('2026-10-10'), amount: 30000 }],
    payments: [{
      installmentId: 'inst-1', amount: 15000, reference: 'MOCK-0587-1002',
      paidAt: new Date('2026-10-10'),
    }],
    attendance: [],
    scores: [],
  };
  const ledger = formatStudent(student, now);
  assert.equal(ledger.balance, 15000);
  assert.equal(ledger.installments[0].status, 'Part paid');
  assert.equal(ledger.installments[0].daysOverdue, 30);
  assert.equal(ledger.receipts[0].gstRate, 18);
});

import bcrypt from 'bcryptjs';
import { Student, User } from './models.js';

const D = (date) => new Date(`${date}T00:00:00.000Z`);

function buildInstalments(rows) {
  return rows.map(([label, dueDate, amount]) => ({ label, dueDate: D(dueDate), amount }));
}

function buildAttendance(presentCount, total = 20) {
  return Array.from({ length: total }, (_, index) => ({
    date: new Date(Date.UTC(2026, 9, 1 + index)),
    present: index < presentCount,
  }));
}

export async function seedDatabaseIfEmpty() {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ACCOUNT_PASSWORD) {
    throw new Error('SEED_ACCOUNT_PASSWORD is required in production.');
  }
  const sample = [
    {
      studentId: 'STU-0412', name: 'Aarav Meena', batch: 'JEE 2027 Morning',
      centre: 'Jaipur Central', course: 'JEE 2027', courseStart: D('2026-04-01'), courseEnd: D('2027-03-31'),
      annualFee: 120000, discount: 0,
      parent: { name: 'Kavita Meena', phone: '9876500101', language: 'en', consentAt: D('2026-04-01') },
      installments: buildInstalments([
        ['Instalment 1', '2026-10-10', 30000], ['Instalment 2', '2026-12-10', 30000],
        ['Instalment 3', '2027-02-10', 30000], ['Instalment 4', '2027-04-10', 30000],
      ]),
      paid: [30000],
      attendance: buildAttendance(19),
      scores: [{ test: 'Mock 05', date: D('2026-09-10'), score: 76 }, { test: 'Mock 06', date: D('2026-10-10'), score: 78 }],
    },
    {
      studentId: 'STU-0587', name: 'Ishita Sharma', batch: 'JEE 2027 Evening',
      centre: 'Jaipur North', course: 'JEE 2027', courseStart: D('2026-04-01'), courseEnd: D('2027-03-31'),
      annualFee: 120000, discount: 0,
      parent: { name: 'Rakesh Sharma', phone: '9876500102', language: 'hi', consentAt: D('2026-04-01') },
      installments: buildInstalments([
        ['Instalment 1', '2026-10-10', 30000], ['Instalment 2', '2026-12-10', 30000],
        ['Instalment 3', '2027-02-10', 30000], ['Instalment 4', '2027-04-10', 30000],
      ]),
      paid: [15000],
      attendance: buildAttendance(13),
      scores: [{ test: 'Mock 05', date: D('2026-09-10'), score: 67 }, { test: 'Mock 06', date: D('2026-10-10'), score: 48 }],
    },
    {
      studentId: 'STU-0219', name: 'Mohit Gurjar', batch: 'NEET 2027 Morning',
      centre: 'Jaipur South', course: 'NEET 2027', courseStart: D('2026-04-01'), courseEnd: D('2027-03-31'),
      annualFee: 160000, discount: 0,
      parent: { name: 'Sunita Gurjar', phone: '9876500103', language: 'en', consentAt: D('2026-04-01') },
      installments: buildInstalments([
        ['Instalment 1', '2026-07-15', 40000], ['Instalment 2', '2026-11-15', 40000],
        ['Instalment 3', '2027-01-15', 40000], ['Instalment 4', '2027-03-15', 40000],
      ]),
      paid: [40000],
      attendance: buildAttendance(18),
      scores: [{ test: 'Mock 05', date: D('2026-09-10'), score: 71 }, { test: 'Mock 06', date: D('2026-10-10'), score: 74 }],
    },
  ];

  if (!await Student.exists({})) {
    for (const row of sample) {
      const student = new Student(row);
      student.payments = row.paid.map((amount, index) => ({
        installmentId: student.installments[index]._id,
        amount,
        reference: `MOCK-${row.studentId}-${1001 + index}`,
        paidAt: D(index === 0 ? (row.studentId === 'STU-0219' ? '2026-07-14' : '2026-10-10') : '2026-10-10'),
        source: 'mock-gateway',
      }));
      await student.save();
    }
  }

  const accountEmail = 'accounts@companya.demo';
  if (!await User.exists({ email: accountEmail })) {
    const seedPassword = process.env.SEED_ACCOUNT_PASSWORD ?? 'Demo@123';
    const passwordHash = await bcrypt.hash(seedPassword, 12);
    await User.create({ email: accountEmail, passwordHash, role: 'accounts', displayName: 'Ananya Verma' });
  }
  const students = await Student.find();
  for (const student of students) {
    const parentEmail = `${student.studentId.toLowerCase()}@parent.demo`;
    if (!await User.exists({ email: parentEmail })) {
      await User.create({
        email: parentEmail, role: 'parent', displayName: student.parent.name, studentId: student.studentId,
      });
    }
  }
  console.log('Saarthi sample students and demo accounts seeded.');
}

export function dateOnly(value) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function daysBetween(from, to) {
  return Math.round((dateOnly(to) - dateOnly(from)) / 86_400_000);
}

export function getInstallmentPaid(installment, payments = []) {
  return payments
    .filter((payment) => String(payment.installmentId) === String(installment._id))
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function getReminderStage(dueDate, remaining, now = new Date()) {
  if (remaining <= 0) return null;
  const daysUntilDue = daysBetween(now, dueDate);
  if (daysUntilDue === 3) return 'before-3';
  if (daysUntilDue === 0) return 'due-today';
  if (daysUntilDue < 0) return `overdue-${Math.floor((Math.abs(daysUntilDue) - 1) / 7) * 7 + 1}`;
  return null;
}

export function createReminderMessage({ studentName, amountDue, dueDate, stage, language }) {
  const amount = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amountDue);
  const date = new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(dueDate));
  if (language === 'hi') {
    if (stage.startsWith('overdue')) return `${studentName} की ₹${amount} की किस्त ${date} से बकाया है। भुगतान होने पर रिमाइंडर बंद हो जाएंगे।`;
    if (stage === 'due-today') return `${studentName} की ₹${amount} की फीस आज देय है। किस्त की तारीख ${date} है।`;
    return `${studentName} की ₹${amount} की फीस ${date} को देय है।`;
  }
  if (stage.startsWith('overdue')) return `₹${amount} for ${studentName} is overdue since ${date}. Reminders stop as soon as payment is recorded.`;
  if (stage === 'due-today') return `₹${amount} for ${studentName} is due today (${date}).`;
  return `A fee instalment of ₹${amount} for ${studentName} is due on ${date}.`;
}

export function calculateDropoutRisk(student, now = new Date()) {
  const reasons = [];
  const missed = student.installments.some((installment) => (
    daysBetween(installment.dueDate, now) > 0
    && getInstallmentPaid(installment, student.payments) < installment.amount
  ));
  const attendance = student.attendance ?? [];
  const attendanceRate = attendance.length
    ? (attendance.filter((item) => item.present).length / attendance.length) * 100
    : null;
  const scores = [...(student.scores ?? [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const scoreDrop = scores.length >= 2
    ? scores[scores.length - 2].score - scores[scores.length - 1].score
    : 0;
  let score = 0;

  if (missed) {
    score += 40;
    reasons.push('An instalment is past due');
  }
  if (attendanceRate !== null && attendanceRate < 75) {
    score += 35;
    reasons.push(`Attendance is ${Math.round(attendanceRate)}%`);
  }
  if (scoreDrop >= 10) {
    score += 25;
    reasons.push(`Recent test score fell ${Math.round(scoreDrop)} points`);
  }

  return {
    flagged: score >= 50,
    score,
    level: score >= 70 ? 'high' : score >= 50 ? 'watch' : 'stable',
    reasons,
    attendanceRate: attendanceRate === null ? null : Math.round(attendanceRate),
  };
}

export function calculateProRataRefund({
  paidAmount, netCourseFee, courseStart, courseEnd, cancellationDate, requestedAt = new Date(),
}) {
  const totalDays = daysBetween(courseStart, courseEnd);
  const usedDays = daysBetween(courseStart, cancellationDate);
  const daysSinceCancellation = daysBetween(cancellationDate, requestedAt);
  if (totalDays <= 0) throw new RangeError('Course end must be after course start.');
  if (usedDays < 0 || usedDays > totalDays) throw new RangeError('Cancellation date must be within the course dates.');
  if (daysSinceCancellation < 0) throw new RangeError('Cancellation date cannot be in the future.');
  const unusedDays = totalDays - usedDays;
  const amount = Math.min(paidAmount, netCourseFee) * unusedDays / totalDays;
  return {
    amount: Math.round(amount),
    totalDays,
    usedDays,
    unusedDays,
    daysSinceCancellation,
    dueBy: new Date(dateOnly(cancellationDate) + 10 * 86_400_000),
    daysUntilDeadline: 10 - daysSinceCancellation,
    isOverdue: daysSinceCancellation > 10,
    formula: `₹${Math.round(Math.min(paidAmount, netCourseFee)).toLocaleString('en-IN')} paid × ${unusedDays} unused days ÷ ${totalDays} course days`,
  };
}

export function formatStudent(student, now = new Date()) {
  const installments = student.installments.map((item) => {
    const paid = getInstallmentPaid(item, student.payments);
    const balance = Math.max(0, item.amount - paid);
    const daysOverdue = balance > 0 ? Math.max(0, daysBetween(item.dueDate, now)) : 0;
    return {
      id: String(item._id),
      label: item.label,
      dueDate: item.dueDate,
      amount: item.amount,
      paid,
      balance,
      daysOverdue,
      status: balance === 0 ? 'Paid' : paid > 0 ? 'Part paid' : daysOverdue > 0 ? 'Overdue' : 'Upcoming',
    };
  });
  const paidTotal = student.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const feeTotal = Math.max(0, student.annualFee - student.discount);
  const balance = Math.max(0, installments.reduce((sum, item) => sum + item.balance, 0));
  const next = installments.find((item) => item.balance > 0);
  return {
    id: student.studentId,
    name: student.name,
    batch: student.batch,
    centre: student.centre,
    course: student.course,
    annualFee: student.annualFee,
    discount: student.discount,
    feeTotal,
    paidTotal,
    balance,
    courseStart: student.courseStart,
    courseEnd: student.courseEnd,
    nextDue: next?.dueDate ?? null,
    nextBalance: next?.balance ?? 0,
    parent: student.parent,
    installments,
    receipts: student.payments.map((payment) => ({
      amount: payment.amount,
      reference: payment.reference,
      paidAt: payment.paidAt,
      gstRate: 18,
    })),
    attendance: student.attendance,
    scores: student.scores,
  };
}

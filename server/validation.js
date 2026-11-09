import { z } from 'zod';

export const accountLoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  language: z.enum(['en', 'hi']).default('en'),
  consentConfirmed: z.literal(true),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  code: z.string().regex(/^\d{6}$/),
});

export const paymentSchema = z.object({
  studentId: z.string().regex(/^STU-\d{4}$/),
  installmentId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const refundSchema = z.object({
  studentId: z.string().regex(/^STU-\d{4}$/),
  cancellationDate: z.iso.date(),
});

const attendanceUploadSchema = z.object({
  studentId: z.string().regex(/^STU-\d{4}$/),
  batch: z.string().min(1).max(100),
  date: z.iso.date(),
  present: z.boolean(),
});

const scoreUploadSchema = z.object({
  studentId: z.string().regex(/^STU-\d{4}$/),
  batch: z.string().min(1).max(100),
  date: z.iso.date(),
  score: z.number().min(0).max(100),
  test: z.string().min(1).max(100),
});

export const academicUploadSchema = z.object({
  attendance: z.array(attendanceUploadSchema).max(500).default([]),
  scores: z.array(scoreUploadSchema).max(500).default([]),
}).refine((value) => value.attendance.length + value.scores.length > 0, {
  message: 'Add at least one attendance or test-score row.',
});

export const studentQuerySchema = z.object({
  centre: z.string().max(80).optional(),
  batch: z.string().max(80).optional(),
  q: z.string().max(100).optional(),
});

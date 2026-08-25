import { z } from 'zod';

const cleanText = (max) => z.string().trim().min(2).max(max).refine(
  value => !/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value),
  'Contains unsupported characters'
);

export const BriefSchema = z.object({
  idea: cleanText(160),
  budget: z.enum(['Under $1,000', '$1,000–$5,000', '$5,000+']),
  time: z.enum(['Under 5 hours', '5–10 hours', '10+ hours']),
  goal: z.enum(['$5k MRR', '$10k MRR', 'First 100 users', 'Validate demand']),
  autonomy: z.enum(['Approval required', 'Balanced', 'High autonomy']),
}).strict();

export const IdSchema = z.string().uuid();

const passwordRule = z.string().min(10).max(128).refine(v => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letters and numbers');

export const SignUpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: cleanText(60),
  password: passwordRule,
}).strict();

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordRule,
}).strict();

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export const OperatorSchema = z.object({ message: cleanText(1000) }).strict();
export const DeleteAccountSchema = z.object({ password: z.string().min(1).max(128), confirmation: z.literal('DELETE') }).strict();

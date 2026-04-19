import { z } from 'zod';

import { TenantSettingsSchema, TenantStatusSchema, UserRoleSchema } from './tenancy';

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const OauthExchangeInputSchema = z.object({
  code: z.string().min(16),
});
export type OauthExchangeInput = z.infer<typeof OauthExchangeInputSchema>;

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const VerifyEmailInputSchema = z.object({
  token: z.string().min(16),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;

export const ResendVerificationInputSchema = z.object({
  email: z.string().email(),
});
export type ResendVerificationInput = z.infer<typeof ResendVerificationInputSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthTenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan: z.string(),
  status: TenantStatusSchema.default('active'),
  role: UserRoleSchema.optional(),
  settings: TenantSettingsSchema.optional(),
});
export type AuthTenant = z.infer<typeof AuthTenantSchema>;

export const AuthSessionSchema = z.object({
  isImpersonation: z.boolean(),
  impersonationSessionId: z.string().nullable(),
  actorUserId: z.string().nullable(),
  actorTenantId: z.string().nullable(),
  targetUserId: z.string().nullable(),
  targetTenantId: z.string().nullable(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const AuthRegisterResponseSchema = z.object({
  user: AuthUserSchema,
  tenant: AuthTenantSchema,
  session: AuthSessionSchema.nullable(),
  requiresEmailVerification: z.boolean().default(true),
  emailVerificationSent: z.boolean().default(true),
});
export type AuthRegisterResponse = z.infer<typeof AuthRegisterResponseSchema>;

export const AuthLoginResponseSchema = z.object({
  user: AuthUserSchema,
  tenants: z.array(AuthTenantSchema),
  session: AuthSessionSchema.nullable(),
});
export type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;

export const AuthMeResponseSchema = z.object({
  user: AuthUserSchema.extend({
    tenants: z.array(AuthTenantSchema.extend({ role: UserRoleSchema.optional() })),
  }),
  session: AuthSessionSchema.nullable(),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export const OAuthProvidersResponseSchema = z.object({
  google: z.boolean(),
  microsoft: z.boolean(),
});
export type OAuthProvidersResponse = z.infer<typeof OAuthProvidersResponseSchema>;

export const AuthOkResponseSchema = z.object({
  ok: z.literal(true),
});
export type AuthOkResponse = z.infer<typeof AuthOkResponseSchema>;

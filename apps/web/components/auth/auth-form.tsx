'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth/store';
import {
  fetchOAuthProviders,
  getOAuthAuthorizeUrl,
  type OAuthProvidersResponse,
} from '@/lib/auth/api';
import { PasswordInput } from './password-input';
import { ForgotPasswordModal } from './forgot-password-modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buildOAuthReturnUrl } from '@/lib/auth/oauth-return-url';

interface AuthFormProps {
  className?: string;
  defaultTab?: 'login' | 'register';
}

export function AuthForm({ className, defaultTab = 'login' }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [rememberMe, setRememberMe] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [registerName, setRegisterName] = React.useState('');
  const [registerEmail, setRegisterEmail] = React.useState('');
  const [registerPassword, setRegisterPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [emailTouched, setEmailTouched] = React.useState(false);
  const [confirmTouched, setConfirmTouched] = React.useState(false);

  const [oauthProviders, setOauthProviders] = React.useState<OAuthProvidersResponse | null>(null);
  const [forgotOpen, setForgotOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchOAuthProviders()
      .then((p) => {
        if (!cancelled) setOauthProviders(p);
      })
      .catch(() => {
        if (!cancelled) setOauthProviders({ google: false, microsoft: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showOauth = oauthProviders && (oauthProviders.google || oauthProviders.microsoft);

  const startOAuth = (provider: 'google' | 'microsoft') => {
    window.location.href = getOAuthAuthorizeUrl(
      provider,
      buildOAuthReturnUrl(searchParams.get('redirect'))
    );
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  React.useEffect(() => {
    if (emailTouched && registerEmail && !validateEmail(registerEmail)) {
      setEmailError('Introduce un email válido');
    } else {
      setEmailError(null);
    }
  }, [registerEmail, emailTouched]);

  React.useEffect(() => {
    if (confirmTouched && confirmPassword && registerPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
    } else {
      setPasswordError(null);
    }
  }, [registerPassword, confirmPassword, confirmTouched]);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Email y contraseña son obligatorios');
      return;
    }
    try {
      await login(loginEmail, loginPassword, rememberMe);
      const redirect = searchParams.get('redirect');
      router.push(redirect || '/app');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No hemos podido iniciar sesión.';
      if (message.toLowerCase().includes('confirmar tu email')) {
        router.push(`/verify-email?email=${encodeURIComponent(loginEmail.trim())}`);
      }
      toast.error(message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateEmail(registerEmail)) {
      setEmailError('Introduce un email válido');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (!registerName?.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      const response = await register(registerEmail, registerPassword, registerName.trim());
      toast.success(
        response.emailVerificationSent
          ? 'Te hemos enviado un email para confirmar tu cuenta.'
          : 'La cuenta se ha creado. Puedes reenviar la verificación cuando quieras.'
      );
      router.push(`/verify-email?email=${encodeURIComponent(registerEmail.trim())}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No hemos podido crear la cuenta.';
      toast.error(message);
    }
  };

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      {showOauth ? (
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {oauthProviders!.google ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => startOAuth('google')}
                disabled={isLoading}
              >
                <GoogleIcon />
                <span className="sr-only sm:not-sr-only sm:ml-2">Google</span>
              </Button>
            ) : null}
            {oauthProviders!.microsoft ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => startOAuth('microsoft')}
                disabled={isLoading}
              >
                <MicrosoftIcon />
                <span className="sr-only sm:not-sr-only sm:ml-2">Microsoft</span>
              </Button>
            ) : null}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full pointer-events-none opacity-70"
                  disabled
                >
                  <span className="text-muted-foreground text-sm">
                    SSO empresarial (SAML / OIDC)
                  </span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                El SSO enterprise por tenant llegará después. Aquí activamos Google y Microsoft
                como acceso B2C global.
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O continúa con email
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'login' | 'register')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="login" className="transition-all duration-200">
            Iniciar sesión
          </TabsTrigger>
          <TabsTrigger value="register" className="transition-all duration-200">
            Crear cuenta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="animate-in fade-in-50 duration-300">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                Bienvenido de nuevo
              </h1>
              <p className="text-sm text-muted-foreground">
                Accede con tu email y contraseña
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  required
                  disabled={isLoading}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  className="transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-sm text-primary hover:underline underline-offset-4"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <PasswordInput
                  id="login-password"
                  name="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-normal cursor-pointer select-none"
                >
                  Recordarme en este dispositivo
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin size-4" viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="register" className="animate-in fade-in-50 duration-300">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                Crea tu cuenta
              </h1>
              <p className="text-sm text-muted-foreground">
                Confirmaremos el email antes de abrir sesión
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Nombre completo</Label>
                <Input
                  id="register-name"
                  name="name"
                  type="text"
                  placeholder="Tu nombre"
                  required
                  disabled={isLoading}
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  autoComplete="name"
                  className="transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  required
                  disabled={isLoading}
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  autoComplete="email"
                  aria-invalid={emailError ? 'true' : undefined}
                  aria-describedby={emailError ? 'register-email-error' : undefined}
                  className={cn(
                    'transition-all duration-200',
                    emailError && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                {emailError && (
                  <p id="register-email-error" className="text-sm text-destructive" role="alert">
                    {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Contraseña</Label>
                <PasswordInput
                  id="register-password"
                  name="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  showStrengthIndicator
                  showRequirements
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirmar contraseña</Label>
                <PasswordInput
                  id="register-confirm-password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  autoComplete="new-password"
                  minLength={8}
                  error={passwordError || undefined}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin size-4" viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creando cuenta...
                  </span>
                ) : (
                  'Crear cuenta'
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Al registrarte aceptas nuestros términos y política de privacidad.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

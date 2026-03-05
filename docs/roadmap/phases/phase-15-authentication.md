# Phase 15: Authentication System (Weeks 50-52)

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Priority:** 🟠 HIGH
**Timeline:** Weeks 50-52
**Dependencies:** Phase 13 (Deployment) complete, Phase 14 (Security) established
**Effort:** ~60 hours

---

## Overview

This phase implements a comprehensive authentication and identity management system for HACER. After thorough research and evaluation of available solutions, Better Auth was selected as the primary authentication provider due to its balance of features, cost, and maintenance requirements. The implementation includes social login, multi-factor authentication, enterprise features, and seamless integration with the existing application architecture.

**Exit Criteria:**
- Secure authentication system with social login (GitHub, Google, Discord)
- Multi-factor authentication (TOTP/SMS) implemented
- Enterprise features like SSO and user management working
- Authentication integrated across web app, API, and documentation
- Security audits passed and compliance requirements met

---

## 22.1 Authentication Research & Solution Selection

**Requirements:** Evaluate authentication solutions to find the optimal balance of features, cost, maintenance, and scalability for HACER's needs.

### Authentication Solution Comparison

| Solution | Cost | Features | Maintenance | Scalability | Integration | Recommendation |
|----------|------|----------|-------------|-------------|--------------|----------------|
| **Better Auth** | Free (MIT) | ⭐⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐⭐ | Excellent | **PRIMARY CHOICE** |
| Auth0 | $23/user/month | ⭐⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐⭐ | Excellent | ENTERPRISE OPTION |
| Keycloak | Free (Apache 2.0) | ⭐⭐⭐⭐⭐ | High | ⭐⭐⭐⭐⭐ | Good | SELF-HOSTED OPTION |
| Ory | Free (Apache 2.0) | ⭐⭐⭐⭐⭐ | Medium | ⭐⭐⭐⭐⭐ | Good | MODERN OPTION |
| Firebase Auth | Free tier + usage | ⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐⭐ | Excellent | GOOGLE ECOSYSTEM |
| Clerk | Free tier + usage | ⭐⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐ | Excellent | DEVELOPER-FRIENDLY |

#### Better Auth Selection Rationale

**Why Better Auth:**
1. **Free and Open Source**: MIT license, no usage costs
2. **Comprehensive Feature Set**: Social login, MFA, enterprise SSO, session management
3. **Framework Integration**: Excellent React/Next.js support
4. **Developer Experience**: Simple API, good documentation, active community
5. **Security**: Built on Web Crypto API, secure defaults
6. **Scalability**: Works with any database, horizontal scaling support
7. **Maintenance**: Minimal operational overhead

**Trade-offs Considered:**
- **vs Auth0**: Better Auth is free vs Auth0's $23/user/month, but requires more setup
- **vs Keycloak**: Better Auth has better DX and less operational complexity
- **vs Firebase**: Better Auth is framework-agnostic and not locked to Google ecosystem

#### Alternative Solutions for Different Scenarios

**For Enterprise Customers:**
```typescript
// Auth0 implementation for enterprise tier
import { Auth0Client } from '@auth0/auth0-spa-js';

export class Auth0AuthProvider {
  private auth0: Auth0Client;

  constructor() {
    this.auth0 = new Auth0Client({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_CLIENT_ID!,
      authorizationParams: {
        audience: process.env.AUTH0_AUDIENCE,
        scope: 'openid profile email',
      },
    });
  }

  // Implementation follows Better Auth patterns but uses Auth0 APIs
}
```

**For Self-Hosted Enterprise:**
```typescript
// Keycloak implementation for air-gapped environments
import Keycloak from 'keycloak-js';

export class KeycloakAuthProvider {
  private keycloak: Keycloak;

  constructor() {
    this.keycloak = new Keycloak({
      url: process.env.KEYCLOAK_URL,
      realm: process.env.KEYCLOAK_REALM,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
    });
  }

  // Implementation with Keycloak-specific features
}
```

---

## 22.2 Better Auth Implementation

**Requirements:** Complete authentication system with social login, MFA, enterprise features, and seamless integration.

### Core Better Auth Configuration

```typescript
// packages/auth/src/config/better-auth.config.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextjs } from 'better-auth/plugins/nextjs';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { smsService } from '@/lib/sms';

export const auth = betterAuth({
  // Database adapter
  database: prismaAdapter(prisma),

  // Framework integration
  plugins: [
    nextjs({
      baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    }),
  ],

  // Base configuration
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET!,

  // Trust settings for development
  trustedOrigins: process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:3001']
    : [process.env.FRONTEND_URL!],

  // User management
  user: {
    // Email change functionality
    changeEmail: {
    enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, token }) => {
        await emailService.sendChangeEmailVerification(user, newEmail, token);
    },
  },

    // Account deletion
    deleteUser: {
    enabled: true,
      sendDeleteAccountVerification: async ({ user, token }) => {
        await emailService.sendDeleteAccountVerification(user, token);
      },
    },

    // Additional user fields
    additionalFields: {
      firstName: {
        type: 'string',
        required: false,
      },
      lastName: {
        type: 'string',
        required: false,
      },
      organization: {
        type: 'string',
        required: false,
      },
      jobTitle: {
        type: 'string',
        required: false,
      },
      bio: {
        type: 'string',
        required: false,
        maxLength: 500,
      },
      avatar: {
        type: 'string',
        required: false,
      },
      timezone: {
        type: 'string',
        required: false,
        defaultValue: 'UTC',
      },
      theme: {
        type: 'string',
        required: false,
        defaultValue: 'system',
      },
      language: {
        type: 'string',
        required: false,
        defaultValue: 'en',
      },
    },
  },

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailConfirmation: true,

    // Custom password requirements
    password: {
      minLength: 8,
      maxLength: 128,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialCharacters: false,
    },

    // Email verification
    sendResetPassword: async ({ user, token }) => {
      await emailService.sendPasswordReset(user, token);
    },
  },

  // Social providers
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ['user:email', 'read:user'],
      // Map GitHub profile to user fields
      mapProfileToUser: (profile) => ({
        firstName: profile.name?.split(' ')[0],
        lastName: profile.name?.split(' ').slice(1).join(' '),
        avatar: profile.avatar_url,
        bio: profile.bio,
      }),
    },

    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ['openid', 'profile', 'email'],
      mapProfileToUser: (profile) => ({
        firstName: profile.given_name,
        lastName: profile.family_name,
        avatar: profile.picture,
      }),
    },

    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      scope: ['identify', 'email'],
      mapProfileToUser: (profile) => ({
        firstName: profile.username,
        avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
      }),
    },

    gitlab: {
      clientId: process.env.GITLAB_CLIENT_ID!,
      clientSecret: process.env.GITLAB_CLIENT_SECRET!,
      scope: ['read_user'],
      mapProfileToUser: (profile) => ({
        firstName: profile.name?.split(' ')[0],
        lastName: profile.name?.split(' ').slice(1).join(' '),
        avatar: profile.avatar_url,
        bio: profile.bio,
      }),
    },
  },

  // Multi-factor authentication
  mfa: {
    enabled: true,

    // TOTP (Time-based One-Time Password)
    totp: {
      issuer: 'HACER',
      // Custom QR code generation
      generateQRCode: async (uri) => {
        // Generate QR code for TOTP setup
        return qrCodeService.generateQR(uri);
    },
    },

    // SMS OTP as backup
    sms: {
      sendOTP: async ({ code, phoneNumber }) => {
        await smsService.sendOTP(phoneNumber, code);
      },
    },

    // Backup codes
    backupCodes: {
      enabled: true,
      count: 10, // Generate 10 backup codes
    },
  },

  // OAuth 2.0 / OpenID Connect for enterprise
  oauth: {
    enabled: true,
    providers: {
      // Microsoft Azure AD
      azureAD: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        tenantId: process.env.AZURE_TENANT_ID!,
        scope: ['openid', 'profile', 'email'],
      },

      // Okta
      okta: {
        clientId: process.env.OKTA_CLIENT_ID!,
        clientSecret: process.env.OKTA_CLIENT_SECRET!,
        domain: process.env.OKTA_DOMAIN!,
        scope: ['openid', 'profile', 'email'],
      },

      // Generic OIDC provider
      oidc: {
        clientId: process.env.OIDC_CLIENT_ID!,
        clientSecret: process.env.OIDC_CLIENT_SECRET!,
        wellKnownUrl: process.env.OIDC_WELL_KNOWN_URL!,
        scope: ['openid', 'profile', 'email'],
      },
    },
  },

  // Session management
  session: {
    // Cookie-based session storage
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },

    // Session cookie configuration
    sessionCookie: {
      name: 'hacer-session',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },

    // Refresh token settings
    refreshToken: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs

    // Custom rate limit rules
    rules: [
      {
        path: '/api/auth/sign-in',
        windowMs: 60 * 1000, // 1 minute
        max: 5, // 5 sign-in attempts per minute
      },
      {
        path: '/api/auth/reset-password',
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 reset attempts per hour
      },
    ],
  },

  // Advanced security features
  advanced: {
    // Cross-subdomain cookie support
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.NODE_ENV === 'production' ? '.hacer.com' : undefined,
    },

    // Custom cookie prefix
    cookiePrefix: 'hacer',

    // Custom cookie options
    defaultCookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },

    // IP-based session binding
    ipAddress: {
      enabled: true,
      // Block login if IP changes (optional security feature)
      bindToSession: false,
    },

    // Device tracking
    deviceTracking: {
      enabled: true,
      // Track device fingerprints for security
      fingerprinting: true,
    },
  },

  // Custom hooks for business logic
  hooks: {
    before: {
      signUp: async ({ user, request }) => {
        // Validate email domain for enterprise users
        if (user.email && process.env.ALLOWED_EMAIL_DOMAINS) {
          const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS.split(',');
          const emailDomain = user.email.split('@')[1];

          if (!allowedDomains.includes(emailDomain)) {
            throw new Error('Email domain not allowed for registration');
          }
        }

        // Check for disposable email addresses
        if (user.email && await emailService.isDisposableEmail(user.email)) {
          throw new Error('Disposable email addresses are not allowed');
        }

        // Log registration attempt
        console.log(`New user registration attempt: ${user.email} from ${request.ip}`);
      },

      signIn: async ({ user, request }) => {
        // Check for suspicious login patterns
        const suspicious = await securityService.checkSuspiciousLogin(user, request);
        if (suspicious) {
          await emailService.sendSuspiciousLoginAlert(user, request);
        }

        // Update user metadata
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            lastLoginIp: request.ip,
            loginCount: { increment: 1 },
          },
        });
      },
    },

    after: {
      signUp: async ({ user }) => {
        // Send welcome email
        await emailService.sendWelcomeEmail(user);

        // Create user profile and preferences
        await prisma.userProfile.create({
          data: {
            userId: user.id,
            preferences: {
              theme: 'system',
              notifications: {
                email: true,
                marketing: false,
                security: true,
              },
              language: 'en',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            onboarding: {
              completed: false,
              steps: [],
            },
          },
        });

        // Initialize user workspace
        await workspaceService.createDefaultWorkspace(user.id);

        // Send analytics event
        await analyticsService.trackUserRegistration(user);
      },

      signOut: async ({ user, session }) => {
        // Clean up user session data
        await sessionService.cleanupSession(session.id);

        // Log sign out
        console.log(`User ${user.email} signed out`);
      },
    },
  },

  // Database hooks for data consistency
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Ensure email uniqueness (additional check)
        const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (existingUser) {
            throw new Error('Email already registered');
          }

          return user;
        },

        after: async (user) => {
          // Create audit log entry
          await auditService.logEvent({
              action: 'USER_CREATED',
              userId: user.id,
              details: {
                email: user.email,
                provider: user.provider || 'email',
              ip: 'system', // Will be updated by hooks
            },
          });
        },
      },

      update: {
        after: async (user, oldUser) => {
          // Log user updates for audit trail
          if (oldUser.email !== user.email) {
            await auditService.logEvent({
              action: 'USER_EMAIL_CHANGED',
                userId: user.id,
              details: {
                oldEmail: oldUser.email,
                newEmail: user.email,
              },
            });
          }
        },
      },
    },

    session: {
      create: {
        after: async (session) => {
          // Track active sessions for security monitoring
          await sessionService.trackActiveSession(session);
        },
      },

      delete: {
        after: async (session) => {
          // Clean up session tracking
          await sessionService.cleanupActiveSession(session);
        },
      },
    },
  },
});

// Export types for TypeScript
export type { Session, User } from 'better-auth';
```

### React Integration Components

```typescript
// packages/auth/src/components/AuthProvider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
```

#### Authentication UI Components

```typescript
// packages/auth/src/components/SignInForm.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Github, Mail, Eye, EyeOff } from 'lucide-react';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
          email,
          password,
        redirect: false,
        });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (error) {
      setError('Failed to sign in with ' + provider);
      setIsLoading(false);
    }
  };

    return (
    <div className="w-full max-w-md space-y-6">
          <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to your HACER account</p>
          </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
            <Input
            id="email"
              type="email"
            placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            disabled={isLoading}
            />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
          </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
          onClick={() => handleSocialSignIn('github')}
              disabled={isLoading}
            >
          <Github className="mr-2 h-4 w-4" />
          GitHub
            </Button>

            <Button
              variant="outline"
          onClick={() => handleSocialSignIn('google')}
              disabled={isLoading}
            >
          <Mail className="mr-2 h-4 w-4" />
          Google
            </Button>
          </div>

      <div className="text-center text-sm">
        <a href="/auth/forgot-password" className="text-primary hover:underline">
          Forgot your password?
        </a>
          </div>

      <div className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <a href="/auth/sign-up" className="text-primary hover:underline">
          Sign up
        </a>
              </div>
    </div>
  );
}
```

#### Multi-Factor Authentication Setup

```typescript
// packages/auth/src/components/MFASetup.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Shield, Smartphone, Key, AlertTriangle } from 'lucide-react';

interface MFASetupProps {
  user: any;
  onComplete: () => void;
}

export function MFASetup({ user, onComplete }: MFASetupProps) {
  const [step, setStep] = useState<'method' | 'totp' | 'sms' | 'backup'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'sms' | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const mfaMethods = [
    {
      id: 'totp',
      name: 'Authenticator App',
      description: 'Use Google Authenticator, Authy, or similar apps',
      icon: Smartphone,
      recommended: true,
    },
    {
      id: 'sms',
      name: 'SMS',
      description: 'Receive codes via text message',
      icon: Shield,
      recommended: false,
    },
  ];

  const handleMethodSelect = async (method: 'totp' | 'sms') => {
    setSelectedMethod(method);
    setIsLoading(true);
    setError('');

    try {
      if (method === 'totp') {
        // Generate TOTP secret and QR code
        const response = await fetch('/api/auth/mfa/setup-totp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          setQrCode(data.qrCode);
          setSecret(data.secret);
      setStep('totp');
        } else {
          throw new Error('Failed to setup TOTP');
        }
      } else if (method === 'sms') {
        setStep('sms');
      }
    } catch (error) {
      setError('Failed to setup MFA method');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          code: verificationCode,
        }),
      });

      if (response.ok) {
        await generateBackupCodes();
      } else {
      setError('Invalid verification code');
      }
    } catch (error) {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSMSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/setup-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationCode(data.code); // For demo purposes
        setStep('backup');
      } else {
        throw new Error('Failed to setup SMS MFA');
      }
    } catch (error) {
      setError('SMS setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    try {
      const response = await fetch('/api/auth/mfa/generate-backup-codes', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setStep('backup');
      }
    } catch (error) {
      console.error('Failed to generate backup codes:', error);
      // Continue anyway
      setStep('backup');
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Set up Multi-Factor Authentication</h1>
        <p className="text-muted-foreground">
          Add an extra layer of security to your account
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'method' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose your MFA method</h2>
          {mfaMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card
                key={method.id}
                className={`cursor-pointer transition-colors ${
                  selectedMethod === method.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedMethod(method.id as any)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{method.name}</h3>
                        {method.recommended && (
                          <Badge variant="secondary">Recommended</Badge>
            )}
          </div>
                      <p className="text-sm text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

              <Button
            className="w-full"
            disabled={!selectedMethod || isLoading}
            onClick={() => selectedMethod && handleMethodSelect(selectedMethod)}
          >
            {isLoading ? 'Setting up...' : 'Continue'}
              </Button>
            </div>
      )}

      {step === 'totp' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Setup Authenticator App</span>
            </CardTitle>
            <CardDescription>
              Scan the QR code with your authenticator app, then enter the 6-digit code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
          </div>
            )}

            <form onSubmit={handleTOTPSubmit} className="space-y-4">
          <div className="space-y-2">
                <Label htmlFor="totp-code">Verification Code</Label>
                <Input
                  id="totp-code"
              type="text"
              placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
                  required
            />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
          </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify & Continue'}
          </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'sms' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Setup SMS Authentication</span>
            </CardTitle>
            <CardDescription>
              Enter your phone number to receive verification codes via SMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSMSSubmit} className="space-y-4">
          <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
              type="tel"
                  placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
                  required
            />
                <p className="text-xs text-muted-foreground">
                  We'll send a verification code to this number
                </p>
          </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Verification Code'}
          </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'backup' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Backup Codes</span>
            </CardTitle>
            <CardDescription>
              Save these backup codes in a secure place. You can use them to access your account if you lose your phone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Each backup code can only be used once. Store them securely and don't share them.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-muted p-2 rounded text-center">
                  {code}
                </div>
              ))}
          </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
              >
                Copy Codes
              </Button>
              <Button className="flex-1" onClick={handleComplete}>
                Complete Setup
          </Button>
        </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### API Integration and Route Protection

```typescript
// apps/api/src/routes/auth.ts
import { Router } from 'express';
import { auth } from '@hacer/auth';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Apply rate limiting to auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
});

// Better Auth routes
router.use('/auth', authLimiter, auth);

// Custom auth routes
router.post('/auth/verify-mfa', authLimiter, async (req, res) => {
  // Handle MFA verification
});

router.post('/auth/setup-mfa', authLimiter, async (req, res) => {
  // Handle MFA setup
});

export default router;
```

#### Database Schema for Authentication

```sql
-- User table (managed by Better Auth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account table for social login (managed by Better Auth)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

-- Session table (managed by Better Auth)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification tokens (managed by Better Auth)
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (identifier, token)
);

-- Custom user profile extension
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  organization TEXT,
  job_title TEXT,
  bio TEXT,
  avatar TEXT,
  timezone TEXT DEFAULT 'UTC',
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  last_login_ip TEXT,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MFA configuration
CREATE TABLE user_mfa (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  totp_secret TEXT,
  totp_backup_codes TEXT[], -- JSON array of backup codes
  sms_phone_number TEXT,
  sms_verified BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for security events
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys for programmatic access
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 22.3 Enterprise Authentication Features

**Requirements:** Advanced authentication features for enterprise customers including SSO, user management, and compliance features.

### Single Sign-On (SSO) Integration

```typescript
// packages/auth/src/providers/enterprise/SSOProvider.ts
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AzureADProvider } from './AzureADProvider';
import { OktaProvider } from './OktaProvider';
import { SAMLProvider } from './SAMLProvider';

export type SSOProvider = 'auth0' | 'azure-ad' | 'okta' | 'saml' | 'oidc';

export interface SSOConfig {
  provider: SSOProvider;
  clientId: string;
  clientSecret?: string;
  domain?: string;
  tenantId?: string;
  wellKnownUrl?: string;
  metadataUrl?: string;
  scopes?: string[];
  additionalParams?: Record<string, string>;
}

export class SSOProviderManager {
  private providers = new Map<string, SSOProviderInstance>();

  async configureSSO(organizationId: string, config: SSOConfig): Promise<void> {
    let provider: SSOProviderInstance;

    switch (config.provider) {
      case 'auth0':
        provider = new Auth0Provider(config);
        break;
      case 'azure-ad':
        provider = new AzureADProvider(config);
        break;
      case 'okta':
        provider = new OktaProvider(config);
        break;
      case 'saml':
        provider = new SAMLProvider(config);
        break;
      case 'oidc':
        provider = new OIDCProvider(config);
        break;
      default:
        throw new Error(`Unsupported SSO provider: ${config.provider}`);
    }

    // Validate configuration
    await provider.validateConfig();

    // Store configuration (encrypted)
    await this.storeSSOConfig(organizationId, config);

    // Register provider
    this.providers.set(organizationId, provider);
  }

  async authenticateWithSSO(organizationId: string): Promise<SSOUser> {
    const provider = this.providers.get(organizationId);
    if (!provider) {
      throw new Error('SSO not configured for this organization');
    }

    return await provider.authenticate();
  }

  async getSSOUserInfo(organizationId: string, token: string): Promise<SSOUser> {
    const provider = this.providers.get(organizationId);
    if (!provider) {
      throw new Error('SSO not configured for this organization');
    }

    return await provider.getUserInfo(token);
  }

  private async storeSSOConfig(organizationId: string, config: SSOConfig): Promise<void> {
    // Encrypt and store SSO configuration
    const encryptedConfig = await this.encryptConfig(config);
    await database.storeSSOConfig(organizationId, encryptedConfig);
  }

  private async encryptConfig(config: SSOConfig): Promise<string> {
    // Encrypt sensitive configuration data
    return JSON.stringify(config); // Placeholder - implement proper encryption
  }
}

interface SSOProviderInstance {
  validateConfig(): Promise<void>;
  authenticate(): Promise<SSOUser>;
  getUserInfo(token: string): Promise<SSOUser>;
}

interface SSOUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  roles?: string[];
  groups?: string[];
  department?: string;
  manager?: string;
  customClaims?: Record<string, any>;
}
```

### User Management Dashboard

```typescript
// apps/admin/src/pages/users/UserManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Search, Filter, MoreHorizontal, UserPlus, Shield, Mail, Phone } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  createdAt: Date;
  mfaEnabled: boolean;
  emailVerified: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, [searchTerm, selectedRole, selectedStatus]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        role: selectedRole,
        status: selectedStatus,
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: User['role']) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Update local state
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ));
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: User['status']) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, status: newStatus } : user
        ));
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeVariant = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'secondary';
      case 'user': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: User['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
              <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
              </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
            </Button>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Enabled</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.mfaEnabled).length}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => !u.emailVerified).length}
          </div>
          </CardContent>
        </Card>
              </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
            </div>
          </div>

                <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="user">User</option>
                </select>

                <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
                </select>
              </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
                </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.mfaEnabled ? (
                      <Badge variant="default">Enabled</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? (
                      <div className="text-sm">
                        {new Date(user.lastLogin).toLocaleDateString()}
              </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Never</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleUserStatus(user.id, user.status)}>
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'admin')}>
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'moderator')}>
                          Make Moderator
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'user')}>
                          Make User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 22.4 Phase 22 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Authentication research | 4h | - | - | Better Auth selected with rationale documented |
| Better Auth core setup | 8h | Research | <200ms auth response | Authentication system initialized |
| Social login integration | 6h | Core setup | - | GitHub, Google, Discord login working |
| Email/password auth | 4h | Core setup | - | Registration and login functional |
| Multi-factor authentication | 8h | Social login | - | TOTP and SMS MFA implemented |
| Session management | 4h | MFA | - | Secure session handling working |
| React component integration | 6h | Session management | - | Auth components integrated in UI |
| API route protection | 4h | React integration | - | Backend routes secured |
| Enterprise SSO setup | 6h | API protection | - | Azure AD, Okta integration ready |
| User management dashboard | 8h | SSO setup | - | Admin interface for user management |
| Security monitoring | 4h | User management | - | Audit logs and security alerts working |
| Rate limiting & abuse protection | 4h | Security monitoring | - | DDoS protection and rate limiting active |
| Authentication testing | 6h | Rate limiting | - | Comprehensive auth test suite passing |
| Documentation & integration guides | 4h | Testing | - | Auth setup guides for developers |

**Total Estimated Effort:** ~60 hours (3 weeks)  
**Performance Budget:** <200ms auth response, <500ms MFA verification  
**Quality Gates:** Secure authentication working, social login functional, MFA enabled, enterprise features available

---

## Risk Mitigation

**Security Vulnerabilities:** Implement comprehensive security audits and stay updated with latest authentication security practices.

**Provider Lock-in:** Design system to be easily migrable to other providers if needed.

**Scalability Issues:** Use database indexing and caching for user authentication performance.

**Compliance Requirements:** Regular compliance audits and updates for GDPR, CCPA, and other regulations.

**User Experience:** Thorough UX testing to ensure authentication flows are smooth and intuitive.

---

**Part of:** [Comprehensive Development Roadmap](../README.md)  
**Previous:** [Phase 14: Security & Privacy](phase-14-security-privacy.md)  
**Next:** [Phase 16: API Ecosystem](phase-16-api-ecosystem.md)
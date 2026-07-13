# Environment

Remote backend access is opt-in.

## Variables

```bash
VITE_ENABLE_LOCAL_BACKEND=false
VITE_ENABLE_REMOTE_BACKEND=false
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_PROJECT_REF=
VITE_PUBLIC_SITE_URL=http://localhost:5173
VITE_SENTRY_DSN=
```

## Connecting Supabase local

Use this only with the local Supabase stack:

```bash
VITE_ENABLE_LOCAL_BACKEND=true
VITE_ENABLE_REMOTE_BACKEND=false
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-publishable-or-anon-key
VITE_SUPABASE_PROJECT_REF=
```

## Connecting a new Supabase project

Only use fresh credentials from a brand-new project.

```bash
VITE_ENABLE_REMOTE_BACKEND=true
VITE_SUPABASE_URL=https://yourprojectref.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key
VITE_SUPABASE_PROJECT_REF=yourprojectref
```

The project ref must match the one in the URL. If it does not match, the
frontend client stays disabled.

## Sentry error reporting

`VITE_SENTRY_DSN` is optional. When it is set, production builds report render,
window, unhandled promise, and React Query errors to Sentry. Development builds
and production builds without a DSN do not initialize Sentry.

Do not attach customer data, emails, phone numbers, order details, or query
payloads to error-reporting contexts.

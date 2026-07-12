# Database Safety

The original database is in real production use. Treat it as read-only and out
of scope for this refactor.

## Forbidden during neutralization

- Do not run `supabase db push`.
- Do not run `supabase db reset`.
- Do not run `supabase migration repair`.
- Do not deploy Supabase functions.
- Do not run SQL against the original project.
- Do not use the service role key from the original project.
- Do not copy `.env.local`, `.supabase-secrets.env`, or `supabase/.temp/` into a
  new repo.

## Required before connecting a new backend

1. Create a brand-new Supabase project.
2. Generate fresh credentials for that project.
3. Set `VITE_ENABLE_REMOTE_BACKEND=true`.
4. Set `VITE_SUPABASE_URL`.
5. Set `VITE_SUPABASE_ANON_KEY`.
6. Set `VITE_SUPABASE_PROJECT_REF` to the 20-character project ref from the URL.
7. Run `npm run audit:connections`.
8. Run `npm run audit:secrets`.
9. Only then test the app against the new project.

## Why the extra project ref exists

The frontend guard requires the declared project ref to match the Supabase URL.
This prevents an old `.env.local` from silently connecting to the original
database just because it still has a URL and anon key.

## Local secret files found in this copy

This copy currently has local environment/link files. They are ignored by git,
but they still exist on disk and should be quarantined before this repo is
shared or used as a template.

Do not print their values in chat, tickets, commits, docs, or screenshots.

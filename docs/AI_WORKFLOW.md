# AI Workflow

This repo is expected to be edited frequently with AI assistance. Use these
rules to keep changes controlled.

## Before a change

- Read the relevant files first.
- Run or inspect `git status`.
- Do not revert user changes.
- Prefer small, domain-scoped changes over large rewrites.
- If a task touches checkout, payments, inventory, auth, or database policies,
  treat it as high risk.

## During a change

- Keep Supabase access disabled unless the task explicitly targets a new
  non-production backend.
- Do not run remote Supabase commands unless the user explicitly approves the
  target project.
- Prefer extracting pure functions, hooks, mappers, and clients before changing
  behavior.
- Add scripts or docs when they make future AI work safer.

## Before finishing

Run the safest relevant checks:

```bash
npm run lint
npm run typecheck
npm run audit:secrets
npm run audit:connections
npm run audit:encoding
```

For UI or frontend changes, also run:

```bash
npm run build
```

If a safety audit fails because local production secrets still exist, report it
without revealing values.

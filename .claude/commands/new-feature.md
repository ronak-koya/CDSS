# /new-feature — Checklist for Adding a New Feature

Use this checklist whenever implementing a new feature in MedIntel CDSS.

## Pre-implementation checklist:

1. **Check memory** — Read `MEMORY.md` to understand what's already built. Avoid duplicating existing routes or components.

2. **Check schema** — Read `backend/prisma/schema.prisma` before adding new models. If adding a model:
   - Add to schema
   - Run `/db-push` to push changes
   - Update `memory/schema_and_api.md`

3. **Check existing routes** — Review `backend/src/routes/` to avoid duplicate endpoints.

4. **Check existing components** — Review `frontend/src/pages/` and `frontend/src/components/` for reusable patterns.

## Implementation order:

1. **Backend first**:
   - Add Prisma model (if needed) → run `/db-push`
   - Add route file in `backend/src/routes/`
   - Register route in `backend/src/index.ts`

2. **Frontend**:
   - Add page in `frontend/src/pages/`
   - Add route in `frontend/src/App.tsx`
   - Add sidebar nav item in `frontend/src/components/Sidebar.tsx` (with correct `roles` array)

## Standards to follow:
- Use `pnpm` not npm
- Tailwind CSS classes only (no inline styles except for dynamic values)
- Orange primary theme: `primary-500` / `primary-600` for buttons, `primary-50` for hover
- DM Sans body font, Sora for headings
- All date strings: `YYYY-MM-DD` format (never `new Date()` for String fields)
- Date construction: always use local constructor `new Date(yr, mo-1, dy, h, m, 0, 0)`
- API calls: use `api.get/post/patch/delete` from `frontend/src/lib/api.ts`
- Auth: `authenticate` middleware on all protected routes
- Role guard: check `req.user!.role` for role-specific endpoints

## After implementation:
- Update `memory/features_built.md` with the new feature
- Update `memory/schema_and_api.md` if new models or routes were added

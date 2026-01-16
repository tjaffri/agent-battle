# Claude Code Guidelines for Agent Battle

## Git Workflow

### Branch Protection is Enforced
- **Never push directly to `main`** - all changes must go through PRs
- **Always create a fresh feature branch** before making changes:
  ```bash
  git checkout main
  git pull
  git checkout -b feature/your-feature-name
  ```
- **Do not reuse feature branches** after a PR has been merged - always start fresh from `main`
- PRs require all CI checks (Lint, Test, Build) to pass before merging
- **Do not auto-merge PRs** - create the PR and let the human review and merge it
- After creating a PR, inform the user of the PR URL so they can review it

### Before Committing
**Always run tests and linters locally before committing:**

```bash
# Frontend
cd frontend
npm test -- --run
npm run lint
npm run format:check
npm run build

# Backend
cd backend
source .venv/bin/activate
black --check app/ tests/
ruff check app/ tests/
pytest
```

### Before Deploying
- Vercel deployments are automatic via GitHub integration
- Preview deployments are created for every PR
- Production deployments happen when PRs merge to main
- **Do not manually deploy with `vercel --prod`** unless absolutely necessary

## Common Pitfalls to Avoid

### 1. Gitignore Patterns
- Check if new files are being ignored by `.gitignore` before committing
- Use `git check-ignore -v <filepath>` to debug gitignore issues
- Be careful with broad patterns like `lib/` - they may match unintended paths
- Use leading slashes for root-only matches: `/lib/` instead of `lib/`

### 2. Path Aliases in TypeScript/Vite
- **Prefer relative imports** over path aliases (`@/`) for CI reliability
- Path aliases can behave differently between local and CI environments
- If using path aliases, ensure they're configured in both:
  - `tsconfig.json` (for TypeScript)
  - `vite.config.ts` (for Vite/Vitest)

### 3. CI Environment Differences
- Always do a clean build locally to simulate CI:
  ```bash
  rm -rf node_modules/.tmp dist
  npm run build
  ```
- CI uses `npm ci` which does a clean install from package-lock.json
- Files not tracked in git won't exist in CI

### 4. Environment Variables
- When adding env vars to Vercel, use `printf` to avoid newline characters:
  ```bash
  printf 'your-api-key' | npx vercel env add VAR_NAME production
  ```
- Newline characters in API keys cause "Illegal header value" errors

## Project Structure Reminders

- **Frontend**: `frontend/` - React + TypeScript + Vite
- **Backend**: `backend/` - FastAPI + Python (local development)
- **API**: `api/` - Vercel serverless function (production)
- **Vercel config**: `vercel.json` - deployment configuration

## Useful Commands

```bash
# Check what's being ignored by git
git status --ignored

# Check why a file is ignored
git check-ignore -v <filepath>

# List all tracked files
git ls-files

# Watch CI status for a PR
gh pr checks <pr-number> --watch

# View CI failure logs
gh run view <run-id> --log-failed
```

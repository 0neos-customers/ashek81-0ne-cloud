# Skool Authentication Setup

> **Purpose:** Capture and maintain Skool session cookies for API access

---

## Auto-Refresh Protocol (Recommended)

Credentials are stored in `.env.local`. To refresh cookies automatically:

```bash
cd 0ne-app
bun run scripts/skool-refresh-cookies.ts          # Check and refresh if needed
bun run scripts/skool-refresh-cookies.ts --force  # Force refresh even if valid
```

The script:
1. Checks if current cookies are valid (tests API)
2. If expired, uses stored credentials to login
3. Saves new cookies to `.env.local`
4. Returns success/failure status

**For Claude Code sessions:** Just run the refresh script - credentials are already stored.

---

## Initial Setup (First Time Only)

### Option 1: Interactive Setup

```bash
cd 0ne-app
bun run scripts/skool-auth.ts --interactive
```

Then manually add credentials to `apps/web/.env.local`:
```env
SKOOL_EMAIL=your@email.com
SKOOL_PASSWORD=yourpassword
```

### Option 2: Direct Environment Variables

```bash
SKOOL_EMAIL="your@email.com" SKOOL_PASSWORD="yourpass" bun run scripts/skool-auth.ts --headless
```

### Option 3: Manual Cookie Extraction

If automation doesn't work:

1. Login to Skool in Chrome
2. Open DevTools (F12) > Application > Cookies > `www.skool.com`
3. Copy all cookie values
4. Add to `apps/web/.env.local`:

```env
SKOOL_COOKIES="__client=...; __client_uat=...; __session=..."
```

---

## Cookie Storage

Cookies are saved in two places:

| Location | Purpose |
|----------|---------|
| `apps/web/.env.local` | Used by the app (`SKOOL_COOKIES` env var) |
| `scripts/.skool-cookies.json` | Full cookie data for debugging |

---

## Cookie Expiry

Skool uses multiple cookie types with different lifespans:

| Cookie | Lifespan | Purpose |
|--------|----------|---------|
| `auth_token` | ~1 year (JWT) | Actual authentication token |
| `aws-waf-token` | ~5 minutes | AWS WAF bot detection |
| `AWSALB` / `AWSALBTG` | ~1 hour | AWS load balancer session |

**Key insight:** The `auth_token` is long-lived, but AWS WAF cookies expire quickly and are IP-bound.

### Production (Vercel) Considerations

AWS WAF tokens are tied to:
1. **IP address** - Cookies generated from GitHub Actions may not work from Vercel
2. **Browser fingerprint** - Headless browser fingerprints differ from server requests
3. **Time** - Tokens expire within minutes

**Current mitigation:**
- GitHub Action runs every 4 hours (not weekly)
- Triggers Vercel redeploy to pick up new env vars
- May still have gaps if IP mismatch causes WAF rejection

**If 403 errors persist:**
1. Manual cookie extraction from browser (same IP not required for auth_token)
2. Extract only the `auth_token` and test if WAF cookies are actually required
3. Consider using a proxy service that maintains browser sessions

---

## 2FA / Verification

If your account has 2FA enabled:

1. Run the script in interactive mode (without `--headless`)
2. When prompted for 2FA, complete it in the browser window
3. The script will wait up to 2 minutes for you to complete verification
4. Cookies will be captured after successful login

---

## Troubleshooting

### "Login failed" error

- Check email/password are correct
- Skool may have changed their login form selectors
- Try manual cookie extraction

### "API test failed" error

- Cookies may have expired
- Account may have been logged out
- Re-run the auth script

### Browser doesn't open

- Make sure Playwright browsers are installed:
  ```bash
  bunx playwright install chromium
  ```

### Rate limited

- Wait a few minutes before retrying
- Don't run the script too frequently

---

## Security Notes

- **Never commit credentials** - Use environment variables
- **Cookies grant full access** - Treat them like passwords
- **Use .gitignore** - The `.env.local` and `.skool-cookies.json` files are gitignored
- **Credentials are not stored** - Only the resulting cookies are saved

---

## Using Cookies in Code

```typescript
// In your API route or server action
const cookies = process.env.SKOOL_COOKIES;

const response = await fetch("https://api2.skool.com/self/chat-channels?offset=0&limit=20", {
  headers: {
    "accept": "application/json",
    "cookie": cookies,
    "origin": "https://www.skool.com",
    "referer": "https://www.skool.com/",
  },
});
```

---

## GitHub Action (Automated Refresh)

**File:** `.github/workflows/skool-refresh-cookies.yml`

**Schedule:** Every 4 hours (`0 */4 * * *`)

**What it does:**
1. Runs Playwright to login to Skool
2. Captures all cookies
3. Updates `SKOOL_COOKIES` env var in Vercel
4. Triggers production redeploy

**Required secrets:**
| Secret | Purpose |
|--------|---------|
| `SKOOL_EMAIL` | Skool login email |
| `SKOOL_PASSWORD` | Skool password |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_PROJECT_ID` | Project ID from Vercel |
| `VERCEL_TEAM_ID` | Team ID (optional) |

**Manual trigger:** GitHub Actions UI → "Run workflow"

---

## Related Files

- `scripts/skool-auth.ts` - The authentication script
- `scripts/skool-refresh-cookies.ts` - Auto-refresh with validation
- `scripts/.skool-cookies.json` - Full cookie data (gitignored)
- `apps/web/.env.local` - Environment variables (gitignored)
- `.github/workflows/skool-refresh-cookies.yml` - GitHub Action
- `SKOOL-API.md` - API endpoint documentation

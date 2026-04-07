# CLAUDE.md — INTEX-II Codebase Guide for AI Agents

> **Read this entire file before making any changes.** This is a multi-person project where multiple AI agents edit code. Careless changes break things for everyone.

---

## Project Overview

**INTEX-II** is the BYU IS 455 capstone webapp for Faro Safehouse (formerly Lighthouse Sanctuary), an NGO operating safehouses in Chile for survivors of human trafficking. The app provides:

- A **public landing page** showing anonymized impact data
- An **admin portal** for staff to manage residents, donors, counseling, visitations, and reports
- A **donor portal** (placeholder) for donors to view their impact
- **ML pipelines** that train nightly and surface predictions (donor churn, resident risk, social media performance)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Static Web Apps                     │
│              React 19 + Vite + TypeScript + Tailwind 4      │
│         victorious-plant-08e77061e.7.azurestaticapps.net    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (credentials: include)
┌──────────────────────────▼──────────────────────────────────┐
│              Azure App Service (.NET 10)                     │
│                   ASP.NET Core Web API                       │
│    intex-backend-fvgedfcwcxf8cnc9.australiaeast-01          │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ AuthController│   │ 14 Entity    │   │ Analytics +    │  │
│  │ (Identity    │   │ Controllers  │   │ AdminDashboard │  │
│  │  cookies)    │   │ (CRUD)       │   │ Controllers    │  │
│  └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
│         │                  │                    │            │
│  ┌──────▼───────┐   ┌──────▼────────────────────▼────────┐  │
│  │IdentityContext│   │         AppDbContext               │  │
│  │ (PostgreSQL) │   │         (SQL Server)               │  │
│  └──────┬───────┘   └──────┬─────────────────────────────┘  │
└─────────┼──────────────────┼────────────────────────────────┘
          │                  │
┌─────────▼──────┐   ┌──────▼──────────────────────┐
│ Supabase       │   │ Azure SQL                    │
│ PostgreSQL     │   │ 4-4intexdb.database.windows  │
│ (Identity      │   │ .net                         │
│  tables only)  │   │ (all operational data +      │
│                │   │  ML prediction tables)       │
└────────────────┘   └──────▲──────────────────────┘
                            │
               ┌────────────┴────────────┐
               │ ML Pipelines (Python)    │
               │ GitHub Actions nightly   │
               │ 3 models → artifacts +   │
               │ batch inference → DB     │
               └──────────────────────────┘
```

### Two Databases — Why and What Lives Where

We use free tiers, so auth needed its own database:

| Database | Provider | Contents |
|---|---|---|
| **Azure SQL** (`AppDbContext`) | Azure SQL Server | All operational tables: residents, safehouses, donations, supporters, partners, incidents, education records, health records, intervention plans, home visitations, process recordings, social media posts, safehouse monthly metrics, public impact snapshots, ML prediction tables |
| **Supabase PostgreSQL** (`IdentityContext`) | Supabase (free tier) | ASP.NET Identity tables only: AspNetUsers, AspNetRoles, AspNetUserRoles, AspNetUserClaims, AspNetUserLogins, AspNetUserTokens, AspNetRoleClaims |

**DO NOT** attempt to merge these into one database or change the connection strings.

---

## Authentication & Authorization — DO NOT MODIFY

The auth system was carefully migrated from custom JWT to ASP.NET Identity cookie auth. **Do not change the auth implementation** unless explicitly asked.

### How It Works

1. **Backend** uses `AddIdentityApiEndpoints<ApplicationUser>()` which auto-generates `/api/auth/login`, `/api/auth/register`, and 2FA endpoints via `MapIdentityApi<ApplicationUser>()`
2. **Sessions** are managed via encrypted httpOnly cookies (`SameSite=None`, `Secure=Always`, 7-day sliding expiration)
3. **Custom endpoints** in `AuthController.cs`:
   - `GET /api/auth/me` — Always returns 200 with `{ isAuthenticated: true/false, ... }` (never 401)
   - `GET /api/auth/providers` — Lists available external login providers
   - `GET /api/auth/external-login` + `GET /api/auth/external-callback` — Google OAuth flow
   - `POST /api/auth/logout` — Calls `SignOutAsync()`
4. **Frontend** uses `AuthContext` with `refreshAuthState()` — pages call `loginUser()` / `registerUser()` / `logoutUser()` from `lib/authAPI.ts` then refresh

### Roles

| Role | Access |
|---|---|
| **Admin** | Full CRUD on all entities |
| **Staff** | Read-only on all entities |
| **Donor** | Donor portal only (placeholder) |

- Roles are defined in `Data/AuthRoles.cs` — use constants, not strings
- Authorization policies in `Data/AuthPolicies.cs`
- All entity controllers: `[Authorize(Roles = "Admin,Staff")]` at class level, `[Authorize(Roles = "Admin")]` on write operations
- `PublicImpactController` is intentionally unauthenticated (public landing page data)
- Registration does NOT allow role selection — all self-registered users become Donors

### Files That Compose the Auth System (do not touch)

```
backend/
  Program.cs                          — Identity + cookie config + MapIdentityApi
  Controllers/AuthController.cs       — /me, /providers, OAuth, /logout
  Data/ApplicationUser.cs             — IdentityUser + FirstName, LastName, SupporterId
  Data/AuthRoles.cs                   — Role constants
  Data/AuthPolicies.cs                — Policy constants
  Data/IdentityContext.cs             — Identity DbContext (Supabase PostgreSQL)
  Data/SeedData.cs                    — Seeds roles + test users
  Infrastructure/SecurityHeaders.cs   — CSP middleware

frontend/
  src/lib/authAPI.ts                  — All auth API calls (login, register, logout, session, OAuth)
  src/context/AuthContext.tsx          — AuthProvider + useAuth hook
  src/components/ProtectedRoute.tsx    — Role-based route guard
```

---

## Backend Structure

**Framework:** ASP.NET Core 10 Web API
**ORM:** Entity Framework Core (SQL Server for data, Npgsql for Identity)
**Location:** `backend/IntexAPI/IntexAPI/`

### Controllers (17 total)

All entity controllers follow the same pattern:
- Class-level `[Authorize(Roles = "Admin,Staff")]`
- `GET` (list with pagination) + `GET /{id}` (single)
- `POST` / `PUT` / `DELETE` with `[Authorize(Roles = "Admin")]`

Special controllers:
- `AuthController` — see auth section above
- `AdminDashboardController` — aggregated dashboard data
- `AnalyticsController` — trends and chart data
- `PublicImpactController` — unauthenticated landing page aggregates

### Data Models (in `Data/`)

One C# class per table. `AppDbContext` maps all operational entities. `IdentityContext` handles Identity tables.

### Key Config Files

- `appsettings.json` — Connection strings, FrontendUrl, Google OAuth config
- `Properties/launchSettings.json` — Local dev URLs (port 5180)

---

## Frontend Structure

**Framework:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4
**Router:** react-router v7 (import from `'react-router'`, NOT `'react-router-dom'`)
**Location:** `frontend/`

### Directory Layout

```
src/
  App.tsx                    — Route definitions
  main.tsx                   — Entry point
  lib/
    authAPI.ts               — Auth API functions
  apis/
    client.ts                — Generic API client (apiRequest<T>)
    *Api.ts                  — One module per entity (17 files)
    index.ts                 — Re-exports all API modules
  types/
    *.ts                     — TypeScript interfaces per entity
    apiDtos.ts               — DTO shapes for aggregate endpoints
  context/
    AuthContext.tsx           — Auth state
    CookieConsentContext.tsx  — Cookie consent state
  components/
    AdminLayout.tsx           — Sidebar + Outlet for admin pages
    CookieConsentBanner.tsx   — GDPR-style cookie banner
    ProtectedRoute.tsx        — Route guard
    Navbar.tsx, Hero.tsx, Footer.tsx, etc.
  pages/
    Landing.tsx               — Public landing page
    LoginPage.tsx, RegisterPage.tsx, LogoutPage.tsx
    CookiePolicyPage.tsx
    Admin.tsx                 — Dashboard
    AdminDonors.tsx, AdminCaseload.tsx, etc.
  styles/
    index.css                 — Tailwind imports + custom styles
  assets/                     — Images + video
```

### API Communication

- **Dev:** Vite proxy forwards `/api/*` to `http://localhost:5180`
- **Prod:** Direct HTTPS to Azure backend URL
- All requests use `credentials: 'include'` for cookie auth
- Entity APIs use `apiRequest<T>()` from `apis/client.ts`
- Auth APIs use dedicated functions from `lib/authAPI.ts`

### Deployment

- Frontend deploys to Azure Static Web Apps via GitHub Actions on push to `main`
- Backend deploys to Azure App Service (manual / separate pipeline)

---

## ML Pipelines

**Location:** `ML Pipelines/` (separate git repo)
**Language:** Python 3.11
**Orchestration:** GitHub Actions nightly at 2 AM UTC (`retrain.yml`)

### Three Models

| Pipeline | Script | Target | Output |
|---|---|---|---|
| Social Media Performance | `train_social_media.py` | Predict post engagement | `social_media_model.sav` + `social_media_recommendations.csv` |
| Resident Reintegration Risk | `train_resident_risk.py` | Predict reintegration success | `resident_risk_model.sav` + `resident_risk_scores.csv` |
| Donor Churn | `train_donor_churn.py` | Predict donor churn (180-day threshold) | `donor_churn_model.sav` + `donor_risk_scores.csv` |

### How They Work

1. Scripts read from Azure SQL (or local CSVs when `USE_DATABASE=false`)
2. Train sklearn pipelines (Pipeline, ColumnTransformer, etc.)
3. Save model artifacts (`.sav` via joblib) + metadata/metrics (`.json`)
4. `run_inference_all.py` loads trained models and writes predictions back to Azure SQL
5. Artifacts uploaded to GitHub Actions for download

### Key Files

- `scripts/config.py` — Paths, DB toggle, connection string, constants
- `scripts/utils_db.py` — SQLAlchemy helpers (get_engine, load_table, write_table)
- `requirements.txt` — Python dependencies

**Note:** The ML pipeline is currently having training issues that need investigation.

---

## Rules for Editing This Codebase

### 1. Make Minimal Changes

- Change only what is necessary to accomplish the task
- Do not refactor surrounding code, add comments to code you didn't write, or "improve" things that weren't asked for
- Do not add features beyond what was requested
- Do not add speculative abstractions, helper utilities, or "future-proofing"

### 2. Do Not Break Auth

- Do not modify any file listed in the "Auth System" section above unless explicitly asked
- Do not change cookie settings, CORS origins, Identity configuration, or role definitions
- Do not add `[AllowAnonymous]` to protected endpoints
- Do not change how the frontend handles auth state

### 3. Follow Existing Patterns

- **Backend controllers:** Follow the same pattern as existing controllers (class-level `[Authorize]`, method-level for writes, same DTO style)
- **Frontend APIs:** One file per entity in `src/apis/`, using `apiRequest<T>()` from `client.ts`
- **Frontend types:** One file per entity in `src/types/`
- **Styling:** Tailwind 4 utility classes. Do not introduce new CSS frameworks or CSS-in-JS.
- **Routing:** Use `react-router` v7 imports (NOT `react-router-dom`)

### 4. Respect the Two-Database Architecture

- Operational data → Azure SQL via `AppDbContext`
- Identity data → Supabase PostgreSQL via `IdentityContext`
- Never cross-reference between the two contexts in a single query
- Never change connection strings

### 5. Security Practices

- Never expose secrets, connection strings, or API keys in client-side code
- Never disable HTTPS, CORS, or authentication for convenience
- Never add `[AllowAnonymous]` without explicit approval
- All new endpoints with sensitive data must have `[Authorize]` with appropriate roles
- Validate user input at system boundaries
- Use parameterized queries — never interpolate user input into SQL

### 6. Code Quality Standards

- TypeScript: Use proper types, avoid `any`
- C#: Use nullable reference types (`string?` where appropriate)
- Name things clearly — no abbreviations except universally understood ones (id, url, db)
- Handle errors at appropriate boundaries — don't swallow exceptions silently
- Keep functions focused — one responsibility per function
- Prefer existing framework features over hand-rolled solutions

### 7. Testing Changes

- After backend changes: verify the project builds (`dotnet build`)
- After frontend changes: verify TypeScript compiles (`npm run build`)
- Test auth flows (login, logout, protected routes) after ANY change to ensure nothing broke
- Verify CORS still works (frontend can reach backend)

### 8. Git Practices

- Do not force push
- Do not modify `.github/workflows/` files without explicit approval
- Do not commit `.env` files, secrets, or credentials
- Write clear commit messages describing what changed and why

---

## Local Development

### Backend
```bash
cd backend/IntexAPI/IntexAPI
dotnet run    # Starts on http://localhost:5180
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # Starts on http://localhost:5173, proxies /api to :5180
```

### ML Pipelines (local, CSV mode)
```bash
cd "ML Pipelines"
pip install -r requirements.txt
cd scripts
python train_social_media.py    # Uses local CSVs by default
```

### Seed Users (for testing)

| Email | Password | Role |
|---|---|---|
| admin@intex.com | Admin123!Special | Admin |
| staff@intex.com | Staff123!Special | Staff |
| donor@intex.com | Donor123!Special | Donor |

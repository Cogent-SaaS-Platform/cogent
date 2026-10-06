# Phase A5: CI/CD & Automated Testing Gates

> **Objective:** Fix all 168 ESLint errors, automate linting and test execution via GitHub Actions, and configure automated Docker container builds deployed to Google Cloud Run.  
> **Target Tooling:** GitHub Actions + ESLint 9 + Vitest + Playwright + Google Artifact Registry + Cloud Run.

---

## 1. Executive Summary & Deliverables

1. **Lint Remediation Plan:** Fix the 168 ESLint errors (predominantly `@typescript-eslint/no-explicit-any` and unused variables in `src/shared/types/index.ts` and presentation types).
2. **Deterministic CI Test Suite:** Ensure all 31 Vitest test files (145 tests) and Playwright E2E tests execute cleanly inside GitHub Actions runners.
3. **Continuous Integration (CI) Workflow:** Create `.github/workflows/ci.yml` that validates code hygiene (`lint` -> `typecheck` -> `test` -> `build`) on every pull request targeting `main`.
4. **Continuous Deployment (CD) Workflow:** Create `.github/workflows/deploy.yml` that triggers on merge to `main`, builds the production Docker image, pushes it to Google Artifact Registry, and deploys to Cloud Run with zero downtime.

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A5.1: ESLint Remediation Strategy (Zero Errors Gate)
- **Current State:** 168 errors, 146 warnings (primarily `no-explicit-any` across shared schemas and UI event handlers).
- **Remediation Plan:**
  1. In `src/shared/types/index.ts` (lines 175, 187, etc.):
     - Replace `Record<string, any>` with type-safe `Record<string, unknown>`.
     - Replace untyped JSON payload definitions with explicit Zod inferred types.
  2. In `src/shared/auth/tenantSyncService.ts`:
     - Type the injected client properly as `SupabaseClient<Database>` instead of casting to `any`.
  3. Verify with:
     ```bash
     npx eslint src --max-warnings=0
     ```

### Task A5.2: GitHub Actions Continuous Integration (CI) Workflow
- **Target File:** `.github/workflows/ci.yml`
- **Workflow Definition:**
  ```yaml
  name: Cogent CI Pipeline

  on:
    pull_request:
      branches: [main]
    push:
      branches: [main]

  jobs:
    validate:
      name: Lint, Typecheck & Test
      runs-on: ubuntu-latest
      env:
        NODE_ENV: test
        NEXT_TELEMETRY_DISABLED: 1
      steps:
        - name: Checkout Code
          uses: actions/checkout@v4

        - name: Setup Node.js 22
          uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: 'npm'

        - name: Install Dependencies
          run: npm ci

        - name: ESLint Hygiene Gate
          run: npm run lint

        - name: TypeScript Static Typecheck
          run: npx tsc --noEmit

        - name: Vitest Unit & Integration Suite
          run: npm run test

        - name: Next.js Production Build Validation
          run: npm run build
          env:
            NEXT_PUBLIC_APP_URL: "https://ci-test.internal"
            NEXT_PUBLIC_SUPABASE_URL: "https://ci-test.supabase.co"
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "ey-ci-mock-anon-key"
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_ci_mock"
  ```

### Task A5.3: GitHub Actions Continuous Deployment (CD) Workflow
- **Target File:** `.github/workflows/deploy.yml`
- **Workflow Definition:**
  ```yaml
  name: Cogent CD - Cloud Run Release

  on:
    push:
      branches: [main]

  jobs:
    deploy-production:
      name: Build Docker & Deploy to Google Cloud Run
      runs-on: ubuntu-latest
      permissions:
        contents: read
        id-token: write

      steps:
        - name: Checkout Code
          uses: actions/checkout@v4

        - name: Authenticate to Google Cloud
          uses: google-github-actions/auth@v2
          with:
            credentials_json: ${{ secrets.GCP_SA_KEY }}

        - name: Set up Google Cloud SDK
          uses: google-github-actions/setup-gcloud@v2

        - name: Configure Docker for Google Artifact Registry
          run: |
            gcloud auth configure-docker europe-west3-docker.pkg.dev --quiet

        - name: Build & Tag Container Image
          run: |
            IMAGE_TAG="europe-west3-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/cogent-docker-repo/cogent-web:${{ github.sha }}"
            docker build -t "$IMAGE_TAG" -t "europe-west3-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/cogent-docker-repo/cogent-web:latest" .
            docker push "$IMAGE_TAG"
            docker push "europe-west3-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/cogent-docker-repo/cogent-web:latest"

        - name: Deploy to Cloud Run
          uses: google-github-actions/deploy-cloudrun@v2
          with:
            service: cogent-web
            region: europe-west3
            image: "europe-west3-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/cogent-docker-repo/cogent-web:${{ github.sha }}"
            flags: "--allow-unauthenticated --port=8080 --min-instances=0 --max-instances=10 --cpu=1 --memory=1Gi"
  ```

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Create Google Cloud Service Account for GitHub Actions
1. In Google Cloud Console, navigate to **IAM & Admin** -> **Service Accounts**.
2. Click **Create Service Account**:
   - Name: `github-actions-deployer`
   - Description: `Deploys Cogent releases from GitHub Actions`
3. Assign required IAM Roles:
   - **Artifact Registry Writer** (`roles/artifactregistry.writer`)
   - **Cloud Run Developer** (`roles/run.developer`)
   - **Service Account User** (`roles/iam.serviceAccountUser`)
4. Create and Download JSON Key:
   - Select the newly created service account -> **Keys** tab -> **Add Key** -> **Create new key (JSON)**.
   - Save the downloaded JSON file on your machine.

### Step 2: Add Secrets to GitHub Repository
1. In your GitHub repository:
   - Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add:
   - `GCP_PROJECT_ID`: Your GCP project ID (e.g. `cogent-production`).
   - `GCP_SA_KEY`: The entire contents of the downloaded JSON key file.

---

## 4. Acceptance Criteria & Phase A5 Verification Checklist

- [ ] `npm run lint` completes with zero errors and zero warnings.
- [ ] Pull requests trigger GitHub Actions CI and block merge if any test or lint check fails.
- [ ] Merging a PR into `main` automatically builds the multi-stage Docker image in GitHub Actions.
- [ ] Container image is published to Google Artifact Registry in `europe-west3`.
- [ ] Cloud Run successfully rolls out a new revision with zero manual SSH or CLI steps.

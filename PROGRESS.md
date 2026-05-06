# Project Progress Report

This document serves as a comprehensive record of the development progress, architectural decisions, and implemented features for the **Spotify to YouTube List Converter** project.

## 🏗️ Architecture & Infrastructure Setup
- **Microservices Architecture**: Successfully decoupled the application into three main components: a React Frontend, a Spring Boot Backend, and an AWS Lambda function.
- **Infrastructure as Code (IaC)**: Developed complete Terraform scripts (`terraform/`) to provision AWS resources including VPCs, EC2 instances (for K3s), ECR repositories, and Lambda functions.
- **Kubernetes Orchestration**: Created Kubernetes manifests (`k8s/deployment.yaml`, `k8s/service.yaml`) to deploy the frontend and backend to a K3s cluster.
- **Dockerization**: Containerized both the frontend and backend services with optimized `Dockerfile`s and configured a `docker-compose.yml` for seamless local development.

## 🚀 AWS Lambda (Spotify Fetcher)
- **Spotify API Integration**: Implemented a Python 3.10 Lambda function (`lambda/main.py`) to handle Spotify API communication securely.
- **Authentication**: Utilized the Spotify Client Credentials flow to retrieve access tokens.
- **Mock Mode**: Engineered a fallback "Mock Mode" that returns static data when Spotify credentials are not provided, heavily accelerating local development and testing.
- **CORS Handling**: Configured the Lambda function to handle preflight `OPTIONS` requests and return appropriate HTTP status codes.

## ⚙️ Spring Boot Backend
- **Project Initialization**: Bootstrapped a Java 21 Spring Boot 3.3.6 application (`com.converter.backend`).
- **YouTube Searching Mechanism**: Implemented a search endpoint (`/api/v1/youtube/search`) that asynchronously processes a list of track names.
- **CLI Integration**: Integrated the `yt-dlp` command-line tool via Java's `ProcessBuilder` to scrape YouTube Music for video IDs without relying on the official API rate limits.
- **Concurrency Control**: Configured a fixed thread pool (`Executors.newFixedThreadPool(2)`) to manage the execution of `yt-dlp` processes and prevent Out-Of-Memory (OOM) errors on small cloud instances.
- **Global CORS**: Implemented global CORS configuration to allow cross-origin requests from the React frontend.

## 🎨 React Frontend
- **Project Setup**: Initialized a blazing-fast React 19 application using Vite.
- **UI/UX Design**: Built a modern, dark-themed, glassmorphism-inspired UI with custom CSS animations and a responsive grid overlay.
- **API Integration**: Integrated `axios` to coordinate requests between the AWS Lambda function (to get tracks) and the Spring Boot Backend (to find YouTube links).
- **State Management**: Implemented React hooks (`useState`) to manage the loading state, status messages, error handling, and the dynamic rendering of the results table.
- **Pagination**: Added client-side pagination to the results table to ensure a clean UI when processing large playlists (50 tracks).
- **Internationalization (i18n)**: Integrated `react-i18next` with `i18next-browser-languagedetector` for automatic browser language detection. Supports 6 languages (EN, TR, DE, IT, ES, SV) with user choice persisted in `localStorage`. All user-facing strings — including error messages, progress indicators, status alerts, and the footer — are externalized into JSON translation files under `src/i18n/locales/`. A flag-based language switcher dropdown is positioned in the top-right corner of the UI.

## 🧭 Architectural Decisions

### ❌ Spotify OAuth Integration — Cancelled
**Date:** 2026-05-06  
**Status:** Rejected after full technical analysis  
**Original Proposal:** Replace Client Credentials flow with OAuth 2.0 to let users log in with Spotify and access private playlists.

**Why it was rejected:**
1. **UX degradation**: OAuth adds login redirects, permission consent screens, and page reloads — turning a 5-step flow into 13 steps. For ~100 concurrent users, friction kills conversion rates.
2. **Trust barrier**: Multiple login/permission pages make users question account safety ("Will they hack my Spotify?"). This directly contradicts the project's "beautifully simple" design philosophy.
3. **Infrastructure cost**: OAuth requires session management (Redis/DynamoDB), encrypted token storage, refresh token rotation, CSRF protection, and a logout endpoint — none of which currently exist.
4. **Compliance burden**: Storing user tokens triggers GDPR data protection requirements and Spotify mandates a privacy policy page and a 1-4 week app review process.
5. **Marginal benefit**: The only capability gained is accessing *private* playlists. Users can make any playlist public in Spotify with 2 clicks, which is simpler for everyone.

**Chosen approach:** Keep the zero-login, paste-a-link UX. Add a frontend hint message when a private playlist fails, guiding users to make it public instead.

### ❌ YouTube Data API — Cancelled
**Date:** 2026-04 (original), confirmed 2026-05  
**Status:** Rejected due to rate limits  
**Reasoning:** The official YouTube Data API has a 10,000 units/day free quota. A single playlist conversion of 50 tracks would consume ~2,500 units, meaning only ~4 users per day could convert playlists before hitting the limit. `yt-dlp` scraping has no such quota, making it the only viable approach for a public-facing tool.

### ❌ YouTube Account Integration — Cancelled
**Date:** 2026-05-06  
**Status:** Rejected — same rationale as Spotify OAuth  
**Original Proposal:** Add Google/YouTube OAuth so the app could automatically create a playlist in the user's YouTube account.

**Why it was rejected:** The same core reasons that led to rejecting Spotify OAuth apply here — Google OAuth would add login redirects, consent screens, token/session storage, and GDPR obligations, breaking the zero-login UX. Users can already open the output links directly in YouTube Music without granting account access.

## ⎈ Helm Charts
- **Chart Structure**: Created `helm/spotify-converter/` — a single Helm 3 chart containing both frontend and backend Deployments and Services as templates. Replaces the fragile `sed`-based `REPLACE_ME_IMAGE_URL` placeholder with proper `{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}` injection at deploy time.
- **Environment Separation**: `values.yaml` (defaults), `values-dev.yaml` (single replica, dev CORS), `values-prod.yaml` (2 replicas, higher resources, CORS set via CI secrets).
- **CI/CD Migration**: Both `backend-ci.yml` and `frontend-ci.yml` updated from `SCP + kubectl apply` to `helm upgrade --install --atomic` with 5-minute timeout and automatic rollback on failure.
- **Infrastructure**: Helm 3 installed via `user_data.sh` on EC2 bootstrap.
- **Archive**: Old raw manifests moved to `k8s/legacy/` for reference.

## 🔒 Security Hardening
- **NodePort Lockdown (security.tf)**: Replaced the open range `30000-32767` with only the two specific ports actually in use (`30080` backend, `30081` frontend). This prevents accidental exposure of any future K3s services.
- **CI Action Pinning**: Updated all GitHub Actions from unpinned versions (`@master`, `@v1`, `@v3`) to specific releases (`@v4`, `@v2`, `@v0.1.7`, `@v1.0.3`). Using `@master` is a supply-chain attack vector — a compromised upstream commit would run in our pipeline.
- **Lambda CORS Tightening (lambda.tf)**: Restricted `allow_methods` from `["*"]` to `["POST", "OPTIONS"]` and `allow_headers` from `["*"]` to `["Content-Type"]`. Only the methods/headers the frontend actually uses are now permitted.
- **Frontend Build URL**: Changed `VITE_BACKEND_URL` from a hardcoded `http://$EC2_HOST:30080/api/...` string in the CI file to a proper `${{ secrets.VITE_BACKEND_URL }}` GitHub Secret, preventing the EC2 IP from being visible in the workflow file.

## 📝 Documentation
- **README.md**: Wrote a comprehensive README detailing the architecture, tech stack, prerequisites, and instructions for both local Docker and cloud Terraform deployments.


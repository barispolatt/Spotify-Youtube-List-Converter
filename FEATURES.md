# Spotify to YouTube List Converter - Features & Fixes

This document outlines the required fixes, architectural improvements, and potential new features for the Spotify to YouTube List Converter project. All items are prioritized and checkable.

## 🔴 High Priority Fixes

- [x] **Fix Language Inconsistency in Frontend Error Handling**: The frontend `App.jsx` checks for `row.youtubeLink !== "Bulunamadı"` (Turkish) to disable the listen link, but the backend `BackendApplication.java` returns `"Not found"` (English) on failure. Update the frontend condition to check for `"Not found"` to properly hide broken links.
- [x] **Align Implementation with Documentation (MUI)**: The `README.md` states the project uses Material UI (MUI), and it's installed in `package.json`, but `App.jsx` uses pure CSS and basic HTML elements. Refactor the frontend to utilize MUI components for consistency and better maintainability.
- [x] **Align Implementation with Documentation (YouTube API)**: *Resolution: The documentation has been updated to reflect the use of `yt-dlp`. While the official YouTube Data API was considered, its strict free tier quota (10,000 units/day) makes it unsuitable for a high-volume public application.*
- [x] **Optimize Backend Concurrency**: The backend uses a fixed thread pool of 2 (`Executors.newFixedThreadPool(2)`). Processing a 50-track playlist is extremely slow because only 2 `yt-dlp` processes run concurrently. Introduce a more robust async queue mechanism or evaluate scaling the thread pool size based on the environment to improve performance.

## 🟡 Medium Priority Fixes

- [x] **Add Proper Error Objects in Backend**: The backend currently returns string messages or "Not found" for missing tracks. Standardize the API response to return structured JSON error objects (e.g., `{ "status": "error", "message": "..." }`) for better frontend error handling.
- [x] **Handle Empty Playlists gracefully**: Ensure both the Lambda function and the Backend gracefully handle empty playlists or invalid Spotify URLs with clear error messages returned to the user.
- [x] **CORS Configuration Optimization**: The Spring Boot backend uses `*` for allowed origins, methods, and headers. Restrict CORS to specific frontend domains (e.g., the Vercel/Netlify domain or localhost) for improved security.

## 🟢 Potential Updates & Features

### Architecture & Performance
- [x] **Real-time Progress Updates (WebSockets / SSE)**: Instead of blocking the frontend until all tracks are processed, implement Server-Sent Events (SSE) or WebSockets so the UI updates track-by-track as they are found on YouTube.
- [x] ~~**Replace `yt-dlp` with Official YouTube Data API**~~: *(Cancelled) Using the official YouTube Data API introduces strict rate limits that would crash the app under heavy load. We are officially retaining `yt-dlp` to avoid quota exhaustion.*

### User Experience (UX)
- [ ] **Spotify OAuth Integration**: Replace the hardcoded Spotify Client Credentials flow with an OAuth 2.0 flow. This would allow users to log in with their Spotify accounts and convert their private playlists.
- [ ] **YouTube Account Integration**: Add Google/YouTube OAuth so the application can automatically create a new playlist directly in the user's YouTube account, rather than just outputting a list of links.
- [ ] **Internationalization (i18n)**: Implement `react-i18next` to support multiple languages (e.g., English, Turkish, German) since there are already traces of Turkish in the codebase.
- [ ] **Dark/Light Mode Toggle**: Implement a theme toggle mechanism using MUI's theming capabilities.

### DevOps & Infrastructure
- [ ] **Helm Charts**: Convert the raw Kubernetes YAML files in the `k8s/` directory into Helm charts for easier deployment, versioning, and environment-specific configurations.
- [ ] **CI/CD Pipeline Expansion**: Add automated testing (unit and integration tests) to the GitHub Actions pipeline to ensure stability before deployments.

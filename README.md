# Blue Code - OS — Full-stack starter

This ZIP preserves the supplied Blue Code - OS React/Vite frontend and adds a separate Express/MongoDB backend. It includes server-side account registration/login, per-user workspace persistence, Hunter API routes, and OpenRouter AI routes. Apollo/customer connection and payments are not part of this version.

## Requirements
- Node.js 20 LTS recommended (18+ supported)
- MongoDB Atlas account or local MongoDB
- Hunter API key and OpenRouter API key (optional until those features are used)

## 1. Configure backend
1. Open this folder in VS Code.
2. Open a terminal and run `cd server` then `npm install`.
3. Copy `.env.example` to `.env`.
4. In `server/.env`, set `MONGODB_URI`, `JWT_SECRET` (random secret at least 32 characters), `HUNTER_API_KEY`, and `OPENROUTER_API_KEY`. Keys stay here on the server; never put them in `client/.env` or commit `.env`.
5. Start the backend: `npm run dev`. Check `http://localhost:5000/api/health`.

## 2. Configure frontend
Open a second terminal: `cd client`, `npm install`, copy `.env.example` to `.env` if needed, then `npm run dev`. Open the URL Vite prints (normally `http://localhost:5173`).

## 3. User flow
- Create account → ICP Builder → ICP Review → Booking Setup → Dashboard.
- Sign in → Dashboard.
- Workspaces are saved to MongoDB by authenticated user. The UI still includes demo/sample prospect data until you explicitly run the live Hunter workflow; sample records are not represented as verified live data.
- Apollo connection has been removed. Hunter is configured centrally in the backend; customers do not enter their own Hunter API key.

## API endpoints
- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/workspace`, `PUT /api/workspace`
- `GET /api/integrations/status`
- `POST /api/hunter/discover` — JSON body uses Hunter Discover filters/query
- `GET /api/hunter/domain-search?domain=example.com`
- `GET /api/hunter/email-finder?domain=example.com&first_name=Jane&last_name=Doe`
- `GET /api/hunter/company-enrichment?domain=example.com`
- `POST /api/ai/draft-email`, `POST /api/ai/classify-reply`, `POST /api/ai/evaluate-prospect`

All Hunter and AI routes require a logged-in user and use API keys only on the server. Hunter Discover access depends on Hunter account eligibility; funding, technology, and some filters are Premium-only. Free plan credits/limits can change. Email sending and payment processing are intentionally not enabled.

## ICP score
`POST /api/ai/evaluate-prospect` asks the model to return evidence-aware Trigger, Main Signal, Intake and ICP match assessments. The backend calculates the score with provisional weights: ICP match 40, Trigger 20, Main Signal 25, Intake 15. Unknown signals earn no points, and the response includes a breakdown. Adjust these weights only after product requirements are approved. This endpoint evaluates only supplied evidence; it does not independently crawl news/websites or prove a buying intent.

## Build/check
From project root: `npm run build` and `npm run check:server`.

## Important notes
- This is an integration baseline, not a production launch. Test against your actual Hunter/OpenRouter plans and credentials.
- Do not commit `.env` files. Do not expose secrets in `VITE_*` variables.
- Secure deployment still requires HTTPS, production CORS configuration, rate-limit review, database backups, monitoring, privacy/terms review, and tests.
- Hunter API data may have usage and contractual limits. Confirm the current terms before showing/storing it for customers.

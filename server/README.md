# Our Space — Express & TypeScript Backend

The private, secure backend web service for **Our Space**, a mobile-first PWA for couples. Built with Express, TypeScript, Mongoose, Socket.IO, Pino, and Cloudinary.

---

## 🛠 Features & Security Stack

- **Security & Headers**: [Helmet](https://helmetjs.github.io/) security headers enabled.
- **CORS Protection**: Restricted to the frontend client origin (`CLIENT_ORIGIN`) with `credentials: true`.
- **Rate Limiting**: Centralized rate limiting with strict limits on authentication routes (`/auth/login`).
- **Validation**: Strict request validation using [Zod](https://zod.dev/) schemas on request body, query, and params.
- **Centralized Error Handling**: Unified `AppError` hierarchy (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`) returning structured JSON error payloads.
- **Structured Logging**: High-performance structured logging with [Pino](https://getpino.io/) and `pino-http`.
- **Media & Voice Upload**:
  - `POST /media/sign`: Generates secure Cloudinary signatures for direct client upload (auth required).
  - `POST /media/voice` and `POST /voice`: Multi-part audio upload with a strict 10MB file size limit.
- **Real-Time Communication**: [Socket.IO](https://socket.io/) initialized with room-based isolation (`couple:<coupleId>`).
- **Health Check**: `GET /health` and `GET /api/health` endpoints returning server timestamp and uptime.

---

## 🔒 Authentication & Authorization Architecture

### Authentication Flow
- **No public signup**: The app is strictly designed for a single couple. Users and couples are initialized via the CLI seed script (`npm run seed:couple`).
- **`POST /auth/login`**: Accepts `email` and `password`. Returns:
  - Access token: Short-lived JWT (15 minutes) in the JSON response body.
  - Refresh token: Long-lived JWT (7 days) stored in an `httpOnly`, `Secure`, `SameSite=None` cookie (`refreshToken`).
- **`POST /auth/refresh`**: Validates the refresh token cookie and issues a fresh 15-minute access token.
- **`POST /auth/logout`**: Clears the `refreshToken` cookie.
- **`requireAuth` Middleware**: Verifies Bearer JWT, fetches user, and populates `req.user` and `req.coupleId`.

### Authorization Rules (Enforced in Services)
All authorization logic is centralized in `/server/src/services` and never scattered across routes:
1. **Multi-Tenant Isolation**: Every database operation enforces `{ coupleId }`. Clients can never supply or tamper with `coupleId`.
2. **Cycle & SymptomLog Privacy**:
   - Only the owner (`role: 'her'`) may create, update, or delete cycle and symptom logs.
   - The partner may read cycle and symptom records **only** if the owner's `shareCycle === true`.
3. **Thought & Insecurity Privacy**:
   - The author always has access to their thoughts.
   - Thoughts with `visibility: 'private'` are never visible to the partner.
   - Insecurities default to `visibility: 'private'`.
   - The author **cannot** respond to their own thoughts or insecurities.
   - Only the partner may add responses.
   - Insecurity responses are strictly limited to an emoji or a note of up to 200 characters.
4. **ProgressPost Authorization**:
   - Only the author may edit or delete their progress posts.
   - The partner may add replies and emoji reactions.
   - Users may only delete their own replies and reactions.
5. **Message Authorization**:
   - Both partners in the couple can read messages.
   - Only the message sender can delete their message.

---

## 🗄 Mongoose Models

All models include Mongoose `{ timestamps: true }` (`createdAt`, `updatedAt`). All couple models carry indexed `coupleId`:

- **Couple**: `{ startDate }`
- **User**: `{ coupleId, name, email (unique), passwordHash, role: 'her'|'him', shareCycle: boolean (default false), avatarUrl }`
- **Message**: `{ coupleId, senderId, body, mediaUrl, voiceUrl, replyTo, seenAt, reactions: [{userId, emoji}] }`
- **Mood**: `{ coupleId, userId, emoji, energy 1-5, note }`
- **Goal**: `{ coupleId, userId, title, category, targetCount, unit, deadline, status }`
- **ProgressPost**: `{ coupleId, userId, goalId, category, body, countAdded, minutes, struggled, mediaUrls[], voiceUrl, replies: [{userId, body, voiceUrl, quickCheer, createdAt}], reactions: [{userId, emoji}] }`
- **Cycle**: `{ userId, coupleId, startDate, endDate, flow, notes }`
- **SymptomLog**: `{ userId, coupleId, date, symptoms[], pain, mood }` with unique compound index on `(userId, date)`
- **Thought**: `{ coupleId, userId, body, kind: 'thought'|'insecurity', visibility: 'private'|'shared', justVenting, responses: [{userId, emoji, note, createdAt}] }`
- **Note**: `{ coupleId, fromId, body, kind }`
- **Event**: `{ coupleId, title, date, remindDaysBefore }`
- **PushSubscription**: `{ userId, endpoint (unique), keys }`

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 20.x
- **MongoDB** instance (local MongoDB or MongoDB Atlas)

### 2. Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```

Configure your variables:
```env
PORT=5001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:8080

MONGODB_URI=mongodb://127.0.0.1:27017/our-space

JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_characters
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

SEED_HER_NAME=Aditi
SEED_HER_EMAIL=aditi@ourspace.local
SEED_HER_PASSWORD=YourSecurePassword123!
SEED_HIM_NAME=Aman
SEED_HIM_EMAIL=aman@ourspace.local
SEED_HIM_PASSWORD=YourSecurePassword123!
SEED_COUPLE_START_DATE=2025-04-16T00:00:00Z
```

### 3. Installation
From the `/server` directory:
```bash
npm install
```

### 4. Seed Couple & Accounts
Run the seed CLI script to initialize the couple and create the two users with bcrypt (cost 12):
```bash
npm run seed:couple
```
Or from the project root:
```bash
npm run seed:couple
```

### 5. Start Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5001`.

### 6. Run Integration Tests
Run the automated test suite powered by [Vitest](https://vitest.dev/), Supertest, and `mongodb-memory-server`:
```bash
npm test
```
The test suite verifies:
- Multi-tenant couple data isolation
- Protection of partner private thoughts and unshared cycle data
- Message and progress post ownership controls
- Cloudinary signed upload generation
- Authentication login, refresh, and logout flows

---

## 🌐 API Reference

### System & Health
- `GET /health` — Health check endpoint

### Authentication
- `POST /auth/login` — Log in with email and password
- `POST /auth/refresh` — Refresh access token using httpOnly cookie
- `POST /auth/logout` — Invalidate session and clear cookie
- `GET /auth/me` — Get authenticated user details

### Media & Voice
- `POST /media/sign` — Generate Cloudinary direct signed upload credentials
- `POST /media/voice` or `POST /voice` — Upload voice note (max 10MB)

### Cycles & Symptoms
- `GET /cycles` — List cycles (partner requires owner `shareCycle: true`)
- `POST /cycles` — Create cycle record (owner only)
- `PUT /cycles/:id` — Update cycle record (owner only)
- `DELETE /cycles/:id` — Delete cycle record (owner only)
- `GET /cycles/symptoms` — List symptom logs (partner requires owner `shareCycle: true`)
- `POST /cycles/symptoms` — Upsert daily symptoms (owner only)
- `DELETE /cycles/symptoms/:id` — Delete symptom log (owner only)

### Thoughts & Insecurities
- `GET /thoughts` — List visible thoughts
- `POST /thoughts` — Create thought or insecurity
- `GET /thoughts/:id` — Get single thought
- `DELETE /thoughts/:id` — Delete thought (author only)
- `POST /thoughts/:id/responses` — Partner response (max 200 chars for insecurities)

### Progress Posts
- `GET /progress` — List couple progress updates
- `POST /progress` — Share a new progress milestone
- `PATCH /progress/:id` or `PUT /progress/:id` — Update post (author only)
- `DELETE /progress/:id` — Delete post (author only)
- `POST /progress/:id/replies` — Partner reply
- `DELETE /progress/:id/replies/:replyId` — Delete reply (reply owner only)
- `POST /progress/:id/reactions` — Toggle emoji reaction

### Messages
- `GET /messages` — Get chat history
- `POST /messages` — Send message
- `DELETE /messages/:id` — Delete message (sender only)
- `POST /messages/:id/reactions` — Toggle message reaction
- `POST /messages/:id/seen` — Mark message as seen

---

## ☁️ Deployment to Render

The repository includes a ready-to-deploy [`render.yaml`](../render.yaml) blueprint specification:

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), choose **Blueprints** → **New Blueprint Instance**.
3. Select this repository. Render automatically reads `render.yaml` and configures the `our-space-backend` Web Service.
4. Fill in the sensitive environment variables in the Render Dashboard:
   - `CLIENT_ORIGIN`: Your frontend URL (e.g., `https://ourspace.onrender.com`)
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
5. Click **Apply**. Render will automatically build (`npm install && npm run build`) and start (`npm run start`) the service.
6. The service monitors health at `/health`.

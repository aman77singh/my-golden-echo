# Our Digital Keepsake

Build me a single-page romantic website — a "relationship portfolio" for me and my girlfriend. 
It should feel premium, cinematic, and personal, with delightful surprise interactions — 
not a generic template. Use React + Tailwind CSS + Framer Motion, dark elegant theme with 
warm gold/rose gradient accents, glow effects, and grain/noise texture overlay for a 
film-like feel.

=== GLOBAL LAYOUT ===
- Fixed left sidebar (collapses to hamburger on mobile): Home / Us, Our Timeline, Photo Dump, 
  My Apologies, Random Thoughts, Music, A Letter To You — plus an 8th item "???" that stays 
  locked (greyed, subtle lock icon) until the user has visited all other 6 sections at least 
  once, then unlocks with a little shimmer animation and reveals a bonus final surprise section.
- Custom cursor: small heart that leaves a fading trail of 3-4 mini hearts as it moves.
- Subtle animated star/constellation background on Home — stars twinkle and faint lines connect 
  nearby ones; on load, animate a couple of lines to briefly trace out our initials before 
  fading back to random twinkling.
- Smooth fade+slide page transitions between sections. Fine grain/noise texture overlay at low 
  opacity across the whole site for a warm, filmic look.

=== MUSIC PLAYER (persistent, top-right) ===
- Spinning vinyl record (CSS rotate animation, pauses when paused) with a soft outer glow that 
  pulses gently in sync with playback (simulate with a slow scale/opacity pulse if real audio 
  analysis isn't available).
- Small musical notes (🎵🎶) drift up and fade out from the record at randomized angles/speeds.
- Click record → opens playlist drawer (album art, title, artist, click to switch).
- Use Spotify Web Playback SDK for real playback (Client ID + playlist ID from a config file, 
  not hardcoded); fallback to a styled Spotify embed iframe if not logged in.
- "Now playing" label in an elegant script font.
- Easter egg: define one track as "our song" in the config — when it plays, page accent color 
  smoothly transitions to a warmer rose tone for the duration, then eases back.

=== HOME / US ===
- Hero with both names in large type, tagline, hero photo with a soft vignette + glow border.
- Live "time together" counter (years/months/days/hours/minutes, updating live).
- When the counter crosses a round milestone (e.g. 100 days, 1 year), trigger a one-time confetti 
  or firefly-burst animation across the screen.
- Scroll-down indicator with a gentle bounce.

=== OUR TIMELINE ===
- Vertical alternating-card timeline, animated in on scroll, connected by a glowing line that 
  "fills up" as you scroll down it (like a progress trail).
- Include 6 sample milestone cards already written (editable later):
  1. "The First Hello" — "A random comment turned into a 3-hour conversation. Neither of us 
     saw that coming."
  2. "First Date Jitters" — "I changed my outfit four times. You pretended not to notice I was 
     nervous."
  3. "The Trip That Changed Everything" — "New city, no plans, just us — and somehow that was 
     the best itinerary we never made."
  4. "The Fight We Don't Talk About" — "We were both wrong. We were both stubborn. We both 
     stayed anyway."
  5. "The Apology That Meant It" — "Not the words — the way things felt different after."
  6. "Today" — "Still here. Still choosing you. Still figuring it out, together."

=== PHOTO DUMP ===
- Masonry gallery, parallax scroll (different columns drift at slightly different speeds), 
  hover zoom, click-to-lightbox with caption support.
- Placeholder grid ready for ~20 images, lazy-loaded, drag-to-reorder support in the config 
  if easy to implement.

=== MY APOLOGIES ===
- Sticky-note / handwritten-letter aesthetic, "Caveat" or "Dancing Script" font for headings.
- Make each note a scratch-to-reveal card: it looks scribbled/blurred over at first, and the 
  user drags or taps across it to "scratch off" and reveal the real message underneath 
  (canvas-based scratch effect or simple reveal-on-drag animation).
- Include 4 pre-written sample apology notes (editable):
  1. "For the nights I got quiet instead of talking it out."
  2. "For making you repeat yourself because I wasn't really listening the first time."
  3. "For every time 'I'm fine' meant the opposite."
  4. "For not saying sorry fast enough, even when I knew I should."

=== RANDOM THOUGHTS ===
- Scrapbook/journal layout, slightly tilted polaroid-style cards in an organic (non-grid) 
  arrangement, mixed with emoji doodles.
- Include 5 sample entries (editable):
  1. "Sometimes I still can't believe you chose me on a random Tuesday and never stopped."
  2. "You have this laugh you do only when you're truly caught off guard. I collect those."
  3. "I think about the version of me before you and I don't really recognize him."
  4. "Reminder to self: tell her the small things too, not just the big ones."
  5. "If love had a soundtrack, half of it would just be our dumb inside jokes."

=== A LETTER TO YOU (final section) ===
- Full-screen, minimal, elegant serif font, line-by-line fade/typewriter reveal on scroll.
- Include a full pre-written sample letter (editable) ending with both names + today's date, 
  closing with a soft animated heartbeat or gentle confetti.

=== BONUS "???" SECTION (unlocks after visiting all others) ===
- A short, extra-personal surprise message/animation that feels like a reward for exploring 
  the whole site — e.g. a final photo, a countdown to a future date (like your anniversary or 
  a trip), or one last line: "You found it. Just like I found you — not looking for it, but 
  glad I did."

=== TECHNICAL REQUIREMENTS ===
- Fully responsive, mobile-first.
- Clean component structure, with a single /content config file for all text, image paths, 
  timeline entries, apology notes, thoughts, letter text, start date, and Spotify playlist ID 
  — clearly commented so all edits happen in ONE place.
- Skippable intro animation (<2s) on first load — e.g. two initials merging into a heart.
- Well-commented code throughout for easy future tweaks.

Build this now with the sample content above already filled in (not generic placeholders) 
so the site feels complete and personal on first preview — I'll swap in real photos and 
tweak text after.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/45f1f359-4e30-45d3-b961-1d6339cbb6c7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js >= 20.x and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
# 1. Clone repository
git clone <this-repository-url>
cd <repository-name>

# 2. Install dependencies (root and server)
npm install
npm run --prefix server install

# 3. Configure environment files
cp server/.env.example server/.env

# 4. Seed the couple accounts
npm run seed:couple

# 5. Start dev environments
npm run dev           # Frontend on http://localhost:8080
npm run server:dev    # Backend on http://localhost:5001
```

---

## 🛠️ Environment Variables Configuration

### Server Environment (`server/.env`)
| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Yes | HTTP server port | `5001` |
| `NODE_ENV` | Yes | App environment (`development` / `production`) | `production` |
| `CLIENT_ORIGIN` | Yes | Authorized frontend URL | `https://ourspace.onrender.com` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster0.net/our-space` |
| `JWT_ACCESS_SECRET` | Yes | Key for signing short-lived access JWTs (min 32 chars) | `32+_chars_random_secret_here` |
| `JWT_REFRESH_SECRET` | Yes | Key for signing long-lived refresh tokens (min 32 chars) | `32+_chars_random_secret_here` |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token TTL (default: `15m`) | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh cookie TTL (default: `7d`) | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary Cloud name for photos & audio | `our-space-cloud` |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API Key | `1234567890` |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API Secret | `abcdef123456...` |
| `VAPID_PUBLIC_KEY` | Yes | Web Push Public Key (base64url) | Generated via `web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Yes | Web Push Private Key | Generated via `web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | Yes | Web Push mailto or URL contact | `mailto:contact@ourspace.local` |
| `JOBS_SECRET_KEY` | Yes | Secret header token for `/jobs/tick` | `our_space_cron_secret_tick_2026` |

### Client Environment (`.env`)
| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Optional API URL override for local/LAN development. Local development defaults to `http://localhost:5001`; hosted apps always use `https://our-space-backend-8p9m.onrender.com`. |
| `VITE_VAPID_PUBLIC_KEY` | Public VAPID key matching server for browser push subscriptions |

---

## 🚀 Creating the Couple Accounts

The platform is strictly private and couple-isolated (no public registration). Initialize the two partner accounts via the seed script:

```bash
npm run seed:couple
```

You can customize the seeded accounts using environment variables in `server/.env`:
* `SEED_HER_NAME`: Partner 1 Name (default: `Aditi`)
* `SEED_HER_EMAIL`: Login email (default: `aditi@ourspace.local`)
* `SEED_HER_PASSWORD`: Secure initial password
* `SEED_HIM_NAME`: Partner 2 Name (default: `Aman`)
* `SEED_HIM_EMAIL`: Login email (default: `aman@ourspace.local`)
* `SEED_HIM_PASSWORD`: Secure initial password
* `SEED_COUPLE_START_DATE`: ISO string of couple anniversary (`2025-04-16T00:00:00Z`)

---

## ☁️ Deploying Backend to Render

This repository contains a pre-configured [`render.yaml`](./render.yaml) blueprint:

1. Push your repository to your private GitHub repo.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New** → **Blueprint**.
3. Connect your repository. Render parses `render.yaml` and provisions `our-space-backend`.
4. In Render's dashboard for the service, configure the secret variables:
   * `CLIENT_ORIGIN` → Your deployed frontend URL.
   * `MONGODB_URI` → Your MongoDB Atlas cluster connection URI.
   * `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   * `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
5. Click **Apply**. Render will automatically build (`npm install && npm run build`) and start the server.
6. **External Cron Wake-Up**: If using Render's free tier, schedule a periodic GET request every 10–14 minutes via [cron-job.org](https://cron-job.org) or GitHub Actions to:
   ```
   GET https://<your-service>.onrender.com/jobs/tick
   Header: X-Jobs-Secret: <your_JOBS_SECRET_KEY>
   ```
   This prevents sleep and executes all due background reminders, cycle alerts, and summaries.

---

## 🛡️ Enabling MongoDB Atlas Cloud Backups

To safeguard all memories, chats, and milestone records against accidental loss:

1. Log into [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to your cluster and select **Backup**.
3. Under **Cloud Backup**, click **Turn On Cloud Backup**.
4. Configure snapshot schedule:
   * **Daily Snapshots**: Retain for 7 days.
   * **Weekly Snapshots**: Retain for 4 weeks.
   * **Monthly Snapshots**: Retain for 12 months.
5. (Optional M10+ tier): Enable **Point-in-Time Restore (PITR)** to roll back to any second within the last 7 days.
6. The app also features a self-serve **JSON Data Export** under **Settings & Privacy** → **Download Archive**, allowing either partner to export their entire database history anytime.

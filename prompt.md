I'm building my personal website using Astro. I already have an Astro 
project initialized with Tailwind, React, and MDX integrations. I want 
you to build out the entire site for me based on the spec below.

# About me (for content/voice reference)

My name is Lamp, I'm 13, I live in Montpellier, France. I code mostly 
in Python and C# but use whatever fits the job (JS, HTML, CSS, Lua, 
PowerShell, batch). I have a YouTube channel called ilovelampadaire 
(around 300 subs), I have a black tortoiseshell cat named Salma, and 
I run several websites and self-hosted services.

GitHub: lamps-dev
Discord: lampyt
YouTube: @ilovelampadaire
Mastodon: @lampyt@mastodon.social

My domains:
- lamps-dev.dev (this site / portfolio)
- onlycats.info (vibecoded joke project)
- sillycat.cloud (in-progress silly cat themed cloud project)
- uniqueweb.site (parked, nothing yet)

# Voice / tone

Casual, lowercase, no corporate fluff, no emdashes anywhere. I want it 
to sound human, like I'm texting a friend. Reference my current site 
for tone: "I code projects and i also code stupid projects sometimes."
Do NOT use emdashes (—) anywhere in any text content. Use commas, 
periods, or just two sentences instead.

# Pages I want

1. **/** (home) — landing page with:
   - A big hero with my name and a short tagline
   - Animated mesh gradient background using @paper-design/shaders-react 
     (already installed). Colors: #EB4679, #051681, #7961D3, #C25EA5
   - Subtle grain/noise overlay for texture
   - A music player component (see below)
   - Featured projects section (2-3 highlighted projects)
   - Social links

2. **/about** — paste in this exact content (don't rewrite, my voice):

[PASTE THE ABOUT TEXT WE BUILT HERE]

3. **/projects** — project showcase split into three sections:
   - "stuff that works" (active projects)
   - "stupid shit" (joke/dumb projects)  
   - "rip" (graveyard / abandoned projects)
   
   Use a `src/data/projects.ts` file as the single source of truth. 
   Define a TypeScript type for project entries with: name, tagline, 
   description, status ('active' | 'stupid' | 'rip'), tech (string[]), 
   github (optional), demo (optional), image (optional), date.
   
   Loop over the data array to render cards. Cards should show 
   screenshot (if available), name, tagline, tech tags, links. 
   Don't hardcode projects in JSX.
   
   For now, populate it with placeholder entries:
   - Cubic (active) — python + c# toolset, "swore i'd add 100 tools, 
     currently has 2", github lamps-dev/cubic
   - lmp bot (active) — discord bot, pycord, with honeypot spam channel
   - onlycats.info (stupid) — joke website, vibecoded
   - sillycat.cloud (active) — silly cat themed cloud project
   - SysInfo (rip) — early python project, "copied blindly i admit"
   - PyChatroom (rip) — "dead and broken"
   
   I'll fill in real data later.

4. **/uses** — "what i use" page with sections for:
   - hardware (PC, RPi, etc.)
   - software (editor, terminal, browser)
   - dev (languages, frameworks)
   - online (domains, hosting)
   
   Pull from `src/data/uses.ts`. Leave most entries as placeholders 
   I'll fill in. Format: simple categorized lists, minimal styling.

5. **/now** — minimal page showing what I'm up to right now. 
   Hardcode placeholder content for now (currently building, 
   currently learning, currently watching/listening). Date the 
   entry at the top.

6. **/blog** — set up using Astro Content Collections with MDX 
   support. I want to be able to drop .mdx files in src/content/blog/ 
   with frontmatter (title, date, description, tags) and have them 
   automatically appear on /blog as a list, with /blog/[slug] for 
   each post. Use Astro's typed content collections properly. 
   Create one example placeholder post so I can see how it works.

7. **/404** — custom 404 page with personality. Something like a 
   broken terminal vibe, fits my aesthetic. Link back to home.

# Components needed

- **BaseLayout.astro** — wraps every page with html/head/body, 
  navbar, footer, and includes the anti-flash theme script in head
- **Navbar.astro** — top nav with links: home, projects, about, uses, 
  now, blog. Theme toggle on the right side. Active page highlighted.
- **Footer.astro** — small footer with social links and a copyright line
- **ThemeToggle.astro** — sun/moon morph icon button, smooth animation 
  between sun and moon when clicked, persists choice in localStorage, 
  prevents flash of wrong theme on page load via inline script in head
- **MusicPlayer.tsx** — React component (uses client:load), reads 
  /files/assets/songs/playlist.json and plays a random song, hidden 
  audio element with autoplay (falls back to user click if blocked), 
  loops to next random song on end, volume 0.1. Port my existing 
  vanilla JS music player logic to clean React with TypeScript. 
  Place it in the corner of the screen as a small floating widget.
- **MeshGradientHero.tsx** — wraps @paper-design/shaders-react 
  MeshGradient with my preferred colors and settings (distortion 0.8, 
  swirl 0.1, speed 0.3). Used as the hero background on home.
- **ProjectCard.astro** — single project display, used on home 
  (featured) and projects page. Different styling for status types.
- **SocialLinks.astro** — row of icons linking to GitHub, YouTube, 
  Mastodon, Discord (use Lucide icons via lucide-astro or astro-icon, 
  install whichever you prefer)
- **SectionHeading.astro** — consistent heading style across pages

# Styling

- Dark mode default, light mode available via theme toggle
- Use CSS variables for theming (--color-bg, --color-text, --color-muted, 
  --color-border, --color-accent) defined in src/styles/global.css
- Set up Tailwind v4's @theme block to use these variables
- Typography: Geist Sans for body, Geist Mono for accents/code 
  (install @fontsource/geist-sans and @fontsource/geist-mono)
- Spacing: breathy but not too sparse, content max-width around 720-768px
- Subtle animations only, no aggressive motion
- View Transitions enabled in BaseLayout for smooth page-to-page 
  navigation

# Content/files I have

- /public/files/assets/songs/ — folder with mp3s and a playlist.json 
  with structure { "songs": ["song1.mp3", "song2.mp3"] }
- I'll add project screenshots to /public/projects/ later

# Constraints

- DO NOT use emdashes (—) anywhere. Use commas or two sentences instead.
- Keep components small and reusable
- Use TypeScript everywhere, no plain JS
- Comment any non-obvious logic
- Don't install packages that aren't needed
- Make the site work without JavaScript where possible (only MusicPlayer, 
  ThemeToggle, and the mesh gradient need JS), only mostly TS.

# Final deliverables

After building, give me:
1. A summary of every file you created/modified
2. A list of any decisions you made that I should review
3. Instructions on how to run it (pnpm dev) and add real content later
4. A list of TODOs for me (real project data, real screenshots, 
   actual blog posts, etc.)

Build the whole thing in one go. Don't ask me clarifying questions, 
just make reasonable decisions and tell me what you decided in your 
final summary.

___
# ADDITIONAL FEATURES for /now page

## 1. Live Discord presence

I want my Discord status displayed on /now (and optionally elsewhere). 
Use Lanyard (https://github.com/Phineas/lanyard) — it's free, no auth 
needed, just exposes any Discord user's presence via API/websocket as 
long as they're in the Lanyard Discord server.

My Discord user ID: 1056952213056004118

Build a `DiscordPresence.tsx` React component that:
- Connects to Lanyard's websocket (wss://api.lanyard.rest/socket) for 
  real-time updates, NOT polling
- Shows my online status (online/idle/dnd/offline) with a colored dot
- Shows my current activity if any:
  - If I'm playing a game, show game name + elapsed time
  - If I'm using Spotify, show track + artist + album art
  - If I'm coding (via VS Code rich presence or similar), show what 
    file/project
  - If custom status set, show that
- Falls back gracefully if I'm offline or Lanyard is down (just show 
  "offline" with a gray dot, don't crash)
- Updates live without page refresh
- Use client:load directive

Style it to match the site (use the CSS variables, mono font for 
elapsed time, accent color for online dot). Make it look like a small 
card or inline pill, not too big.

Note: I need to be in the Lanyard Discord server (discord.gg/lanyard) 
for this to work. Add a comment in the component explaining this.

## 2. Computer activity autodetection

I want a "currently coding" widget that shows what I'm working on in 
my editor in real-time. Use Wakatime (https://wakatime.com) — free 
tier is plenty for this.

Build a `CodingActivity.tsx` React component that:
- Fetches my Wakatime stats from their public API endpoint:
  https://wakatime.com/api/v1/users/current/status_bar/today
  (this requires my API key)
- Shows:
  - Current language/file I'm editing (if I'm actively coding)
  - Today's total coding time
  - Top language used today
  - Top project today
- Updates every 60 seconds (Wakatime's free tier rate limit is fine 
  with this)
- Falls back to "not coding right now" if I haven't been active in 
  the last 5 minutes
- Use client:load directive

For the API key, use an env variable. Create a `.env.example` file 
with `PUBLIC_WAKATIME_API_KEY=` and update `.env` with my real key 
when I provide it. Make sure `.env` is in .gitignore.

⚠️ IMPORTANT: Wakatime's API key is sensitive. Do NOT expose it 
client-side directly. Instead, create an Astro API route at 
`src/pages/api/wakatime.ts` that:
- Reads the key from server-side env (import.meta.env.WAKATIME_API_KEY, 
  no PUBLIC_ prefix)
- Fetches Wakatime's API server-side
- Returns sanitized data to the client
- Caches for 60 seconds to avoid hammering Wakatime

Then have the React component fetch from /api/wakatime instead of 
Wakatime directly.

To make this work, also update `astro.config.mjs` to use the right 
output mode. Use `output: 'server'` with `adapter: vercel()` (assuming 
Vercel deploy) so API routes work, OR `output: 'hybrid'` so most pages 
stay static and only the API route runs server-side. Hybrid is better 
for performance. Install @astrojs/vercel if needed.

## 3. Layout for /now page

Restructure the /now page to use these widgets. Layout idea:
[date stamp - "last updated: april 2026"]
## now
### right now
[DiscordPresence widget]
[CodingActivity widget]
### currently building

- bullet list of active projects (from data/now.ts)

### currently learning

- list

### currently watching/listening

- list

elsewhere
[link to /projects, /uses, etc.]

Pull the bullet lists from `src/data/now.ts` so I can update them 
without touching the page file. Type it properly with TypeScript.

# Setup checklist for me to do after

Add to your final TODO list output:
1. Join the Lanyard Discord server (discord.gg/lanyard) so my 
   presence is trackable
2. Sign up at wakatime.com, install Wakatime plugin in my editor 
   (VS Code, JetBrains, whatever I use), grab API key from 
   wakatime.com/settings/api-key
3. Add WAKATIME_API_KEY to .env file
4. Test both widgets work locally before deploying
5. If deploying to Vercel: add WAKATIME_API_KEY in Vercel project 
   settings → Environment Variables

# Optional polish (only if time permits)

- Make Discord activity card show progress bar for Spotify (current 
  position / song length) using the timestamps Lanyard provides
- Cache Wakatime response in memory between requests (5 min TTL) so 
  even with multiple concurrent visitors I don't hit rate limits
- Add a tiny "live" indicator (pulsing dot) when websocket is 
  connected and updating
___
If you ever need btw:
Discord: "Lamp Studios" (my discord server): https://discord.gg/sZxmbu4ZrG
Bluesky: https://bsky.app/profile/lamps-dev.bsky.social
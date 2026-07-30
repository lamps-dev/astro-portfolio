# Lamp's new portfolio

(the old one is available [here](https://github.com/lamps-dev/lamps-dev.dev)).

Welcome, to, well, my new portfolio, built with Astro (blog template)! (and somewhat vibecoded, [heres the reason why btw](https://www.lamps-dev.dev/blog/the-switch/#:~:text=Why%2C%20vibecode%20almost%20everything%3F)).

Live at [lamps-dev.dev](https://lamps-dev.dev) :3

___

## What this thing actually is

It's a portfolio, but I kept adding stuff to it, so now it's a portfolio **and** a blog **and** a gallery **and** a YouTube page **and** a music player **and** a bunch of little live widgets that show what I'm doing right now. Sorry.

The stack, if you care:

- **[Astro](https://astro.build) 6** with `output: 'static'`, so most pages are just plain HTML that got built once. The few things that need a server (the API routes) opt out with `prerender = false`.
- **React** but only as islands, aka. only the components that genuinely need to be interactive get shipped as JS.
- **TailwindCSS v4** (via the Vite plugin, no config file needed anymore, which is nice).
- **MDX** for blog posts, so I can drop components straight into a post.
- **TypeScript**, which I am still learning, be nice.
- **Vercel** for hosting, using `@astrojs/vercel`.
- Geist Sans + Geist Mono for fonts, `astro-icon` and `simple-icons-astro` and `lucide-react` for icons, `sharp` for image stuff.

___

## The pages

| page | what's on it |
| --- | --- |
| `/` | Big animated mesh gradient hero (it's a shader, it's pretty) + my featured projects. |
| `/projects` | Every project I've made, including the dead ones, rip. Comes from `src/data/projects.ts`. |
| `/gallery` | Folders of photos. Hover to peek, click to open, click an image for a lightbox. Has proper view transitions between the index and a folder. |
| `/youtube` | My channel's uploads, filterable by streams/videos/shorts, with a live banner when I'm actually streaming, and comments in the lightbox. |
| `/about` | Me. I'm 13 and I live in France. |
| `/uses` | My hardware, software, dev stuff and my domains. |
| `/now` | What I'm building/learning/consuming right now, plus the live widgets (see below). |
| `/blog` | Posts. Written in MDX. |
| `/changelog` | Live feed of the actual commits to this repo, so you can watch me break things in real time. |
| `/privacy` and `/tos` | The boring but legally nice pages. |
| `/404` | A fake terminal that says the page doesn't exist and then `ls`'s all the pages that **do** exist. The page list is generated from the filesystem, so I never have to update it, which was the whole point. |
| `/rss.xml` | RSS feed for the blog, because RSS is still good actually. |

___

## The live widgets (the fun part)

These are the bits that make the site feel alive instead of being a static brochure.

### Coding activity (Wakatime)

`CodingActivity.tsx` -> `/api/wakatime`. Shows what language and project I'm currently coding in, plus my total for today. The API key **never** touches the browser, the route proxies it server-side and caches the answer for 60 seconds so I don't get rate limited by my own website.

If I haven't saved a file in 5 minutes it stops saying I'm active, because reading docs for 20 minutes is technically coding but Wakatime doesn't send a heartbeat for vibes.

### Discord presence (Lanyard)

`DiscordPresence.tsx` connects straight to [Lanyard](https://github.com/Phineas/lanyard)'s websocket, no API key, no server involved. Shows my status, what game I'm playing, what I'm listening to on Spotify, all of it.

> [!NOTE]
> Lanyard only works if the Discord user is in the [Lanyard server](https://discord.gg/lanyard). If they're not, you get a quiet little "offline" pill and nothing else. Ask me how I found that out.

### Now watching (my own browser extension)

`NowWatching.tsx` -> `/api/yt-now`. This one's silly and I love it. I made a browser extension called **yt-scrobbler** that sends what I'm watching on YouTube (or YouTube Music) to my own website, and the widget shows it with a little progress bar that keeps moving between polls because the client interpolates the time locally instead of spamming the API.

The state lives in plain server memory. No database. If the serverless function goes cold it just says nothing's playing until the next heartbeat, and honestly that's fine for a personal site.

Protected with `YT_NOW_SECRET` so randoms can't POST "lamp is watching something embarrassing" to my own portfolio.

### Changelog

`Changelog.tsx` -> `/api/commits`. Pulls the latest 40 commits from this repo through GitHub's API, cached for 5 minutes, with an optional `GITHUB_TOKEN` for a better rate limit. Click a commit to expand its full description.

### Music player

`MusicPlayer.tsx`, floating in the corner of every page except the 404. Picks a random song from `public/files/assets/songs/playlist.json`, tries not to play the same one twice in a row, starts at 10% volume because I'm not a monster.

It survives page navigations thanks to `transition:persist`, so the song keeps playing while you click around. The cover art comes from `/api/cover/[song]`, which reads the ID3 tag embedded in the mp3.

That route is genuinely my favourite bit of jank in here: on Vercel the mp3s are static CDN files and are **not** in the function's filesystem, so it can't just read them off disk. Instead it fetches the song from its own public URL and stream-parses only the first few bytes to get to the cover, then cancels the download. It does not download a whole 8MB song to show you a 300px square. :3

___

## The YouTube page, aka. quota hell

`/api/youtube` was the most annoying thing here so it gets its own section.

The YouTube Data API gives you 10,000 quota units a day and the page polls once a minute (1,440 times a day), so every single unit matters. `search.list` costs **100 units per call**, which would nuke the entire day's quota in about 100 refreshes. So the route doesn't use it at all. Instead it walks the channel's uploads playlist:

- `channels.list` = 1 unit, cached for 12 hours (my channel ID isn't going anywhere)
- `playlistItems.list` = 1 unit per 50 videos
- `videos.list` = 1 unit per 50 videos

That's 4 units per refresh at 100 videos, so about 5,760 a day, which leaves room for comments. Comments are fetched lazily and only when you actually open a video, so browsing the grid costs nothing extra.

Other fun problems I had to solve in there:

- **Shorts have no API flag.** None. So the route asks youtube.com directly: `/shorts/<id>` returns 200 for a real Short and redirects to `/watch` for anything else. It also has to send consent cookies, otherwise every request from an EU region bounces to `consent.youtube.com` and every Short gets mislabeled.
- **Live vs premiere** is figured out from the duration, because a live stream reports `P0D` (0 seconds) while a premiere reports its real runtime, being a pre-recorded upload.
- **Archived streams and finished premieres are literally identical** once they end. There's no field that separates them. So archives default to "streams" and I pin the odd one out in `YOUTUBE_TYPE_OVERRIDES` in `src/consts.ts`.
- **Scheduled streams that never happened** stay "upcoming" forever in YouTube's eyes, so anything more than 12 hours past its start time gets filtered out instead of sitting in the live banner saying "starting now" until the heat death of the universe.

___

## Writing blog posts

Drop a `.md` or `.mdx` file in `src/content/blog/`. Frontmatter:

```yaml
---
title: The post title
description: Shows up in the feed and in link previews.
date: 2026-07-30
updated: 2026-07-31   # optional
tags:                  # optional
  - stuff
draft: true            # optional, hides it from /blog
---
```

Things you can do in a post that aren't normal Markdown:

- **Subtext**, Discord style. A line starting with `-# ` renders as small grey text. (`src/lib/remark-subtext.mjs`)
- **Videos with image syntax.** `![a clip](/files/assets/videos/clip.mp4)` renders an actual `<video>` instead of a broken image. (`src/lib/remark-video.mjs`)
- **`<Video />`** if you want a poster, a visible caption, a gif-style silent loop, or multiple formats.
- **`<Embed url="..." />`** for YouTube, Vimeo, Spotify, SoundCloud, CodePen, X, GitHub Gists and Bluesky. Every single one is consent-gated, so the reader sees a placeholder asking if they want to load it, and nothing third-party loads until they say yes.
- **Images are clickable** and open in a lightbox, that's built into the post layout.
- **Comments** are [giscus](https://giscus.app), so they're just GitHub Discussions on this repo.

___

## Privacy stuff

I wrote my own cookie consent script (`public/lampconsent.js`, it's called LampConsent, it has a duck emoji in the header comment, I'm very normal). It auto-detects vendors, does Google Consent Mode v2 properly, and everything analytics-related is loaded as `type="text/plain"` until consent is actually granted. The GTM noscript fallback is deliberately left out, since it would load tracking for no-JS visitors who can't even reach the prompt, which would kind of defeat the point.

Embeds in blog posts are gated behind the "Functional" category, and the choice isn't persisted, so a refresh re-asks.

___

## Configuring it (if you're me, or stealing it)

Almost everything you'd want to change lives in two spots:

**`src/consts.ts`** for site title, description, my age (which the about page reads so I only update it in one place), site URL, socials, the nav links, the GitHub repo the changelog reads from, and the YouTube handle + type overrides.

**`src/data/`** for the content lists:

- `projects.ts` -> every project card, with a `status` and an optional `featured: true` to put it on the homepage
- `uses.ts` -> the /uses page sections
- `now.ts` -> the /now page lists
- `gallery.ts` -> gallery groups and image captions. Put the actual image files in `src/assets/gallery/` and reference them by filename, Astro optimises them at build time. If you typo a filename the build fails and tells you which files **do** exist, which past me appreciated a lot.

### Environment variables

All of these are optional. Missing one just means that widget quietly says it's unavailable instead of exploding.

| variable | what it's for |
| --- | --- |
| `WAKATIME_API_KEY` | the coding activity widget |
| `YOUTUBE_API_KEY` | the /youtube page and its comments |
| `GITHUB_TOKEN` | changelog rate limit, works without it, just slower |
| `YT_NOW_SECRET` | the bearer token yt-scrobbler uses to POST to `/api/yt-now` |

None of them are prefixed with `PUBLIC_`, so none of them ever reach the browser. They're read at request time (`process.env` on Vercel, `import.meta.env` for local `astro dev`), so changing one in the Vercel dashboard doesn't need a rebuild.

___

## How I set it up locally (even tho I don't test locally anymore)

### Requirements
- [pnpm](https://pnpm.io/installation).
- [NodeJS](https://nodejs.org/en) 22.12 or newer.
- Astro (Will auto-install during build process).
- A computer (Because how else are you going to build it-
Oh wait[^1]...).

### Note
> [!IMPORTANT]
> **If you're on Windows**, building this will explode with something like ``EPERM: operation not permitted, symlink``. That's not the project being broken, that's just Windows refusing to let a normal account create symlinks, which is a thing the Vercel adapter's build step needs to do (and pnpm does it constantly too).
>
> The fix is turning on **Developer Mode**: Settings > System > For developers > Developer Mode -> ON.
>
> That toggle just flips one registry value, so if you'd rather do it by hand (or the toggle refuses to stick, which happens), open regedit as admin and set:
>
> ```
> HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock
>   AllowDevelopmentWithoutDevLicense = 1   (DWORD, 32-bit)
> ```
>
> Or from an **admin** PowerShell, one line:
>
> ```powershell
> New-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -Value 1 -PropertyType DWORD -Force
> ```
>
> Then restart your terminal (or just reboot, Windows loves a reboot), nuke ``node_modules`` and ``.vercel``, ``pnpm install`` again, and it builds. **You do NOT need to swap out ``@astrojs/vercel`` for anything**, which is what I used to do before I found this out. :3

### Guide

1. (If you don't have Git installed already, install it from [git-scm.com](https://git-scm.com/install/) and select your OS). Run ``git clone https://github.com/lamps-dev/astro-portfolio`` in the directory where you want to build the project at.
2. ``cd astro-portfolio`` and then, ``pnpm install`` to install all dependencies.
3. To run it, ``pnpm run dev``, to build it, ``pnpm build``. (``pnpm preview`` if you want to look at the built version.)

___

## Where everything is

```
src/
  components/     the UI bits (.astro for static, .tsx for the interactive ones)
  content/blog/   the blog posts
  data/           projects, uses, now, gallery config
  layouts/        BaseLayout, BlogPost, Legal
  lib/            youtube helpers, gallery resolver, the two remark plugins
  pages/          every route, including api/
  styles/         global.css
  consts.ts       site-wide config
public/
  files/assets/   the songs and videos
  lampconsent.js  my cookie consent script
```

___

[^1]: If you are crazy enough, Termux for Android and iPhone (I think) exists and you can try building it on there, their package manager (``pkg``) certainly has ``Git``.

-# This README was rewritten with Claude to actually document everything my portfolio does, because I kept adding features and never updating this file. The site is still mine, the silliness is still mine, I just needed help writing it all down. :3

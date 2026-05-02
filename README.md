# Lamp's new portfolio

(the old one is available [here](https://github.com/lamps-dev/lamps-dev.dev)).

Welcome, to, well, my new portfolio, built with Astro (blog template)! (and somewhat vibecoded, [heres the reason btw.](https://www.lamps-dev.dev/blog/the-switch/#:~:text=Why%2C%20vibecode%20almost%20everything%3F)).

## How I set it up locally (even tho I don't test locally anymore)

### Requirements
- [pnpm](https://pnpm.io/installation).
- [NodeJS](https://nodejs.org/en).
- Astro (Will auto-install during build process).
- A computer (Because how else are you going to build it-
Oh wait[^1]...).

### Note
> [!IMPORTANT]
> The Vercel server astro package binaries are broken on Windows (since vercel deployements are supposed to be done on Linux systems), due to that, you **MUST** uninstall the vercel build astro package (``pnpm remove @astrojs/vercel``) and install the Node server package instead (``pnpm add @astrojs/node``). **ONLY DO THIS LOCALLY AND ONLY ON YOUR WINDOWS SYSTEM IF USING WINDOWS!!!!**

### Guide

1. (If you don't have Git installed already, install it from [git-scm.com](https://git-scm.com/install/) and select your OS). Run ``git clone https://github.com/lamps-dev/astro-portfolio`` in the directory where you want to build the project at.
2. ``cd astro-portfolio`` and then, ``pnpm install`` to install all dependencies.
3. To run it, ``pnpm run dev``, to build it, ``pnpm build``.


___

[^1]: If you are crazy enough, Termux for Android and iPhone (I think) exists and you can try building it on there, their package manager (``pkg``) certainly has ``Git``.
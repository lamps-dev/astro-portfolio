---
layout: ../layouts/Legal.astro
title: Privacy Policy
description: How Lamp Studios collects, uses, shares, and lets you remove your data.
---

**Last updated: October 26, 2026**

This policy covers all services operated by **Lamp Studios** (an unregistered personal/hobby project, referred to here as "we", "us", or "the operator"), including services hosted on the `lamps-dev.dev`, `uniqueweb.site`, and `sillycat.cloud` domains, any subdomains thereof, the **LmpBot** Discord bot ([source code](https://github.com/lamp-studios/lmpbot-beta)), and any additional services Lamp Studios may host on external domains or platforms outside of those listed above.

See also the [Terms of Service](/tos).

---

## 1. What we collect

We try to keep data collection minimal. Depending on which service you use, we may collect:

- **Email addresses**: only sometimes, when you sign up for an account, contact us, or join a waitlist
- **Country information**: collected via the sillycat.cloud waitlist form
- **Account information**: only sometimes, when a specific service requires you to create an account (e.g. username, password hash, basic profile info)

Some services may also collect basic technical data automatically (such as IP addresses or request logs) to keep things running and secure.

LmpBot collects a different set of data, described in [section 10](#10-lmpbot-discord-bot).

## 2. Why we collect it

All data is collected for one reason: **so the services you're using actually work properly.** This includes things like:

- Letting you log in and access your account
- Sending you updates if you joined a waitlist
- Responding to support requests
- Keeping services running, debugging issues, and preventing abuse

We don't sell your data. We don't use it for ads. We don't share it with random third parties.

## 3. Who we share it with

Two third parties may process your data in limited ways:

- **Cloudflare**: used as a reverse proxy and CDN for most services. Cloudflare may see traffic, IP addresses, and request metadata as part of routing and DDoS protection. See [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/) for details.
- **Google Tag Manager**: used *sometimes* on certain pages for basic analytics. When active, it may set cookies and collect usage data. See [Google's privacy policy](https://policies.google.com/privacy) for details.

That's it for the websites. LmpBot uses a few more, listed in [section 10](#10-lmpbot-discord-bot).

## 4. How long we keep it

We retain data for approximately **1 to 5 months**, depending on the service and the type of data. After that, it's deleted or anonymized.

**Exception:** the sillycat.cloud waitlist form data is kept until the waitlist purpose is fulfilled (i.e. until sillycat.cloud officially launches and waitlist subscribers are notified), at which point it will be deleted.

## 5. Your rights & how to request data removal

Under the GDPR (RGPD in France) and similar privacy laws, you have the right to:

- Access the data we hold about you
- Request correction of inaccurate data
- Request deletion of your data ("right to be forgotten")
- Withdraw consent at any time
- Lodge a complaint with a supervisory authority (in France: [CNIL](https://www.cnil.fr/))

**To remove your data:**

- On **lamps-dev.dev**, click the "cancel all" button in the GDPR rights popup
- For **any other service** without a built-in option, email **rimit58872@pm.me** and we'll handle it manually

## 6. Cookies

We use cookies sparingly. Possible sources:

- **Google Tag Manager** (sometimes, on certain pages): for analytics
- **Cloudflare**: for security, bot detection, and performance
- **GDPR rights popup on lamps-dev.dev**: stores your consent preferences locally

You can clear or block cookies in your browser at any time. Some services may not work fully without them.

## 7. Children's privacy

These services are not specifically directed at children under 13 (or 15 in France, per RGPD). If you're a parent and believe your child has provided data without consent, contact us and we'll delete it.

## 8. Changes to this policy

If anything significant changes, the "Last updated" date at the top of this page will be updated. For minor changes, we may not announce them individually. Check back occasionally if you care about the details.

## 9. Additional & future services

Any additional services operated by Lamp Studios, whether hosted on `lamps-dev.dev`, `uniqueweb.site`, `sillycat.cloud`, or on external domains and third-party platforms, follow the same data handling principles outlined above unless explicitly noted otherwise on that service's page.

## 10. LmpBot (Discord bot)

This section covers the **LmpBot** Discord bot operated by Lamp Studios. Where it differs from the sections above, this section wins for LmpBot.

### What LmpBot stores

- **Server settings**: IDs of the channels and roles a server's admins configure (verification role, chatbot channel, news channel, forum channel, bot trap channel, birthday settings, chatbot AI choice). These are Discord IDs, not message content.
- **Verification status**: a flag noting that you've verified in a server.
- **Birthdays**: if you set one with `/birthday`, the day and month (no year), plus whether you prefer private replies.
- **Chatbot history**: if you talk to the bot in a server's chatbot channel, your messages and the bot's replies are stored so it can remember the conversation. This is stored per server, per channel and per user. Mentions in your message are stored as the usernames they point to. Images you attach are **not** stored, only a note of their file name.
- **Chatbot facts**: simple facts the bot picks out of your chatbot messages, such as your name, what you're building, and things you say you like or hate.

LmpBot does not store messages sent outside the chatbot channel. It reads messages in other channels only to run features that server admins switched on (for example, the bot trap channel and verification).

### What gets sent to third parties

- **Discord**: everything the bot does goes through Discord. See [Discord's privacy policy](https://discord.com/privacy).
- **AI providers**: when you talk to the chatbot, your message, attached images, recent chat history, stored facts, your username, display name and user ID, and the server name are sent to whichever AI provider that server uses: **Google Gemini** ([privacy policy](https://policies.google.com/privacy)), **OpenAI** or an OpenAI-compatible provider ([privacy policy](https://openai.com/policies/privacy-policy)), or a **self-hosted Ollama** model that runs on our own hardware and sends nothing to an outside company.
- **Database hosting**: bot data is stored in **MongoDB Atlas** ([privacy policy](https://www.mongodb.com/legal/privacy-policy)), **Supabase** ([privacy policy](https://supabase.com/privacy)), or a local SQLite file on our own server, depending on which is available.

The bot's uptime monitoring only sends status and ping time, never user data.

### How long LmpBot keeps data

Unlike the websites, LmpBot data is **not deleted automatically** after a set time, because features like birthdays and chatbot memory need it to stick around. It's kept until:

- you ask us to delete it (see below), or
- a server admin clears the setting, for server settings, or
- the bot is shut down for good, at which point all of its data is deleted.

### Removing your LmpBot data

Email **rimit58872@pm.me** with your Discord username or user ID. We'll run the bot's data deletion command, which removes everything LmpBot stores about you, in **every server** and from every database it uses:

- your chatbot history (your messages and the bot's replies to you)
- the facts the chatbot remembered about you
- your birthday and reply preference
- your verification status

If one of the databases is unreachable at the time, we'll run the deletion again once it's back, so nothing is left behind. If you were talking to the chatbot right as your data was deleted, its reply may still be sent, but it won't be saved.

Deletion does **not** cover:

- **Server settings**, which belong to the server, not to you.
- **Your messages on Discord itself.** LmpBot doesn't delete anything from Discord, so delete those yourself or ask the server's moderators.
- **Data already sent to an AI provider.** Google and OpenAI handle that under their own policies (linked above).
You can also simply stop using the chatbot channel and `/birthday` to stop new data being stored.

---

## Contact

Got questions, complaints, or privacy requests? Reach out:

- **Primary:** [rimit58872@pm.me](mailto:rimit58872@pm.me)
- **Backup:** [lampyt@lamps-dev.dev](mailto:lampyt@lamps-dev.dev)
- **YouTube:** [@ilovelampadaire](https://youtube.com/@ilovelampadaire)

---

*This document was written for a personal/hobby developer setup. It is not legal advice. If you're running something serious, talk to an actual lawyer.*

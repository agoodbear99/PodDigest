# PodDigest Privacy Policy

_Last updated: [FILL IN DATE BEFORE PUBLISHING]_

This is a starting draft based on what PodDigest actually does today. It is not legal advice — please have it reviewed before publishing, and host the final version at a public URL (e.g. a GitHub Pages page) so it can be linked from the App Store listing.

## What PodDigest does

PodDigest lets you paste a podcast link (Apple Podcasts or an RSS feed URL) and generates an AI-written summary of an episode's show notes, so you can decide whether it's worth your time.

## Information we process

**You don't need an account to use PodDigest.** We don't collect your name, email, or any account credentials.

- **Podcast links and episode text.** When you paste a podcast URL, we fetch the show's public RSS feed to show you its episodes. When you request a summary, the episode's show notes (or, for uploaded audio, its transcript) are sent to Anthropic's Claude API to generate the summary. See [Anthropic's privacy policy](https://www.anthropic.com/privacy) for how they handle data sent to their API.
- **Push notification token.** If you subscribe to a show for new-episode alerts, your device's Expo push token and the show's feed URL are stored on our server so we can notify you when a new episode is published. You can unsubscribe at any time, which deletes this record.
- **On-device storage only.** Your summary history, favorites, subscriptions list, and language preference are stored locally on your device (not on our servers) and are removed if you delete the app.

## What we don't do

- We don't run analytics or ad-tracking SDKs.
- We don't sell or share your data with advertisers.
- We don't require sign-in, so we have no persistent user profile tied to you.

## Third parties

- **Anthropic (Claude API)** — processes episode text/transcripts to generate summaries.
- **Expo (push notification service)** — delivers the new-episode notifications you subscribe to.

## Data retention

Subscription records (feed URL + push token) are kept until you unsubscribe. Everything else lives only on your device and is under your control (see History/Favorites screens to delete it, or uninstall the app to remove all local data).

## Contact

Questions about this policy: [FILL IN YOUR CONTACT EMAIL]

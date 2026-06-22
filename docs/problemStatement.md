# Daily Essentials — Problem Statement & Product Vision

## One-liner
**Daily Essentials** helps friend groups plan a meetup, split who-brings-what,
and (with consent) share their live location on the way there — so everyone
arrives, on time, with everything they need.

## The problem
Casual hangouts fall apart over small coordination gaps:
- People don't know **where/when** exactly, or it changes last-minute.
- Supplies get **doubled up or forgotten** (three people bring chips, no one brings cups).
- No one knows **who's actually coming** or **how far away** they are.
- Group chats are noisy; key details get buried.

## The solution
A friendly, mobile-first app where a group can, in one place:
1. Set a **meetup** (title, place, time, map).
2. **RSVP** so everyone sees who's in.
3. Manage a **shared supplies list** — claim items, flag what's still needed.
4. **Chat** with the group (and 1:1) — text, images, reactions, receipts, and
   "drop the meetup pin" location cards, WhatsApp-style.
5. Personalize everything — **profile customization** (avatar, banner, status,
   accent color) and **chat customization** (wallpaper, bubble color per chat).
6. Optionally **share live location** on the way (consent-based, time-boxed)
   with ETAs, like WhatsApp's "share live location".

## Headline / selling point
**Consent-based realtime location sharing** among friends for a meetup, with
live ETAs and "I've arrived" — the WhatsApp-style feature, scoped to a single
event and a single group.

> Safety note: this is the highest-risk feature. It is designed as
> **opt-in, time-boxed, foreground sharing** the user can stop anytime — never
> silent or always-on tracking. See `architecture.md` for the full guardrails.

## Current status (prototype)
The current deliverable is a **standalone `index.html`** used as a design/UX
prototype:
- Three.js 3D leaf centerpiece, tactile 3D buttons, generated sound effects.
- Demo "login", meetup, RSVP, and supplies — all in `localStorage`.
- No server, no real accounts, no real location sharing yet.

This prototype validates the look, feel, and core flows before we build the
real product.

## Target platforms
- **Web** (mobile-first responsive PWA) — primary, ships first.
- **Native mobile** (Android + iOS) — fast follow, reusing the same backend API.
  Native is required for reliable background-capable location, push
  notifications, and app-store distribution.

## Product goals
- **Mobile-first**: every screen designed for one-hand phone use first.
- **Real accounts**: OAuth sign-in (Google/Apple) + secure sessions.
- **Multi-user, realtime**: changes (RSVP, supplies, chat, location) sync instantly.
- **Social & expressive**: group + 1:1 chat with reactions/receipts, plus deep
  profile and chat customization so the app feels personal.
- **Trustworthy location**: explicit consent, visible "sharing" state, easy stop,
  auto-expiry.
- **Notifications**: opt-in push for "meetup set", "supply still needed",
  "friend nearby / arrived".

## Non-goals (for now)
- Public/stranger discovery — this is for **existing friend groups** only.
- Always-on/background tracking without consent — explicitly out of scope.
- Monetizing or selling location data — never.
- Being a full chat app — light reactions/notes only, not a messenger.

## Core concepts (product)
- **User**: account (OAuth), profile, avatar.
- **Group**: a set of friends.
- **Meetup**: belongs to a group; title, place (geo), time, RSVP list.
- **Supply item**: name, claimed-by or "needed", optional note.
- **Location share**: per-user, per-meetup, time-boxed, consent-flagged.

## Primary user flows
1. **Onboard**: OAuth sign-in, set name + avatar.
2. **Create/join group** via invite link or QR.
3. **Create meetup**: place, time, map pin.
4. **RSVP**: I'm in / can't make it.
5. **Supplies**: add, claim, mark needed; see a "ready" progress meter.
6. **Head out**: tap "Share my live location for 1 hour" → friends see ETAs.
7. **Arrive**: auto or manual "I've arrived"; sharing auto-stops on expiry.

## Fun/delight features (prototype-friendly)
- Confetti + leaf burst on RSVP and when all supplies are covered.
- Leaf reacts (bounce/spin) to button presses.
- Avatars from colored initials; emoji reactions on the meetup.
- Haptics (`navigator.vibrate`) paired with sound effects.
- Shareable invite link + QR code.
- Light / dark / "party" themes.

## Success metrics (early)
- % of meetups where all supplies reach "covered".
- % of attendees who RSVP before the event.
- Repeat usage: groups creating a 2nd+ meetup.
- Opt-in rate and median duration of location shares (with no complaints).

## Compliance / trust requirements (because of location)
- Explicit, revocable consent before any location is shared.
- Clear, always-visible indicator while sharing is active.
- Automatic expiry; no background tracking on web.
- Data minimization + retention limits for location points.
- Privacy policy + age gating; align with GDPR/CCPA and app-store location rules.

See `architecture.md` for how this is built.

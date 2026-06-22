# Daily Essentials — Architecture

This document describes how Daily Essentials evolves from the current
single-file prototype into a production product: a mobile-first web app (PWA)
plus native Android/iOS apps, sharing one backend, with the headline feature
being **consent-based realtime location sharing**.

---

## 1. Goals & constraints

- **Mobile-first** UX; web ships first as a PWA, native follows.
- **Realtime**: RSVP, supplies, and location update live for all members.
- **Trustworthy location**: opt-in, time-boxed, visibly active, easy to stop.
- **One backend, many clients**: web + Android + iOS use the same API.
- **Scales from 5 friends to global**: stateless API, horizontal scaling.

---

## 2. High-level system

```
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │  Web (PWA)   │   │  Android app │   │   iOS app    │
        │  React/Vue   │   │ Kotlin/Flutter│  │ Swift/Flutter│
        └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
               │  HTTPS (REST) + WebSocket (realtime) │
               └──────────────┬───────────────────────┘
                              ▼
                   ┌────────────────────┐
                   │   API Gateway /     │
                   │   Load Balancer     │
                   └─────────┬──────────┘
                             ▼
        ┌────────────────────────────────────────────┐
        │            Backend services                 │
        │  Auth │ Groups/Meetups │ Supplies │ Location │
        │              Notifications                   │
        └───┬───────────┬────────────┬────────────┬───┘
            ▼           ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
     │ Postgres │ │  Redis   │ │ Object   │ │  Push    │
     │ (durable)│ │(realtime/│ │ store    │ │ (FCM/    │
     │          │ │ presence)│ │(avatars) │ │  APNs)   │
     └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 3. Clients

### 3.1 Web (PWA) — ships first
- **Framework**: React or Vue + TypeScript. (Prototype is vanilla; migrate the
  proven UI into components.)
- **Mobile-first**: design at 360px width first, scale up. Safe-area insets,
  44px+ tap targets, 16px inputs (no iOS zoom), bottom nav on mobile.
- **PWA**: installable, offline shell via service worker, web push where
  supported.
- **3D/visual layer**: keep Three.js leaf + tactile buttons + Web Audio SFX from
  the prototype as a reusable "delight" module.
- **Realtime**: WebSocket client with auto-reconnect; optimistic UI updates.

### 3.2 Native (Android + iOS) — fast follow
- **Option A (fastest)**: Flutter — one codebase, both stores.
- **Option B**: native Kotlin (Android) + Swift/SwiftUI (iOS) for best platform
  feel + most reliable location/background behavior.
- Native is needed for: reliable foreground-service location, real push
  notifications, and store distribution.
- Reuses the same REST + WebSocket API as web.

---

## 4. Backend

### 4.1 Style
- Start as a **modular monolith** (one deployable, clear internal modules), not
  microservices. Simpler to ship; split out later if a module (e.g. Location)
  needs independent scaling.
- **Stateless** API instances behind a load balancer → easy horizontal scaling.

### 4.2 Suggested stack
- **Language/framework**: Node.js (NestJS) or Go. Either works; pick team
  familiarity.
- **DB**: PostgreSQL (with PostGIS for geo queries like "who's within X km").
- **Cache / realtime fan-out / presence**: Redis (Pub/Sub + ephemeral TTL keys).
- **Object storage**: S3-compatible for avatars/images.
- **Push**: FCM (Android/web) + APNs (iOS).

### 4.3 Modules
- **Auth**: OAuth (Google/Apple) → issues app JWT (short-lived access +
  refresh). Sessions/refresh tokens stored server-side (Redis/DB).
- **Groups**: create/join via invite token or QR; membership + roles.
- **Meetups**: CRUD, RSVP, tied to a group; place stored as lat/lng + label.
- **Supplies**: items, claim/unclaim, "needed" flag; emits realtime events.
- **Location** (see §6): start/stop share, ingest points, fan out to members.
- **Notifications**: opt-in push for meetup set, supply needed, friend arrived.

---

## 5. Realtime layer

- **Transport**: WebSocket (fallback to SSE/long-poll if needed). Each client
  joins rooms by `meetup_id` and `group_id`.
- **Fan-out**: API writes to Postgres (source of truth) → publishes an event to
  **Redis Pub/Sub** → all WS server instances broadcast to subscribed clients.
- **Event examples**: `rsvp.updated`, `supply.claimed`, `supply.added`,
  `location.updated`, `member.arrived`.
- **Presence**: Redis keys with TTL (`presence:meetup:{id}:user:{id}`) refreshed
  by client heartbeats → "3 friends online / on the way".
- **Optimistic UI**: clients apply changes locally, reconcile on server ack.

---

## 6. Live location sharing (the headline feature) — design + guardrails

This is the core selling point **and** the highest-risk feature. Designed to be
WhatsApp-style: **opt-in, time-boxed, visibly active, easy to stop.**

### 6.1 Consent & control (non-negotiable)
- Sharing is **always opt-in per session**: user picks a duration (e.g. 15 min /
  1 hr / until I arrive). No silent or always-on tracking.
- A **persistent, visible indicator** shows while sharing is active (banner +
  notification on native).
- **Stop anytime** in one tap; sharing **auto-expires** at the chosen time.
- Scoped to **one meetup + that group only** — never broadcast wider.
- On web: **foreground only** (no background geolocation). True background
  sharing is a native-only capability, behind an explicit OS permission.

### 6.2 Data flow
```
Device GPS ──(throttled, e.g. every 5–15s or on meaningful move)──►
  Client ──WS/HTTPS──► Location service
    → validate active consent + not expired
    → store latest point (short TTL in Redis; minimal history in Postgres/PostGIS)
    → publish location.updated → fan-out to group members in that meetup
Members' clients render moving avatars on the map + ETA.
```

### 6.3 ETA
- Compute client-side or via a routing/maps provider (Google/Mapbox) using the
  shared point and the meetup destination.

### 6.4 Privacy & compliance
- **Data minimization**: keep only the latest position + short trail; purge on
  share end/expiry.
- **Retention limits**: location history TTL (e.g. minutes–hours), then deleted.
- **Encryption**: TLS in transit; encrypt sensitive fields at rest.
- **Never sell/share** location with third parties or ads.
- **Age gating** + privacy policy; align with **GDPR/CCPA** and **Apple/Google
  location policies** (required for store approval).
- **Abuse protections**: rate limits, anomaly checks, block/report a member,
  leave group revokes sharing instantly.

---

## 7. Data model (initial)

```
users        (id, oauth_provider, oauth_sub, name, email, avatar_url, created_at)
groups       (id, name, invite_token, created_by, created_at)
memberships  (id, group_id, user_id, role[owner|member], joined_at)
meetups      (id, group_id, title, place_label, lat, lng, start_at, created_by)
rsvps        (id, meetup_id, user_id, status[in|out|maybe], updated_at)
supplies     (id, meetup_id, name, claimed_by_user_id NULL, note, created_at)
location_shares (id, meetup_id, user_id, started_at, expires_at, active bool)
location_points (id, share_id, lat, lng, accuracy, recorded_at)  -- short TTL
devices      (id, user_id, platform, push_token, created_at)     -- for push

-- chat
conversations (id, group_id NULL, type[group|dm], created_at)
messages     (id, conversation_id, sender_id, body, kind[text|image|location|system],
              reply_to_id NULL, created_at, edited_at NULL, deleted_at NULL)
message_receipts (id, message_id, user_id, state[delivered|read], at)
reactions    (id, message_id, user_id, emoji, created_at)

-- customization
profiles     (user_id, display_name, bio, avatar_url, banner_url,
              accent_color, status_emoji, status_text, theme)
chat_themes  (id, owner_user_id NULL, conversation_id NULL, name,
              wallpaper_url, bubble_color, accent_color, is_preset bool)
```

- Postgres is the source of truth; Redis holds ephemeral presence + latest
  location for fast fan-out.

---

## 8. API surface (sketch)

```
POST   /auth/oauth/{provider}        -> app JWT (+ refresh)
POST   /auth/refresh

GET    /groups            POST /groups            POST /groups/join
GET    /groups/{id}/meetups            POST /groups/{id}/meetups
GET    /meetups/{id}                   PATCH /meetups/{id}
PUT    /meetups/{id}/rsvp

GET    /meetups/{id}/supplies          POST /meetups/{id}/supplies
PATCH  /supplies/{id}   (claim/unclaim/needed)   DELETE /supplies/{id}

POST   /meetups/{id}/location/start    (duration) 
POST   /location/ping                  (lat,lng,accuracy)   [or via WS]
POST   /meetups/{id}/location/stop

WS     /realtime          rooms: group:{id}, meetup:{id}, conversation:{id}
POST   /devices           (register push token)

-- chat
GET    /conversations                  POST /conversations
GET    /conversations/{id}/messages    (paginated, cursor)
POST   /conversations/{id}/messages    (text|image|location)
PATCH  /messages/{id}                  (edit)   DELETE /messages/{id}
POST   /messages/{id}/reactions        (emoji)
POST   /conversations/{id}/read        (mark read up to message)

-- customization
GET    /me/profile        PATCH /me/profile        POST /me/avatar
GET    /chat-themes       POST /chat-themes
PATCH  /conversations/{id}/theme
```

---

## 9. Chat / messaging module

WhatsApp-style group + direct messaging, reusing the realtime layer.

### 9.1 Behavior
- **Group chat** auto-created per group; optional **1:1 DMs** between members.
- Message kinds: **text, image, location card** (drop the meetup pin into chat),
  and **system** messages ("Sam is in", "Cups still needed", "Maya arrived").
- **Delivery + read receipts** via `message_receipts` (single/double/blue-tick
  style). **Typing indicators** + presence via Redis TTL keys.
- **Reactions** (emoji) and **reply-to** threading; edit/delete with tombstones.
- **Media** uploaded to object storage; clients get signed URLs.

### 9.2 Realtime + delivery
- Clients join `conversation:{id}` rooms. New message → write to Postgres →
  publish `message.created` via Redis → fan-out to connected members.
- **Offline users** get a **push notification** (FCM/APNs) and fetch on next
  open. Messages paginate by cursor (keyset on `created_at`).
- Ordering: server-assigned monotonic timestamp/sequence per conversation;
  clients reconcile optimistic sends on ack.

### 9.3 Scale & safety
- Hot conversations cached in Redis; cold history in Postgres (consider
  partitioning `messages` by time as volume grows).
- **Moderation**: block/report, leave-group revokes access, rate limits, basic
  spam/abuse checks.
- **Encryption**: TLS in transit + at-rest encryption to start. **E2EE is a
  Phase-2 option** (Signal-protocol style) — powerful but it complicates search,
  multi-device, and server-side moderation, so it is deliberately deferred.

---

## 10. Profile & chat customization

The "make it yours" layer — a key delight/retention feature.

### 10.1 Profile customization
- Avatar (upload or generated initials), **banner image**, bio, **status**
  (emoji + short text, like "🌿 vibing"), and a personal **accent color** that
  themes their UI highlights.
- App **theme**: light / dark / "party"; optional per-user accent color.
- Achievement/flair badges (e.g. "Never forgets the snacks") as a fun hook.

### 10.2 Chat customization (WhatsApp-style)
- **Chat wallpaper** (presets + custom upload), **bubble color**, and accent per
  conversation, stored in `chat_themes` and applied client-side.
- Custom **chat nickname/title** and group icon for the group conversation.
- Per-conversation settings (mute, custom notification tone).
- All theming is **presentational + client-applied**, so it never blocks the
  data path and is cheap to sync.

---

## 11. Security

- OAuth only (no password storage); short-lived JWT + rotating refresh tokens.
- Authorization checks: a user can only see meetups/locations for groups they
  belong to.
- TLS everywhere; secrets in a managed secret store, never in the client bundle.
- Rate limiting + input validation on every endpoint; audit logs for location
  start/stop.

---

## 12. Phased roadmap

- **Phase 0 (done)**: standalone prototype (this repo) — UX, 3D, sound, flows.
- **Phase 1 — Web MVP**: OAuth, groups, meetups, RSVP, supplies, realtime sync.
  No location yet. Ship as installable PWA.
- **Phase 2 — Chat + customization**: group/DM messaging, receipts, reactions,
  profile + chat theming. (Transport encryption; E2EE deferred.)
- **Phase 3 — Location (web, foreground)**: consent-based, time-boxed live
  sharing + ETAs + "arrived", with full guardrails (§6).
- **Phase 4 — Native apps**: Flutter (or native) Android + iOS; reliable
  foreground-service location, push notifications, store launch.
- **Phase 5 — Scale & delight**: presence, supply templates, recurring meetups,
  badges/flair, optional E2EE; observability (metrics/tracing), autoscaling.

---

## 13. More ideas to consider

- **Polls in chat** ("Where to?", "What time?") that turn the winner into the meetup.
- **Supply templates** ("Movie night", "BBQ") to prefill the list.
- **Smart suggestions**: warn on duplicate supplies, suggest missing essentials.
- **Recurring meetups** + calendar export (.ics) and reminders.
- **Cost splitting**: track who paid for what, settle up later.
- **Memories**: a shared photo album per meetup after it ends.
- **Streaks / badges**: "5 hangouts in a row", "Never forgets the snacks".
- **Voice notes** and GIF/sticker support in chat.
- **Quiet hours / DND** per user for notifications.

---

## 14. Migrating the prototype

- Extract the prototype's CSS design tokens + components (buttons, tags, cards)
  into the web framework's component library.
- Keep the **Three.js leaf** and **Web Audio SFX** as an isolated "delight"
  module so they're reusable and easy to disable on low-power devices.
- Replace `localStorage` state with API calls + a client store (e.g. React
  Query/Zustand) and the WebSocket event stream.
```

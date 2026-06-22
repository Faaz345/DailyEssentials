---
name: High Vibrance
colors:
  surface: '#0a160e'
  surface-dim: '#0a160e'
  surface-bright: '#2f3c33'
  surface-container-lowest: '#051109'
  surface-container-low: '#121e16'
  surface-container: '#16221a'
  surface-container-high: '#202d24'
  surface-container-highest: '#2b382e'
  on-surface: '#d8e6d9'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#d8e6d9'
  inverse-on-surface: '#27332a'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#4ae175'
  primary: '#4ae276'
  on-primary: '#003915'
  primary-container: '#21c55d'
  on-primary-container: '#004b1d'
  inverse-primary: '#006e2e'
  secondary: '#9ddf2e'
  on-secondary: '#213600'
  secondary-container: '#83c300'
  on-secondary-container: '#304b00'
  tertiary: '#f0c300'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cfa800'
  on-tertiary-container: '#4f3e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6aff8e'
  primary-fixed-dim: '#4ae175'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#b2f746'
  secondary-fixed-dim: '#98da27'
  on-secondary-fixed: '#121f00'
  on-secondary-fixed-variant: '#334f00'
  tertiary-fixed: '#ffe083'
  tertiary-fixed-dim: '#eec200'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#0a160e'
  on-background: '#d8e6d9'
  surface-variant: '#2b382e'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 20px
  stack-gap-lg: 24px
  stack-gap-md: 16px
  stack-gap-sm: 8px
  grid-gutter: 12px
---

## Brand & Style

This design system is built for social connectivity and shared experiences, specifically targeting a lifestyle-oriented community. The brand personality is **friendly, fun, and chill**, prioritizing an approachable atmosphere over rigid corporate structures.

The visual style is a fusion of **Corporate Modern** structure and **Tactile** playfulness. It utilizes high-density dark backgrounds to allow vibrant greens and neons to pop, creating a "night-mode" aesthetic that feels premium yet relaxed. Key characteristics include heavy, rounded containers, soft depth cues, and highly legible, bold typography that maintains a sense of movement and energy.

## Colors

The palette is anchored by a deep, forest-toned dark mode to provide a restful foundation for high-contrast accents.

- **Primary Green (#21C55D):** Used for primary actions, success states, and brand-defining moments.
- **Secondary Lime (#A3E635):** Used for highlights and playful UI elements that require visual differentiation from the primary green.
- **Tertiary Yellow (#FACC15):** Reserved for warnings, premium callouts, or energetic accents.
- **Neutrals:** The background uses a very dark green-black to maintain brand cohesion even in "empty" spaces, while elevated surfaces use a slightly lighter forest green to create depth.

## Typography

The typography system utilizes **Be Vietnam Pro** (as a high-quality alternative to Poppins) to achieve a bold, rounded, and playful character. 

- **Headlines:** Use ExtraBold weights with slightly tightened letter-spacing to create a "chunky" and impactful look.
- **Body Text:** Maintain a Medium weight for readability against dark backgrounds, ensuring a soft contrast that isn't jarring to the eyes.
- **Labels:** Used for "Status Pills" and metadata, often employing Bold weights to ensure legibility at small scales.

## Layout & Spacing

The system follows a **fluid grid** model optimized for mobile-first interaction. Layouts are driven by vertical stacks with generous internal padding to maintain the "chill" and uncluttered vibe.

- **Margins:** Standard side margins are set to 20px to ensure content doesn't feel cramped against the screen edges.
- **Card Spacing:** Elements within a card should use a 16px rhythm, while major sections on the screen use 24px spacing.
- **Safe Areas:** Bottom navigation and top status bars must respect device safe areas, with floating elements (like the Chunky Button) centered or pinned with a 24px offset from the bottom.

## Elevation & Depth

This system avoids harsh drop shadows in favor of **Tonal Layering** and **Soft Ambient Occlusion**.

- **Surface Tiers:** The base background is the darkest layer. Cards and containers use a slightly lighter value (#1B2F1E) to appear "lifted."
- **Shadows:** Use very soft, diffused shadows (Blur: 20px, Spread: -5px, Opacity: 30%) with a slight green tint to ground the cards without creating a "floating" effect that breaks the tactile feel.
- **Inner Glow:** Interactive elements like the "Chunky Button" may use a subtle top-edge inner highlight to simulate a physical, convex surface.

## Shapes

The shape language is defined by extreme roundedness to evoke friendliness and safety.

- **Cards:** Primary containers use a **24px corner radius**. This is a signature element of the design system.
- **Buttons:** Interactive "Chunky" components use a **16px radius**, striking a balance between the organic curves of the cards and the precision of a button.
- **Status Pills & Avatars:** Always fully rounded (pill-shaped or circular) to contrast against the rectangular grid.

## Components

### Chunky Button
The primary action driver. It features a 16px radius, bold typography, and a "tactile" feel. It should occupy full-width within its container or a fixed 50% width in pairs. The "I'm in" success state uses the primary green, while "Can't make it" uses a subtle dark stroke.

### Status Pill
Small, high-visibility indicators used for attendance (e.g., "Host", "I'm in", "Can't"). These use a background color that matches the status (Green for success, Grey for neutral) with a 999px radius and `label-bold` typography.

### Rounded Cards
The main structural unit. Cards should have a 24px radius and a slightly lighter green background than the main canvas. Content inside should be padded by 20px.

### Progress Rings
Used for supply tracking or goal completion. These use the primary green for the active segment and a dark translucent stroke for the remaining track, emphasizing the vibrant "glow" against the dark background.

### Avatars
Circular profile images with a 2px stroke. When grouped (e.g., "Who's coming"), use a status pill directly beneath the avatar to provide context without cluttering the image.
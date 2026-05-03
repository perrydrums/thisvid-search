---
name: Vivid Search System
colors:
  surface: '#f9f9fc'
  surface-dim: '#d9dadd'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#edeef1'
  surface-container-high: '#e8e8eb'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#5f3e3e'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#946e6d'
  outline-variant: '#e9bcba'
  surface-tint: '#bf002a'
  primary: '#ba0029'
  on-primary: '#ffffff'
  primary-container: '#e90036'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb3b2'
  secondary: '#5f5e62'
  on-secondary: '#ffffff'
  secondary-container: '#e4e1e7'
  on-secondary-container: '#656468'
  tertiary: '#00647c'
  on-tertiary: '#ffffff'
  tertiary-container: '#007f9c'
  on-tertiary-container: '#fafdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b2'
  on-primary-fixed: '#410008'
  on-primary-fixed-variant: '#92001e'
  secondary-fixed: '#e4e1e7'
  secondary-fixed-dim: '#c8c5cb'
  on-secondary-fixed: '#1b1b1f'
  on-secondary-fixed-variant: '#47464b'
  tertiary-fixed: '#b7eaff'
  tertiary-fixed-dim: '#4cd6ff'
  on-tertiary-fixed: '#001f28'
  on-tertiary-fixed-variant: '#004e60'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  margin: 32px
---

## Brand & Style

The design system is built for a high-performance video search application, prioritizing speed, clarity, and a professional aesthetic. The brand personality is efficient and focused, yet energetic, utilizing a vibrant pink-red accent to punctuate a sophisticated neutral palette.

The visual style follows a **Modern Corporate** direction with a touch of **Minimalism**. It relies on ample whitespace, a strict grid, and high-quality typography to organize complex search filters and dense video results. The objective is to make the tool feel like a professional utility—highly functional and reliable—while maintaining a contemporary, fresh feel through subtle depth and bold accenting.

## Colors

The palette centers on a high-energy **Vivid Pink-Red** (#FF003C) derived from the reference, used sparingly for primary actions, active states, and critical highlights. 

### Palette Strategy
- **Primary:** The accent color is optimized for visibility. In dark mode, it retains its saturation to "pop" against dark surfaces.
- **Neutrals:** A sophisticated range of cool grays. Light mode uses a soft off-white (#F4F4F7) for backgrounds to reduce eye strain, while Dark mode utilizes a deep charcoal (#121214) rather than pure black to maintain depth.
- **Functional:** Success, Warning, and Error colors are desaturated slightly to ensure they don't compete with the primary pink-red accent.

## Typography

This design system employs a dual-font strategy to balance character with utility. 

**Manrope** is used for headlines. Its geometric yet slightly condensed nature provides a modern, high-tech feel that stays legible even at heavy weights. **Inter** is used for all functional text, UI labels, and body copy. It is selected for its exceptional readability in data-heavy environments and its neutral, "system-like" appearance that emphasizes efficiency.

Key typographic principles:
- **Hierarchical Contrast:** Large, bold headings contrast with clean, functional body text.
- **Labels:** Small labels use semi-bold weights or all-caps to distinguish them from interactive text.
- **Tight Leading:** Headlines use tighter line heights to maintain a compact, professional look.

## Layout & Spacing

The layout is built on a **12-column Fluid Grid** for the main content area, allowing the video results to scale dynamically across different screen sizes. A **Fixed Sidebar** (320px) is recommended for search filters to provide a constant point of interaction while browsing.

Spacing follows a strict 4px baseline grid. 
- **Internal Padding:** Use 16px (md) for standard card padding and 8px (sm) for smaller UI elements like chips or input fields.
- **Margins:** Use 24px (lg) to separate distinct sections of the search interface.
- **Density:** The layout favors a medium-high density to ensure the "Fast & Efficient" goal is met, minimizing the need for excessive scrolling in the filter panel.

## Elevation & Depth

This design system uses **Tonal Layering** supplemented by **Ambient Shadows** to create a sense of hierarchy without cluttering the UI with heavy borders.

- **Level 0 (Background):** The base canvas (Light: #F4F4F7, Dark: #121214).
- **Level 1 (Cards/Sidebar):** Raised surfaces using the primary surface color (#FFFFFF or #1A1A1E). These feature a subtle, soft shadow: `0px 4px 12px rgba(0, 0, 0, 0.05)`.
- **Level 2 (Overlays/Dropdowns):** Higher elevation for interactive menus. These use a more pronounced shadow to clearly separate them from the content below: `0px 8px 24px rgba(0, 0, 0, 0.12)`.

In dark mode, depth is primarily communicated through lighter surface tints rather than shadows alone, ensuring the UI remains crisp on OLED screens.

## Shapes

The shape language is consistently **Rounded**, which softens the professional "Corporate" aesthetic and makes the application feel more approachable.

- **Standard Elements:** Buttons, input fields, and search bars use a 0.5rem (8px) radius.
- **Containers:** Content cards and sidebars use a 1rem (16px) radius to frame video thumbnails gracefully.
- **Interactive Chips:** Tags or category filters should use "Pill" shapes (full radius) to distinguish them from rectangular input fields.

## Components

### Buttons
- **Primary:** Solid Vivid Pink-Red with white text. High emphasis.
- **Secondary:** Transparent background with a 1px border of the neutral mid-gray.
- **Ghost:** No border or background; text turns Vivid Pink-Red on hover.

### Form Elements
- **Inputs:** Use a soft gray background (#EDEEF2 in light mode) with no border in its default state. On focus, apply a 2px border of the primary color.
- **Checkboxes/Radios:** Custom styled with the primary color for the "Checked" state. Use the same 0.25rem roundedness for checkboxes.

### Video Cards
- **Thumbnail:** 16:9 aspect ratio with a subtle 8px corner radius.
- **Metadata:** Positioned below the thumbnail using `body-sm` for secondary info (duration, views) and `headline-md` (scaled down) for the video title.
- **Hover State:** Cards should subtly lift (increase shadow) and the thumbnail should slightly scale (1.02x) to provide immediate feedback.

### Search Bar
- A prominent, wide component at the top of the viewport. Use a large icon (24px) and `body-lg` font for the input text to emphasize the primary action of the application.
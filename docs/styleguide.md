# Flowship – Product UI / UX Style Guide (v1)

> **Brand Personality**   *disciplined · tech · calm*  with a spaceship‑bridge ambience. Design language balances focused minimalism with subtle cosmic flair.

---

## 1 · Color Palette

| Token                             | Hex         | Usage                                   |
| --------------------------------- | ----------- | --------------------------------------- |
| **Primary / Cosmic Violet**       | **#8A6DFF** | Main action buttons, links, focus rings |
| **Primary / Event Horizon Black** | **#0D1117** | Core dark background                    |
| **Secondary / Nebula Indigo**     | #535CFF     | Button hover, interactive icon hover    |
| **Secondary / Stardust Gray**     | #1B2330     | Card & panel surfaces                   |
| **Secondary / Warp Gray**         | #242E40     | Inputs, secondary surfaces              |
| **Accent / Pulsar Magenta**       | #FF4D9D     | Highlights, empty‑state illustrations   |
| **Accent / Ion Teal**             | #00E0D3     | Informational badges, graphs            |
| **Success Green**                 | #2ECC71     | Success toasts, positive metrics        |
| **Warning Yellow**                | #F4D13D     | Caution, pending states                 |
| **Error Red**                     | #E45855     | Destructive actions, validation errors  |
| **Info Blue**                     | #3FA9F7     | Neutral informational banners           |
| **Light Surface**                 | #F8F9FC     | Light‑mode panels                       |
| **Light Background**              | #FFFFFF     | Light‑mode root background              |

*All foreground–background pairs meet WCAG 2.1 AA contrast.*

### Dark ↔ Light Mapping

| Dark                          | Light                         |
| ----------------------------- | ----------------------------- |
| Event Horizon Black → #0D1117 | Light Background → #FFFFFF    |
| Stardust Gray → #1B2330       | Light Surface → #F8F9FC       |
| Text Primary → #E6EBF4        | Text Primary (Dark) → #172026 |

---

## 2 · Typography

**Primary Font:** `Inter` — fallbacks: system­‑ui, Roboto, Helvetica Neue, sans‑serif  
*(Chosen for clarity, variable width, and broad platform availability)*

| Size Token     | px / lh | Weight | Tracking | Usage                 |
| -------------- | ------- | ------ | -------- | --------------------- |
| **H1**         | 32 / 40 | 700    | -0.2     | Page titles           |
| **H2**         | 28 / 36 | 600    | -0.2     | Major section headers |
| **H3**         | 24 / 32 | 600    | -0.1     | Card titles, modals   |
| **H4**         | 20 / 28 | 500    | -0.05    | Sub‑headers           |
| **Body‑Large** | 17 / 26 | 400    | 0        | Long‑form copy        |
| **Body**       | 15 / 24 | 400    | 0        | Standard UI text      |
| **Body‑Small** | 13 / 20 | 400    | 0.1      | Secondary text        |
| **Caption**    | 12 / 16 | 500    | 0.2      | Timestamps, labels    |
| **Button**     | 16 / 24 | 500    | 0        | Buttons, CTAs         |

---

## 3 · Spacing System

`4 – 8 – 12 – 16 – 24 – 32 – 48 – 64` px scale.  
*Base unit = 4 px.*  
Major section gutters: 32 / 48 px.  
Grid: responsive 12‑col with 80 px max content width constraint on large screens.

---

## 3A · Layout & Grid (Baseline‑Alignment Variant)

| Token              | Value                                   | Purpose                                              |
| ------------------ | --------------------------------------- | ---------------------------------------------------- |
| **Header Height**  | 48 px                                   | Logo & utility bar (Event Horizon Black)             |
| **Grid**           | `grid-template-columns: 280px 1fr 280px`| Left cards · Timer hero · Right cards                |
| **Column Gap**     | 32 px                                   | Matches spacing system                               |
| **Align Items**    | `start`                                 | All first‑row cards share same top edge              |
| **Top Margin**     | 32 px from header                       | Consistent vertical rhythm                           |
| **Card Stack Gap** | 24 px                                   | Vertical spacing inside side columns                 |

```css
.layout-aligned {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 32px;
  align-items: start;
  margin-top: 32px; /* below 48px header */
}
body.staggered .layout-aligned {
  align-items: initial;
}
```

> **Note:** When `layout-aligned` is active, Timer Hero Panel loses its extra vertical offset.

---

## 4 · Component Styling

### Buttons

| Type            | BG              | Text   | Border | Radius | Height | Shadow          |
| --------------- | --------------- | ------ | ------ | ------ | ------ | --------------- |
| **Primary**     | Cosmic Violet   | white  | —      | 8 px   | 44 px  | 0 2 8 #000A     |
| **Hover**       | Nebula Indigo   | white  | —      | 8 px   | —      | Elevation +2    |
| **Secondary**   | transparent     | violet | 1.5 px | 8 px   | 44 px  | none            |
| **Text**        | transparent     | violet | —      | 0      | 40 px  | none            |
| **Destructive** | Error Red       | white  | —      | 8 px   | 44 px  | 0 2 8 #000A     |

#### Timer Launch Button

| Property | Spec                                       | Notes                                           |
| -------- | ------------------------------------------ | ----------------------------------------------- |
| Label    | **LAUNCH** (alt: START)                    | Space‑themed label                              |
| Width    | 150 px                                     | Stand‑out width                                 |
| BG       | Cosmic Violet → Nebula Indigo 45° gradient | Differentiates from default primary             |
| Glow     | 0 0 12 8 Cosmic Violet @ 25 %              | Mirrors streak aura                             |
| Hover    | Brighten gradient + elevate shadow 2 px    | Affordance                                      |
| Active   | Scale 97 %, shadow blur 4 px               | Press feedback                                  |

#### Timer Hero Panel

* Width: middle column (`1fr`) max 640 px  
* Elevation: `0 4 16 rgba(0,0,0,0.32)`  
* Aura: Ion Teal 20 % base glow (intensifies with streak)  
* Corner Radius: 16 px  
* Padding: 24 / 20 px  
* Internal grid: 2‑col for labels + stats

### Cards / Panels

* Surface: Stardust Gray (dark) / Light Surface (light)  
* Corner: 12 px  
* Shadow: 0 2 8 rgba(0,0,0,0.12)  
* Padding: 16 px  
* Optional header divider: 1 px Warp Gray

### Inputs

| State   | Border                     | BG        | Text    |
| ------- | -------------------------- | --------- | ------- |
| Default | 1 px Warp Gray             | Warp Gray | #E6EBF4 |
| Hover   | 1 px Cosmic Violet         | Warp Gray | #E6EBF4 |
| Focused | 2 px Cosmic Violet         | Warp Gray | white   |
| Error   | 2 px Error Red             | Warp Gray | white   |

Corner radius: 8 px — Left icon optional (24 px) inside 12 px padding.

### Icons

* Library: Lucide 24 × 24 px (20 × 20 dense)  
* Active: Cosmic Violet — Inactive: #A0AAB8 — Destructive: Error Red

---

## 5 · Motion & Animation (Token Library)

| Token                        | Purpose                        | Value                                   |
| ---------------------------- | ------------------------------ | --------------------------------------- |
| `--motion-duration-fast`     | Hover / tap                    | 120 ms                                  |
| `--motion-duration-standard` | Standard component             | 200 ms                                  |
| `--motion-duration-emphasis` | Modals / toasts                | 300 ms spring(300,35)                   |
| `--motion-duration-page`     | Route change                   | 350 ms cubic-bezier(0.16,1,0.3,1)       |
| `--motion-ease-standard`     | Default easing                 | cubic-bezier(0.2,0.8,0.2,1)             |
| `--motion-ease-spring`       | Spring easing                  | physics spring tension 300 friction 35 |
| `--motion-reduced`           | Reduced-motion fallback        | Fade‑only, no transform                |

```css
.button{
  transition:
    transform var(--motion-duration-fast) var(--motion-ease-standard),
    box-shadow var(--motion-duration-fast) var(--motion-ease-standard);
}
```

### Star‑Field Parallax

```css
@keyframes starsEnter{
  from{transform:translateY(20px);opacity:0;}
  to  {transform:translateY(0);opacity:1;}
}
@keyframes starsExit{
  to{transform:translateY(-20px);opacity:0;}
}
.route-enter-active .stars{
  animation:starsEnter var(--motion-duration-page) var(--motion-ease-standard) both;
}
.route-leave-active .stars{
  animation:starsExit var(--motion-duration-page) var(--motion-ease-standard) both;
}
@media(prefers-reduced-motion:reduce){
  .stars{animation:none;}
}
```

---

## 6 · Accessibility Addendum

* Run Lighthouse + axe-core on every PR  
* Focus outline: 2 px Cosmic Violet  
* Respect `prefers-reduced-motion`

---

© 2025 Flowship Design – Last updated 2025‑08‑05

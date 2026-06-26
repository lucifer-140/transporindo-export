# TAS Logo Package

Brand-aligned logo assets — colors match the TAS design tokens.

## Brand colours

| Role            | Hex        | Token             |
|-----------------|------------|-------------------|
| Brand red       | `#DC2626`  | `--accent`        |
| Ink             | `#18181B`  | `--fg` (light)    |
| Off-white       | `#F5F5F7`  | `--fg` (dark) — card bg |
| App dark bg     | `#0A0A0B`  | `--bg` (dark)     |
| App light bg    | `#F4F4F5`  | `--bg` (light)    |

## Folder structure

```
tas-logo/
├── README.md
├── light/                             ← LIGHT theme (#F4F4F5 / #FFFFFF bg)
│   ├── tas-logo.svg                   ← master vector
│   ├── tas-logo-transparent.png       ← 2000×2000, transparent
│   ├── tas-logo-on-white.png          ← 2000×2000, white bg
│   └── tas-logo-512.png               ← 512×512, transparent
│
└── dark/                              ← DARK theme (#0A0A0B bg)
    ├── tas-logo-dark.svg              ← master — off-white card
    ├── tas-logo-dark-circle.svg       ← circular badge variant
    ├── tas-logo-dark-transparent.png  ← 2000×2000, transparent
    ├── tas-logo-dark-on-ink.png       ← 2000×2000, on app dark bg
    ├── tas-logo-dark-512.png          ← 512×512, transparent
    └── tas-logo-dark-circle-transparent.png
```

## Which file to use

| App theme                            | Use this version              |
|--------------------------------------|-------------------------------|
| Light theme (`.theme-light`)         | `light/tas-logo.svg`          |
| Dark theme  (`.theme-dark`)          | `dark/tas-logo-dark.svg`      |
| On brand red (`--accent`)            | `dark/tas-logo-dark.svg`      |

## Why dark mode is a "card"

The original artwork uses white as a real colour — windshield, ship's deck,
bow tip are all white-on-paper. A naïve invert breaks that. Instead, the
dark variant places the original artwork on an off-white card matching the
`--fg` token (`#F5F5F7`), so the design reads exactly as intended on any
dark surface.

## Auto theme switching in HTML

```html
<picture>
  <source srcset="dark/tas-logo-dark.svg" media="(prefers-color-scheme: dark)">
  <img src="light/tas-logo.svg" alt="TAS">
</picture>
```

Or, since TAS uses an explicit theme class:

```html
<img class="logo-light" src="light/tas-logo.svg" alt="TAS"/>
<img class="logo-dark"  src="dark/tas-logo-dark.svg" alt="TAS"/>

<style>
  .theme-dark  .logo-light { display: none; }
  .theme-light .logo-dark  { display: none; }
</style>
```

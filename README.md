![Hero](https://raw.githubusercontent.com/mattpilott/kitto/main/.github/hero.svg)

<p align="center">
  🎒 Kitto, a collection of utilities, helpers and tools for your projects.
  (Japanese キット for Kit)
</p>

## Hello 👋,

<a href="https://github.com/mattpilott/kitto/releases">
<img src="https://img.shields.io/github/v/release/mattpilott/kitto?include_prereleases&label=Release" alt="Releases" />
</a>

<a href="https://github.com/mattpilott/kitto/actions">
<img src="https://github.com/mattpilott/kitto/actions/workflows/main.yml/badge.svg" alt="CI" />
</a>

The purpose of this repo is to create a single point of access for all those little helpers, tools and utilities that you have on all your projects.

### Structure

The structure is super simple, there is a main import at the root of lib that pulls in the namespaces, those in turn have their own indice which import the modules themselves.

Each module is a single exported function or micro api, please continue this way as it makes things easy to reason about and keeps individual modules small.

The aim with this approach is to have small files that do one thing well.

### Design overlay

Mount `Overlay` while developing to compare a page with design images:

```svelte
<script>
	import { Overlay } from 'kitto/svelte'
</script>

<Overlay srcset="/design-d.jpg 1920w, /design-t.jpg 1024w, /design-m.jpg 393w" />
```

The familiar `srcset` syntax lists each image's intended design width in CSS pixels. The overlay picks
the nearest width to the viewport (ties favour the larger design), centres it, and displays it at that
exact width without scaling. This selection is independent of device pixel density. Use positive
integer `w` descriptors and encode spaces or commas within URLs; density descriptors are unsupported.

Open the bottom-right **Overlay** panel to show the image, adjust opacity, select a design manually,
or change its X/Y offsets using numeric inputs. The inline Step selector sets their steppers to 1px or 10px. Positive offsets move right/down.
The header displays the viewport dimensions. Drag it with a mouse or touch to move the panel;
click it to expand or collapse. Its position is remembered and kept within the viewport as you resize.
With the header focused, arrow keys move the panel and `Home` restores its bottom-right position.
The panel uses Milieu light/dark colors based on your system preference, with Geist/Geist Mono font
stacks and system fallbacks. Expanding and collapsing uses a short Svelte slide transition, disabled
when reduced motion is requested. Each design width remembers its own offsets.
**Reset** clears all adjustments and restores the bottom-right position, collapsed panel, automatic
source selection, 50% opacity, and 1px step. It preserves whether the overlay image is enabled.
The keyboard icon highlights while shortcut help is open.

Settings persist locally across reloads, separately for each pathname and source configuration.
Reordering a `srcset` does not discard settings. When storage is unavailable, controls still work
for the current mount. There is no offsets prop; adjustments are made through the panel or keyboard.

| Shortcut                       | Action                                |
| ------------------------------ | ------------------------------------- |
| `1`–`9`                        | Show image at 10–90% opacity          |
| `0` / double `0`               | Show at 100% / hide                   |
| `Shift` + arrows               | Move the active design by 10px        |
| `Ctrl` + `Shift` + arrows      | Move by 1px                           |
| `Shift` + `Alt` + `↑`          | Reset the active design's X/Y offsets |
| `Shift` + `↑` and `↓` together | Reset the active design's X/Y offsets |

Shortcuts are ignored while editing inputs. The image follows document scrolling and never intercepts
page interactions or adds scrollbars. Only one overlay per page is supported; the consuming application
controls development-only mounting (for example, using SvelteKit's `dev` flag).

Existing `<Overlay desktop="/design-d.jpg@1920" mobile="/design-m.jpg@393" />` usage still works,
including its 640px breakpoint and default widths of 1920/393px. A lone legacy image is reused at both
breakpoints. When both APIs are supplied, `srcset` takes precedence. Old global overlay settings are
not migrated.

### Effects

`kitto/effects` is a Svelte 5 port of Jakub Antalik's [Libraries.dev](https://libraries.dev) (MIT). Prop names,
presets and defaults match upstream, so configurations copied from the libraries.dev playground drop straight in.

| Component                                 | Upstream        | What it does                                                  |
| ----------------------------------------- | --------------- | ------------------------------------------------------------- |
| `BorderBeam`                              | `border-beam`   | A glow that rides the border of a card, button or input       |
| `ThinkingOrb`                             | `thinking-orbs` | Dotted orbs for loading states in AI interfaces               |
| `BotAvatar`                               | `bot-avatars`   | Animated bot avatars with living faces                        |
| `Liquid` / `Liquid.Item`                  | `liquid-gooey`  | Pieces that merge like goo and morph like jelly               |
| `VoiceBeam`                               | `voice-glow`    | A glow that rises with your voice (`use_microphone` included) |
| `MetalFx`, `MetalText`, `MetalBadge`      | `metal-fx`      | Liquid metal rings, buttons, text and badges                  |
| `ImageGeneration` (`kitto/effects/image`) | `img-fx`        | A WebGL pixel mosaic that settles into the image              |

```svelte
<script>
	import { BorderBeam } from 'kitto/effects'
</script>

<BorderBeam>
	<button>Get started</button>
</BorderBeam>
```

React-only details map to Svelte: `className` is `class`, `children` is a snippet, forwarded refs are
`bind:element`, and hooks are runes functions or attachments. `ImageGeneration` needs `three` (an optional peer
dependency), so it lives in its own `kitto/effects/image` entry. Each effect has a demo under `/effects/<name>` in
the dev server. The metal shader is Paper Shaders' `liquidMetal`, vendored unmodified under Apache-2.0; see
`src/lib/effects/metal/NOTICE.md`.

#### Open to contributions, ideas and feedback, oh plus bugs of course 🤓

[Documentation available here](https://mattpilott.github.io/kitto/)

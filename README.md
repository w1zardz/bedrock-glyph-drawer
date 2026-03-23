# Bedrock Glyph Drawer

**Free online pixel editor for creating custom Minecraft Bedrock fonts and glyphs** — draw Unicode characters, design glyph_E1/glyph_E2 textures, and export PNG for PocketMine-MP resource packs.

No installation required. Works in any browser, including mobile.

![License](https://img.shields.io/badge/license-MIT-green)
![PocketMine](https://img.shields.io/badge/PocketMine--MP-5.x-blue)
![Minecraft](https://img.shields.io/badge/Minecraft-Bedrock-brightgreen)

---

## What is this?

Minecraft Bedrock Edition allows custom fonts through **glyph textures** (like `glyph_E1.png`). Each glyph texture is a 256-cell grid where each cell represents a Unicode character. This tool lets you **visually draw** those characters pixel by pixel.

Perfect for:
- Creating **custom emoji** for your PocketMine-MP server
- Designing **custom UI symbols** (health bars, icons, logos)
- Making **Minecraft Bedrock resource pack fonts**
- Drawing any **pixel art** and exporting to PNG

## Features

- **Pixel-perfect drawing** — pencil, eraser, fill, eyedropper, line, rectangle tools
- **Multiple canvas sizes** — 16×16, 32×32, 64×64, 128×128, or custom
- **Color palette** — preset colors + custom color picker
- **Undo/Redo** — full history support (Ctrl+Z / Ctrl+Shift+Z)
- **Grid toggle** — see individual pixels clearly
- **Export PNG** — multiple scale options (1x, 2x, 4x, 8x, 16x)
- **Import PNG** — load and edit existing glyph textures
- **Dark/Light theme** — comfortable for any environment
- **Mobile-friendly** — touch support, responsive layout
- **Zero dependencies** — single HTML file, works offline

## Quick Start

1. Open `index.html` in any browser (or use [GitHub Pages](https://w1zardz.github.io/bedrock-glyph-drawer/))
2. Choose canvas size (32×32 is default for Bedrock glyphs)
3. Draw your character/symbol using the tools
4. Export as PNG
5. Place the PNG in your resource pack under `font/` folder

## How to Use Custom Fonts in PocketMine-MP

1. Draw your glyphs using this editor
2. Save the PNG as `glyph_E1.png` (or E2, E3, etc.)
3. Place it in your resource pack: `fonts/glyph_E1.png`
4. In your PocketMine-MP plugin, use the Unicode characters:

```php
// Example: using custom glyph in PocketMine-MP
$player->sendMessage("\u{E100}"); // First character in glyph_E1
$player->sendMessage("\u{E101}"); // Second character
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| B | Pencil tool |
| E | Eraser tool |
| G | Fill (bucket) tool |
| I | Eyedropper |
| L | Line tool |
| R | Rectangle tool |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

## Use Cases

### Custom Server UI
Create unique icons for your Minecraft Bedrock server — health indicators, currency symbols, rank badges, custom arrows, and more.

### Resource Pack Development
Design complete custom font sets for Minecraft Bedrock Edition resource packs. Each glyph texture supports 256 characters.

### PocketMine-MP Plugin Development
Build plugins that display custom symbols in chat, scoreboards, boss bars, and forms using Unicode characters mapped to your custom glyphs.

## Built With

- Vanilla HTML/CSS/JS — no frameworks, no build tools
- Works completely offline after first load

## Related Tools

- [FormAPI Craft](https://github.com/w1zardz/formapi-craft) — Visual form builder for PocketMine-MP

## Contributing

PRs and issues welcome! Ideas:
- Glyph sheet mode (full 16×16 grid of characters)
- Copy/paste between cells
- Animation preview
- More export formats

## License

MIT License — use it however you want.

---

Made with care for the PocketMine-MP community.

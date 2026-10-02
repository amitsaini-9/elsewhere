# Elsewhere art direction

The images and videos were generated on September 9, 2026 using the user's deployed agent-platform API. This followed the imagegen skill's prompt and visual-review workflow, with the user's explicitly supplied cloud endpoint instead of the built-in generator.

The visual direction is natural editorial film photography: sage greens, cream morning light, quiet nearby landscapes, and enough depth to invite exploration. These are imagined scenes rather than representations of named real destinations.

## Assets

| Scene | Original | Website version |
| --- | --- | --- |
| Coastal hills | `public/media/hero.png` | `public/media/hero.webp` |
| Woodland path | `public/media/forest.png` | `public/media/forest.webp` |
| Coastal cove | `public/media/coast.png` | `public/media/coast.webp` |
| Meadow walk | `public/media/hills.png` | `public/media/hills.webp` |
| Coastal film | `public/media/hero-film.mp4` | same, with `hero-poster.webp` |
| Woodland film | `public/media/forest-film.mp4` | same, with `forest-poster.webp` |

Final prompt text for the four stills and coastal film is in [prompts.json](prompts.json). The woodland film prompt is in [forest-film-prompt.json](forest-film-prompt.json). Generation response files preserve the original cloud media URLs. The gateway used `gemini-3-pro-image` at its fixed 1K setting and `gemini-omni-1.1-flash-preview` at its fixed 720p/5-second setting.

The four website stills total roughly 845 KB, converted from roughly 7.5 MiB of PNGs using `optimize.cjs`. Videos are 1280×720 and about five seconds each. Posters were extracted from their first decoded video frames to match the composition before playback. The coastal camera moves forward, so its loop contains a visible reset; no seamless-loop claim is made.

All six generated assets have been visually inspected. Videos decode in Chromium, pause when offscreen, respect reduced motion, and have static fallbacks.

# MVTalk

A small, dependency-light (well, three CDN libraries light) web app that turns a bit of square-bracket markup into a voice saying things. Type some instructions, hit play, get noise. Sometimes the noise is even good.

Full write-up, syntax reference and general waffling can be found in the [guide](https://maycivoxel.github.io/mvtalk/guide), but this README should get you up and running.

## What is this, actually?

MVTalk reads a plain text sample index (`rf.txt`), pulls the matching audio out of a zip archive, and lets you sequence those samples using a tiny custom syntax with per-phoneme pitch, volume and duration control. It'll also chew through a MIDI file and spit out a singable phoneme sequence automatically, if you're feeling ambitious. See Part 4 of the guide for why that feature exists (short version: OpenUTAU and I had a falling out).

Everything runs client side in your browser. No server-side processing, no accounts, no data collection. It does need an internet connection though, since it pulls in Tone.js, JSZip and @tonejs/midi from a CDN.

## Quick start

1. Serve the folder over HTTP(S). Doesn't need to be fancy, GitHub Pages, a local dev server, whatever you've got. It won't work opened directly as a `file://` due to browser fetch restrictions, so don't bother trying that.
2. Make sure `rf.txt` and the archive it references sit in the same directory as `mvtalk.html`.
3. Open the page. It'll load the samples automatically and tell you how many it found (check the console for the full verbose breakdown).
4. Type some phoneme markup into the box, press play.

## Syntax, briefly

```
[name]                        play a phoneme at base settings
[name:PTCH=+2;VOL=-1;DUR=300] play a phoneme with pitch, volume and duration set
[BRK]                         a natural pause
[BRK:DUR=500]                 a pause of exactly 500ms
```

- `PTCH`: pitch shift in semitones (`+`/`-`). Genuine pitch shifting, doesn't touch playback speed.
- `VOL`: volume shift in decibels (`+`/`-`).
- `DUR`: duration in milliseconds. Vowels only. Shorter than the clip cuts it, longer boomerangs it (plays forward, then backward, then forward again, until it reaches the requested length).

Full details, including the `rf.txt` format, live in Part 2 of the guide. Not repeating the whole thing here or this README will end up longer than the app itself.

## rf.txt format

```ini
[META]
FORMAT=WAV
ARCHIVE="filename.zip"

[VOWEL]
vowel
sounds
go
here

[CONSONANT]
consonant
sounds
go
here

[MISC]
sfx
and
other
misc
audio
goes
here
```

One phoneme name per line. MVTalk appends the format extension itself and looks for `name.extension` inside the referenced archive.

## Licensing

This matters more than usual here, so pay attention:

- **The code** (everything in this repo that isn't audio) is MIT licensed. Copy it, modify it, fork it, sell a fancier version of it, whatever, just keep the licence notice knocking about somewhere.
- **The audio samples** (my voice, loaded via `rf.txt` and the archive) are released separately under **CC0**. Effectively public domain. Use them in songs, videos, games, serious releases, silly releases, anything. No credit required, though it's appreciated if given.

If you'd like to credit the voice in a track, `feat. MVTalk` works fine, since the bank itself doesn't have a proper name. It also plays nicely alongside other vocal synth credits, e.g. `feat. Kasane Teto SV and MVTalk`.

Full legal text for both licences is in the header comment of `index.html`.

## Forking

Go for it, genuinely. See Part 7 of the guide if you want the long version, but the short version is: it's MIT, so you're allowed. Pull requests welcome, bug reports welcome, complete rewrites that make it look less like a programmer made the CSS also very welcome.

## Planned things (no promises)

- **Multiple bank support.** Currently MVTalk is hardwired to one `rf.txt`. Eventually it should be possible to load in other banks too, with the bundled one just being the default. Not happening soon.
- **Built-in filters.** Vibrato and reverb as proper config keys, e.g. something like `[ah:VIBR=...]`. Also not happening soon, use Audacity or similar for now.
- **Automatic Japanese to MVTalk conversion.** Using context awareness to take Japanese lyrics and generate a phoneme sequence automatically. This one's a big ask and might just live on the shelf indefinitely, but it would be genuinely useful for Japanese vocalsynth folks, so it's not entirely dead in the water.

See Part 9 of the guide for the same list with slightly more personality attached to it.

## Credits

Made by mayci_voxel/cairode (^_^)

Built on top of [Tone.js](https://tonejs.github.io/), [JSZip](https://stuk.github.io/jszip/) and [@tonejs/midi](https://github.com/Tonejs/Midi), all pulled in via CDN, under their respective licences.

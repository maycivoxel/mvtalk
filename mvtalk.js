/* ==========================================================================
   MVTalk app logic
   MIT licensed (see header comment). Audio assets loaded at runtime are
   CC0 and are not part of this code's license.
   ========================================================================== */

const state = {
  audioCtx: null,
  samples: {},        // key: lowercase phoneme name - { buffer: AudioBuffer, category: 'vowel'|'consonant'|'misc' }
  lastRenderedBuffer: null,
  currentSource: null,
};

const DEFAULT_BRK_MS = 150;      // 'natural space' duration when [BRK] has no DUR
const MIDI_BASE_NOTE = 60;       // MIDI note treated as PTCH=+0 (Middle C)
const MIDI_DEFAULT_PHONEME = 'ah';

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function ensureAudioCtx() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.Tone && Tone.setContext) {
      Tone.setContext(state.audioCtx);
    }
    console.log('[MVTalk] AudioContext created, sampleRate =', state.audioCtx.sampleRate);
  }
}

// Parsing and reading rf.txt

function parseRF(text) {
  const lines = text.split(/\r?\n/);
  let section = null;
  const meta = {};
  const vowels = [];
  const consonants = [];
  const misc = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[(META|VOWEL|CONSONANT|MISC)\]$/i);
    if (sectionMatch) {
      section = sectionMatch[1].toUpperCase();
      continue;
    }

    if (section === 'META') {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim().toUpperCase();
      let val = line.slice(eq + 1).trim();
      val = val.replace(/^"(.*)"$/, '$1'); // strip surrounding quotes
      meta[key] = val;
    } else if (section === 'VOWEL') {
      vowels.push(line);
    } else if (section === 'CONSONANT') {
      consonants.push(line);
    } else if (section === 'MISC') {
      misc.push(line);
    }
  }

  return { meta, vowels, consonants, misc };
}

async function loadSamples() {
  setStatus('Loading rf.txt...');
  console.log('[MVTalk] Fetching rf.txt ...');

  let rfText;
  try {
    const res = await fetch('rf.txt');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rfText = await res.text();
  } catch (err) {
    console.error('[MVTalk] Failed to load rf.txt :', err);
    setStatus('Failed to load rf.txt (see console).');
    return;
  }

  const rf = parseRF(rfText);
  console.log('[MVTalk] Parsed rf.txt! ', rf);

  const format = (rf.meta.FORMAT || 'wav').toLowerCase();
  const archiveName = rf.meta.ARCHIVE;

  if (!archiveName) {
    console.error('[MVTalk] rf.txt META section has no ARCHIVE key.');
    setStatus('rf.txt is missing ARCHIVE.');
    return;
  }

  console.log(`[MVTalk] Format='${format}' Archive='${archiveName}'`);
  setStatus(`Loading archive '${archiveName}'...`);

  let zip;
  try {
    const res = await fetch(archiveName);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrBuf = await res.arrayBuffer();
    zip = await JSZip.loadAsync(arrBuf);
  } catch (err) {
    console.error('[MVTalk] Failed to load/unzip archive:', err);
    setStatus('Failed to load archive (see console).');
    return;
  }

  ensureAudioCtx();

  const categories = [
    ['vowel', rf.vowels],
    ['consonant', rf.consonants],
    ['misc', rf.misc],
  ];

  let loaded = 0;
  let failed = 0;

  for (const [category, names] of categories) {
    for (const name of names) {
      const filename = `${name}.${format}`;
      const entry = zip.file(filename);
      if (!entry) {
        console.warn(`[MVTalk] Archive is missing '${filename}' for ${category} phoneme '${name}'`);
        failed++;
        continue;
      }
      try {
        const arrBuf = await entry.async('arraybuffer');
        const audioBuffer = await state.audioCtx.decodeAudioData(arrBuf);
        state.samples[name.toLowerCase()] = { buffer: audioBuffer, category };
        loaded++;
        console.log(`[MVTalk] Loaded ${category} '${name}' (${audioBuffer.duration.toFixed(3)}s, ${audioBuffer.numberOfChannels}ch)`);
      } catch (err) {
        console.error(`[MVTalk] Failed to decode '${filename}' : `, err);
        failed++;
      }
    }
  }

  setStatus(`Ready. Loaded ${loaded} phoneme(s), ${failed} failed/missing.`);
  console.log(`[MVTalk] Sample loading complete: ${loaded} loaded, ${failed} failed.`);
}

/* --------------------------------------------------------------------------
   Syntax:
     [name] / [name:KEY=val;KEY2=val2] - this adds a phoneme
     [BRK] / [BRK:DUR=ms] - this adds a break/silence
   Keys: PTCH (semitones, +/-), VOL (dB, +/-), DUR (ms, vowels only)
   -------------------------------------------------------------------------- */

function parseConfig(configStr) {
  const config = {};
  if (!configStr) return config;
  for (const part of configStr.split(';')) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    const key = p.slice(0, eq).trim().toUpperCase();
    const val = p.slice(eq + 1).trim();
    config[key] = val;
  }
  return config;
}

function parsePhonemeString(text) {
  const events = [];
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1];
    const colonIdx = inner.indexOf(':');
    const head = (colonIdx === -1 ? inner : inner.slice(0, colonIdx)).trim();
    const configStr = colonIdx === -1 ? '' : inner.slice(colonIdx + 1);
    const config = parseConfig(configStr);

    if (head.toUpperCase() === 'BRK') {
      events.push({ type: 'brk', config });
    } else {
      events.push({ type: 'phoneme', name: head, config });
    }
  }
  return events;
}

// Audio buffer helpers

function cloneBuffer(buffer) {
  const out = state.audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.getChannelData(ch).set(buffer.getChannelData(ch));
  }
  return out;
}

function makeSilence(durMs, numChannels, sampleRate) {
  const len = Math.max(1, Math.round((durMs / 1000) * sampleRate));
  return state.audioCtx.createBuffer(numChannels, len, sampleRate);
}

function pingPongIndices(naturalLen, targetLen) {
  const seq = [];
  if (naturalLen <= 1) {
    for (let i = 0; i < targetLen; i++) seq.push(0);
    return seq;
  }
  let i = 0, dir = 1;
  while (seq.length < targetLen) {
    seq.push(i);
    i += dir;
    if (i >= naturalLen - 1) { i = naturalLen - 1; dir = -1; }
    else if (i <= 0) { i = 0; dir = 1; }
  }
  return seq;
}

function applyDuration(buffer, durMs) {
  const sampleRate = buffer.sampleRate;
  const naturalLen = buffer.length;
  const targetLen = Math.max(1, Math.round((durMs / 1000) * sampleRate));
  const numCh = buffer.numberOfChannels;
  const out = state.audioCtx.createBuffer(numCh, targetLen, sampleRate);

  if (targetLen <= naturalLen) {
    for (let ch = 0; ch < numCh; ch++) {
      out.getChannelData(ch).set(buffer.getChannelData(ch).subarray(0, targetLen));
    }
  } else {
    const idxSeq = pingPongIndices(naturalLen, targetLen);
    for (let ch = 0; ch < numCh; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < targetLen; i++) dst[i] = src[idxSeq[i]];
    }
  }
  return out;
}

function concatBuffers(segments, sampleRate) {
  if (segments.length === 0) {
    return state.audioCtx.createBuffer(1, 1, sampleRate);
  }
  const numChannels = Math.max(...segments.map(s => s.numberOfChannels));
  const totalLen = segments.reduce((sum, s) => sum + s.length, 0);
  const out = state.audioCtx.createBuffer(numChannels, Math.max(1, totalLen), sampleRate);

  let offset = 0;
  for (const seg of segments) {
    for (let ch = 0; ch < numChannels; ch++) {
      const srcCh = ch < seg.numberOfChannels ? ch : 0;
      out.getChannelData(ch).set(seg.getChannelData(srcCh), offset);
    }
    offset += seg.length;
  }
  return out;
}

// Now we get into the juicy stuff, the rendering!

async function renderPhoneme(sample, config, name) {
  const ptch = config.PTCH !== undefined ? parseFloat(config.PTCH) : 0;
  const vol = config.VOL !== undefined ? parseFloat(config.VOL) : 0;
  const srcBuffer = sample.buffer;

  console.log(`[MVTalk] Rendering '${name}' (${sample.category}) PTCH=${ptch} VOL=${vol}`);

  if (!ptch && !vol) {
    // Just clone the raw sample.
    return cloneBuffer(srcBuffer);
  }

  try {
    const rendered = await Tone.Offline(() => {
      const player = new Tone.Player(srcBuffer);
      let node = player;
      if (ptch) {
        const pitchShift = new Tone.PitchShift(ptch);
        node.connect(pitchShift);
        node = pitchShift;
      }
      if (vol) {
        const volume = new Tone.Volume(vol);
        node.connect(volume);
        node = volume;
      }
      node.toDestination();
      player.start(0);
    }, srcBuffer.duration, srcBuffer.numberOfChannels, state.audioCtx.sampleRate);
    return rendered.get();
  } catch (err) {
    console.error(`[MVTalk] Tone.Offline render failed for '${name}', falling back to unprocessed clip:`, err);
    return cloneBuffer(srcBuffer);
  }
}

async function renderAll() {
  ensureAudioCtx();
  const text = document.getElementById('input').value;
  const events = parsePhonemeString(text);
  console.log('[MVTalk] Parsed', events.length, 'event(s):', events);

  const segments = [];

  for (const ev of events) {
    if (ev.type === 'brk') {
      const dur = ev.config.DUR !== undefined ? parseFloat(ev.config.DUR) : DEFAULT_BRK_MS;
      console.log(`[MVTalk] BRK ${dur}ms`);
      segments.push(makeSilence(dur, 1, state.audioCtx.sampleRate));
      continue;
    }

    const key = ev.name.toLowerCase();
    const sample = state.samples[key];
    if (!sample) {
      console.warn(`[MVTalk] Unknown phoneme '${ev.name}' : no matching sample loaded, skipping.`);
      continue;
    }

    let buf = await renderPhoneme(sample, ev.config, ev.name);

    if (ev.config.DUR !== undefined) {
      if (sample.category === 'vowel') {
        buf = applyDuration(buf, parseFloat(ev.config.DUR));
      } else {
        console.warn(`[MVTalk] DUR is ignored for non-vowel phoneme '${ev.name}' (category: ${sample.category})`);
      }
    }

    segments.push(buf);
  }

  const final = concatBuffers(segments, state.audioCtx.sampleRate);
  state.lastRenderedBuffer = final;
  console.log(`[MVTalk] Final rendered duration: ${final.duration.toFixed(3)}s`);
  return final;
}

// Playback and downloading!

function stopSequence() {
  if (state.currentSource) {
    try { state.currentSource.stop(); } catch (e) { /* already stopped */ }
    state.currentSource = null;
    console.log('[MVTalk] Playback stopped.');
  }
}

async function playSequence() {
  try {
    ensureAudioCtx();
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    setStatus('Rendering...');
    const buffer = await renderAll();
    stopSequence();
    setStatus('Playing...');
    const src = state.audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(state.audioCtx.destination);
    src.onended = () => setStatus('Ready.');
    src.start();
    state.currentSource = src;
    console.log('[MVTalk] Playback started.');
  } catch (err) {
    console.error('[MVTalk] Playback error : ', err);
    setStatus('Error during playback (see console).');
  }
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function bufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numCh * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const arrBuf = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrBuf);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let sample = buffer.getChannelData(ch)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrBuf], { type: 'audio/wav' });
}

async function downloadSequence() {
  try {
    setStatus('Rendering for download...');
    const buffer = await renderAll();
    const blob = bufferToWav(buffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mvtalk-output.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('Downloaded.');
    console.log('[MVTalk] WAV downloaded.');
  } catch (err) {
    console.error('[MVTalk] Download error:', err);
    setStatus('Error during download (see console).');
  }
}

/* --------------------------------------------------------------------------
   MIDI import
   Single-track only. Every note becomes an 'ah' vowel phoneme; MIDI note
   60 (middle C) is treated as PTCH=+0, other notes are shifted by the
   difference in semitones. Note length becomes DUR (ms). Gaps between
   notes become [BRK:DUR=...].
   -------------------------------------------------------------------------- */

async function handleMidiFile(file) {
  if (!file) return;
  try {
    const arrBuf = await file.arrayBuffer();
    const midi = new Midi(arrBuf);
    console.log('[MVTalk] Parsed MIDI file:', midi);

    const track = midi.tracks[0];
    if (!track || !track.notes || track.notes.length === 0) {
      console.warn('[MVTalk] No notes found in the first MIDI track.');
      setStatus('MIDI has no notes in track 1.');
      return;
    }

    let text = '';
    let cursor = 0; // seconds

    for (const note of track.notes) {
      const gapSec = note.time - cursor;
      if (gapSec > 0.01) {
        text += `[BRK:DUR=${Math.round(gapSec * 1000)}]`;
      }
      const semis = note.midi - MIDI_BASE_NOTE;
      const sign = semis >= 0 ? '+' : '';
      const durMs = Math.max(1, Math.round(note.duration * 1000));
      text += `[${MIDI_DEFAULT_PHONEME}:PTCH=${sign}${semis};DUR=${durMs}]`;
      cursor = note.time + note.duration;
    }

    document.getElementById('input').value = text;
    console.log('[MVTalk] Generated phoneme sequence from MIDI:', text);
    setStatus(`Imported ${track.notes.length} note(s) from MIDI.`);
  } catch (err) {
    console.error('[MVTalk] Failed to parse MIDI file:', err);
    setStatus('Failed to parse MIDI file (see console).');
  }
}

// Putting it together...

document.getElementById('playBtn').addEventListener('click', playSequence);
document.getElementById('stopBtn').addEventListener('click', stopSequence);
document.getElementById('downloadBtn').addEventListener('click', downloadSequence);
document.getElementById('reloadBtn').addEventListener('click', () => {
  state.samples = {};
  loadSamples();
});
document.getElementById('midiInput').addEventListener('change', (e) => {
  handleMidiFile(e.target.files[0]);
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('[MVTalk] App starting.');
  loadSamples();
});

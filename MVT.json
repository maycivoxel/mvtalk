/*
 * MVTalk MVT Score handler
 * ------------------------
 * Handles importing and exporting MVTalk Score (.mvt) files.
 *
 * MVT files are plaintext.
 *
 * Header format:
 *
 * >> MVTALK SCORE <<
 * ♪ Title: 'Untitled'
 * ♪ Author: 'Unnamed author'
 * ♪ Description: 'Your text here'
 * https://maycivoxel.github.io/mvtalk
 * >> BEGIN SCORE <<
 *
 * Everything through ">> BEGIN SCORE <<" is ignored by the
 * MVTalk synthesiser. The score begins on the next line.
 *
 * MVTalk application code is MIT licensed.
 */

const MVT_BEGIN_MARKER = '>> BEGIN SCORE <<';
const MVT_HEADER_MARKER = '>> MVTALK SCORE <<';
const MVT_URL = 'https://maycivoxel.github.io/mvtalk';

const MVT_DEFAULTS = {
  title: 'Untitled',
  author: 'Unnamed author',
  description: 'Your text here'
};


/* ==========================================================================
   Metadata helpers
   ========================================================================== */

function escapeMvtMetadata(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function unescapeMvtMetadata(value) {
  return String(value)
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}


/* ==========================================================================
   MVT parsing
   ========================================================================== */

/*
 * Parse an MVT file.
 *
 * Returns:
 *
 * {
 *   title: "...",
 *   author: "...",
 *   description: "...",
 *   score: "..."
 * }
 *
 * If >> BEGIN SCORE << is present, everything before it is treated
 * as MVT metadata/header and everything after it is treated as score.
 *
 * If the marker isn't present, the entire file is treated as score.
 */
function parseMVT(text) {
  const normalized = String(text).replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  const metadata = {
    title: MVT_DEFAULTS.title,
    author: MVT_DEFAULTS.author,
    description: MVT_DEFAULTS.description
  };

  /*
   * Parse recognized metadata fields.
   */
  for (const line of lines) {
    const match = line.match(
      /^♪\s*(Title|Author|Description):\s*'(.*)'\s*$/
    );

    if (!match) continue;

    const key = match[1].toLowerCase();
    metadata[key] = unescapeMvtMetadata(match[2]);
  }

  /*
   * Locate the beginning of the actual score.
   */
  const beginIndex = lines.findIndex(
    line => line.trim() === MVT_BEGIN_MARKER
  );

  if (beginIndex !== -1) {
    metadata.score = lines
      .slice(beginIndex + 1)
      .join('\n')
      .trim();
  } else {
    /*
     * Allow simple hand-written MVT files containing only score syntax.
     */
    metadata.score = normalized.trim();
  }

  return metadata;
}


/* ==========================================================================
   MVT generation
   ========================================================================== */

/*
 * Create the complete plaintext contents of an MVT file.
 */
function createMVT({
  title = MVT_DEFAULTS.title,
  author = MVT_DEFAULTS.author,
  description = MVT_DEFAULTS.description,
  score = ''
} = {}) {
  return [
    MVT_HEADER_MARKER,
    `♪ Title: '${escapeMvtMetadata(title)}'`,
    `♪ Author: '${escapeMvtMetadata(author)}'`,
    `♪ Description: '${escapeMvtMetadata(description)}'`,
    MVT_URL,
    MVT_BEGIN_MARKER,
    '',
    String(score).trim(),
    ''
  ].join('\n');
}


/* ==========================================================================
   Filename handling
   ========================================================================== */

function sanitizeMvtFilename(name) {
  const cleaned = String(name || MVT_DEFAULTS.title)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ');

  return cleaned || MVT_DEFAULTS.title;
}


/* ==========================================================================
   Export
   ========================================================================== */

/*
 * Generate and download an MVT file.
 */
function exportMVT({
  title = MVT_DEFAULTS.title,
  author = MVT_DEFAULTS.author,
  description = MVT_DEFAULTS.description,
  score = ''
} = {}) {
  const contents = createMVT({
    title,
    author,
    description,
    score
  });

  const blob = new Blob(
    [contents],
    { type: 'text/plain;charset=utf-8' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeMvtFilename(title)}.mvt`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  /*
   * Give the browser a moment to consume the object URL before
   * releasing it.
   */
  setTimeout(() => URL.revokeObjectURL(url), 0);

  console.log('[MVTalk] MVT exported:', link.download);
}


/* ==========================================================================
   Import
   ========================================================================== */

/*
 * Read and parse an MVT File object.
 */
async function importMVTFile(file) {
  if (!file) {
    throw new Error('No MVT file supplied.');
  }

  const text = await file.text();
  const parsed = parseMVT(text);

  console.log('[MVTalk] MVT imported:', parsed);

  return parsed;
}


/*
 * Load an imported MVT score into the existing MVTalk editor.
 */
async function loadMVTIntoEditor(file) {
  try {
    const parsed = await importMVTFile(file);

    const input = document.getElementById('input');

    if (!input) {
      throw new Error('MVTalk input textarea was not found. (how?)');
    }

    input.value = parsed.score;

    /*
     * Populate metadata fields if the UI has them.
     *
     * These are optional so the MVT handler still works with
     * the current MVTalk interface.
     */
    const titleInput =
      document.getElementById('mvtTitle');

    const authorInput =
      document.getElementById('mvtAuthor');

    const descriptionInput =
      document.getElementById('mvtDescription');

    if (titleInput) {
      titleInput.value = parsed.title;
    }

    if (authorInput) {
      authorInput.value = parsed.author;
    }

    if (descriptionInput) {
      descriptionInput.value = parsed.description;
    }

    if (typeof setStatus === 'function') {
      setStatus(`Imported MVT: ${parsed.title}`);
    }

    return parsed;

  } catch (err) {
    console.error('[MVTalk] MVT import failed:', err);

    if (typeof setStatus === 'function') {
      setStatus('Failed to import MVT file (see console).');
    }

    throw err;
  }
}


/* ==========================================================================
   Export current editor contents
   ========================================================================== */

function saveCurrentMVT() {
  const input = document.getElementById('input');

  if (!input) {
    console.error('[MVTalk] Cannot export MVT: input textarea not found. (how?)');
    return;
  }

  const score = input.value;

  const title =
    document.getElementById('mvtTitle')?.value ||
    MVT_DEFAULTS.title;

  const author =
    document.getElementById('mvtAuthor')?.value ||
    MVT_DEFAULTS.author;

  const description =
    document.getElementById('mvtDescription')?.value ||
    MVT_DEFAULTS.description;

  exportMVT({
    title,
    author,
    description,
    score
  });

  if (typeof setStatus === 'function') {
    setStatus('MVT exported.');
  }
}


/* ==========================================================================
   Import / Export button setup
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const importBtn =
    document.getElementById('importMvtBtn');

  const exportBtn =
    document.getElementById('exportMvtBtn');

  const mvtInput =
    document.getElementById('mvtInput');


  /*
   * Import button opens the hidden file picker.
   */
  importBtn?.addEventListener('click', () => {
    if (!mvtInput) {
      console.error(
        '[MVTalk] MVT file input was not found.'
      );
      return;
    }

    mvtInput.click();
  });


  /*
   * Export button saves the current editor contents.
   */
  exportBtn?.addEventListener('click', () => {
    saveCurrentMVT();
  });


  /*
   * Handle the selected MVT file.
   */
  mvtInput?.addEventListener('change', async event => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      await loadMVTIntoEditor(file);
    } catch {
      /*
       * loadMVTIntoEditor() already reports the error.
       */
    }

    /*
     * Reset the input so selecting the same file again
     * still triggers the change event.
     */
    event.target.value = '';
  });


  console.log('[MVTalk] MVT import/export controls initialized.');
});


/* ==========================================================================
   Console API
   ========================================================================== */

window.parseMVT = parseMVT;
window.createMVT = createMVT;
window.exportMVT = exportMVT;
window.importMVTFile = importMVTFile;
window.loadMVTIntoEditor = loadMVTIntoEditor;
window.saveCurrentMVT = saveCurrentMVT;

console.log('[MVTalk] MVT handler loaded.');
console.log(
  '[MVTalk] Available commands: ' +
  'parseMVT(), createMVT(), exportMVT(), ' +
  'importMVTFile(), loadMVTIntoEditor(), saveCurrentMVT()'
);

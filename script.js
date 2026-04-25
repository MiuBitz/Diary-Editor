// ── State ──────────────────────────────────────────────────
let entries = []; // { id, filename, date, tags, notes, links }

const ALL_TAGS = [
    "Blender", 
    "Godot", "Godot Sensei", "Game Dev",
    "Life", "Journal",
    "Miusoft", "Yoo Game Art", "Freelance","Marketing",
    "Film", "Bat Man", "Games", "Miu Plays", "M Entertainment",
    "Tools", "Stocks", "Miu Farming Days" , "Game Ideas", "Android", "Mobile", "Instagram", "Motivation"
];

// ── Helpers ────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateFromFilename(filename) {
    // Pattern: 2026_04_01_5.png → 2026-04-01
    const m = filename.match(/(\d{4})_(\d{2})_(\d{2})_/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return document.getElementById('globalDate').value || todayStr();
}

function pathFromEntry(e) {
    const d = e.date.replace(/-/g, '/');
    const y = e.date.slice(0, 4);
    const mo = e.date.slice(5, 7);
    const base = e.filename.replace(/\.[^.]+$/, '.png');
    return `img/${y}/${mo}/${base}`;
}

function uid() { return Math.random().toString(36).slice(2, 8); }

// ── File Drop & Browse ─────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
    handleFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener('change', e => handleFiles([...e.target.files]));

function handleFiles(files) {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;

    // Sort by filename naturally
    imgs.sort((b, a) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    imgs.forEach(f => {
        entries.push({
            id: uid(),
            filename: f.name,
            date: dateFromFilename(f.name),
            tags: [],
            notes: '',
            links: '',
            previewUrl: URL.createObjectURL(f)
        });
    });

    fileInput.value = '';
    renderList();
    document.getElementById('dropZone').style.display = 'none';
    renderOutput();
}

// ── Render Entry List ──────────────────────────────────────
function renderList() {
    const list = document.getElementById('entriesList');
    const empty = document.getElementById('emptyState');
    document.getElementById('countBadge').textContent = `${entries.length} image${entries.length !== 1 ? 's' : ''}`;

    if (!entries.length) {
        empty.style.display = 'flex';
        list.querySelectorAll('.entry-card').forEach(c => c.remove());
        return;
    }
    empty.style.display = 'none';

    // Clear and re-render all cards
    list.querySelectorAll('.entry-card').forEach(c => c.remove());

    entries.forEach((entry, idx) => {
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.dataset.id = entry.id;

        const suggestHtml = ALL_TAGS
            .filter(t => !entry.tags.includes(t))
            .map(t => `<button class="tag-suggest-btn" onclick="addTag('${entry.id}', '${t.replace(/'/g, "\\'")}')">+${t}</button>`)
            .join('');

        const tagsHtml = entry.tags
            .map(t => `<span class="tag-chip" title="click to remove" onclick="removeTag('${entry.id}','${t.replace(/'/g, "\\'")}')">× ${t}</span>`)
            .join('');

        card.innerHTML = `
      <div class="entry-card-header">
        <span class="entry-num">#${idx + 1}</span>
        <span class="entry-path">${pathFromEntry(entry)}</span>
        <button class="btn-remove" onclick="removeEntry('${entry.id}')" title="Remove">✕</button>
      </div>
      <div class="entry-card-body">
      ${entry.previewUrl ? `<img src="${entry.previewUrl}" style="width:100%; border-radius:4px; border:1px solid var(--border); object-fit:cover;">` : ''}
        <div class="field-row">
          <span class="field-label">Date</span>
          <input type="date" value="${entry.date}" onchange="updateEntry('${entry.id}','date',this.value)">
        </div>
        <div class="field-row">
          <span class="field-label">Tags <span style="color:var(--muted)">(click suggestions to add)</span></span>
          <div class="tag-container" id="tags-${entry.id}">${tagsHtml}</div>
          <div class="tag-input-row">
            <input type="text" placeholder="Custom tag + Enter" id="tagInput-${entry.id}"
              onkeydown="if(event.key==='Enter'){addTagFromInput('${entry.id}');}"
              style="flex:1">
            <button class="btn btn-secondary" style="padding:4px 8px;font-size:10px;" onclick="addTagFromInput('${entry.id}')">Add</button>
          </div>
          <div class="tag-suggest">${suggestHtml}</div>
        </div>
        <div class="field-row">
          <span class="field-label">Notes</span>
          <textarea placeholder="Optional note..." onchange="updateEntry('${entry.id}','notes',this.value)">${entry.notes}</textarea>
        </div>
        <div class="field-row">
          <span class="field-label">Links <span style="color:var(--muted)">(one per line)</span></span>
          <textarea placeholder="https://..." rows="2" style="height:50px" onchange="updateEntry('${entry.id}','links',this.value)">${entry.links}</textarea>
        </div>
      </div>
    `;
        list.appendChild(card);
    });
}

// ── Entry mutations ────────────────────────────────────────
function updateEntry(id, field, val) {
    const e = entries.find(e => e.id === id);
    if (!e) return;
    e[field] = val;
    if (field === 'date') {
        // Re-render the path in header
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) card.querySelector('.entry-path').textContent = pathFromEntry(e);
    }
    renderOutput();
}

function removeEntry(id) {
    entries = entries.filter(e => e.id !== id);
    renderList();
    renderOutput();
}

function addTag(id, tag) {
    const e = entries.find(e => e.id === id);
    if (!e || e.tags.includes(tag)) return;
    e.tags.push(tag);
    renderList();
    renderOutput();
}

function addTagFromInput(id) {
    const input = document.getElementById(`tagInput-${id}`);
    const val = input.value.trim();
    if (!val) return;
    addTag(id, val);
    input.value = '';
}

function removeTag(id, tag) {
    const e = entries.find(e => e.id === id);
    if (!e) return;
    e.tags = e.tags.filter(t => t !== tag);
    renderList();
    renderOutput();
}

function applyGlobalDate() {
    const d = document.getElementById('globalDate').value;
    if (!d) return;
    entries.forEach(e => { if (!e.date || e.date === todayStr()) e.date = d; else e.date = d; });
    renderList();
    renderOutput();
    showToast('Date applied to all entries');
}

function clearAll() {
    if (entries.length && !confirm('Clear all entries?')) return;
    entries = [];
    document.getElementById('dropZone').style.display = 'block'; 
    renderList();
    renderOutput();
}

// ── Output Rendering ───────────────────────────────────────
function buildLinks(linksStr) {
    if (!linksStr.trim()) return '[]';
    const links = linksStr.split('\n').map(l => l.trim()).filter(Boolean);
    if (!links.length) return '[]';
    return `[${links.map(l => `"${l}"`).join(', ')}]`;
}

function buildJS(entry) {
    const path = pathFromEntry(entry);
    const tags = entry.tags.length ? `["${entry.tags.join('", "')}"]` : '[]';
    const notes = entry.notes ? entry.notes.replace(/"/g, '\\"') : '';
    const links = buildLinks(entry.links);
    return `    {\n        path: "${path}",\n        date: "${entry.date}",\n        tags: ${tags},\n        notes: "${notes}",\n        links: ${links}\n    }`;
}

function renderOutput() {
    const out = document.getElementById('outputArea');
    if (!entries.length) {
        out.innerHTML = `<span style="color:var(--muted); font-style:italic;">// entries will appear here as you fill them in...</span>`;
        return;
    }
    const raw = entries.map(buildJS).join(',\n');
    // Syntax highlight
    out.textContent = raw;
}

function getRawOutput() {
    return entries.map(buildJS).join(',\n');
}

function copyOutput() {
    const text = getRawOutput();
    if (!text) return showToast('Nothing to copy yet');
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
}

function copyWrapped() {
    const text = `const entries = [\n${getRawOutput()}\n];`;
    if (!entries.length) return showToast('Nothing to copy yet');
    navigator.clipboard.writeText(text).then(() => showToast('Copied with wrapper!'));
}

// ── Save / Load TXT ───────────────────────────────────────
function saveTxt() {
    if (!entries.length) return showToast('No entries to save');
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diary-entries-${todayStr()}.txt`;
    a.click();
    showToast('Saved!');
}

function loadTxt() {
    document.getElementById('loadTxtInput').click();
}

function handleLoadTxt(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const loaded = JSON.parse(ev.target.result);
            if (Array.isArray(loaded)) {
                // Merge or replace?
                if (entries.length && confirm('Merge with current entries? (Cancel = replace)')) {
                    entries = [...entries, ...loaded];
                } else {
                    entries = loaded;
                }
                renderList();
                renderOutput();
                showToast(`Loaded ${loaded.length} entries`);
            }
        } catch {
            showToast('Could not parse file');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ── Toast ──────────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Init ───────────────────────────────────────────────────
document.getElementById('globalDate').value = todayStr();
renderList();
renderOutput();
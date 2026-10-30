(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const CATS = ['Siang', 'Malam', 'Feminin', 'Maskulin', 'Unisex', 'Versatile'];
  const TIERS = [
    ['top', 'Top notes', 'Menguap dalam 5–15 menit', 20],
    ['heart', 'Heart notes', 'Bertahan 2–4 jam', 30],
    ['base', 'Base notes', 'Bertahan 4–24 jam atau lebih', 50]
  ];
  const SYS = [
    { id: 'sys-1', sys: true, name: 'Mykonos California Signature', desc: 'Floral fruity manis, versatile.', obs: 'Proyeksi awal kuat, dry down vanilla musk halus.', weight: 10, costPerGr: 8500, ratios: { top: 25, heart: 40, base: 35 }, materials: { top: 'Citrus, red berries', heart: 'White floral', base: 'Musk, vanilla' }, tags: ['Siang', 'Feminin', 'Versatile'], drive: '' },
    { id: 'sys-2', sys: true, name: 'HMNS Farhampton', desc: 'Fougère modern maskulin, bersih dan hangat.', obs: 'Bertahan 6+ jam di kulit, cocok untuk suasana profesional.', weight: 10, costPerGr: 8500, ratios: { top: 30, heart: 25, base: 45 }, materials: { top: 'Bergamot, coriander', heart: 'Lavender, orange blossom', base: 'Amber, tonka bean, cedar' }, tags: ['Siang', 'Malam', 'Maskulin', 'Versatile'], drive: '' }
  ];

  let db = Store.load(), editId = null, formTags = [], filter = 'Semua', query = '', importMode = 'merge';

  let tt;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
  function persistDb() { if (!Store.save(db)) toast('Gagal menyimpan ke browser. Unduh backup sekarang.'); updateChrome(); }
  function go(tab) {
    $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + tab));
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'lib') renderLib();
    if (tab === 'backup') renderBackup();
    scrollTo(0, 0);
  }
  function daysSince(iso) { return iso ? (Date.now() - new Date(iso)) / 864e5 : Infinity; }
  function updateChrome() {
    $('#count').textContent = db.recipes.length;
    const d = daysSince(db.settings.lastBackup), b = $('#banner');
    if (db.recipes.length && d > 7) {
      b.hidden = false;
      b.innerHTML = `<span>${db.settings.lastBackup ? 'Backup terakhir ' + Math.floor(d) + ' hari lalu.' : 'Resep Anda belum pernah dicadangkan.'}</span><button data-go="backup">Cadangkan</button>`;
    } else b.hidden = true;
    $('#store-state').textContent = `${db.recipes.length} resep di perangkat ini`;
  }

  function renderTiers() {
    $('#tiers').innerHTML = TIERS.map(([k, n, h, v]) => `
      <div class="tier">
        <div class="tier-h"><div><h3>${n}</h3><small>${h}</small></div>
        <div class="tier-v"><b id="g-${k}">0.000</b> g<span id="p-${k}"></span></div></div>
        <input type="range" id="s-${k}" min="0" max="100" value="${v}" aria-label="Rasio ${n}">
        <input type="text" id="m-${k}" placeholder="Material dominan (opsional)"></div>`).join('');
    TIERS.forEach(([k]) => $('#s-' + k).addEventListener('input', calc));
  }
  function renderFormTags() {
    $('#tag-form').innerHTML = CATS.map(t => `<button type="button" class="chip ${formTags.includes(t) ? 'on' : ''}" data-tag="${t}">${t}</button>`).join('');
  }
  function ratios() { const r = {}; TIERS.forEach(([k]) => r[k] = parseInt($('#s-' + k).value) || 0); return r; }
  function calc() {
    const r = ratios(), w = parseFloat($('#in-weight').value) || 0, c = parseFloat($('#in-cost').value) || 0;
    const total = r.top + r.heart + r.base;
    TIERS.forEach(([k]) => {
      $('#s-' + k).style.setProperty('--v', r[k] + '%');
      $('#g-' + k).textContent = (w * r[k] / 100).toFixed(3);
      $('#p-' + k).textContent = r[k] + '%';
    });
    $('#sum-total').textContent = total + '%';
    $('#sum-cost').textContent = rp(w * c);
    const ok = total === 100, m = $('#sum-msg');
    $('#btn-save').disabled = !ok;
    m.className = 'msg' + (ok ? '' : ' bad');
    m.textContent = ok ? '' : `Total rasio ${total}%. ${total < 100 ? 'Kurang' : 'Lebih'} ${Math.abs(100 - total)}% dari 100%.`;
  }
  function balance() {
    const r = ratios(), t = r.top + r.heart + r.base;
    if (!t) { TIERS.forEach(([k, , , v]) => $('#s-' + k).value = v); return calc(); }
    const a = Math.round(r.top / t * 100), b = Math.round(r.heart / t * 100);
    TIERS.forEach(([k], i) => $('#s-' + k).value = [a, b, 100 - a - b][i]);
    calc();
  }
  function fill(r, asCopy) {
    const copy = asCopy || r.sys;
    editId = copy ? null : r.id;
    $('#in-name').value = copy ? r.name + ' (salinan)' : r.name;
    $('#in-desc').value = r.desc || ''; $('#in-obs').value = r.obs || ''; $('#in-drive').value = r.drive || '';
    $('#in-weight').value = Number(r.weight).toFixed(3); $('#in-cost').value = r.costPerGr;
    TIERS.forEach(([k]) => { $('#s-' + k).value = r.ratios[k]; $('#m-' + k).value = (r.materials && r.materials[k]) || ''; });
    formTags = [...(r.tags || [])]; renderFormTags(); calc();
    $('#lab-title').textContent = editId ? 'Ubah formula' : 'Formula dari salinan';
    $('#btn-save').textContent = editId ? 'Perbarui resep' : 'Simpan resep';
  }
  function resetForm() {
    editId = null; formTags = [];
    ['#in-name', '#in-desc', '#in-obs', '#in-drive', '#m-top', '#m-heart', '#m-base'].forEach(s => $(s).value = '');
    $('#in-weight').value = '10.000'; $('#in-cost').value = 8500;
    TIERS.forEach(([k, , , v]) => $('#s-' + k).value = v);
    $('#lab-title').textContent = 'Desain formula'; $('#btn-save').textContent = 'Simpan resep';
    renderFormTags(); calc();
  }
  function saveRecipe() {
    const name = $('#in-name').value.trim();
    if (!name) { toast('Nama formula wajib diisi.'); $('#in-name').focus(); return; }
    const drive = $('#in-drive').value.trim();
    if (drive && !safeUrl(drive)) { toast('Link Drive harus diawali https://'); return; }
    const now = new Date().toISOString(), old = db.recipes.find(x => x.id === editId);
    const rec = {
      id: old ? old.id : Store.uid(), name, desc: $('#in-desc').value.trim(), obs: $('#in-obs').value.trim(), drive,
      weight: parseFloat($('#in-weight').value) || 0, costPerGr: parseFloat($('#in-cost').value) || 0,
      ratios: ratios(), tags: [...formTags],
      materials: { top: $('#m-top').value.trim(), heart: $('#m-heart').value.trim(), base: $('#m-base').value.trim() },
      createdAt: old ? old.createdAt : now, updatedAt: now
    };
    if (old) db.recipes[db.recipes.indexOf(old)] = rec; else db.recipes.unshift(rec);
    persistDb(); toast(old ? 'Resep diperbarui.' : 'Resep disimpan.'); resetForm(); go('lib');
  }

  function renderFilter() {
    $('#tag-filter').innerHTML = ['Semua', ...CATS].map(t => `<button class="chip ${filter === t ? 'on' : ''}" data-filter="${t}">${t}</button>`).join('');
  }
  function card(r) {
    const link = safeUrl(r.drive);
    return `<article class="card">
      <header><h3>${esc(r.name)}</h3>${r.sys ? '<span class="chip solid">Referensi</span>' : ''}</header>
      <div class="tags">${(r.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      ${r.desc ? `<p><b>Profil</b>${esc(r.desc)}</p>` : ''}${r.obs ? `<p><b>Observasi</b>${esc(r.obs)}</p>` : ''}
      <div class="bar"><i style="width:${r.ratios.top}%;opacity:1"></i><i style="width:${r.ratios.heart}%;opacity:.6"></i><i style="width:${r.ratios.base}%;opacity:.3"></i></div>
      <dl class="ratio">${TIERS.map(([k, n], i) => `<div><dt><span class="dot" style="opacity:${[1, .6, .3][i]}"></span>${n.split(' ')[0]}</dt><dd>${r.ratios[k]}%</dd></div>`).join('')}</dl>
      <div class="meta"><span>${rp(r.weight * r.costPerGr)}</span><span>${Number(r.weight).toFixed(3)} g bibit</span>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Foto di Drive</a>` : ''}</div>
      <footer>
        <button data-a="${r.sys ? 'copy' : 'edit'}" data-id="${r.id}">${r.sys ? 'Bedah' : 'Ubah'}</button>
        ${r.sys ? '' : `<button data-a="copy" data-id="${r.id}">Duplikat</button>`}
        <button data-a="json" data-id="${r.id}">.json</button>
        <button data-a="txt" data-id="${r.id}">.txt</button>
        ${r.sys ? '' : `<button class="del ghost" data-a="del" data-id="${r.id}">Hapus</button>`}
      </footer></article>`;
  }
  function renderLib() {
    renderFilter();
    const q = query.toLowerCase();
    const list = [...db.recipes, ...SYS].filter(r =>
      (filter === 'Semua' || (r.tags || []).includes(filter)) &&
      (!q || [r.name, r.desc, r.obs].join(' ').toLowerCase().includes(q)));
    $('#grid').innerHTML = list.length ? list.map(card).join('') :
      `<div class="empty">Tidak ada resep yang cocok. Buat formula baru di Laboratorium.</div>`;
  }
  const find = id => [...db.recipes, ...SYS].find(r => r.id === id);

  function renderBackup() {
    $('#st-count').textContent = db.recipes.length;
    const l = db.settings.lastBackup;
    $('#st-last').textContent = l ? new Date(l).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah';
    $('#in-folder').value = db.settings.drive || '';
    Store.persist().then(p => $('#st-persist').textContent = p === null ? 'Tidak didukung' : p ? 'Aktif' : 'Belum diberikan browser');
  }
  function doImport(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const inc = Store.parse(fr.result);
        if (importMode === 'replace') {
          if (!confirm(`Ganti seluruh data (${db.recipes.length} resep) dengan isi file (${inc.recipes.length} resep)?`)) return;
          toast(`${Store.replaceWith(db, inc)} resep dipulihkan.`);
        } else toast(`${Store.mergeIn(db, inc)} resep baru ditambahkan.`);
        persistDb(); renderBackup(); renderLib();
      } catch (e) { toast(e.message || 'File tidak bisa dibaca.'); }
    };
    fr.readAsText(file);
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tab) go(t.dataset.tab);
    if (t.dataset.go) go(t.dataset.go);
    if (t.dataset.tag) { const g = t.dataset.tag; formTags = formTags.includes(g) ? formTags.filter(x => x !== g) : [...formTags, g]; renderFormTags(); }
    if (t.dataset.filter) { filter = t.dataset.filter; renderLib(); }
    if (t.dataset.a) {
      const r = find(t.dataset.id); if (!r) return;
      const a = t.dataset.a;
      if (a === 'edit') { fill(r); go('lab'); }
      if (a === 'copy') { fill(r, true); go('lab'); }
      if (a === 'json') Store.exportRecipeJson(r);
      if (a === 'txt') Store.exportRecipeText(r);
      if (a === 'del' && confirm(`Hapus "${r.name}"? Pastikan sudah ada backup.`)) { db.recipes = db.recipes.filter(x => x.id !== r.id); persistDb(); renderLib(); toast('Resep dihapus.'); }
    }
  });
  $('#btn-save').addEventListener('click', saveRecipe);
  $('#btn-balance').addEventListener('click', balance);
  $('#btn-reset').addEventListener('click', resetForm);
  ['#in-weight', '#in-cost'].forEach(s => $(s).addEventListener('input', calc));
  $('#search').addEventListener('input', e => { query = e.target.value; renderLib(); });
  $('#theme').addEventListener('click', () => {
    const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = n; db.settings.theme = n; persistDb();
  });
  $('#bk-export').addEventListener('click', () => { Store.exportAll(db); updateChrome(); renderBackup(); toast('Backup diunduh. Unggah ke Drive.'); });
  $('#bk-csv').addEventListener('click', () => db.recipes.length ? Store.exportCsv(db.recipes) : toast('Belum ada resep untuk diekspor.'));
  $('#bk-merge').addEventListener('click', () => { importMode = 'merge'; $('#bk-file').click(); });
  $('#bk-replace').addEventListener('click', () => { importMode = 'replace'; $('#bk-file').click(); });
  $('#bk-file').addEventListener('change', e => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });
  $('#dr-save').addEventListener('click', () => {
    const v = $('#in-folder').value.trim();
    if (v && !safeUrl(v)) return toast('Link harus diawali https://');
    db.settings.drive = v; persistDb(); toast('Link folder Drive disimpan.');
  });
  $('#dr-open').addEventListener('click', () => {
    const u = safeUrl(db.settings.drive);
    u ? window.open(u, '_blank', 'noopener') : toast('Simpan link folder Drive terlebih dahulu.');
  });

  renderTiers(); renderFormTags(); calc(); updateChrome();
  Store.persist();
})();

(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  const nf = Store.nf, rp = n => 'Rp ' + nf(Math.round(n)), g3 = n => nf(n, 3) + ' g';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parseNum = s => { s = String(s ?? '').trim().replace(/\s/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, ''); return parseFloat(s) || 0; };
  const parseMoney = s => parseInt(String(s ?? '').replace(/\D/g, '')) || 0;

  const CATS = ['Siang', 'Malam', 'Feminin', 'Maskulin', 'Unisex', 'Versatile'];
  const TIERS = [['top', 'Top notes', 'Menguap dalam 5–15 menit', 20], ['heart', 'Heart notes', 'Bertahan 2–4 jam', 30], ['base', 'Base notes', 'Bertahan 4–24 jam atau lebih', 50]];
  const STATUS = { draft: 'Draft', macerasi: 'Maserasi', siap: 'Siap pakai', arsip: 'Arsip' };
  const PRESETS = [['EDC', 5], ['EDT', 10], ['EDP', 18], ['Parfum', 25]];
  const SORTS = { baru: 'Terbaru', nama: 'Nama A–Z', rating: 'Penilaian tertinggi', hpp: 'HPP terendah' };
  const SYS = [
    { id: 'sys-1', name: 'Mykonos California Signature', desc: 'Floral fruity manis, versatile.', obs: 'Proyeksi awal kuat, dry down vanilla musk halus.', total: 50, conc: 20, costOil: 8500, ratios: { top: 25, heart: 40, base: 35 }, materials: { top: 'Citrus, red berries', heart: 'White floral', base: 'Musk, vanilla' }, tags: ['Siang', 'Feminin', 'Versatile'], status: 'siap', rating: 4 },
    { id: 'sys-2', name: 'HMNS Farhampton', desc: 'Fougère modern maskulin, bersih dan hangat.', obs: 'Bertahan 6+ jam di kulit, cocok untuk suasana profesional.', total: 50, conc: 20, costOil: 8500, ratios: { top: 30, heart: 25, base: 45 }, materials: { top: 'Bergamot, coriander', heart: 'Lavender, orange blossom', base: 'Amber, tonka bean, cedar' }, tags: ['Siang', 'Malam', 'Maskulin', 'Versatile'], status: 'siap', rating: 5 }
  ].map(r => ({ ...Store.migrate(r), sys: true }));

  let db = Store.load(), editId = null, editFav = false, formTags = [], rating = 0, importMode = 'merge';
  let q = '', sort = 'baru', fStatus = 'all', fCat = 'Semua';

  /* ---------- util ---------- */
  let tt;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2800); }
  function persistDb() { if (!Store.save(db)) toast('Gagal menyimpan ke browser. Unduh backup sekarang.'); updateChrome(); }
  function tween(el, to, dg = 0, pre = '') {
    cancelAnimationFrame(el._r);
    const from = el._v ?? 0, t0 = performance.now(), D = reduce ? 0 : 380;
    const step = t => { const k = D ? Math.min(1, (t - t0) / D) : 1, v = from + (to - from) * (1 - Math.pow(1 - k, 3)); el.textContent = pre + nf(v, dg); el._v = v; if (k < 1) el._r = requestAnimationFrame(step); };
    el._r = requestAnimationFrame(step);
  }
  const daysSince = iso => iso ? (Date.now() - new Date(iso)) / 864e5 : Infinity;
  const fmtDate = d => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  function ready(r) {
    if (!r.macStart) return null;
    const s = new Date(r.macStart + 'T00:00:00'); if (isNaN(s)) return null;
    const e = new Date(s.getTime() + r.macWeeks * 7 * 864e5), now = new Date();
    return { end: e, left: Math.ceil((e - now) / 864e5), prog: Math.min(1, Math.max(0, (now - s) / (e - s))) };
  }
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const allRecipes = () => [...db.recipes, ...SYS];
  const find = id => allRecipes().find(r => r.id === id);

  function go(tab) {
    $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + tab));
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'dash') renderDash();
    if (tab === 'lib') renderLib();
    if (tab === 'backup') renderBackup();
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  function updateChrome() {
    $('#count').textContent = nf(db.recipes.length);
    $('#store-state').textContent = `${nf(db.recipes.length)} resep di perangkat ini`;
    const d = daysSince(db.settings.lastBackup), b = $('#banner');
    if (db.recipes.length && d > 7) {
      b.hidden = false;
      b.innerHTML = `<span>${db.settings.lastBackup ? 'Backup terakhir ' + Math.floor(d) + ' hari lalu.' : 'Resep Anda belum pernah dicadangkan.'}</span><button data-go="backup">Cadangkan sekarang</button>`;
    } else b.hidden = true;
  }

  /* ---------- ringkasan ---------- */
  function renderDash() {
    const L = db.recipes, mac = L.filter(r => r.status === 'macerasi');
    tween($('#d-total'), L.length); tween($('#d-fav'), L.filter(r => r.fav).length); tween($('#d-mac'), mac.length);
    tween($('#d-avg'), L.length ? L.reduce((a, r) => a + Store.derive(r).cost, 0) / L.length : 0, 0, 'Rp ');
    $('#d-maclist').innerHTML = mac.length ? mac.map(r => {
      const y = ready(r), txt = !y ? 'Tanggal mulai belum diisi' : y.left > 0 ? `${nf(y.left)} hari lagi, siap ${fmtDate(y.end)}` : 'Siap diuji';
      return `<div class="row-item" data-a="view" data-id="${r.id}"><div style="flex:1"><b>${esc(r.name)}</b><small>${txt}</small><div class="prog"><i style="width:${y ? Math.round(y.prog * 100) : 0}%"></i></div></div></div>`;
    }).join('') : '<p class="empty">Belum ada resep yang sedang maserasi.</p>';
    $('#d-recent').innerHTML = L.length ? L.slice(0, 5).map(r => `<div class="row-item" data-a="view" data-id="${r.id}"><div><b>${esc(r.name)}</b><small>${rp(Store.derive(r).cost)} · ${g3(r.total)}</small></div><span class="pill ${r.status}">${STATUS[r.status]}</span></div>`).join('')
      : '<p class="empty">Belum ada resep. Mulai dari Laboratorium.</p>';
    const l = db.settings.lastBackup;
    $('#d-backup').textContent = l ? `Backup terakhir ${fmtDate(new Date(l))}, berisi ${nf((db.settings.history[0] || {}).count || 0)} resep.` : 'Belum pernah dibuat. Unduh backup dan simpan di Drive.';
  }

  /* ---------- laboratorium ---------- */
  function renderTiers() {
    $('#tiers').innerHTML = TIERS.map(([k, n, h, v]) => `
      <div class="tier"><div class="tier-h"><div><h3>${n}</h3><small>${h}</small></div>
      <div class="tier-v"><b id="g-${k}">0,000</b> g<span id="p-${k}"></span></div></div>
      <input type="range" id="s-${k}" min="0" max="100" value="${v}" aria-label="Rasio ${n}">
      <input type="text" id="m-${k}" placeholder="Material dominan (opsional)"></div>`).join('');
    $('#in-status').innerHTML = Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    $('#sort').innerHTML = Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  }
  function renderFormTags() { $('#tag-form').innerHTML = CATS.map(t => `<button type="button" class="chip ${formTags.includes(t) ? 'on' : ''}" data-tag="${t}">${t}</button>`).join(''); }
  function renderRating() { $('#rating').innerHTML = [1, 2, 3, 4, 5].map(i => `<button type="button" class="${i <= rating ? 'on' : ''}" data-star="${i}" aria-label="${i} bintang">★</button>`).join(''); }
  const ratios = () => { const r = {}; TIERS.forEach(([k]) => r[k] = parseInt($('#s-' + k).value) || 0); return r; };
  function readForm() {
    return {
      name: $('#in-name').value.trim(), total: parseNum($('#in-total').value), conc: Math.min(100, Math.max(0, parseNum($('#in-conc').value))),
      costOil: parseMoney($('#in-coil').value), costAlc: parseMoney($('#in-calc').value), ratios: ratios(),
      materials: { top: $('#m-top').value.trim(), heart: $('#m-heart').value.trim(), base: $('#m-base').value.trim() },
      tags: [...formTags], desc: $('#in-desc').value.trim(), obs: $('#in-obs').value.trim(), drive: $('#in-drive').value.trim(),
      status: $('#in-status').value, macStart: $('#in-start').value, macWeeks: Math.max(1, parseInt($('#in-weeks').value) || 4), rating
    };
  }
  function calc() {
    const f = readForm(), x = Store.derive(f), tot = f.ratios.top + f.ratios.heart + f.ratios.base;
    TIERS.forEach(([k]) => { $('#s-' + k).style.setProperty('--v', f.ratios[k] + '%'); $('#g-' + k).textContent = nf(x.tier[k], 3); $('#p-' + k).textContent = f.ratios[k] + '%'; });
    $('#presets').innerHTML = PRESETS.map(([n, v]) => `<button type="button" class="chip ${f.conc === v ? 'on' : ''}" data-preset="${v}">${n} ${v}%</button>`).join('');
    const bad = tot !== 100 || f.total <= 0;
    $('#ratio-total').textContent = `Total ${tot}%`; $('#ratio-total').classList.toggle('bad', tot !== 100);
    $('#sum-msg').className = 'msg' + (bad ? ' bad' : '');
    $('#sum-msg').textContent = tot !== 100 ? `Total rasio ${tot}%, ${tot < 100 ? 'kurang' : 'lebih'} ${Math.abs(100 - tot)}% dari 100%.` : f.total <= 0 ? 'Isi total massa lebih dari 0 g.' : '';
    $('#btn-save').disabled = bad;
    $('#sheet').innerHTML = TIERS.map(([k, n]) => `<tr><td>${n}<small>${f.ratios[k]}% · ${esc(f.materials[k] || 'material belum diisi')}</small></td><td>${g3(x.tier[k])}</td></tr>`).join('')
      + `<tr><td>Alkohol<small>${nf(100 - f.conc, 1)}% dari total massa</small></td><td>${g3(x.alc)}</td></tr>`;
    tween($('#sum-oil'), x.oil, 3); tween($('#sum-alc'), x.alc, 3); tween($('#sum-cost'), x.cost, 0, 'Rp ');
    $('#sum-total').textContent = g3(f.total); $('#sum-coil').textContent = rp(x.cOil); $('#sum-calc').textContent = rp(x.cAlc); $('#sum-cpg').textContent = rp(x.cpg);
    const y = ready(f);
    $('#ready-info').textContent = !f.macStart ? 'Isi tanggal mulai untuk menghitung estimasi siap diuji.' : y.left > 0 ? `Siap diuji pada ${fmtDate(y.end)} (${nf(y.left)} hari lagi).` : `Masa maserasi selesai pada ${fmtDate(y.end)}.`;
  }
  function balance() {
    const r = ratios(), t = r.top + r.heart + r.base;
    if (!t) TIERS.forEach(([k, , , v]) => $('#s-' + k).value = v);
    else { const a = Math.round(r.top / t * 100), b = Math.round(r.heart / t * 100); TIERS.forEach(([k], i) => $('#s-' + k).value = [a, b, 100 - a - b][i]); }
    calc();
  }
  const numStr = (n, d = 3) => nf(n, d);
  function fill(r, copy) {
    copy = copy || r.sys; editId = copy ? null : r.id; editFav = copy ? false : r.fav;
    $('#in-name').value = copy ? r.name + ' (salinan)' : r.name;
    $('#in-total').value = numStr(r.total); $('#in-conc').value = String(r.conc).replace('.', ',');
    $('#in-coil').value = nf(r.costOil); $('#in-calc').value = nf(r.costAlc);
    TIERS.forEach(([k]) => { $('#s-' + k).value = r.ratios[k]; $('#m-' + k).value = r.materials[k] || ''; });
    $('#in-desc').value = r.desc; $('#in-obs').value = r.obs; $('#in-drive').value = r.drive;
    $('#in-status').value = copy ? 'draft' : r.status; $('#in-start').value = copy ? '' : r.macStart; $('#in-weeks').value = r.macWeeks;
    formTags = [...r.tags]; rating = copy ? 0 : r.rating; renderFormTags(); renderRating(); calc();
    $('#lab-title').textContent = editId ? 'Ubah formula' : 'Formula dari salinan';
    $('#btn-save').textContent = editId ? 'Perbarui resep' : 'Simpan resep';
  }
  function resetForm() {
    editId = null; editFav = false; formTags = []; rating = 0;
    ['#in-name', '#in-desc', '#in-obs', '#in-drive', '#in-start', '#m-top', '#m-heart', '#m-base'].forEach(s => $(s).value = '');
    $('#in-total').value = '50,000'; $('#in-conc').value = '20'; $('#in-coil').value = '8.500'; $('#in-calc').value = '0'; $('#in-weeks').value = 4; $('#in-status').value = 'draft';
    TIERS.forEach(([k, , , v]) => $('#s-' + k).value = v);
    $('#lab-title').textContent = 'Desain formula'; $('#btn-save').textContent = 'Simpan resep';
    renderFormTags(); renderRating(); calc();
  }
  function saveRecipe() {
    const f = readForm();
    if (!f.name) { toast('Nama formula wajib diisi.'); $('#in-name').focus(); return; }
    if (f.drive && !safeUrl(f.drive)) { toast('Link Drive harus diawali https://'); $('#in-drive').focus(); return; }
    const now = new Date().toISOString(), old = db.recipes.find(x => x.id === editId);
    const rec = { ...f, id: old ? old.id : Store.uid(), fav: editFav, createdAt: old ? old.createdAt : now, updatedAt: now };
    if (old) db.recipes[db.recipes.indexOf(old)] = rec; else db.recipes.unshift(rec);
    persistDb(); toast(old ? 'Resep diperbarui.' : 'Resep disimpan.'); resetForm(); go('lib');
  }

  /* ---------- pustaka ---------- */
  function renderFilters() {
    $('#status-filter').innerHTML = [['all', 'Semua status'], ...Object.entries(STATUS)].map(([k, v]) => `<button class="chip ${fStatus === k ? 'on' : ''}" data-status="${k}">${v}</button>`).join('');
    $('#tag-filter').innerHTML = ['Semua', ...CATS].map(t => `<button class="chip ${fCat === t ? 'on' : ''}" data-cat="${t}">${t === 'Semua' ? 'Semua kategori' : t}</button>`).join('');
  }
  function card(r, i) {
    const x = Store.derive(r), link = safeUrl(r.drive), y = r.status === 'macerasi' ? ready(r) : null;
    return `<article class="card" style="--i:${Math.min(i, 10)}">
      <header><h3 data-a="view" data-id="${r.id}">${esc(r.name)}</h3>${r.sys ? '<span class="chip solid">Referensi</span>' : `<button class="fav ${r.fav ? 'on' : ''}" data-a="fav" data-id="${r.id}" aria-label="Favorit">★</button>`}</header>
      <div class="tags"><span class="pill ${r.status}">${STATUS[r.status]}</span>${r.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      ${r.desc ? `<p><b>Profil</b>${esc(r.desc)}</p>` : ''}${r.obs ? `<p><b>Observasi</b>${esc(r.obs)}</p>` : ''}
      <div class="bar"><i style="width:${r.ratios.top}%;opacity:1"></i><i style="width:${r.ratios.heart}%;opacity:.62"></i><i style="width:${r.ratios.base}%;opacity:.32"></i></div>
      <dl class="ratio">${TIERS.map(([k, n], j) => `<div><dt><span class="dot" style="opacity:${[1, .62, .32][j]}"></span>${n.split(' ')[0]}</dt><dd>${r.ratios[k]}%</dd></div>`).join('')}</dl>
      <div class="meta"><span><strong>${rp(x.cost)}</strong></span><span>${g3(r.total)} · ${nf(r.conc, 1)}% bibit</span>${r.rating ? `<span>${stars(r.rating)}</span>` : ''}${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Foto di Drive</a>` : ''}</div>
      ${y ? `<div><small class="mute">${y.left > 0 ? nf(y.left) + ' hari lagi maserasi selesai' : 'Maserasi selesai, siap diuji'}</small><div class="prog"><i style="width:${Math.round(y.prog * 100)}%"></i></div></div>` : ''}
      <footer>
        <button data-a="view" data-id="${r.id}">Detail</button>
        <button data-a="${r.sys ? 'copy' : 'edit'}" data-id="${r.id}">${r.sys ? 'Bedah' : 'Ubah'}</button>
        ${r.sys ? '' : `<button data-a="copy" data-id="${r.id}">Duplikat</button>`}
        <button data-a="json" data-id="${r.id}">.json</button><button data-a="txt" data-id="${r.id}">.txt</button>
        ${r.sys ? '' : `<button class="del" data-a="del" data-id="${r.id}">Hapus</button>`}
      </footer></article>`;
  }
  function renderLib() {
    renderFilters(); $('#sort').value = sort;
    const s = q.toLowerCase();
    let list = allRecipes().filter(r => (fStatus === 'all' || r.status === fStatus) && (fCat === 'Semua' || r.tags.includes(fCat)) && (!s || [r.name, r.desc, r.obs].join(' ').toLowerCase().includes(s)));
    const cmp = { baru: (a, b) => b.createdAt.localeCompare(a.createdAt), nama: (a, b) => a.name.localeCompare(b.name), rating: (a, b) => b.rating - a.rating, hpp: (a, b) => Store.derive(a).cost - Store.derive(b).cost }[sort];
    list = list.sort(cmp);
    $('#grid').innerHTML = list.length ? list.map(card).join('') : '<p class="empty" style="grid-column:1/-1">Tidak ada resep yang cocok dengan filter ini.</p>';
  }

  /* ---------- detail ---------- */
  function view(r) {
    const x = Store.derive(r), y = ready(r), link = safeUrl(r.drive);
    $('#m-body').innerHTML = `<h2 id="m-title">${esc(r.name)}</h2>
      <div class="tags"><span class="pill ${r.status}">${STATUS[r.status]}</span>${r.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}${r.rating ? `<span class="chip">${stars(r.rating)}</span>` : ''}</div>
      <table class="tbl"><tbody>
        ${TIERS.map(([k, n]) => `<tr><td>${n}<small>${r.ratios[k]}% · ${esc(r.materials[k] || 'material belum diisi')}</small></td><td>${g3(x.tier[k])}</td></tr>`).join('')}
        <tr><td>Alkohol<small>${nf(100 - r.conc, 1)}%</small></td><td>${g3(x.alc)}</td></tr>
        <tr><td><b>Total massa</b><small>${nf(r.conc, 1)}% bibit</small></td><td>${g3(r.total)}</td></tr></tbody></table>
      <dl class="kv"><div><dt>HPP bibit</dt><dd>${rp(x.cOil)}</dd></div><div><dt>HPP alkohol</dt><dd>${rp(x.cAlc)}</dd></div><div class="tot"><dt>Estimasi HPP</dt><dd>${rp(x.cost)}</dd></div><div><dt>HPP per gram jadi</dt><dd>${rp(x.cpg)}</dd></div>
      ${y ? `<div><dt>Maserasi</dt><dd>${r.macWeeks} minggu, siap ${fmtDate(y.end)}</dd></div>` : ''}</dl>
      ${r.desc ? `<p><b>Profil.</b> ${esc(r.desc)}</p>` : ''}${r.obs ? `<p><b>Observasi.</b> ${esc(r.obs)}</p>` : ''}
      ${link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener" style="color:var(--bur);font-weight:600">Buka foto di Drive</a></p>` : ''}
      <div class="actions"><button class="primary" data-a="${r.sys ? 'copy' : 'edit'}" data-id="${r.id}">${r.sys ? 'Bedah di Laboratorium' : 'Ubah resep'}</button>
      <button data-a="copytxt" data-id="${r.id}">Salin lembar</button><button data-a="txt" data-id="${r.id}">.txt</button><button data-a="json" data-id="${r.id}">.json</button></div>`;
    const m = $('#modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); $('.x').focus();
  }
  function closeModal() { const m = $('#modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }

  /* ---------- cadangan ---------- */
  function renderBackup() {
    $('#st-count').textContent = nf(db.recipes.length);
    const l = db.settings.lastBackup;
    $('#st-last').textContent = l ? new Date(l).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah';
    $('#in-folder').value = db.settings.drive || '';
    const h = db.settings.history || [];
    $('#history').innerHTML = h.length ? h.map(e => `<li><span>${new Date(e.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span><span>${nf(e.count)} resep</span></li>`).join('') : '<li>Belum ada riwayat.</li>';
    Store.persist().then(p => $('#st-persist').textContent = p === null ? 'Tidak didukung' : p ? 'Aktif' : 'Belum diberikan browser');
  }
  function doImport(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const inc = Store.parse(fr.result);
        if (importMode === 'replace') {
          if (!confirm(`Ganti seluruh data (${db.recipes.length} resep) dengan isi file (${inc.recipes.length} resep)?`)) return;
          toast(`${nf(Store.replaceWith(db, inc))} resep dipulihkan.`);
        } else toast(`${nf(Store.mergeIn(db, inc))} resep baru ditambahkan.`);
        persistDb(); renderBackup(); renderLib(); renderDash();
      } catch (e) { toast(e.message || 'File tidak bisa dibaca.'); }
    };
    fr.readAsText(file);
  }

  /* ---------- event ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a],[data-tab],[data-go],[data-tag],[data-status],[data-cat],[data-star],[data-preset],[data-newlab],[data-close]');
    if (e.target.id === 'modal' || (t && t.dataset.close !== undefined)) return closeModal();
    if (!t) return;
    const d = t.dataset;
    if (d.tab) go(d.tab);
    if (d.go) go(d.go);
    if (d.newlab !== undefined) { resetForm(); go('lab'); }
    if (d.tag) { formTags = formTags.includes(d.tag) ? formTags.filter(x => x !== d.tag) : [...formTags, d.tag]; renderFormTags(); }
    if (d.star) { rating = rating === +d.star ? 0 : +d.star; renderRating(); }
    if (d.preset) { $('#in-conc').value = d.preset; calc(); }
    if (d.status) { fStatus = d.status; renderLib(); }
    if (d.cat) { fCat = d.cat; renderLib(); }
    if (d.a) {
      const r = find(d.id); if (!r) return;
      if (d.a === 'view') view(r);
      if (d.a === 'edit') { closeModal(); fill(r); go('lab'); }
      if (d.a === 'copy') { closeModal(); fill(r, true); go('lab'); }
      if (d.a === 'json') Store.exportRecipeJson(r);
      if (d.a === 'txt') Store.exportRecipeText(r);
      if (d.a === 'copytxt') navigator.clipboard.writeText(Store.recipeText(r)).then(() => toast('Lembar formula disalin.'), () => toast('Gagal menyalin. Gunakan unduhan .txt.'));
      if (d.a === 'fav') { r.fav = !r.fav; persistDb(); renderLib(); }
      if (d.a === 'del' && confirm(`Hapus "${r.name}"? Pastikan sudah ada backup.`)) { db.recipes = db.recipes.filter(x => x.id !== r.id); persistDb(); renderLib(); toast('Resep dihapus.'); }
    }
  });
  $('#tab-lab').addEventListener('input', e => {
    if (e.target.classList.contains('money')) e.target.value = nf(parseMoney(e.target.value));
    calc();
  });
  $('#in-total').addEventListener('blur', e => e.target.value = nf(parseNum(e.target.value), 3));
  $('#btn-save').addEventListener('click', saveRecipe);
  $('#btn-balance').addEventListener('click', balance);
  $('#btn-reset').addEventListener('click', () => { resetForm(); toast('Formulir dikosongkan.'); });
  $('#search').addEventListener('input', e => { q = e.target.value; renderLib(); });
  $('#sort').addEventListener('change', e => { sort = e.target.value; renderLib(); });
  $('#theme').addEventListener('click', () => {
    const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = n; db.settings.theme = n; persistDb();
  });
  $('#bk-export').addEventListener('click', () => { Store.exportAll(db); updateChrome(); renderBackup(); toast('Backup diunduh. Unggah ke Drive.'); });
  $('#bk-csv').addEventListener('click', () => db.recipes.length ? Store.exportCsv(db.recipes) : toast('Belum ada resep untuk diekspor.'));
  $('#bk-merge').addEventListener('click', () => { importMode = 'merge'; $('#bk-file').click(); });
  $('#bk-replace').addEventListener('click', () => { importMode = 'replace'; $('#bk-file').click(); });
  $('#bk-file').addEventListener('change', e => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });
  $('#bk-wipe').addEventListener('click', () => {
    if (!confirm('Hapus SEMUA resep dan pengaturan di browser ini?')) return;
    if (!confirm('Yakin? Tindakan ini tidak bisa dibatalkan.')) return;
    Store.wipe(); db = Store.load(); document.documentElement.dataset.theme = 'light';
    updateChrome(); renderBackup(); renderDash(); renderLib(); toast('Semua data dihapus.');
  });
  $('#dr-save').addEventListener('click', () => {
    const v = $('#in-folder').value.trim();
    if (v && !safeUrl(v)) return toast('Link harus diawali https://');
    db.settings.drive = v; persistDb(); toast('Link folder Drive disimpan.');
  });
  $('#dr-open').addEventListener('click', () => { const u = safeUrl(db.settings.drive); u ? window.open(u, '_blank', 'noopener') : toast('Simpan link folder Drive terlebih dahulu.'); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && $('#tab-lab').classList.contains('on')) { e.preventDefault(); if (!$('#btn-save').disabled) saveRecipe(); }
  });

  renderTiers(); renderFormTags(); renderRating(); calc(); updateChrome(); renderDash();
  Store.persist();
})();

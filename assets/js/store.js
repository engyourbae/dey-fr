/* Penyimpanan lokal, ekspor, impor, dan backup */
const Store = (() => {
  const KEY = 'dey_sillage_v2';
  const blank = () => ({ v: 2, recipes: [], settings: { drive: '', lastBackup: null, theme: '' } });

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.recipes)) return { ...blank(), ...d, settings: { ...blank().settings, ...d.settings } };
    } catch (e) {}
    return blank();
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const slug = s => (s || 'resep').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resep';
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function exportAll(d) {
    d.settings.lastBackup = new Date().toISOString();
    save(d);
    download(`DEY-backup-${today()}.json`, JSON.stringify({ app: 'DEY SillageArchitect', exportedAt: d.settings.lastBackup, ...d }, null, 2));
  }
  function parse(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.recipes)) throw new Error('Format file tidak dikenali.');
    return d;
  }
  function mergeIn(d, inc) {
    const ids = new Set(d.recipes.map(r => r.id));
    let n = 0;
    inc.recipes.forEach(r => { if (r && r.id && r.name && !ids.has(r.id)) { d.recipes.push(r); n++; } });
    return n;
  }
  function replaceWith(d, inc) {
    d.recipes = inc.recipes.filter(r => r && r.id && r.name);
    if (inc.settings && inc.settings.drive) d.settings.drive = inc.settings.drive;
    return d.recipes.length;
  }
  function exportRecipeJson(r) {
    download(`DEY-${slug(r.name)}.json`, JSON.stringify({ app: 'DEY SillageArchitect', recipes: [r] }, null, 2));
  }
  function recipeText(r) {
    const g = k => (r.weight * r.ratios[k] / 100).toFixed(3);
    const m = k => (r.materials && r.materials[k]) ? `  (${r.materials[k]})` : '';
    return [
      `DEY SillageArchitect | Lembar formula`, '='.repeat(40),
      `Nama      : ${r.name}`,
      `Kategori  : ${(r.tags || []).join(', ') || '-'}`,
      `Dibuat    : ${(r.createdAt || '').slice(0, 10)}`, '',
      `Jumlah bibit : ${r.weight.toFixed(3)} g`,
      `HPP bibit    : Rp ${Math.round(r.weight * r.costPerGr).toLocaleString('id-ID')}`, '',
      `Top   ${String(r.ratios.top).padStart(3)}%  ${g('top')} g${m('top')}`,
      `Heart ${String(r.ratios.heart).padStart(3)}%  ${g('heart')} g${m('heart')}`,
      `Base  ${String(r.ratios.base).padStart(3)}%  ${g('base')} g${m('base')}`, '',
      `Profil    : ${r.desc || '-'}`,
      `Observasi : ${r.obs || '-'}`,
      `Foto      : ${r.drive || '-'}`, ''
    ].join('\n');
  }
  function exportRecipeText(r) { download(`DEY-${slug(r.name)}.txt`, recipeText(r), 'text/plain'); }
  function exportCsv(list) {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Nama', 'Kategori', 'Bibit (g)', 'HPP/g', 'Top %', 'Heart %', 'Base %', 'Profil', 'Observasi', 'Drive']];
    list.forEach(r => rows.push([r.name, (r.tags || []).join(';'), r.weight, r.costPerGr, r.ratios.top, r.ratios.heart, r.ratios.base, r.desc, r.obs, r.drive]));
    download(`DEY-resep-${today()}.csv`, '\ufeff' + rows.map(x => x.map(q).join(',')).join('\n'), 'text/csv');
  }
  async function persist() {
    try {
      if (!navigator.storage || !navigator.storage.persist) return null;
      return (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch (e) { return null; }
  }
  return { load, save, uid, exportAll, parse, mergeIn, replaceWith, exportRecipeJson, exportRecipeText, exportCsv, persist };
})();

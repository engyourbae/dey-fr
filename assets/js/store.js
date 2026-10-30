/* Penyimpanan lokal, migrasi, ekspor, impor, dan backup */
const Store = (() => {
  const KEY = 'dey_sillage_v2';
  const blankSettings = () => ({ drive: '', lastBackup: null, theme: 'light', history: [] });
  const blank = () => ({ v: 3, recipes: [], settings: blankSettings() });

  function migrate(r) {
    if (!r || typeof r !== 'object') return null;
    r = { ...r };
    if (r.total == null) {                       // data versi lama: weight = massa bibit
      const w = +r.weight || 0;
      r.conc = 20; r.total = +(w / 0.2).toFixed(3);
      r.costOil = +r.costPerGr || 0; r.costAlc = 0;
    }
    delete r.weight; delete r.costPerGr;
    const rt = r.ratios || {};
    return {
      id: r.id || uid(), name: String(r.name || '').trim(), desc: r.desc || '', obs: r.obs || '', drive: r.drive || '',
      total: +r.total || 0, conc: r.conc == null ? 20 : +r.conc, costOil: +r.costOil || 0, costAlc: +r.costAlc || 0,
      ratios: { top: +rt.top || 0, heart: +rt.heart || 0, base: +rt.base || 0 },
      materials: { top: '', heart: '', base: '', ...(r.materials || {}) },
      tags: Array.isArray(r.tags) ? r.tags : [],
      status: ['draft', 'macerasi', 'siap', 'arsip'].includes(r.status) ? r.status : 'draft',
      macStart: r.macStart || '', macWeeks: +r.macWeeks || 4, rating: +r.rating || 0, fav: !!r.fav,
      createdAt: r.createdAt || new Date().toISOString(), updatedAt: r.updatedAt || r.createdAt || new Date().toISOString()
    };
  }
  function derive(r) {
    const oil = r.total * r.conc / 100, alc = Math.max(0, r.total - oil);
    const t = { top: oil * r.ratios.top / 100, heart: oil * r.ratios.heart / 100, base: oil * r.ratios.base / 100 };
    const cOil = oil * r.costOil, cAlc = alc * r.costAlc;
    return { oil, alc, tier: t, cOil, cAlc, cost: cOil + cAlc, cpg: r.total ? (cOil + cAlc) / r.total : 0 };
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.recipes)) {
        return { v: 3, recipes: d.recipes.map(migrate).filter(r => r && r.name), settings: { ...blankSettings(), ...d.settings } };
      }
    } catch (e) {}
    return blank();
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const slug = s => (s || 'resep').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resep';
  const today = () => new Date().toISOString().slice(0, 10);
  function uid() { return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function exportAll(d) {
    const now = new Date().toISOString();
    d.settings.lastBackup = now;
    d.settings.history = [{ at: now, count: d.recipes.length }, ...(d.settings.history || [])].slice(0, 8);
    save(d);
    download(`DEY-backup-${today()}.json`, JSON.stringify({ app: 'DEY SillageArchitect', exportedAt: now, v: 3, recipes: d.recipes, settings: d.settings }, null, 2));
  }
  function parse(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.recipes)) throw new Error('Format file tidak dikenali.');
    d.recipes = d.recipes.map(migrate).filter(r => r && r.name);
    return d;
  }
  function mergeIn(d, inc) {
    const ids = new Set(d.recipes.map(r => r.id));
    let n = 0;
    inc.recipes.forEach(r => { if (!ids.has(r.id)) { d.recipes.push(r); n++; } });
    return n;
  }
  function replaceWith(d, inc) {
    d.recipes = inc.recipes;
    if (inc.settings && inc.settings.drive) d.settings.drive = inc.settings.drive;
    return d.recipes.length;
  }
  const nf = (n, dg = 0) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: dg, maximumFractionDigits: dg });
  function recipeText(r) {
    const x = derive(r), g = n => nf(n, 3) + ' g', m = k => r.materials[k] ? `  (${r.materials[k]})` : '';
    return [
      'DEY SillageArchitect | Lembar formula', '='.repeat(42),
      `Nama        : ${r.name}`, `Kategori    : ${r.tags.join(', ') || '-'}`, `Status      : ${r.status}`,
      `Penilaian   : ${r.rating ? r.rating + '/5' : '-'}`, `Dibuat      : ${r.createdAt.slice(0, 10)}`, '',
      `Total massa : ${g(r.total)}`, `Konsentrasi : ${nf(r.conc, 1)}%`,
      `Bibit       : ${g(x.oil)}`, `Alkohol     : ${g(x.alc)}`, '',
      `Top   ${String(r.ratios.top).padStart(3)}%  ${g(x.tier.top)}${m('top')}`,
      `Heart ${String(r.ratios.heart).padStart(3)}%  ${g(x.tier.heart)}${m('heart')}`,
      `Base  ${String(r.ratios.base).padStart(3)}%  ${g(x.tier.base)}${m('base')}`, '',
      `HPP bibit   : Rp ${nf(x.cOil)}`, `HPP alkohol : Rp ${nf(x.cAlc)}`, `Estimasi HPP: Rp ${nf(x.cost)}`, '',
      `Maserasi    : ${r.macStart ? r.macStart + ' (' + r.macWeeks + ' minggu)' : '-'}`,
      `Profil      : ${r.desc || '-'}`, `Observasi   : ${r.obs || '-'}`, `Foto        : ${r.drive || '-'}`, ''
    ].join('\n');
  }
  function exportRecipeJson(r) { download(`DEY-${slug(r.name)}.json`, JSON.stringify({ app: 'DEY SillageArchitect', v: 3, recipes: [r] }, null, 2)); }
  function exportRecipeText(r) { download(`DEY-${slug(r.name)}.txt`, recipeText(r), 'text/plain'); }
  function exportCsv(list) {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Nama', 'Kategori', 'Status', 'Rating', 'Total (g)', 'Konsentrasi %', 'Bibit (g)', 'Alkohol (g)', 'Top %', 'Heart %', 'Base %', 'HPP', 'Profil', 'Observasi', 'Drive']];
    list.forEach(r => { const x = derive(r); rows.push([r.name, r.tags.join(';'), r.status, r.rating, r.total, r.conc, x.oil.toFixed(3), x.alc.toFixed(3), r.ratios.top, r.ratios.heart, r.ratios.base, Math.round(x.cost), r.desc, r.obs, r.drive]); });
    download(`DEY-resep-${today()}.csv`, '\ufeff' + rows.map(x => x.map(q).join(',')).join('\n'), 'text/csv');
  }
  async function persist() {
    try {
      if (!navigator.storage || !navigator.storage.persist) return null;
      return (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch (e) { return null; }
  }
  return { load, save, wipe, uid, migrate, derive, nf, recipeText, exportAll, parse, mergeIn, replaceWith, exportRecipeJson, exportRecipeText, exportCsv, persist };
})();

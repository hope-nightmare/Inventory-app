"use strict";

function loadJSON(key, fallback){
  try{ var raw = localStorage.getItem(key); return raw!=null ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
function saveJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function fmt(n){
  var r = Math.round(n*10)/10;
  if(Object.is(r,-0)) r = 0;
  return r.toLocaleString('ru-RU', {maximumFractionDigits:1});
}
function fmtDateTime(ts){
  var d = new Date(ts);
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}) + ' ' +
         d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
}
function fileDateSlug(ts){
  var d = new Date(ts);
  function p(n){ return (n<10?'0':'')+n; }
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes());
}
function roundNum(n){ var r = Math.round(n*100)/100; return Object.is(r,-0)?0:r; }
function vibrate(){ if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){} }

function evalExpr(str){
  if(str==null || str==='') return NaN;
  var s = String(str).replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  s = s.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  if(!/^[0-9+\-*/().\s]+$/.test(s)) return NaN;
  try{
    var res = Function('"use strict"; return (' + s + ');')();
    return (typeof res === 'number' && isFinite(res)) ? res : NaN;
  }catch(e){ return NaN; }
}

function copyText(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ alert('Скопировано'); }, function(){ fallbackCopy(text); });
  } else fallbackCopy(text);
}
function fallbackCopy(text){
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ document.execCommand('copy'); alert('Скопировано'); }catch(e){ alert('Не удалось скопировать'); }
  document.body.removeChild(ta);
}
function saveTextFile(filename, text){
  var blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
}

function getBaseUnitKey(p){ return p.measure==='volume' ? 'ml' : (p.measure==='count' ? 'pcs' : 'g'); }
function unitLabelShort(key){ return {g:'г', kg:'кг', ml:'мл', l:'л', pcs:'шт'}[key] || key; }

function getRatioToGramsOrMl(conv){
  if(!conv) return null;
  var aGrams = (conv.aType==='g'||conv.aType==='ml') ? conv.aValue : (conv.aType==='kg'||conv.aType==='l') ? conv.aValue*1000 : null;
  var bGrams = (conv.bType==='g'||conv.bType==='ml') ? conv.bValue : (conv.bType==='kg'||conv.bType==='l') ? conv.bValue*1000 : null;
  var aPcs = conv.aType==='pcs' ? conv.aValue : null;
  var bPcs = conv.bType==='pcs' ? conv.bValue : null;
  var gr = aGrams!=null ? aGrams : bGrams;
  var pc = aPcs!=null ? aPcs : bPcs;
  if(gr==null || pc==null || pc===0) return null;
  return gr/pc;
}

function getUnitOptions(p){
  var natives = [];
  if(p.measure==='count') natives = [{key:'pcs', label:'шт'}];
  else if(p.measure==='volume') natives = [{key:'ml',label:'мл'},{key:'l',label:'л'}];
  else natives = [{key:'g',label:'г'},{key:'kg',label:'кг'}];

  if(p.converter && getRatioToGramsOrMl(p.converter)!=null){
     if(p.measure === 'count'){
        var aIsPcs = p.converter.aType === 'pcs';
        var otherType = aIsPcs ? p.converter.bType : p.converter.aType;
        if(otherType==='g' || otherType==='kg') natives.push({key:'g', label:'г'}, {key:'kg', label:'кг'});
        else if(otherType==='ml' || otherType==='l') natives.push({key:'ml', label:'мл'}, {key:'l', label:'л'});
     } else {
        natives.push({key:'pcs', label:'шт'});
     }
  }
  return natives;
}

function toBase(p, value, unitKey){
  var baseUnit = getBaseUnitKey(p);
  if(unitKey===baseUnit) return value;
  var r = getRatioToGramsOrMl(p.converter);

  if(unitKey==='kg' || unitKey==='l') {
     if (baseUnit === 'g' || baseUnit === 'ml') return value * 1000;
     if (baseUnit === 'pcs' && r) return (value * 1000) / r;
  }
  if(unitKey==='g' || unitKey==='ml') {
     if (baseUnit === 'pcs' && r) return value / r;
  }
  if(unitKey==='pcs'){
    if ((baseUnit === 'g' || baseUnit === 'ml') && r) return value * r;
  }
  return NaN;
}

function converterSummaryText(conv){
  return fmt(conv.aValue)+' '+unitLabelShort(conv.aType)+' = '+fmt(conv.bValue)+' '+unitLabelShort(conv.bType);
}

var contexts = {};
function buildActiveProducts(ctx){
  var list = [];
  ctx.baseList.forEach(function(bp){
    if(ctx.custom.deleted.indexOf(bp.name) !== -1) return;
    var ov = ctx.custom.edited[bp.name];
    var p = ov ? Object.assign({}, bp, ov) : Object.assign({}, bp);
    p._baseKey = bp.name; p._customId = null;
    p.cats = (ov && ov.cats) ? ov.cats : (ctx.baseCats[bp.name] || []);
    p.measure = p.measure || 'weight';
    list.push(p);
  });
  ctx.custom.added.forEach(function(cp){
    var p = Object.assign({}, cp);
    p._baseKey = null; p._customId = cp.id;
    p.cats = cp.cats || [];
    p.measure = p.measure || 'weight';
    list.push(p);
  });
  list.sort(function(a,b){ return a.name.localeCompare(b.name,'ru'); });
  return list;
}

function getCtx(type){
  if(contexts[type]) return contexts[type];
  var isItalia = (type === 'italia');
  var ctx = {
    type: type,
    storeKey: isItalia ? 'italia_recalc_v1' : ('store_v2_'+type),
    snapKey: isItalia ? 'italia_recalc_snapshots_v1' : ('snap_v2_'+type),
    customKey: isItalia ? 'italia_custom_products_v1' : ('custom_v2_'+type),
    catKey: 'catdefs_v2_'+type,
    sortKey: 'sortdefs_v2_'+type,
    baseList: isItalia ? BASE_PRODUCTS : [],
    baseCats: isItalia ? CATS_BY_NAME : {}
  };
  ctx.store = loadJSON(ctx.storeKey, {});
  ctx.snapshots = loadJSON(ctx.snapKey, []);
  ctx.custom = loadJSON(ctx.customKey, {added:[], edited:{}, deleted:[]});
  ctx.categoryDefs = loadJSON(ctx.catKey, isItalia ? DEFAULT_ITALIA_CATEGORIES.slice() : []);
  ctx.sortDefs = loadJSON(ctx.sortKey, DEFAULT_SORT_KEYS.slice());
  ctx.products = buildActiveProducts(ctx);
  contexts[type] = ctx;
  return ctx;
}

function refreshProducts(ctx){ ctx.products = buildActiveProducts(ctx); }
function saveCustom(ctx){ saveJSON(ctx.customKey, ctx.custom); }
function saveStoreCtx(ctx){ saveJSON(ctx.storeKey, ctx.store); }
function saveSnapsCtx(ctx){ saveJSON(ctx.snapKey, ctx.snapshots); }
function saveCategoryDefs(ctx){ saveJSON(ctx.catKey, ctx.categoryDefs); }
function saveSortDefs(ctx){ saveJSON(ctx.sortKey, ctx.sortDefs); }

function findProductByKeys(ctx, baseKey, customId){
  return ctx.products.find(function(p){
    return (baseKey!=null && p._baseKey===baseKey) || (customId!=null && p._customId===customId);
  });
}
function nameTaken(ctx, nm, exceptBaseKey, exceptCustomId){
  var low = nm.trim().toLowerCase();
  return ctx.products.some(function(p){
    if(exceptBaseKey!=null && p._baseKey===exceptBaseKey) return false;
    if(exceptCustomId!=null && p._customId===exceptCustomId) return false;
    return p.name.trim().toLowerCase() === low;
  });
}
function migrateStoreName(ctx, oldName, newName){
  if(oldName === newName) return;
  if(ctx.store[oldName]){ ctx.store[newName] = ctx.store[oldName]; delete ctx.store[oldName]; saveStoreCtx(ctx); }
}
function addCustomProduct(ctx, data){
  var cp = {
    id: 'c_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
    name: data.name, type: data.type,
    percent: data.percent!=null ? data.percent : undefined,
    narez: data.narez!=null ? data.narez : undefined,
    tselyy: data.tselyy!=null ? data.tselyy : undefined,
    note: data.note || null,
    cats: data.cats || [],
    measure: data.measure || 'weight',
    converter: data.converter || null
  };
  ctx.custom.added.push(cp);
  saveCustom(ctx);
  refreshProducts(ctx);
}
function updateProduct(ctx, p, data){
  var newFields = {
    name: data.name, type: data.type,
    percent: data.percent!=null ? data.percent : undefined,
    narez: data.narez!=null ? data.narez : undefined,
    tselyy: data.tselyy!=null ? data.tselyy : undefined,
    note: data.note || null,
    cats: data.cats || [],
    measure: data.measure || 'weight',
    converter: data.converter || null
  };
  if(p._customId != null){
    var cp = ctx.custom.added.find(function(c){ return c.id === p._customId; });
    if(cp){
      if(cp.name !== newFields.name) migrateStoreName(ctx, cp.name, newFields.name);
      Object.assign(cp, newFields);
    }
  } else if(p._baseKey != null){
    if(p.name !== newFields.name) migrateStoreName(ctx, p.name, newFields.name);
    ctx.custom.edited[p._baseKey] = newFields;
  }
  saveCustom(ctx);
  refreshProducts(ctx);
}
function deleteProductEntry(ctx, p){
  if(p._customId != null){
    ctx.custom.added = ctx.custom.added.filter(function(c){ return c.id !== p._customId; });
  } else if(p._baseKey != null){
    ctx.custom.deleted.push(p._baseKey);
    delete ctx.custom.edited[p._baseKey];
  }
  delete ctx.store[p.name]; saveStoreCtx(ctx);
  saveCustom(ctx);
  refreshProducts(ctx);
}
function addCategory(ctx, label){
  var key = 'cat_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  ctx.categoryDefs.push({key:key, label:label});
  saveCategoryDefs(ctx);
}
function removeCategory(ctx, key){
  ctx.categoryDefs = ctx.categoryDefs.filter(function(c){ return c.key!==key; });
  saveCategoryDefs(ctx);
}

function getEntry(ctx, name){ return ctx.store[name] || { total:0, history:[] }; }
function recompute(ctx, name){
  var e = ctx.store[name];
  if(!e) return;
  var total = 0;
  for(var i=0;i<e.history.length;i++){
    var h = e.history[i];
    total += (h.action==='add' ? h.net : -h.net);
  }
  e.total = total;
}
function addHistory(ctx, name, action, rawValue, net, mode, detail){
  if(!ctx.store[name]) ctx.store[name] = { total:0, history:[] };
  ctx.store[name].history.unshift({
    id: Date.now()+'_'+Math.random().toString(36).slice(2,7),
    ts: Date.now(), action:action, rawValue:rawValue, net:net, mode:mode, detail:detail
  });
  recompute(ctx, name);
  saveStoreCtx(ctx);
}
function deleteHistory(ctx, name, id){
  if(!ctx.store[name]) return;
  ctx.store[name].history = ctx.store[name].history.filter(function(h){ return h.id !== id; });
  recompute(ctx, name);
  saveStoreCtx(ctx);
}
function resetProductEntries(ctx, name){ delete ctx.store[name]; saveStoreCtx(ctx); }

function currentNonzeroItems(ctx){
  return ctx.products.map(function(p){ return {name:p.name, total: getEntry(ctx,p.name).total, unitLabel: unitLabelShort(getBaseUnitKey(p))}; })
    .filter(function(i){ return i.total; })
    .sort(function(a,b){ return a.name.localeCompare(b.name,'ru'); });
}
function saveSnapshotNow(ctx){
  var snap = { id: Date.now()+'_'+Math.random().toString(36).slice(2,7), ts: Date.now(), items: currentNonzeroItems(ctx) };
  ctx.snapshots.unshift(snap);
  saveSnapsCtx(ctx);
  return snap;
}
function buildReportText(items, dateTs, title){
  var lines = [title + ' — ' + fmtDateTime(dateTs), ''];
  if(items.length===0){ lines.push('Все позиции на нуле.'); }
  else { items.forEach(function(i){ lines.push(i.name + ': ' + fmt(i.total) + ' ' + (i.unitLabel||'г')); }); }
  return lines.join('\n');
}

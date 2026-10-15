"use strict";

var app = document.getElementById('app');

// --- НАСТРОЙКИ ---
var DEFAULT_SETTINGS = {
  vibration: true,
  sound: false,
  wakeLock: false,
  scale: 1.0,
  theme: {
    bg: '#17150F',
    surface: '#211D17',
    surface2: '#2B261E',
    border: '#3A3327',
    text: '#F0E9DC',
    textDim: '#9C9384',
    accent: '#7C9A52',
    accent2: '#D2A542',
    danger: '#AE5138',
    radius: 14
  }
};
var appSettings = JSON.parse(localStorage.getItem('appSettings')) || {};
appSettings = Object.assign({}, DEFAULT_SETTINGS, appSettings);
appSettings.theme = Object.assign({}, DEFAULT_SETTINGS.theme, appSettings.theme);

var wakeLockObj = null;
async function updateWakeLock() {
  if(!appSettings.wakeLock) {
    if(wakeLockObj) { await wakeLockObj.release(); wakeLockObj = null; }
    return;
  }
  if('wakeLock' in navigator) {
    try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch(e){}
  }
}
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible' && appSettings.wakeLock) updateWakeLock();
});

function saveSettings() {
  localStorage.setItem('appSettings', JSON.stringify(appSettings));
  applySettings();
}

function applySettings() {
  var root = document.documentElement;
  root.style.setProperty('--app-scale', appSettings.scale);
  var t = appSettings.theme;
  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface-2', t.surface2);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--text', t.text);
  root.style.setProperty('--text-dim', t.textDim);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent2', t.accent2);
  root.style.setProperty('--danger', t.danger);
  root.style.setProperty('--radius-card', t.radius + 'px');
  root.style.setProperty('--radius-btn', Math.round(t.radius * 0.85) + 'px');
  updateWakeLock();
}
applySettings();

var audioCtx = null;
function feedback() {
  if(appSettings.vibration && navigator.vibrate) navigator.vibrate(15);
  if(appSettings.sound) {
    if(!audioCtx) {
       var AudioContext = window.AudioContext || window.webkitAudioContext;
       if(AudioContext) audioCtx = new AudioContext();
    }
    if(audioCtx) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine'; osc.frequency.value = 600;
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.start(); osc.stop(audioCtx.currentTime + 0.05);
    }
  }
}

// --- УТИЛИТЫ UI ---
function topbar(title, crumb, rightHtml, note){
  var showBack = stack.length > 0;
  return '' +
    '<header class="topbar">' +
      (showBack ? '<button class="back-btn" id="backBtn" aria-label="Назад">←</button>' : '') +
      '<div style="flex:1; min-width:0; margin-right:10px;">' +
        (crumb ? '<span class="crumb">'+esc(crumb)+'</span>' : '') +
        '<h1 style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">'+esc(title)+'</h1>' +
        (note ? '<div style="font-size:12px; font-weight:600; color:var(--text-dim); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">'+esc(note)+'</div>' : '') +
      '</div>' +
      (rightHtml ? '<div>'+rightHtml+'</div>' : '') +
    '</header>';
}
function bindBack(){ var b = document.getElementById('backBtn'); if(b) b.onclick = back; }

function fmtDisplayTotal(val, baseUnitKey) {
  if (baseUnitKey === 'g') {
    return (Math.round(val)/1000).toLocaleString('ru-RU', {maximumFractionDigits:3}) + ' кг';
  } else if (baseUnitKey === 'ml') {
    return (Math.round(val)/1000).toLocaleString('ru-RU', {maximumFractionDigits:3}) + ' л';
  } else {
    return (Math.round(val*10)/10).toLocaleString('ru-RU', {maximumFractionDigits:1}) + ' шт';
  }
}

// --- ЭКРАНЫ ---
function renderHome(){
  var cards = TYPE_META.map(function(m){
    var ctx = getCtx(m.key);
    return '<button class="nav-card ready" data-type="'+m.key+'">'+esc(m.label)+
      '<span class="sub">'+ctx.products.length+' позиций</span><span class="tag">открыть</span></button>';
  }).join('');
  app.innerHTML =
    topbar('Пересчеты') +
    '<main>' +
      '<h2 class="page-title">Пересчеты</h2>' +
      '<p class="page-sub">Выбери раздел для сведения позиций.</p>' +
      cards +
      '<button class="nav-card ready" id="btnManage" style="margin-top:16px;">Управление позициями<span class="sub">добавить, изменить, убрать</span><span class="tag">✎</span></button>' +
      '<button class="nav-card ready" id="btnSettings" style="margin-top:6px;">Настройки приложения<span class="sub">вибрация, масштаб, оформление</span><span class="tag">⚙️</span></button>' +
    '</main>';
  app.querySelectorAll('.nav-card[data-type]').forEach(function(b){
    b.onclick = function(){ nav({screen:'section', type:b.getAttribute('data-type')}); };
  });
  document.getElementById('btnManage').onclick = function(){ nav({screen:'manageTypePick'}); };
  document.getElementById('btnSettings').onclick = function(){ nav({screen:'settingsMain'}); };
}

function renderSettingsMain(){
  app.innerHTML =
    topbar('Настройки') +
    '<main>' +
      '<div class="settings-group">' +
        '<div class="settings-title">Основные</div>' +
        '<div class="setting-row" id="rowScale" style="cursor:pointer;"><span>Масштаб интерфейса</span><span class="tag">изменить</span></div>' +
        '<div class="setting-row" id="rowTheme" style="cursor:pointer;"><span>Оформление</span><span class="tag">цвета</span></div>' +
      '</div>' +
      '<div class="settings-group">' +
        '<div class="settings-title">Звук и вибрация</div>' +
        '<label class="setting-row"><span>Вибрация при нажатии</span><div class="switch"><input type="checkbox" id="chkHaptic" '+(appSettings.vibration?'checked':'')+'><span class="slider"></span></div></label>' +
        '<label class="setting-row"><span>Звук при нажатии (Пик)</span><div class="switch"><input type="checkbox" id="chkSound" '+(appSettings.sound?'checked':'')+'><span class="slider"></span></div></label>' +
      '</div>' +
      '<div class="settings-group">' +
        '<div class="settings-title">Поведение</div>' +
        '<label class="setting-row single"><span>Не гасить экран (WakeLock)</span><div class="switch"><input type="checkbox" id="chkWake" '+(appSettings.wakeLock?'checked':'')+'><span class="slider"></span></div></label>' +
      '</div>' +
    '</main>';
  bindBack();
  document.getElementById('rowScale').onclick = function(){ nav({screen:'settingsScale'}); };
  document.getElementById('rowTheme').onclick = function(){ nav({screen:'settingsTheme'}); };

  document.getElementById('chkHaptic').onchange = function(e){ appSettings.vibration = e.target.checked; saveSettings(); feedback(); };
  document.getElementById('chkSound').onchange = function(e){ appSettings.sound = e.target.checked; saveSettings(); feedback(); };
  document.getElementById('chkWake').onchange = function(e){ appSettings.wakeLock = e.target.checked; saveSettings(); };
}

function renderSettingsScale(){
  var viewMode = 'calc';
  function updatePreview(){
    var previewHTML = '';
    if(viewMode === 'calc'){
      previewHTML =
        '<div style="font-size:12px; color:var(--text-dim); text-align:center; margin-bottom:8px;">5% нарез, 10% целый</div>' +
        '<div style="display:flex; gap:10px;">' +
          '<input class="value-input" type="text" readonly placeholder="0" value="1350" style="flex:1; font-size:28px; padding:12px 15px; margin:0; font-weight:800;">' +
          '<button style="flex:none; width:65px; border-radius:var(--radius-btn); border:1px solid var(--border); background:var(--surface-2); color:var(--accent2); font-size:18px; font-weight:800;">г</button>' +
        '</div>' +
        '<div class="btn-row" style="margin-bottom:12px;"><button class="btn-add">+ Добавить</button><button class="btn-sub">− Отнять</button></div>' +
        '<div class="calc-panel" style="margin-top:0;"><div class="calc-grid">' +
          '<button class="action">C</button><button class="action">⌫</button><button class="action">%</button><button class="op">÷</button>' +
        '</div></div>';
    } else {
      previewHTML =
        '<button class="prod-row"><span><span class="name">Балык</span><span class="pct">5% нарез, 10% целый</span></span><span class="total-badge">0,08 кг</span></button>' +
        '<button class="prod-row"><span><span class="name">Салями</span><span class="pct">без %</span></span><span class="total-badge">1,2 шт</span></button>';
    }
    var previewEl = document.getElementById('scalePreview');
    if(previewEl) previewEl.innerHTML = previewHTML;
  }

  app.innerHTML =
    topbar('Масштаб') +
    '<div style="flex:1; overflow:hidden; position:relative; background:var(--bg); border-bottom:2px solid var(--accent); padding:15px;">' +
       '<div id="scalePreview" style="pointer-events:none;"></div>' +
    '</div>' +
    '<div style="padding:20px; background:var(--surface); flex:none; padding-bottom:40px;">' +
       '<div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;">' +
         '<span id="scaleLabel" style="font-weight:700; font-size:16px;">Масштаб: ' + Math.round(appSettings.scale*100) + '%</span>' +
         '<button class="quick-btn" id="btnToggleView">Показать: ' + (viewMode==='calc'?'Список':'Калькулятор') + '</button>' +
       '</div>' +
       '<input type="range" id="scaleSlider" min="0.5" max="1.5" step="0.05" value="'+appSettings.scale+'">' +
    '</div>';
  bindBack();
  updatePreview();

  document.getElementById('btnToggleView').onclick = function(){
    viewMode = viewMode === 'calc' ? 'list' : 'calc';
    this.innerText = 'Показать: ' + (viewMode==='calc'?'Список':'Калькулятор');
    updatePreview();
  };

  document.getElementById('scaleSlider').addEventListener('input', function(e){
    var v = parseFloat(e.target.value);
    appSettings.scale = v;
    applySettings();
    document.getElementById('scaleLabel').innerText = 'Масштаб: ' + Math.round(v*100) + '%';
    saveSettings();
  });
}

function renderSettingsTheme(){
  var t = appSettings.theme;
  function colorRow(label, key){
    return '<div class="setting-row">' +
      '<span>'+label+'</span>' +
      '<input type="color" data-key="'+key+'" value="'+t[key]+'" style="width:40px; height:30px; border:none; padding:0; cursor:pointer; background:transparent;">' +
    '</div>';
  }
  function paint(){
    app.innerHTML =
      topbar('Оформление') +
      '<main>' +
        '<div class="settings-group">' +
          '<div class="settings-title">Цвета</div>' +
          colorRow('Фон приложения', 'bg') +
          colorRow('Поверхность (карточки)', 'surface') +
          colorRow('Вторичная поверхность', 'surface2') +
          colorRow('Обводки (Border)', 'border') +
          colorRow('Акцент (Добавить, Иконки)', 'accent') +
          colorRow('Акцент 2 (Итого, Текст)', 'accent2') +
          colorRow('Опасность (Отнять, Ошибки)', 'danger') +
          colorRow('Текст основной', 'text') +
          colorRow('Текст второстепенный', 'textDim') +
        '</div>' +
        '<div class="settings-group">' +
          '<div class="settings-title">Скругления (Радиус)</div>' +
          '<div class="setting-row single" style="flex-direction:column; align-items:stretch; gap:10px;">' +
             '<div style="display:flex; justify-content:space-between;"><span>Радиус карточек</span><span id="radVal">'+t.radius+'px</span></div>' +
             '<input type="range" id="radSlider" min="0" max="32" step="1" value="'+t.radius+'">' +
          '</div>' +
        '</div>' +
        '<button class="nav-card ready" id="btnResetTheme" style="justify-content:center; text-align:center;">Сбросить по умолчанию</button>' +
      '</main>';
    bindBack();
    app.querySelectorAll('input[type="color"]').forEach(function(inp){
      inp.addEventListener('input', function(e){
        appSettings.theme[e.target.getAttribute('data-key')] = e.target.value;
        saveSettings();
      });
    });
    document.getElementById('radSlider').addEventListener('input', function(e){
      appSettings.theme.radius = parseInt(e.target.value, 10);
      document.getElementById('radVal').innerText = appSettings.theme.radius + 'px';
      saveSettings();
    });
    document.getElementById('btnResetTheme').onclick = function(){
      if(confirm('Сбросить оформление к стандартному?')){
        appSettings.theme = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.theme));
        saveSettings();
        paint();
      }
    };
  }
  paint();
}

function renderSection(type){
  var ctx = getCtx(type);
  app.innerHTML =
    topbar(typeLabel(type)) +
    '<main>' +
      '<h2 class="page-title">'+esc(typeLabel(type))+'</h2>' +
      '<p class="page-sub">Список позиций для справки, ввода веса или сводный отчёт.</p>' +
      '<button class="nav-card ready" id="btnList">Список позиций<span class="sub">'+ctx.products.length+' позиций</span><span class="tag">+/-</span></button>' +
      '<button class="nav-card ready" id="btnSummary">Сводный отчёт<span class="sub">остатки, копия, история по датам</span><span class="tag">итого</span></button>' +
    '</main>';
  bindBack();
  document.getElementById('btnList').onclick = function(){ nav({screen:'list', type:type}); };
  document.getElementById('btnSummary').onclick = function(){ nav({screen:'summary', type:type}); };
}

function catChipsHTML(ctx, selectedCats){
  return ctx.categoryDefs.map(function(c){
    var active = selectedCats.indexOf(c.key)!==-1;
    return '<button class="chip'+(active?' active':'')+'" data-cat="'+c.key+'">'+esc(c.label)+'</button>';
  }).join('');
}
var EXTRA_DEFS = [
  {key:'all', label:'Все'}, {key:'nomotion', label:'Без движения'},
  {key:'haspct', label:'С %'}, {key:'nopct', label:'Без %'}
];
function extraChipsHTML(extra){
  return EXTRA_DEFS.map(function(o){
    return '<button class="chip'+(extra===o.key?' active':'')+'" data-extra="'+o.key+'">'+o.label+'</button>';
  }).join('');
}
function activeSortCatalog(ctx){
  return ctx.sortDefs.map(function(k){ return SORT_CATALOG.find(function(s){ return s.key===k; }); }).filter(Boolean);
}
function filterAndSort(ctx, query, selectedCats, extra, sortKey){
  var q = (query||'').trim().toLowerCase();
  var items = ctx.products.filter(function(p){
    if(q && p.name.toLowerCase().indexOf(q)===-1) return false;
    if(selectedCats.length && !p.cats.some(function(c){ return selectedCats.indexOf(c)!==-1; })) return false;
    var e = getEntry(ctx,p.name);
    var hasPct = (p.type==='single' || p.type==='split');
    if(extra==='nomotion' && e.total) return false;
    if(extra==='haspct' && !hasPct) return false;
    if(extra==='nopct' && hasPct) return false;
    return true;
  });
  var strat = SORT_CATALOG.find(function(s){ return s.key===sortKey; });
  if(strat) items = items.slice().sort(function(a,b){ return strat.cmp(ctx,a,b); });
  return items;
}

function renderList(type){
  var ctx = getCtx(type);
  var active = activeSortCatalog(ctx);
  var st = { q:'', cats:[], extra:'all', sort: active.length ? active[0].key : 'name_asc' };

  function rowsHTML(){
    var items = filterAndSort(ctx, st.q, st.cats, st.extra, st.sort);
    if(items.length===0) return '<div class="empty-state">Ничего не найдено</div>';
    return items.map(function(p){
      var e = getEntry(ctx,p.name);
      var badge = e.total ? '<span class="total-badge">'+fmtDisplayTotal(e.total, getBaseUnitKey(p))+'</span>' : '';
      return '<button class="prod-row" data-name="'+esc(p.name)+'">' +
        '<span><span class="name">'+esc(p.name)+'</span><span class="pct">'+esc(pctLabel(p))+'</span></span>' +
        badge +
        '</button>';
    }).join('');
  }
  function bindRows(){
    app.querySelectorAll('.prod-row').forEach(function(r){
      r.onclick = function(){ nav({screen:'detail', type:type, product:r.getAttribute('data-name')}); };
    });
  }
  function paint(){
    var sortOptionsHTML = active.map(function(s){
      return '<option value="'+s.key+'"'+(st.sort===s.key?' selected':'')+'>Сортировка: '+esc(s.label)+'</option>';
    }).join('');
    app.innerHTML =
      topbar('Список позиций', typeLabel(type)) +
      '<main>' +
        '<input class="search" id="searchInput" type="text" placeholder="Найти позицию…" autocomplete="off" value="'+esc(st.q)+'">' +
        (ctx.categoryDefs.length ? '<div class="chip-row" id="catChips">' + catChipsHTML(ctx, st.cats) + '</div>' : '') +
        '<div class="chip-row" id="extraChips">' + extraChipsHTML(st.extra) + '</div>' +
        (active.length ? '<select class="sort-select" id="sortSelect">' + sortOptionsHTML + '</select>' : '') +
        '<div class="note-line">Процент из таблицы вычитается только когда сам выбираешь кнопку с процентом при отнятии.</div>' +
        '<div id="listWrap">' + rowsHTML() + '</div>' +
      '</main>';
    bindBack();
    var input = document.getElementById('searchInput');
    input.oninput = function(){ st.q = this.value; document.getElementById('listWrap').innerHTML = rowsHTML(); bindRows(); };
    var catChips = document.getElementById('catChips');
    if(catChips) catChips.querySelectorAll('.chip').forEach(function(b){
      b.onclick = function(){
        var c = b.getAttribute('data-cat');
        var i = st.cats.indexOf(c);
        if(i===-1) st.cats.push(c); else st.cats.splice(i,1);
        paint();
      };
    });
    document.getElementById('extraChips').querySelectorAll('.chip').forEach(function(b){
      b.onclick = function(){ st.extra = b.getAttribute('data-extra'); paint(); };
    });
    var sortSel = document.getElementById('sortSelect');
    if(sortSel) sortSel.onchange = function(){ st.sort = this.value; paint(); };
    bindRows();
  }
  paint();
}

function renderDetail(type, name){
  var ctx = getCtx(type);
  var product = ctx.products.find(function(p){ return p.name === name; });
  if(!product){ back(); return; }
  var hasPct = product.type === 'single' || product.type === 'split';
  var pctBtns = percentButtons(product);
  var unitOptions = getUnitOptions(product);
  var baseUnitKey = getBaseUnitKey(product);
  var baseLabel = unitLabelShort(baseUnitKey);

  var state = { value:'', unit:baseUnitKey, mods:[], stack:[], warn:'' };

  function getValBase(){
    var v = evalExpr(state.value);
    if(isNaN(v)) return NaN;
    return toBase(product, v, state.unit);
  }
  function applyModifier(newValueBase, label){
    state.stack.push({value:state.value, unit:state.unit});
    state.mods.push(label);
    state.value = String(roundNum(newValueBase));
    state.unit = baseUnitKey;
    state.warn = '';
    paint();
  }
  function undoFieldStep(){
    if(!state.stack.length) return;
    var prev = state.stack.pop();
    state.value = prev.value; state.unit = prev.unit;
    state.mods.pop();
    paint();
  }

  function applyPercentToField(btn){
    state.warn = '';
    var v = getValBase();
    if(isNaN(v) || v<=0){ state.warn = 'Сначала введи значение.'; paint(); return; }
    applyModifier(v * (1 - btn.pct/100), btn.label);
  }
  
  function doManual(action){
    state.warn = '';
    var v = getValBase();
    if(isNaN(v) || v<=0){ state.warn = 'Сначала введи значение.'; paint(); return; }
    var detail = state.mods.length ? state.mods.join(', ') : '';
    addHistory(ctx, product.name, action, v, v, state.mods.length ? 'combo' : 'raw', detail);
    feedback();
    state.value=''; state.unit=baseUnitKey; state.mods=[]; state.stack=[];
    paint();
  }

  function paint(){
    var e = getEntry(ctx, product.name);
    
    // ИТОГ И ИСТОРИЯ В ШАПКУ
    var color = e.total < 0 ? 'var(--danger)' : 'var(--accent2)';
    var mainTotalDisplay = fmtDisplayTotal(e.total, baseUnitKey);
    var historyBtnHTML = '<button class="quick-btn" id="btnGoHistory" style="padding:6px; border-radius:10px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); background:var(--surface);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg></button>';
    var topRightHTML = '<div style="display:flex; align-items:center; gap:8px;">' +
      '<span style="font-size:18px; font-weight:800; color:'+color+'; white-space:nowrap;">'+mainTotalDisplay+'</span>' +
      historyBtnHTML +
    '</div>';

    // Заметка к позиции
    var noteStr = product.note ? product.note : '';

    // Конвертер
    var convLine = '';
    if(product.converter){
       var r = getRatioToGramsOrMl(product.converter);
       if(r){
          if(baseUnitKey==='g' || baseUnitKey==='ml'){
             convLine = ' (~'+fmt(e.total/r)+' шт)';
          } else if(baseUnitKey==='pcs'){
             var otherUnit = product.converter.aType==='pcs' ? product.converter.bType : product.converter.aType;
             var baseGrams = e.total * r;
             if(otherUnit==='kg' || otherUnit==='l'){
                convLine = ' (~'+fmt(baseGrams/1000)+' '+(otherUnit==='kg'?'кг':'л')+')';
             } else {
                var shortU = (otherUnit==='g'||otherUnit==='kg') ? 'г' : 'мл';
                convLine = ' (~'+fmt(baseGrams)+' '+shortU+')';
             }
          }
       }
    }
    
    // Сбор информации по процентам и конвертеру, чтобы было компактно
    var infoArr = [];
    var pLabel = pctLabel(product);
    if (pLabel !== 'без %') infoArr.push(pLabel);
    if (product.converter) infoArr.push(converterSummaryText(product.converter) + convLine);
    var infoHTML = infoArr.length ? '<div style="font-size:12px; font-weight:700; color:var(--text-dim); text-align:center; margin-bottom:8px;">'+esc(infoArr.join(' · '))+'</div>' : '';
    
    var pctSectionHTML = '';
    if(hasPct && pctBtns.length){
      pctSectionHTML =
        '<div class="quick-grid" id="pctGrid" style="margin-bottom:8px;">' +
          pctBtns.map(function(b,i){ return '<button class="quick-btn pct" data-i="'+i+'" style="flex:1; padding:8px;">'+esc(b.label)+'</button>'; }).join('') +
        '</div>';
    }

    var trailHTML = state.mods.length
      ? '<div class="note-line" style="margin-top:4px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><span>Шаги: '+state.mods.map(esc).join(' → ')+
        '</span><button class="quick-btn calc-toggle" id="btnUndoStep" style="padding:4px 10px;">↺ отменить шаг</button></div>'
      : '';

    var exprPreview = '<div style="min-height:18px; margin-top:4px; font-size:14px; color:var(--text-dim);">';
    if(state.value && /[+\-*/×÷%()]/.test(state.value)){
      var pv = getValBase();
      exprPreview += (isNaN(pv) ? 'Проверь выражение' : '= '+fmt(pv)+' '+baseLabel);
    }
    exprPreview += '</div>';

    var curUnitLabel = unitOptions.length ? unitOptions.find(function(u){ return u.key === state.unit; }).label : baseLabel;

    var unitBtnHTML = unitOptions.length > 1
      ? '<button id="btnCycleUnit" style="flex:none; width:65px; border-radius:var(--radius-btn); border:1px solid var(--border); background:var(--surface-2); color:var(--accent2); font-size:18px; font-weight:800; transition:none;">'+curUnitLabel+'</button>'
      : '<div style="flex:none; width:65px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:var(--text-dim); border:1px solid var(--border); border-radius:var(--radius-btn); background:var(--surface);">'+curUnitLabel+'</div>';

    var keys = ['C','⌫','%','÷', '7','8','9','×', '4','5','6','−', '1','2','3','+', '( )','0','.','='];
    var keypadHTML =
      '<div class="calc-panel" id="weightKeypad" style="margin-top:0;">' +
        '<div class="calc-grid">' +
          keys.map(function(k){
            var isOp = (k==='÷'||k==='×'||k==='−'||k==='+'||k==='=');
            var isAction = (k==='C'||k==='⌫'||k==='%'||k==='( )');
            var cls = isOp ? 'op' : (isAction ? 'action' : 'digit');
            var label = (k==='.') ? ',' : k;
            return '<button class="'+cls+'" data-k="'+esc(k)+'">'+esc(label)+'</button>';
          }).join('') +
        '</div>' +
      '</div>';

    app.innerHTML =
      topbar(product.name, typeLabel(type), topRightHTML, noteStr) +
      '<main style="padding-top:10px;">' +
        infoHTML +

        // БЛОК ВВОДА: Огромное поле слева + кнопка переключения единиц справа
        '<div style="display:flex; gap:10px;">' +
          '<input class="value-input" id="valueInput" type="text" inputmode="none" readonly placeholder="0" value="'+esc(state.value)+'" style="flex:1; font-size:28px; padding:12px 15px; margin:0; text-align:left; font-weight:800;">' +
          unitBtnHTML +
        '</div>' +

        exprPreview +
        trailHTML +
        '<div class="warn-line" style="margin-top:0; min-height:14px; font-size:12px;">'+esc(state.warn)+'</div>' +

        '<div class="btn-row" style="margin-top:0; margin-bottom:12px;">' +
          '<button class="btn-add" id="btnAdd">+ Добавить</button>' +
          '<button class="btn-sub" id="btnSubRaw">− Отнять</button>' +
        '</div>' +

        pctSectionHTML +
        keypadHTML +
      '</main>';

    bindBack();

    document.getElementById('btnGoHistory').onclick = function(){
      nav({screen:'productHistory', type:type, product: product.name});
    };

    var cycleBtn = document.getElementById('btnCycleUnit');
    if (cycleBtn) {
      cycleBtn.onclick = function() {
        feedback();
        var idx = unitOptions.findIndex(function(u){ return u.key === state.unit; });
        var nextIdx = (idx + 1) % unitOptions.length;
        state.unit = unitOptions[nextIdx].key;
        paint();
      };
    }

    app.querySelectorAll('#weightKeypad .calc-grid button').forEach(function(b){
      b.onclick = function(){
        feedback();
        var k = b.getAttribute('data-k');
        state.warn = '';
        state.mods = []; state.stack = [];
        if(k==='C'){ state.value=''; state.unit=baseUnitKey; }
        else if(k==='⌫'){ state.value = state.value.slice(0, -1); }
        else if(k==='='){
          var res = evalExpr(state.value);
          if(isNaN(res)){ state.warn = 'Проверь выражение.'; } else { state.value = String(roundNum(res)); state.warn=''; }
        }
        else if(k==='( )'){
          var open = (state.value.match(/\(/g) || []).length;
          var close = (state.value.match(/\)/g) || []).length;
          state.value += (open > close) ? ')' : '(';
        }
        else state.value += k;
        paint();
      };
    });

    document.getElementById('btnAdd').onclick = function(){ doManual('add'); };
    document.getElementById('btnSubRaw').onclick = function(){ doManual('subtract'); };

    var undoStepBtn = document.getElementById('btnUndoStep');
    if(undoStepBtn) undoStepBtn.onclick = undoFieldStep;

    if(hasPct && pctBtns.length){
      app.querySelectorAll('#pctGrid .quick-btn').forEach(function(b){
        b.onclick = function(){ applyPercentToField(pctBtns[parseInt(b.getAttribute('data-i'),10)]); };
      });
    }
  }
  paint();
}

function renderProductHistory(type, name){
  var ctx = getCtx(type);
  var product = ctx.products.find(function(p){ return p.name === name; });
  if(!product){ back(); return; }
  var baseUnitKey = getBaseUnitKey(product);
  var baseLabel = unitLabelShort(baseUnitKey);

  function paint(){
    var e = getEntry(ctx, product.name);
    var histHTML = e.history.length === 0
      ? '<div class="empty-state">Записей пока нет</div>'
      : e.history.map(function(h){
          var sign = h.action==='add' ? '+' : '−';
          var cls = h.action==='add' ? 'add' : 'sub';
          var metaParts = ['вход '+fmt(h.rawValue)+' '+baseLabel];
          if(h.detail) metaParts.push(h.detail);
          return '<div class="hist-row">' +
            '<div class="hist-left">' +
              '<span class="hist-main '+cls+'">'+sign+fmt(h.net)+' '+baseLabel+'</span>' +
              '<span class="hist-meta">'+fmtDateTime(h.ts)+' · '+esc(metaParts.join(' · '))+'</span>' +
            '</div>' +
            '<button class="hist-del" data-id="'+h.id+'" aria-label="Удалить запись">✕</button>' +
          '</div>';
        }).join('');

    app.innerHTML =
      topbar('История', product.name) +
      '<main>' +
        (e.history.length ? '<button class="undo-btn" id="btnUndo">Отменить последнюю запись</button>' : '') +
        '<div class="hist-title" style="margin-top:20px;">Все записи</div>' +
        '<div id="histWrap">' + histHTML + '</div>' +
        (e.history.length ? '<button class="reset-link" id="btnReset">Обнулить все остатки этой позиции</button>' : '') +
      '</main>';

    bindBack();

    var undoBtn = document.getElementById('btnUndo');
    if(undoBtn){
      undoBtn.onclick = function(){
        if(e.history.length){ deleteHistory(ctx, product.name, e.history[0].id); paint(); }
      };
    }
    app.querySelectorAll('.hist-del').forEach(function(btn){
      btn.onclick = function(){ deleteHistory(ctx, product.name, btn.getAttribute('data-id')); paint(); };
    });
    var resetBtn = document.getElementById('btnReset');
    if(resetBtn){
      resetBtn.onclick = function(){
        if(confirm('Обнулить все записи по позиции «'+product.name+'»? Это нельзя отменить.')){
          resetProductEntries(ctx, product.name);
          paint();
        }
      };
    }
  }
  paint();
}

function renderSummary(type){
  var ctx = getCtx(type);
  var items = currentNonzeroItems(ctx);
  var rowsHTML = items.length===0
    ? '<div class="empty-state">Все позиции на нуле.</div>'
    : items.map(function(i){
        var cls = i.total<0 ? 'amt neg' : 'amt';
        return '<div class="summary-row"><span>'+esc(i.name)+'</span><span class="'+cls+'">'+fmt(i.total)+' '+i.unitLabel+'</span></div>';
      }).join('');

  app.innerHTML =
    topbar('Сводный отчёт', typeLabel(type)) +
    '<main>' +
      '<p class="page-sub">Текущие остатки по позициям, где есть движение.</p>' +
      '<div id="summaryWrap">' + rowsHTML + '</div>' +
      '<button class="nav-card ready" id="btnCopy" style="margin-top:20px;">Скопировать отчёт текстом<span class="tag">📋</span></button>' +
      '<button class="nav-card ready" id="btnFile">Сохранить файлом на телефон<span class="tag">.txt</span></button>' +
      '<button class="nav-card ready" id="btnSaveSnap">Сохранить пересчёт в историю<span class="tag">по дате</span></button>' +
      '<button class="nav-card ready" id="btnHistory">История пересчётов<span class="sub">'+ctx.snapshots.length+' сохранено</span><span class="tag">→</span></button>' +
    '</main>';
  bindBack();
  document.getElementById('btnCopy').onclick = function(){
    copyText(buildReportText(currentNonzeroItems(ctx), Date.now(), 'Пересчёт '+typeLabel(type)));
  };
  document.getElementById('btnFile').onclick = function(){
    var ts = Date.now();
    saveTextFile(type+'-pereschet-'+fileDateSlug(ts)+'.txt', buildReportText(currentNonzeroItems(ctx), ts, 'Пересчёт '+typeLabel(type)));
  };
  document.getElementById('btnSaveSnap').onclick = function(){
    var snap = saveSnapshotNow(ctx);
    var wipe = confirm('Пересчёт сохранён в историю (' + fmtDateTime(snap.ts) + ').\n\nОбнулить текущие остатки, чтобы начать новый период?');
    if(wipe){ ctx.store = {}; saveStoreCtx(ctx); }
    renderSummary(type);
  };
  document.getElementById('btnHistory').onclick = function(){ nav({screen:'snapshots', type:type}); };
}

function renderSnapshots(type){
  var ctx = getCtx(type);
  var rowsHTML = ctx.snapshots.length===0
    ? '<div class="empty-state">Пока ничего не сохранено.</div>'
    : ctx.snapshots.map(function(s){
        return '<div style="display:flex;">' +
          '<button class="snap-row" data-id="'+s.id+'" style="flex:1;">' +
            '<span><span class="d">'+fmtDateTime(s.ts)+'</span><span class="c">'+s.items.length+' позиций с движением</span></span>' +
          '</button>' +
          '<button class="snap-del" data-del="'+s.id+'">✕</button>' +
        '</div>';
      }).join('');
  app.innerHTML =
    topbar('История пересчётов', typeLabel(type)) +
    '<main>' +
      '<p class="page-sub">Сохранённые сводки по датам.</p>' +
      '<div id="snapWrap">'+rowsHTML+'</div>' +
    '</main>';
  bindBack();
  app.querySelectorAll('.snap-row').forEach(function(b){
    b.onclick = function(){ nav({screen:'snapshotDetail', type:type, id: b.getAttribute('data-id')}); };
  });
  app.querySelectorAll('.snap-del').forEach(function(b){
    b.onclick = function(){
      var id = b.getAttribute('data-del');
      if(confirm('Удалить эту сохранённую сводку?')){
        ctx.snapshots = ctx.snapshots.filter(function(s){ return s.id !== id; });
        saveSnapsCtx(ctx);
        renderSnapshots(type);
      }
    };
  });
}

function renderSnapshotDetail(type, id){
  var ctx = getCtx(type);
  var snap = ctx.snapshots.find(function(s){ return s.id === id; });
  if(!snap){ back(); return; }
  var rowsHTML = snap.items.length===0
    ? '<div class="empty-state">В этой сводке все позиции были на нуле.</div>'
    : snap.items.map(function(i){
        var cls = i.total<0 ? 'amt neg' : 'amt';
        return '<div class="summary-row"><span>'+esc(i.name)+'</span><span class="'+cls+'">'+fmt(i.total)+' '+(i.unitLabel||'г')+'</span></div>';
      }).join('');
  app.innerHTML =
    topbar(fmtDateTime(snap.ts), 'История пересчётов') +
    '<main>' +
      '<div id="snapDetailWrap">'+rowsHTML+'</div>' +
      '<button class="nav-card ready" id="btnCopySnap" style="margin-top:20px;">Скопировать текстом<span class="tag">📋</span></button>' +
      '<button class="nav-card ready" id="btnFileSnap">Сохранить файлом<span class="tag">.txt</span></button>' +
    '</main>';
  bindBack();
  document.getElementById('btnCopySnap').onclick = function(){ copyText(buildReportText(snap.items, snap.ts, 'Пересчёт '+typeLabel(type))); };
  document.getElementById('btnFileSnap').onclick = function(){
    saveTextFile(type+'-pereschet-'+fileDateSlug(snap.ts)+'.txt', buildReportText(snap.items, snap.ts, 'Пересчёт '+typeLabel(type)));
  };
}

function renderManageTypePick(){
  app.innerHTML =
    topbar('Управление позициями') +
    '<main>' +
      '<p class="page-sub">Выбери раздел, который редактируем.</p>' +
      TYPE_META.map(function(m){ return '<button class="nav-card ready" data-type="'+m.key+'">'+esc(m.label)+'</button>'; }).join('') +
    '</main>';
  bindBack();
  app.querySelectorAll('.nav-card[data-type]').forEach(function(b){
    b.onclick = function(){ nav({screen:'manage', type:b.getAttribute('data-type')}); };
  });
}

function renderManage(type){
  var ctx = getCtx(type);
  var st = { q:'' };
  function rowsHTML(){
    var q = st.q.trim().toLowerCase();
    var items = ctx.products.filter(function(p){ return !q || p.name.toLowerCase().indexOf(q)!==-1; });
    if(items.length===0) return '<div class="empty-state">Пока пусто. Добавь первую позицию.</div>';
    return items.map(function(p){
      return '<button class="prod-row" data-bk="'+esc(p._baseKey||'')+'" data-cid="'+esc(p._customId||'')+'">' +
        '<span><span class="name">'+esc(p.name)+'</span><span class="pct">'+esc(pctLabel(p))+' · '+unitLabelShort(getBaseUnitKey(p))+'</span></span>' +
        '</button>';
    }).join('');
  }
  function bindRows(){
    app.querySelectorAll('.prod-row').forEach(function(r){
      r.onclick = function(){
        var bk = r.getAttribute('data-bk') || null;
        var cid = r.getAttribute('data-cid') || null;
        nav({screen:'manageForm', type:type, mode:'edit', baseKey:bk, customId:cid});
      };
    });
  }
  app.innerHTML =
    topbar('Управление позициями', typeLabel(type)) +
    '<main>' +
      '<button class="nav-card ready" id="btnFilters">Фильтры<span class="sub">'+ctx.categoryDefs.length+' категорий</span><span class="tag">✎</span></button>' +
      '<button class="nav-card ready" id="btnSortCfg">Сортировка<span class="sub">'+ctx.sortDefs.length+' включено</span><span class="tag">✎</span></button>' +
      '<button class="nav-card ready" id="btnAddNew" style="margin-top:6px;">+ Добавить позицию<span class="tag">новая</span></button>' +
      '<input class="search" id="searchInput" type="text" placeholder="Найти позицию…" autocomplete="off" style="margin-top:14px;">' +
      '<div id="listWrap">' + rowsHTML() + '</div>' +
    '</main>';
  bindBack();
  document.getElementById('btnFilters').onclick = function(){ nav({screen:'manageFilters', type:type}); };
  document.getElementById('btnSortCfg').onclick = function(){ nav({screen:'manageSort', type:type}); };
  document.getElementById('btnAddNew').onclick = function(){ nav({screen:'manageForm', type:type, mode:'new'}); };
  var input = document.getElementById('searchInput');
  input.oninput = function(){ st.q = this.value; document.getElementById('listWrap').innerHTML = rowsHTML(); bindRows(); };
  bindRows();
}

function renderManageFilters(type){
  var ctx = getCtx(type);
  var newLabel = '';
  function paint(){
    var rows = ctx.categoryDefs.length===0
      ? '<div class="empty-state">Фильтров пока нет.</div>'
      : ctx.categoryDefs.map(function(c){
          return '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">' +
            '<button class="nav-card ready" data-edit="'+esc(c.key)+'" style="margin:0; flex:1;">'+esc(c.label)+'<span class="tag">состав</span></button>' +
            '<button class="hist-del" data-key="'+esc(c.key)+'">✕</button>' +
          '</div>';
        }).join('');
    app.innerHTML =
      topbar('Фильтры', typeLabel(type)) +
      '<main>' +
        '<p class="page-sub">Категории, по которым можно фильтровать список позиций. Нажми на категорию, чтобы выбрать, какие позиции в неё входят.</p>' +
        '<div id="catList">' + rows + '</div>' +
        '<div class="field-label">Новый фильтр</div>' +
        '<div style="display:flex; gap:8px;">' +
          '<input class="value-input" id="newCatInput" type="text" placeholder="Название категории" style="flex:1;">' +
          '<button class="btn-add" style="flex:none; padding:0 18px;" id="btnAddCat">+</button>' +
        '</div>' +
      '</main>';
    bindBack();

    app.querySelectorAll('.nav-card[data-edit]').forEach(function(b){
      b.onclick = function(){ nav({screen:'manageFilterProducts', type:type, catKey:b.getAttribute('data-edit')}); };
    });
    
    document.getElementById('catList').querySelectorAll('.hist-del').forEach(function(b){
      b.onclick = function(){
        if(confirm('Удалить этот фильтр?')){ removeCategory(ctx, b.getAttribute('data-key')); paint(); }
      };
    });
    var newInput = document.getElementById('newCatInput');
    newInput.oninput = function(){ newLabel = this.value; };
    document.getElementById('btnAddCat').onclick = function(){
      var lbl = newLabel.trim();
      if(!lbl) return;
      addCategory(ctx, lbl);
      newLabel = '';
      paint();
    };
  }
  paint();
}

function renderManageFilterProducts(type, catKey){
  var ctx = getCtx(type);
  var catDef = ctx.categoryDefs.find(function(c){ return c.key === catKey; });
  if(!catDef){ back(); return; }
  
  var st = { q:'' };
  
  function toggleCat(pName){
    var p = ctx.products.find(function(x){ return x.name === pName; });
    if(!p) return;
    var idx = p.cats.indexOf(catKey);
    var newCats = p.cats.slice();
    if(idx === -1) newCats.push(catKey);
    else newCats.splice(idx, 1);

    if(p._customId != null){
       var cp = ctx.custom.added.find(function(c){ return c.id === p._customId; });
       if(cp) cp.cats = newCats;
    } else if(p._baseKey != null){
       if(!ctx.custom.edited[p._baseKey]) ctx.custom.edited[p._baseKey] = {};
       ctx.custom.edited[p._baseKey].cats = newCats;
    }
    saveCustom(ctx);
    refreshProducts(ctx);
    paint();
  }
  
  function rowsHTML(){
    var q = st.q.trim().toLowerCase();
    var items = ctx.products.filter(function(p){ return !q || p.name.toLowerCase().indexOf(q)!==-1; });
    if(items.length===0) return '<div class="empty-state">Ничего не найдено.</div>';
    
    return items.map(function(p){
      var inCat = p.cats.indexOf(catKey) !== -1;
      return '<button class="prod-select-row '+(inCat?'active':'')+'" data-name="'+esc(p.name)+'">' +
        '<span>'+esc(p.name)+'</span>' +
        '<span class="status">'+(inCat?'✔':'')+'</span>' +
      '</button>';
    }).join('');
  }
  
  function paint(){
    app.innerHTML =
      topbar('Состав: '+catDef.label, typeLabel(type)) +
      '<main>' +
        '<input class="search" id="searchProd" type="text" placeholder="Найти позицию..." autocomplete="off" value="'+esc(st.q)+'">' +
        '<div id="prodWrap">' + rowsHTML() + '</div>' +
      '</main>';
    bindBack();
    
    document.getElementById('searchProd').oninput = function(){
      st.q = this.value;
      document.getElementById('prodWrap').innerHTML = rowsHTML();
      bindRows();
    };
    bindRows();
  }
  
  function bindRows(){
    app.querySelectorAll('.prod-select-row').forEach(function(btn){
      btn.onclick = function(){ toggleCat(btn.getAttribute('data-name')); };
    });
  }
  
  paint();
}

function renderManageSort(type){
  var ctx = getCtx(type);
  var selected = ctx.sortDefs.slice();
  function paint(){
    var rows = SORT_CATALOG.map(function(s){
      var active = selected.indexOf(s.key)!==-1;
      return '<button class="chip'+(active?' active':'')+'" data-key="'+s.key+'" style="display:block; width:100%; text-align:left; margin-bottom:8px; border-radius:var(--radius-btn); padding:12px 14px;">'+esc(s.label)+'</button>';
    }).join('');
    app.innerHTML =
      topbar('Сортировка', typeLabel(type)) +
      '<main>' +
        '<p class="page-sub">Отметь, какие варианты сортировки показывать в списке позиций.</p>' +
        '<div id="sortList">' + rows + '</div>' +
        '<div class="btn-row"><button class="btn-add" id="btnSaveSort">Сохранить</button></div>' +
      '</main>';
    bindBack();
    document.getElementById('sortList').querySelectorAll('.chip').forEach(function(b){
      b.onclick = function(){
        var k = b.getAttribute('data-key');
        var i = selected.indexOf(k);
        if(i===-1) selected.push(k); else selected.splice(i,1);
        paint();
      };
    });
    document.getElementById('btnSaveSort').onclick = function(){
      ctx.sortDefs = SORT_CATALOG.map(function(s){return s.key;}).filter(function(k){ return selected.indexOf(k)!==-1; });
      saveSortDefs(ctx);
      back();
    };
  }
  paint();
}

function renderManageForm(type, mode, baseKey, customId){
  var ctx = getCtx(type);
  var existing = (mode==='edit') ? findProductByKeys(ctx, baseKey, customId) : null;
  if(mode==='edit' && !existing){ back(); return; }

  var f = existing
    ? { name:existing.name, type:existing.type, percent:existing.percent, narez:existing.narez, tselyy:existing.tselyy,
        note:existing.note||'', cats:(existing.cats||[]).slice(), measure:existing.measure||'weight',
        converter: existing.converter ? Object.assign({}, existing.converter) : null, convEdit:false }
    : { name:'', type:'none', percent:null, narez:null, tselyy:null, note:'', cats:[], measure:'weight', converter:null, convEdit:false };
  var err = '';

  function paint(){
    var typeChips = TYPE_DEFS.map(function(t){
      return '<button class="chip'+(f.type===t.key?' active':'')+'" data-type="'+t.key+'">'+t.label+'</button>';
    }).join('');
    var measureChips = MEASURE_DEFS.map(function(m){
      return '<button class="chip'+(f.measure===m.key?' active':'')+'" data-measure="'+m.key+'">'+m.label+'</button>';
    }).join('');

    var numFieldsHTML = '';
    if(f.type==='single' || f.type==='info'){
      numFieldsHTML = '<div class="field-label">'+(f.type==='info'?'% жирности':'Процент, %')+'</div>' +
        '<input class="value-input" id="fPercent" type="number" inputmode="decimal" placeholder="0" value="'+(f.percent!=null?esc(f.percent):'')+'">';
    } else if(f.type==='split'){
      numFieldsHTML =
        '<div class="field-label">% нарез (резаный)</div>' +
        '<input class="value-input" id="fNarez" type="number" inputmode="decimal" placeholder="0" value="'+(f.narez!=null?esc(f.narez):'')+'">' +
        '<div class="field-label">% целый</div>' +
        '<input class="value-input" id="fTselyy" type="number" inputmode="decimal" placeholder="0" value="'+(f.tselyy!=null?esc(f.tselyy):'')+'">';
    }

    var unitOpts = f.measure==='volume' ? [['pcs','шт'],['ml','мл'],['l','л']] : [['pcs','шт'],['g','г'],['kg','кг']];
    if (f.measure==='count') {
        unitOpts = [['pcs','шт'],['g','г'],['kg','кг'],['ml','мл'],['l','л']];
    }

    function selHTML(id, curVal){
      return '<select id="'+id+'" class="sort-select" style="margin-bottom:0; flex:none; width:100px;">' +
        unitOpts.map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===curVal?' selected':'')+'>'+o[1]+'</option>'; }).join('') +
      '</select>';
    }
    
    var convHTML = '';
    if(f.converter && !f.convEdit){
      convHTML = '<div class="field-label">Конвертер</div>' +
        '<div class="note-line" style="margin:0 0 8px;">'+esc(converterSummaryText(f.converter))+'</div>' +
        '<div class="quick-grid"><button class="quick-btn" id="btnConvEdit">Изменить</button><button class="quick-btn" id="btnConvRemove">✕ Убрать</button></div>';
    } else if(f.convEdit){
      convHTML = '<div class="field-label">Конвертер (например: 1 шт = 6 г)</div>' +
        '<div style="display:flex; gap:8px; margin-bottom:8px;">' +
          '<input class="value-input" id="convAVal" type="number" inputmode="decimal" placeholder="1" value="'+(f.convAVal!=null?esc(f.convAVal):'')+'" style="flex:1;">' +
          selHTML('convAType', f.convAType) +
        '</div>' +
        '<div style="display:flex; gap:8px; margin-bottom:8px;">' +
          '<input class="value-input" id="convBVal" type="number" inputmode="decimal" placeholder="6" value="'+(f.convBVal!=null?esc(f.convBVal):'')+'" style="flex:1;">' +
          selHTML('convBType', f.convBType) +
        '</div>' +
        '<div class="quick-grid"><button class="quick-btn" id="btnConvSave">Сохранить конвертер</button><button class="quick-btn" id="btnConvCancel">Отмена</button></div>';
    } else {
      convHTML = '<button class="quick-btn calc-toggle" id="btnConvAdd" style="margin-top:6px;">+ Добавить конвертер</button>';
    }

    app.innerHTML =
      topbar(mode==='edit' ? 'Изменить позицию' : 'Новая позиция', typeLabel(type)) +
      '<main>' +
        '<div class="field-label">Название</div>' +
        '<input class="value-input" id="fName" type="text" placeholder="Например: Ветчина" value="'+esc(f.name)+'">' +

        '<div class="field-label">Единица измерения</div>' +
        '<div class="chip-row" id="measureChips">' + measureChips + '</div>' +

        convHTML +

        '<div class="field-label">Тип процента</div>' +
        '<div class="chip-row" id="typeChips">' + typeChips + '</div>' +
        numFieldsHTML +

        '<div class="field-label">Заметка (необязательно)</div>' +
        '<input class="value-input" id="fNote" type="text" placeholder="например: по чист. весу" value="'+esc(f.note)+'">' +

        '<div class="warn-line">'+esc(err)+'</div>' +
        '<div class="btn-row"><button class="btn-add" id="btnSave">Сохранить</button></div>' +
        (mode==='edit' ? '<button class="reset-link" id="btnDelete">Удалить позицию</button>' : '') +
      '</main>';
    bindBack();

    document.getElementById('measureChips').querySelectorAll('.chip').forEach(function(b){
      b.onclick = function(){ f.measure = b.getAttribute('data-measure'); paint(); };
    });
    app.querySelectorAll('#typeChips .chip').forEach(function(b){
      b.onclick = function(){ f.type = b.getAttribute('data-type'); paint(); };
    });
    
    document.getElementById('fName').oninput = function(){ f.name = this.value; };
    document.getElementById('fNote').oninput = function(){ f.note = this.value; };
    var pctEl = document.getElementById('fPercent'); if(pctEl) pctEl.oninput = function(){ f.percent = parseFloat(this.value); };
    var narEl = document.getElementById('fNarez'); if(narEl) narEl.oninput = function(){ f.narez = parseFloat(this.value); };
    var tselEl = document.getElementById('fTselyy'); if(tselEl) tselEl.oninput = function(){ f.tselyy = parseFloat(this.value); };

    if(f.converter && !f.convEdit){
      document.getElementById('btnConvEdit').onclick = function(){
        f.convAVal=f.converter.aValue; f.convAType=f.converter.aType;
        f.convBVal=f.converter.bValue; f.convBType=f.converter.bType;
        f.convEdit=true; paint();
      };
      document.getElementById('btnConvRemove').onclick = function(){ f.converter=null; paint(); };
    } else if(f.convEdit){
      document.getElementById('convAVal').oninput = function(){ f.convAVal = parseFloat(this.value); };
      document.getElementById('convAType').onchange = function(){ f.convAType = this.value; };
      document.getElementById('convBVal').oninput = function(){ f.convBVal = parseFloat(this.value); };
      document.getElementById('convBType').onchange = function(){ f.convBType = this.value; };
      document.getElementById('btnConvSave').onclick = function(){
        var a=f.convAVal, b=f.convBVal;
        var at=f.convAType||unitOpts[0][0], bt=f.convBType||unitOpts[1][0];
        if(isNaN(a)||a<=0||isNaN(b)||b<=0){ err='Заполни оба значения конвертера.'; paint(); return; }
        var pcsCount = (at==='pcs'?1:0)+(bt==='pcs'?1:0);
        if(pcsCount!==1){ err='Один показатель должен быть "шт", другой — вес/объём.'; paint(); return; }
        f.converter = {aValue:a, aType:at, bValue:b, bType:bt};
        f.convEdit=false; err=''; paint();
      };
      document.getElementById('btnConvCancel').onclick = function(){ f.convEdit=false; paint(); };
    } else {
      document.getElementById('btnConvAdd').onclick = function(){
        f.convAVal=1; f.convAType='pcs';
        f.convBVal=null; f.convBType = (f.measure==='volume'||f.measure==='count') ? 'ml' : 'g';
        if(f.measure==='count') f.convBType = 'g';
        f.convEdit=true; paint();
      };
    }

    document.getElementById('btnSave').onclick = function(){
      var nm = (f.name||'').trim();
      if(!nm){ err='Введи название.'; paint(); return; }
      var exBK = existing ? existing._baseKey : null;
      var exCID = existing ? existing._customId : null;
      if(nameTaken(ctx, nm, exBK, exCID)){ err='Такая позиция уже есть.'; paint(); return; }
      if(f.type==='single' && (isNaN(f.percent) || f.percent==null)){ err='Укажи процент.'; paint(); return; }
      if(f.type==='info' && (isNaN(f.percent) || f.percent==null)){ err='Укажи % жирности.'; paint(); return; }
      if(f.type==='split' && (isNaN(f.narez) && isNaN(f.tselyy))){ err='Укажи хотя бы один процент (нарез или целый).'; paint(); return; }

      var data = {
        name: nm, type: f.type,
        percent: (f.type==='single'||f.type==='info') ? f.percent : null,
        narez: f.type==='split' && !isNaN(f.narez) ? f.narez : null,
        tselyy: f.type==='split' && !isNaN(f.tselyy) ? f.tselyy : null,
        note: (f.note||'').trim() || null,
        cats: f.cats,
        measure: f.measure,
        converter: f.converter
      };
      if(mode==='edit') updateProduct(ctx, existing, data);
      else addCustomProduct(ctx, data);
      back();
    };

    var delBtn = document.getElementById('btnDelete');
    if(delBtn){
      delBtn.onclick = function(){
        if(confirm('Удалить позицию «'+existing.name+'»? Сохранённые остатки по ней тоже удалятся.')){
          deleteProductEntry(ctx, existing);
          back();
        }
      };
    }
  }
  paint();
}

function render(){
  if(route.screen === 'home') renderHome();
  else if(route.screen === 'settingsMain') renderSettingsMain();
  else if(route.screen === 'settingsScale') renderSettingsScale();
  else if(route.screen === 'settingsTheme') renderSettingsTheme();
  else if(route.screen === 'section') renderSection(route.type);
  else if(route.screen === 'list') renderList(route.type);
  else if(route.screen === 'detail') renderDetail(route.type, route.product);
  else if(route.screen === 'productHistory') renderProductHistory(route.type, route.product);
  else if(route.screen === 'summary') renderSummary(route.type);
  else if(route.screen === 'snapshots') renderSnapshots(route.type);
  else if(route.screen === 'snapshotDetail') renderSnapshotDetail(route.type, route.id);
  else if(route.screen === 'manageTypePick') renderManageTypePick();
  else if(route.screen === 'manage') renderManage(route.type);
  else if(route.screen === 'manageFilters') renderManageFilters(route.type);
  else if(route.screen === 'manageFilterProducts') renderManageFilterProducts(route.type, route.catKey);
  else if(route.screen === 'manageSort') renderManageSort(route.type);
  else if(route.screen === 'manageForm') renderManageForm(route.type, route.mode, route.baseKey, route.customId);
  else renderHome();
}

render();

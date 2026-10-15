"use strict";

var TARE_PRESETS = [70, 100, 240, 350, 450, 1350];

function N(name, note){ return {name: name, type:'none', note: note||null}; }
function S(name, percent, note){ return {name: name, type:'single', percent: percent, note: note||null}; }
function SP(name, narez, tselyy, note){ return {name: name, type:'split', narez: narez==null?null:narez, tselyy: tselyy==null?null:tselyy, note: note||null}; }
function I(name, percent){ return {name: name, type:'info', percent: percent}; }

var BASE_PRODUCTS = [
  N('Ананас','по чист. весу'), SP('Балык',5,10), N('Бальзамический соус'), SP('Бекон',3,20),
  S('Брокколи',30), SP('Ветчина',2,10,'рез'), N('Виноград'), N('Вяленые томаты'), N('Груша (шт)'),
  N('Грибная приправа'), N('Дрожжи'), N('Зеленый лук'), N('Картофель'), N('Картофель НФ'),
  N('Корейская морковка'), N('Кукуруза'), N('Кунжут (сырой)'), SP('Курица копченая',7,18,'рез'),
  N('Лук маринованый'), S('Лук (Марс)',10), S('Лук репчатый (белый)',10), I('Майонез',30),
  N('Маслины рез','по чист. весу'), N('Маслины целые','по чист. весу'), N('Масло Оливковое','4,6 кг'),
  N('Масло подсол.'), N('Масло сливочное'), N('Микс салатный'), N('Минеральная вода'),
  N('Молоко','по 1л (0,9л)'), N('Мука'), N('Огурец корнишон'), N('Огурец маринованный','по чист. весу'),
  N('Оливки'), N('Опята','по чист. весу'), S('Охотничьи колбаски',3), S('Перец болгарский',18),
  N('Перец Пепперони','по чист. весу'), N('Перец Халапеньо'), N('Перец Чили'), N('Персик','по чист. весу'),
  S('Помидор свежий',5), S('Помидор Черри',3), N('Порционный чесночный соус'), N('Салат Айсберг'),
  N('Салат Лолла'), SP('Салями',4,12,'рез'), N('Сахар'), N('Свинина'), N('Свинина ПФ'), I('Сливки',30),
  N('Соль Экстра'), SP('Сосиска',null,3,'грязный 5%'), N('Соус Бешамель'), N('Соус Томатный'),
  N('Соус чесночно-майонезный (йо-йо)'), N('Специи на пиццу'), S('Сыр Дор Блю',3), S('Сыр Моцарелла',3),
  S('Сыр Пармезан',2), S('Сыр Русский',2), N('Сыр Сулугуни'), S('Сыр Фета',3), N('Сыр Чеддер'),
  N('Тесто на пиццу'), N('Томаты'), N('Укроп'), N('Уксус'), N('Фарш'), N('Фарш ПФ'), N('Филе куриное'),
  N('Филе куриное ПФ'), N('Хамон'), S('Чеснок',25), N('Шампиньоны'), N('Шампиньоны ПФ'),
  N('Шампиньоны марин. целые'), N('Яйцо'), N('Яйцо перепелиное')
].sort(function(a,b){ return a.name.localeCompare(b.name,'ru'); });

var CATS_BY_NAME = {
  'Балык':['meat'], 'Бекон':['meat'], 'Ветчина':['meat'], 'Хамон':['meat'],
  'Салями':['meat'], 'Сосиска':['meat'], 'Курица копченая':['meat'], 'Охотничьи колбаски':['meat'],
  'Молоко':['dairy'], 'Масло сливочное':['dairy'], 'Сливки':['dairy'],
  'Сыр Дор Блю':['dairy'], 'Сыр Моцарелла':['dairy'], 'Сыр Пармезан':['dairy'], 'Сыр Русский':['dairy'],
  'Сыр Сулугуни':['dairy'], 'Сыр Фета':['dairy'], 'Сыр Чеддер':['dairy'],
  'Яйцо':['dairy'], 'Яйцо перепелиное':['dairy'],
  'Маслины рез':['canned'], 'Маслины целые':['canned'], 'Оливки':['canned'],
  'Огурец корнишон':['canned'], 'Огурец маринованный':['canned'], 'Опята':['canned'],
  'Шампиньоны марин. целые':['canned'], 'Перец Халапеньо':['canned'], 'Перец Чили':['canned'],
  'Перец Пепперони':['canned'], 'Вяленые томаты':['canned'], 'Ананас':['canned'], 'Персик':['canned'],
  'Томаты':['canned'],
  'Брокколи':['veg'], 'Зеленый лук':['veg'], 'Картофель':['veg'], 'Картофель НФ':['veg'],
  'Корейская морковка':['veg'], 'Лук (Марс)':['veg'], 'Лук репчатый (белый)':['veg'],
  'Лук маринованый':['veg'], 'Кукуруза':['veg'], 'Перец болгарский':['veg'],
  'Помидор свежий':['veg'], 'Помидор Черри':['veg'], 'Укроп':['veg'], 'Чеснок':['veg'],
  'Салат Айсберг':['veg'], 'Салат Лолла':['veg'], 'Микс салатный':['veg'],
  'Груша (шт)':['veg'], 'Виноград':['veg'],
  'Шампиньоны':['raw'], 'Свинина':['raw'], 'Филе куриное':['raw'], 'Фарш':['raw'],
  'Свинина ПФ':['pf'], 'Фарш ПФ':['pf'], 'Филе куриное ПФ':['pf'], 'Шампиньоны ПФ':['pf'],
  'Соус Бешамель':['pf'], 'Соус Томатный':['pf'], 'Соус чесночно-майонезный (йо-йо)':['pf'],
  'Порционный чесночный соус':['pf'], 'Бальзамический соус':['pf'],
  'Мука':['dough'], 'Дрожжи':['dough'], 'Сахар':['dough'], 'Соль Экстра':['dough'],
  'Масло Оливковое':['dough'], 'Масло подсол.':['dough'], 'Минеральная вода':['dough'],
  'Тесто на пиццу':['dough'],
  'Специи на пиццу':['other'], 'Грибная приправа':['other'], 'Кунжут (сырой)':['other'],
  'Уксус':['other'], 'Майонез':['other']
};

var DEFAULT_ITALIA_CATEGORIES = [
  {key:'meat', label:'Мясо'}, {key:'dairy', label:'Молочка'}, {key:'canned', label:'Консервация'},
  {key:'veg', label:'Овощи'}, {key:'raw', label:'Сырое'}, {key:'pf', label:'ПФ'},
  {key:'dough', label:'Замес'}, {key:'other', label:'Прочее'}
];

var SORT_CATALOG = [
  {key:'name_asc', label:'По алфавиту (А→Я)', cmp:function(ctx,a,b){ return a.name.localeCompare(b.name,'ru'); }},
  {key:'name_desc', label:'По алфавиту (Я→А)', cmp:function(ctx,a,b){ return b.name.localeCompare(a.name,'ru'); }},
  {key:'total_desc', label:'По остатку: больше → меньше', cmp:function(ctx,a,b){ return Math.abs(getEntry(ctx,b.name).total) - Math.abs(getEntry(ctx,a.name).total); }},
  {key:'total_asc', label:'По остатку: меньше → больше', cmp:function(ctx,a,b){ return Math.abs(getEntry(ctx,a.name).total) - Math.abs(getEntry(ctx,b.name).total); }},
  {key:'pct_first', label:'Сначала с процентом', cmp:function(ctx,a,b){
    var ap=(a.type==='single'||a.type==='split')?0:1, bp=(b.type==='single'||b.type==='split')?0:1;
    return ap-bp || a.name.localeCompare(b.name,'ru');
  }},
  {key:'nopct_first', label:'Сначала без процента', cmp:function(ctx,a,b){
    var ap=(a.type==='single'||a.type==='split')?1:0, bp=(b.type==='single'||b.type==='split')?1:0;
    return ap-bp || a.name.localeCompare(b.name,'ru');
  }}
];
var DEFAULT_SORT_KEYS = ['name_asc','total_desc','pct_first'];

var TYPE_META = [
  {key:'italia', label:'Италия'},
  {key:'japonia', label:'Япония'},
  {key:'operators', label:'Операторы'}
];

var TYPE_DEFS = [
  {key:'none', label:'Без %'}, {key:'single', label:'Один %'},
  {key:'split', label:'Нарез/целый %'}, {key:'info', label:'Жирность'}
];

var MEASURE_DEFS = [
  {key:'weight', label:'Вес (г/кг)'}, {key:'volume', label:'Объём (л/мл)'}, {key:'count', label:'Штуки (шт)'}
];

function typeLabel(type){ var t=TYPE_META.find(function(m){return m.key===type;}); return t?t.label:type; }

function pctLabel(p){
  if(p.type==='none') return p.note ? p.note : 'без %, чистый вес';
  if(p.type==='info') return p.percent+'% (жирность, не вычитается)';
  if(p.type==='single') return p.percent+'%' + (p.note? ' · '+p.note : '');
  if(p.type==='split'){
    var parts=[];
    if(p.narez!=null) parts.push(p.narez+'% нарез');
    if(p.tselyy!=null) parts.push(p.tselyy+'% целый');
    var s=parts.join(', ');
    if(p.note) s += ' · '+p.note;
    return s;
  }
  return '';
}

function percentButtons(p){
  if(p.type==='single') return [{label:'−'+p.percent+'%', pct:p.percent}];
  if(p.type==='split'){
    var arr=[];
    if(p.narez!=null) arr.push({label:'Резаный −'+p.narez+'%', pct:p.narez});
    if(p.tselyy!=null) arr.push({label:'Целый −'+p.tselyy+'%', pct:p.tselyy});
    return arr;
  }
  return [];
}

/* ScrimPass – Sprachumschaltung (Englisch = Standard, Deutsch optional).
 *
 * Die Seiten sind auf Deutsch geschrieben. Ist Englisch aktiv, ersetzt dieses
 * Skript alle sichtbaren Texte (auch später per JS eingefügte, z. B. Toasts,
 * Runden-Listen, Server-Fehlermeldungen) anhand des Wörterbuchs aus
 * /i18n-en.js. Einträge werden exakt gesucht; enthält ein Text Zahlen, wird
 * zusätzlich mit "{n}" als Platzhalter für jede Zahl gesucht
 * ("Noch 3 Plätze frei" -> Schlüssel "Noch {n} Plätze frei").
 * Ganze Absätze mit Rechtstext liegen dagegen doppelt im HTML vor
 * (data-lang="de" / data-lang="en") und werden nur ein-/ausgeblendet.
 *
 * Die Wahl liegt in localStorage + Cookie "sp_lang" (das Cookie liest der
 * Server, z. B. für die Sprache der Stripe-Bezahlseite).
 */
(function () {
  var KEY = 'sp_lang';

  function readLang() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'de' || v === 'en') return v;
    } catch (e) {}
    var m = document.cookie.match(/(?:^|;\s*)sp_lang=(de|en)/);
    return m ? m[1] : 'en';
  }

  var lang = readLang();
  var root = document.documentElement;
  root.setAttribute('lang', lang);
  root.setAttribute('data-ui-lang', lang);
  // Cookie immer auffrischen, damit der Server dieselbe Sprache sieht.
  document.cookie = 'sp_lang=' + lang + '; path=/; max-age=31536000; SameSite=Lax';
  window.SP_LANG = lang;

  window.setLang = function (l) {
    if (l !== 'de' && l !== 'en') return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    document.cookie = 'sp_lang=' + l + '; path=/; max-age=31536000; SameSite=Lax';
    location.reload();
  };

  var dict = window.SP_I18N_EN || {};
  var NUM = /\d+(?:[.,]\d+)*/g;

  // Deutsches Zahlenformat -> englisches (2,99 -> 2.99; 1.000 -> 1,000).
  function enNumber(n) {
    return n.replace(/\./g, '\u0000').replace(/,/g, '.').replace(/\u0000/g, ',');
  }

  // Texte mit Namen o. Ä. darin: [RegExp, Ersatz mit $1, $2 ...]
  var patterns = window.SP_I18N_EN_PATTERNS || [];

  function lookup(core) {
    if (Object.prototype.hasOwnProperty.call(dict, core)) return dict[core];
    var nums = core.match(NUM);
    if (nums) {
      var tpl = core.replace(NUM, '{n}');
      if (Object.prototype.hasOwnProperty.call(dict, tpl)) {
        var i = 0;
        return dict[tpl].replace(/\{n\}/g, function () { return enNumber(nums[i++] || ''); });
      }
    }
    for (var p = 0; p < patterns.length; p++) {
      if (patterns[p][0].test(core)) return core.replace(patterns[p][0], patterns[p][1]);
    }
    // Emoji/Symbol davor (z. B. "🎓 Schnell-Angebot"): Rest einzeln übersetzen.
    var em = core.match(EMOJI_PREFIX);
    if (em) {
      var rest = lookup(em[2]);
      if (rest != null) return em[1] + rest;
    }
    return null;
  }
  var EMOJI_PREFIX;
  try { EMOJI_PREFIX = new RegExp('^((?:[\\p{Extended_Pictographic}\\u2190-\\u21FF\\u2600-\\u27BF●✓✕★][\\uFE0F\\u200D]*)+\\s*)(\\S[\\s\\S]*)$', 'u'); }
  catch (e) { EMOJI_PREFIX = /^([←-⇿☀-➿●✓✕★]\s*)(\S[\s\S]*)$/; }

  // Übersetzt einen Text; führende/abschließende Leerzeichen bleiben erhalten.
  function tr(s) {
    if (!s) return null;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var core = m[2].replace(/\s+/g, ' ');
    if (!core || !/[A-Za-zÄÖÜäöüß€]/.test(core)) return null;
    var out = lookup(core);
    if (out == null) return null;
    // "~" am Anfang: kein Leerzeichen davor (z. B. englisches Satzende ".").
    if (out.charAt(0) === '~') return out.slice(1) + m[3];
    return m[1] + out + m[3];
  }

  // Für die Muster in i18n-en.js: eingesetzte Teile (z. B. Angebotsnamen) mitübersetzen.
  window.SP_I18N_T = function (s) { var o = lang === 'en' ? tr(s) : null; return o == null ? s : o; };

  // Für JS-Code, der Text selbst zusammenbaut: t('Text {name}', {name: x}).
  window.t = function (s, vars) {
    var out = lang === 'en' ? (tr(s) || s) : s;
    if (vars) out = out.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
    return out;
  };

  // ---------- Umschalter (EN | DE) ----------
  function buildToggle(extraClass) {
    var wrap = document.createElement('div');
    wrap.className = 'lang-toggle' + (extraClass ? ' ' + extraClass : '');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', lang === 'en' ? 'Language' : 'Sprache');
    wrap.setAttribute('data-i18n-skip', '');
    ['en', 'de'].forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = l.toUpperCase();
      b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
      if (l === lang) b.className = 'active';
      b.addEventListener('click', function () { if (l !== lang) window.setLang(l); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  var css =
    '.lang-toggle{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:999px;' +
    'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);flex-shrink:0}' +
    '.lang-toggle button{all:unset;cursor:pointer;font:700 11.5px/1 inherit;letter-spacing:.04em;' +
    'padding:6px 9px;border-radius:999px;color:#9a98a3;transition:background .15s,color .15s}' +
    '.lang-toggle button:hover{color:#f3f2ef}' +
    '.lang-toggle button.active{background:#f0b429;color:#161616}' +
    '.lang-toggle button:focus-visible{outline:2px solid #f0b429;outline-offset:2px}' +
    '.lang-toggle-floating{position:fixed;top:14px;right:16px;z-index:200;background:rgba(19,19,24,0.9);backdrop-filter:blur(6px)}' +
    'html[data-ui-lang="en"] [data-lang="de"],html[data-ui-lang="de"] [data-lang="en"]{display:none!important}' +
    // Kurz ausblenden, bis die Übersetzung steht (verhindert deutsches Aufblitzen).
    '.legal-note{font-size:13px;line-height:1.55;color:#9a98a3;background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.25);border-radius:10px;padding:10px 14px;margin:0 0 22px}' +
    '.legal-note a{color:#f0b429}' +
    'html.i18n-pending body{visibility:hidden}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function mountToggle() {
    var slot = document.querySelector('[data-lang-toggle-slot]');
    if (slot) slot.appendChild(buildToggle());
    else document.body.appendChild(buildToggle('lang-toggle-floating'));
  }

  if (lang !== 'en') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountToggle);
    else mountToggle();
    return;
  }

  // ---------- Übersetzen (nur Englisch) ----------
  root.classList.add('i18n-pending');
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function skipped(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP_TAGS[n.nodeName] || n.hasAttribute('data-i18n-skip') || n.isContentEditable) return true;
    }
    return false;
  }

  function translateText(node) {
    var parent = node.parentNode;
    if (!parent || parent.nodeType !== 1 || skipped(parent)) return;
    var out = tr(node.nodeValue);
    if (out != null && out !== node.nodeValue) node.nodeValue = out;
  }

  // Attribute (z. B. placeholder eines <textarea>) dürfen auch dort übersetzt
  // werden, wo der Textinhalt tabu ist – nur data-i18n-skip zählt.
  function attrSkipped(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (n.hasAttribute('data-i18n-skip')) return true;
    }
    return false;
  }

  function translateAttrs(el) {
    if (attrSkipped(el)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v) { var out = tr(v); if (out != null && out !== v) el.setAttribute(ATTRS[i], out); }
    }
    if (el.nodeName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) {
      var o = tr(el.value); if (o != null) el.value = o;
    }
    if (el.nodeName === 'META' && /^(description|og:title|og:description|twitter:title|twitter:description)$/.test(el.getAttribute('name') || el.getAttribute('property') || '')) {
      var c = el.getAttribute('content'); var oc = c && tr(c); if (oc) el.setAttribute('content', oc);
    }
  }

  function translateTree(rootNode) {
    if (rootNode.nodeType === 3) { translateText(rootNode); return; }
    if (rootNode.nodeType !== 1) return;
    translateAttrs(rootNode);
    var all = rootNode.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) translateAttrs(all[i]);
    var w = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null);
    var n; var list = [];
    while ((n = w.nextNode())) list.push(n);
    for (var j = 0; j < list.length; j++) translateText(list[j]);
  }

  function translateTitle() {
    var o = tr(document.title); if (o) document.title = o;
  }

  function start() {
    translateTitle();
    translateTree(document.head);
    translateTree(document.body);
    mountToggle();
    root.classList.remove('i18n-pending');
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') translateText(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
        else for (var k = 0; k < m.addedNodes.length; k++) translateTree(m.addedNodes[k]);
      }
      translateTitle();
    }).observe(document.documentElement, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  // Sicherheitsnetz: nie dauerhaft unsichtbar bleiben.
  setTimeout(function () { root.classList.remove('i18n-pending'); }, 1500);
})();

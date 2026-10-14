/* Entwurf C (?entwurf=3): offizielles Design unverändert, nur anderes Farbschema
 * (Navy-Blau + Lila). Ersetzt beim Laden die Farbwerte in den <style>-Blöcken und
 * in Inline-Styles. ?entwurf=0 schaltet zurück. Muss am Ende von <head> stehen. */
(function () {
  var KEY = 'sp_home_v2', mode = null;
  try {
    var qs = new URLSearchParams(location.search).get('entwurf');
    if (qs === '1' || qs === '2' || qs === '3') localStorage.setItem(KEY, qs);
    if (qs === '0') localStorage.removeItem(KEY);
    mode = localStorage.getItem(KEY);
  } catch (e) {}
  if (mode !== '3') return;

  var MAP = [
    // Token-Münze bleibt gold (wie auf der Vorlage)
    [/radial-gradient\(circle at 35% 30%,\s*#ffe9a8,\s*var\(--gold\)\)/g, 'radial-gradient(circle at 35% 30%, #ffe9a8, #eeb22b)'],
    // Sprachschalter (aus /i18n.js)
    [/#f7c654,\s*#e3a320/gi, '#7444e0,#6535d2'],
    [/--bg:\s*#0b0b0f/g, '--bg: #1b2b3a'],
    [/--bg-elev:\s*#131318/g, '--bg-elev: #203442'],
    [/--sidebar:\s*#0e0e13/g, '--sidebar: #15202e'],
    [/--text-dim:\s*#9a98a3/g, '--text-dim: #a9bccb'],
    [/--text-faint:\s*#64626d/g, '--text-faint: #7f95a8'],
    // Akzent: Gold -> Lila (Buttons, aktive Tabs, Hervorhebungen)
    [/linear-gradient\((\d+deg),\s*#ffd166,\s*var\(--gold\)\)/gi, 'linear-gradient($1,#7444e0,#6535d2)'],
    [/#ffd166/gi, '#9d7bf5'],
    [/#f0b429/gi, '#8e66f0'],
    [/rgba\(240,\s*180,\s*41/g, 'rgba(124,77,230'],
    [/#1a1305/gi, '#ffffff'],
    // dunkle Flächen -> Navy
    [/rgba\(11,\s*11,\s*15/g, 'rgba(34,55,68'],
    [/rgba\(6,\s*6,\s*9/g, 'rgba(10,20,30'],
    [/#191921/gi, '#2a4052'],
    [/#101015/gi, '#182636'],
    [/#0b0b0f/gi, '#1b2b3a'],
    [/#131318/gi, '#203442'],
  ];
  function recolor(css) {
    for (var i = 0; i < MAP.length; i++) css = css.replace(MAP[i][0], MAP[i][1]);
    return css;
  }
  function fixStyles(root) {
    var els = root.querySelectorAll ? root.querySelectorAll('[style]') : [];
    for (var i = 0; i < els.length; i++) {
      var s = els[i].getAttribute('style'), n = recolor(s);
      if (n !== s) els[i].setAttribute('style', n);
    }
    if (root.getAttribute && root.hasAttribute('style')) {
      var s2 = root.getAttribute('style'), n2 = recolor(s2);
      if (n2 !== s2) root.setAttribute('style', n2);
    }
  }

  function fixStyleTags() {
    var styles = document.querySelectorAll('style');
    for (var i = 0; i < styles.length; i++) {
      var t = styles[i].textContent, n = recolor(t);
      if (n !== t) styles[i].textContent = n;
    }
  }
  fixStyleTags();
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#1b2b3a');

  window.addEventListener('load', fixStyleTags);
  document.addEventListener('DOMContentLoaded', function () {
    fixStyleTags();
    fixStyles(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        m.addedNodes.forEach(function (n) { if (n.nodeType === 1) fixStyles(n); });
      });
    }).observe(document.body, {childList: true, subtree: true});
  });
})();

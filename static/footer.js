/* Gemeinsame Fußleiste für alle ScrimPass-Seiten (App, Anleitung, AGB, Datenschutz, ...).
   Wird per <script src="/footer.js" defer> eingebunden und baut Stil + Markup selbst auf. */
(function(){
  if(document.querySelector('.site-footer')) return;

  var appMain = document.querySelector('.shell .main');
  var inApp = !!appMain;

  var css = `
    .site-footer{
      margin-top:auto; position:relative; z-index:1; background:#08080b;
      border-top:1px solid rgba(255,255,255,0.07); color:#9a98a3;
      font-family:'Manrope', sans-serif; -webkit-font-smoothing:antialiased;
    }
    .site-footer *{box-sizing:border-box;}
    .sf-inner{max-width:1600px; margin:0 auto; padding:44px 34px 26px;}
    .sf-top{display:grid; grid-template-columns:1.2fr 1.4fr; gap:48px;}
    .sf-logo{
      display:inline-flex; align-items:center; gap:10px; margin-bottom:16px; text-decoration:none;
      color:#f3f2ef; font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:17px;
    }
    .sf-mark{
      width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center;
      background:linear-gradient(145deg,#f0b429,#b9821f); color:#161616; font-size:14px;
    }
    .sf-brand p{margin:0; max-width:380px; font-size:14px; line-height:1.7;}
    .sf-title{margin-bottom:16px; color:#f3f2ef; font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:15px;}
    .sf-links{list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(2, minmax(0, max-content)); gap:12px 48px;}
    .sf-links a, .sf-legal a{color:#9a98a3; text-decoration:none; font-size:14px; font-weight:500; transition:color .15s ease;}
    .sf-links a:hover, .sf-legal a:hover{color:#f0b429;}
    .sf-bottom{
      margin-top:34px; padding-top:22px; border-top:1px solid rgba(255,255,255,0.07);
      display:flex; justify-content:space-between; align-items:center; gap:14px 28px; flex-wrap:wrap; font-size:13.5px;
    }
    .sf-legal{list-style:none; margin:0; padding:0; display:flex; gap:10px 26px; flex-wrap:wrap;}
    .sf-copy{color:#64626d;}
    @media (max-width:760px){
      .sf-inner{padding:34px 20px 22px;}
      .sf-top{grid-template-columns:1fr; gap:30px;}
    }
    /* Außerhalb der App: Seite mindestens so hoch wie das Fenster, Fußleiste unten */
    body.sf-standalone{min-height:100vh; display:grid; grid-template-rows:1fr auto;}
    body.sf-standalone .wrap{width:100%;}
    body.sf-standalone .site-footer{margin-top:0;}
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var nav = [
    ['matches', 'Free Scrims'], ['dropmaps', 'Dropmaps'], ['redeem', 'Credits einlösen'],
    ['referrals', 'Referrals'], ['history', 'Match-Verlauf'], ['profile', 'Profil'], ['spclient', 'SP-Client']
  ];
  var footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML =
    '<div class="sf-inner">' +
      '<div class="sf-top">' +
        '<div class="sf-brand">' +
          '<a class="sf-logo" href="/" data-footer-view="home"><span class="sf-mark">SP</span>ScrimPass</a>' +
          '<p>ScrimPass ist eine Plattform für kostenlose Scrims: Tritt Runden bei, kämpfe um Top-Platzierungen und verdiene Credits.</p>' +
        '</div>' +
        '<div>' +
          '<div class="sf-title">Navigation</div>' +
          '<ul class="sf-links">' +
            nav.map(function(n){ return '<li><a href="/?view=' + n[0] + '" data-footer-view="' + n[0] + '">' + n[1] + '</a></li>'; }).join('') +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="sf-bottom">' +
        '<ul class="sf-legal">' +
          '<li><a href="/anleitung">So funktioniert’s</a></li>' +
          '<li><a href="/agb">AGB</a></li>' +
          '<li><a href="/datenschutz">Datenschutz</a></li>' +
          '<li><a href="/impressum">Impressum</a></li>' +
          '<li><a href="/widerruf">Widerruf</a></li>' +
        '</ul>' +
        '<div class="sf-copy">© ' + new Date().getFullYear() + ' ScrimPass. Alle Rechte vorbehalten.</div>' +
      '</div>' +
    '</div>';

  if(inApp){
    appMain.appendChild(footer);
    // In der App ohne Neuladen navigieren: den passenden Menüpunkt der Seitenleiste auslösen
    // (der kennt auch die Regel, dass das Profil eine Anmeldung braucht).
    footer.addEventListener('click', function(e){
      var link = e.target.closest('[data-footer-view]');
      if(!link) return;
      var target = document.querySelector('[data-view="' + link.dataset.footerView + '"]');
      if(!target) return;
      e.preventDefault();
      target.click();
    });
  } else {
    document.body.classList.add('sf-standalone');
    document.body.appendChild(footer);
  }
})();

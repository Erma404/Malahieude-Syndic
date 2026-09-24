/* =====================================================================
   MALAHIEUDE SYNDIC — Gestion du consentement aux cookies (CNIL)
   ---------------------------------------------------------------------
   La bannière ne s'affiche QUE si au moins un service est déclaré dans
   CONSENT_SERVICES ci-dessous. Aujourd'hui la liste est vide : le site ne
   dépose aucun cookie, aucune bannière n'apparaît.

   Aperçu sans rien activer : ajouter ?cookies=demo à l'adresse de la page.

   Pour activer un outil : décommenter / adapter un exemple ci-dessous.
   Le script de l'outil n'est chargé qu'APRÈS acceptation de sa catégorie.
   Si la liste des services change, incrémenter CONSENT_VERSION : le choix
   sera redemandé à tous les visiteurs.
   ===================================================================== */
const CONSENT_VERSION = 1;
const CONSENT_DURATION_DAYS = 182; // 6 mois, durée recommandée par la CNIL

const CONSENT_CATEGORIES = {
  audience: {
    label: "Mesure d'audience",
    description: "Statistiques de fréquentation anonymisées, pour comprendre comment le site est utilisé et l'améliorer."
  },
  marketing: {
    label: "Publicité et réseaux sociaux",
    description: "Mesure de l'efficacité de nos campagnes et contenus tiers intégrés."
  }
};

const CONSENT_SERVICES = [
  /* Exemple Matomo (hébergé en France) :
  {
    id: 'matomo', category: 'audience', name: 'Matomo',
    load() {
      const _paq = window._paq = window._paq || [];
      _paq.push(['trackPageView'], ['enableLinkTracking']);
      _paq.push(['setTrackerUrl', 'https://VOTRE-INSTANCE.matomo.cloud/matomo.php'], ['setSiteId', '1']);
      const s = document.createElement('script'); s.async = true;
      s.src = 'https://cdn.matomo.cloud/VOTRE-INSTANCE.matomo.cloud/matomo.js';
      document.head.appendChild(s);
    }
  },
  */
  /* Exemple Google Analytics 4 :
  {
    id: 'ga4', category: 'audience', name: 'Google Analytics',
    load() {
      const s = document.createElement('script'); s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX';
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', 'G-XXXXXXX', { anonymize_ip: true });
    }
  },
  */
];

/* ===================================================================== */
(() => {
  const SELF = document.currentScript;
  const KEY = 'malahieude-consent';
  const demo = new URLSearchParams(location.search).get('cookies') === 'demo';
  const services = demo
    ? [{ id: 'demo', category: 'audience', name: 'Outil de statistiques (démonstration)', load() {} }]
    : CONSENT_SERVICES;
  if (!services.length) return; // aucun cookie : ni bannière, ni lien de gestion

  /* Feuille de style chargée seulement si la bannière peut s'afficher
     (attribut data-css sur la balise script) : aucun blocage du rendu sinon. */
  const cssHref = SELF && SELF.dataset.css;
  if (cssHref && !document.querySelector('link[data-cc-css]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = cssHref; l.setAttribute('data-cc-css', '');
    document.head.appendChild(l);
  }

  const used = [...new Set(services.map(s => s.category))].filter(c => CONSENT_CATEGORIES[c]);
  const policy = document.querySelector('a[href$="politique-confidentialite.html"]');
  const policyHref = policy ? policy.getAttribute('href') + '#cookies' : 'politique-confidentialite.html#cookies';

  const read = () => {
    if (demo) return null;
    try {
      const c = JSON.parse(localStorage.getItem(KEY));
      if (!c || c.v !== CONSENT_VERSION || Date.now() > c.expires) return null;
      return c;
    } catch { return null; }
  };
  const write = choices => {
    const c = { v: CONSENT_VERSION, date: new Date().toISOString(), expires: Date.now() + CONSENT_DURATION_DAYS * 864e5, choices };
    try { if (!demo) localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
    return c;
  };
  const loaded = new Set();
  const apply = choices => services.forEach(s => {
    if (choices[s.category] && !loaded.has(s.id)) { loaded.add(s.id); try { s.load(); } catch (e) { console.error(e); } }
  });

  /* ---------- Interface ---------- */
  const root = document.createElement('section');
  root.className = 'cc';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'false');
  root.setAttribute('aria-labelledby', 'cc-title');
  root.setAttribute('aria-describedby', 'cc-desc');
  root.hidden = true;
  root.innerHTML = `
    <div class="cc-inner">
      <button type="button" class="cc-skip" data-cc="refuse">Continuer sans accepter <span aria-hidden="true">✕</span></button>
      <h2 class="cc-title" id="cc-title">Vos choix en matière de cookies</h2>
      <p class="cc-desc" id="cc-desc">Avec votre accord, nous utilisons des cookies pour mesurer la fréquentation du site. Vous pouvez accepter, refuser ou choisir par catégorie ; votre choix est conservé 6 mois et modifiable à tout moment via « Gestion des cookies » en bas de page. <a href="${policyHref}">En savoir plus</a></p>
      <div class="cc-prefs" id="cc-prefs" hidden>
        <div class="cc-row">
          <div><p class="cc-row-title">Strictement nécessaires</p><p class="cc-row-desc">Mémorisation de votre choix de cookies. Toujours actif.</p></div>
          <span class="cc-always">Toujours actif</span>
        </div>
        ${used.map(c => `
        <div class="cc-row">
          <div><p class="cc-row-title" id="cc-l-${c}">${CONSENT_CATEGORIES[c].label}</p><p class="cc-row-desc">${CONSENT_CATEGORIES[c].description}<br><span class="cc-services">${services.filter(s => s.category === c).map(s => s.name).join(', ')}</span></p></div>
          <label class="cc-switch"><input type="checkbox" data-cat="${c}" aria-labelledby="cc-l-${c}"><span aria-hidden="true"></span></label>
        </div>`).join('')}
      </div>
      <div class="cc-actions">
        <button type="button" class="cc-btn cc-btn-choice" data-cc="refuse">Tout refuser</button>
        <button type="button" class="cc-btn cc-btn-choice" data-cc="accept">Tout accepter</button>
        <button type="button" class="cc-btn cc-btn-link" data-cc="customize" aria-expanded="false" aria-controls="cc-prefs">Personnaliser</button>
        <button type="button" class="cc-btn cc-btn-choice" data-cc="save" hidden>Enregistrer mes choix</button>
      </div>
    </div>`;
  document.body.prepend(root); // tôt dans l'ordre de tabulation

  const prefs = root.querySelector('#cc-prefs');
  const boxes = [...root.querySelectorAll('input[data-cat]')];
  const btnCustomize = root.querySelector('[data-cc="customize"]');
  const btnSave = root.querySelector('[data-cc="save"]');
  let opener = null;

  const open = (current, fromButton) => {
    opener = fromButton || null;
    boxes.forEach(b => { b.checked = !!(current && current.choices[b.dataset.cat]); });
    const detailed = !!fromButton;
    prefs.hidden = !detailed; btnSave.hidden = !detailed; btnCustomize.hidden = detailed;
    btnCustomize.setAttribute('aria-expanded', String(detailed));
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('cc-in'));
    if (fromButton) root.querySelector('.cc-title').setAttribute('tabindex', '-1'), root.querySelector('.cc-title').focus();
  };
  const close = () => {
    root.classList.remove('cc-in');
    setTimeout(() => { root.hidden = true; }, 250);
    if (opener) opener.focus();
  };
  const decide = choices => { apply(write(choices).choices); close(); };
  const all = val => Object.fromEntries(used.map(c => [c, val]));

  root.addEventListener('click', e => {
    const a = e.target.closest('[data-cc]'); if (!a) return;
    const act = a.dataset.cc;
    if (act === 'accept') decide(all(true));
    if (act === 'refuse') decide(all(false));
    if (act === 'save') decide(Object.fromEntries(boxes.map(b => [b.dataset.cat, b.checked])));
    if (act === 'customize') { prefs.hidden = false; btnSave.hidden = false; btnCustomize.hidden = true; btnCustomize.setAttribute('aria-expanded', 'true'); boxes[0] && boxes[0].focus(); }
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && opener) close(); });

  /* Lien « Gestion des cookies » du pied de page */
  document.querySelectorAll('.cc-manage').forEach(b => {
    b.hidden = false;
    b.addEventListener('click', () => open(read(), b));
  });

  const current = read();
  if (current) apply(current.choices); else open(null);
})();

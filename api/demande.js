// Fonction Vercel : reçoit le formulaire « Demander une proposition » et envoie
// (1) la demande au cabinet, (2) une confirmation au visiteur, via SMTP (boîte mail du cabinet).
// Variables d'environnement requises : SMTP_HOST, SMTP_USER, SMTP_PASS ;
// optionnelles : SMTP_PORT (465 par défaut), MAIL_TO, MAIL_FROM.
const nodemailer = require('nodemailer');

const TO = process.env.MAIL_TO || 'contact@malahieude.fr';
const FROM = process.env.MAIL_FROM || `MALAHIEUDE SYNDIC <${process.env.SMTP_USER || 'contact@malahieude.fr'}>`;
const ORIGINS = ['https://www.malahieude.fr', 'https://malahieude.fr'];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

const LABELS = [
  ['adresse', 'Adresse de la copropriété'],
  ['lots', 'Nombre de lots'],
  ['qualite', 'Qualité'],
  ['syndic', 'Syndic actuel'],
  ['ag', "Date de la prochaine assemblée générale"],
  ['message', 'Message'],
  ['nom', 'Nom'],
  ['email', 'E-mail'],
  ['telephone', 'Téléphone'],
];


// --- Modèles d'e-mail : identité du site (marine, taupe, ivoire, filets fins) ---
const C = { navy: '#102133', taupe: '#8b7f73', taupeInk: '#6f655b', ivory: '#f9f7f2', stone: '#efebe4', line: '#d9d2c7' };
const SERIF = "Marcellus,'Palatino Linotype',Palatino,Georgia,serif";
const SANS = "Jost,'Helvetica Neue',Arial,sans-serif";
const SITE = 'https://www.malahieude.fr';

const button = (href, label, solid = true) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:15px 28px;font-family:${SANS};font-size:12px;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;border:1px solid ${C.navy};background:${solid ? C.navy : 'transparent'};color:${solid ? '#f9f7f2' : C.navy}">${esc(label)}</a>`;

function layout({ preheader, kicker, title, body }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.stone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.stone}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.stone}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.ivory};border:1px solid ${C.navy}">
<tr><td style="padding:8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.taupe}">
<tr><td align="center" style="padding:32px 24px 20px"><a href="${SITE}"><img src="${SITE}/assets/logo-email.png" width="210" alt="MALAHIEUDE SYNDIC" style="display:block;border:0;width:210px;max-width:100%;height:auto"></a></td></tr>
<tr><td style="padding:0 40px"><div style="height:1px;background:${C.taupe};line-height:1px;font-size:1px">&nbsp;</div></td></tr>
<tr><td style="padding:28px 40px 8px;font-family:${SANS};color:${C.navy}">
<p style="margin:0 0 10px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:${C.taupeInk}">${esc(kicker)}</p>
<h1 style="margin:0 0 20px;font-family:${SERIF};font-weight:400;font-size:28px;line-height:1.25;color:${C.navy}">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:24px 40px 36px"></td></tr>
<tr><td align="center" style="background:${C.navy};padding:22px 24px;font-family:${SANS};font-size:13px;line-height:1.7;color:#d9dde3">
<span style="letter-spacing:.2em;text-transform:uppercase;color:#f9f7f2">MALAHIEUDE SYNDIC</span><br>Syndic de copropriété indépendant · Paris<br>
<a href="tel:+33668548414" style="color:#f9f7f2;text-decoration:none">06 68 54 84 14</a> · <a href="mailto:contact@malahieude.fr" style="color:#f9f7f2;text-decoration:none">contact@malahieude.fr</a>
</td></tr>
</table></td></tr></table>
</td></tr></table></body></html>`;
}

const recapTable = rows => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.taupe};margin:4px 0 8px">${rows.map(([l, v]) =>
  `<tr><td valign="top" width="38%" style="padding:11px 12px 11px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${C.taupeInk}">${esc(l)}</td><td valign="top" style="padding:11px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:15px;line-height:1.5;color:${C.navy};white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>`;

const para = t => `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.navy}">${t}</p>`;

let transport;
function send({ from, to, reply_to, subject, html, text }) {
  transport = transport || nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport.sendMail({ from, to, replyTo: reply_to, subject, html, text });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const origin = req.headers.origin;
  if (origin && !ORIGINS.includes(origin) && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return res.status(403).json({ error: 'Origine refusée' });
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (body.website) return res.status(200).json({ ok: true }); // champ piège anti-robot

  const d = {
    adresse: clean(body.adresse, 200), lots: clean(body.lots, 10), qualite: clean(body.qualite, 80),
    syndic: clean(body.syndic, 120), ag: clean(body.ag, 40), message: clean(body.message, 3000),
    nom: clean(body.nom, 120), email: clean(body.email, 160), telephone: clean(body.telephone, 30),
  };
  if (!d.adresse || !d.nom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    return res.status(400).json({ error: 'Champs obligatoires manquants ou invalides' });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return res.status(500).json({ error: 'Envoi non configuré' });

  const rows = LABELS.filter(([k]) => d[k]).map(([k, l]) => [l, d[k]]);
  const recap = recapTable(rows);

  try {
    await send({
      from: FROM, to: [TO], reply_to: d.email,
      subject: `Demande de proposition – ${d.adresse}`,
      html: layout({
        preheader: `${d.nom} – ${d.adresse}`,
        kicker: 'Site malahieude.fr',
        title: 'Nouvelle demande de proposition',
        body: para(`<strong>${esc(d.nom)}</strong> souhaite recevoir une proposition pour la copropriété située ${esc(d.adresse)}.`) + recap +
          `<p style="margin:24px 0 0">${button('mailto:' + d.email + '?subject=' + encodeURIComponent('Votre demande de proposition – MALAHIEUDE SYNDIC'), 'Répondre à ' + d.nom.split(' ')[0])}</p>`,
      }),
      text: rows.map(([l, v]) => `${l} : ${v}`).join('\n'),
    });
  } catch (e) {
    return res.status(502).json({ error: "L'envoi a échoué" });
  }

  // Confirmation au visiteur : un échec ici ne doit pas faire échouer la demande.
  try {
    await send({
      from: FROM, to: [d.email], reply_to: TO,
      subject: 'Votre demande de proposition – MALAHIEUDE SYNDIC',
      html: layout({
        preheader: 'Votre demande a bien été reçue. Je reviens vers vous sous 48 heures ouvrées.',
        kicker: 'Demande de proposition',
        title: 'Votre demande a bien été reçue',
        body: para(`Bonjour ${esc(d.nom)},`) +
          para("Merci de l'intérêt que vous portez à MALAHIEUDE SYNDIC. Je reviens vers vous personnellement sous 48 heures ouvrées, pour faire connaissance et préparer une proposition adaptée à votre copropriété.") +
          para('Voici le récapitulatif de ce que vous m’avez transmis :') + recap +
          para('Pour échanger plus vite, vous pouvez m’appeler directement.') +
          `<p style="margin:0 0 24px">${button('tel:+33668548414', 'Appeler le 06 68 54 84 14')}</p>` +
          para('Cordialement,<br><span style="font-family:' + SERIF + ';font-size:18px">Johann MALAHIEUDE</span><br><span style="color:' + C.taupeInk + ';font-size:14px">Fondateur, MALAHIEUDE SYNDIC</span>'),
      }),
      text: `Bonjour ${d.nom},\n\nVotre demande a bien été reçue. Je reviens vers vous sous 48 heures ouvrées.\n\n` + rows.map(([l, v]) => `${l} : ${v}`).join('\n') + '\n\nJohann MALAHIEUDE\nMALAHIEUDE SYNDIC · 06 68 54 84 14',
    });
  } catch (e) { /* ignoré */ }

  return res.status(200).json({ ok: true });
};

// Fonction Vercel : reçoit le formulaire « Demander une proposition » et envoie
// (1) la demande au cabinet, (2) une confirmation au visiteur, via Resend.
// Variables d'environnement requises : RESEND_API_KEY ; optionnelles : MAIL_TO, MAIL_FROM.

const TO = process.env.MAIL_TO || 'contact@malahieude.fr';
const FROM = process.env.MAIL_FROM || 'MALAHIEUDE SYNDIC <contact@malahieude.fr>';
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

async function send(payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}`);
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
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Envoi non configuré' });

  const rows = LABELS.filter(([k]) => d[k]);
  const table = rows.map(([k, l]) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#6b6258;vertical-align:top">${esc(l)}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(d[k])}</td></tr>`).join('');
  const recap = `<table style="border-collapse:collapse;font-size:15px;color:#102133">${table}</table>`;

  try {
    await send({
      from: FROM, to: [TO], reply_to: d.email,
      subject: `Demande de proposition – ${d.adresse}`,
      html: `<p>Nouvelle demande de proposition reçue via le site.</p>${recap}`,
      text: rows.map(([k, l]) => `${l} : ${d[k]}`).join('\n'),
    });
  } catch (e) {
    return res.status(502).json({ error: "L'envoi a échoué" });
  }

  // Confirmation au visiteur : un échec ici ne doit pas faire échouer la demande.
  try {
    await send({
      from: FROM, to: [d.email], reply_to: TO,
      subject: 'Votre demande de proposition – MALAHIEUDE SYNDIC',
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#102133;line-height:1.55">
        <p>Bonjour ${esc(d.nom)},</p>
        <p>Merci de l'intérêt que vous portez à MALAHIEUDE SYNDIC. J'ai bien reçu votre demande et je reviens vers vous personnellement sous 48 heures ouvrées.</p>
        <p>Voici le récapitulatif de ce que vous m'avez transmis :</p>${recap}
        <p>Pour échanger plus vite, vous pouvez m'appeler au 06 68 54 84 14.</p>
        <p>Cordialement,<br>Johann MALAHIEUDE<br>MALAHIEUDE SYNDIC</p></div>`,
    });
  } catch (e) { /* ignoré */ }

  return res.status(200).json({ ok: true });
};

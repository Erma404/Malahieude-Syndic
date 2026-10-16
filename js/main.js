document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>q.parentElement.classList.toggle('open')));
const menuBtn=document.querySelector('.menu-btn'),menu=document.getElementById('mobileMenu');
if(menuBtn&&menu){
  const setMenu=open=>{menu.classList.toggle('open',open);menuBtn.setAttribute('aria-expanded',open);menuBtn.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');menuBtn.textContent=open?'✕':'☰';};
  menuBtn.addEventListener('click',()=>setMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
}

/* Formulaire de demande de proposition (3 étapes, envoi via /api/demande) */
(()=>{
  const form=document.getElementById('reqForm');if(!form)return;
  const panels=[...form.querySelectorAll('.req-panel')],steps=[...form.querySelectorAll('.req-steps li')];
  const prev=document.getElementById('reqPrev'),next=document.getElementById('reqNext'),send=document.getElementById('reqSend');
  const err=document.getElementById('reqError'),live=document.getElementById('reqLive');
  const done=document.getElementById('reqDone'),fail=document.getElementById('reqFail'),recap=document.getElementById('reqRecap');
  const LABELS={adresse:'Adresse',lots:'Nombre de lots',qualite:'Vous êtes',syndic:'Syndic actuel',ag:'Prochaine AG',message:'Vos attentes',nom:'Nom',email:'E-mail',telephone:'Téléphone'};
  let cur=0;
  const show=(n,focus)=>{
    cur=n;
    panels.forEach((p,i)=>p.hidden=i!==n);
    steps.forEach((s,i)=>{s.classList.toggle('is-current',i===n);s.classList.toggle('is-done',i<n);if(i===n)s.setAttribute('aria-current','step');else s.removeAttribute('aria-current')});
    prev.hidden=n===0;next.hidden=n===panels.length-1;send.hidden=n!==panels.length-1;
    err.hidden=true;live.textContent='Étape '+(n+1)+' sur '+panels.length;
    const f=panels[n].querySelector('input,select,textarea');if(f&&focus)f.focus();
  };
  const valid=n=>{
    let ok=true,first=null;
    panels[n].querySelectorAll('[required]').forEach(f=>{
      const bad=!f.value.trim()||(f.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
      f.setAttribute('aria-invalid',bad);if(bad){ok=false;first=first||f}
    });
    if(!ok){err.textContent='Merci de compléter les champs obligatoires.';err.hidden=false;first.focus()}
    return ok;
  };
  const data=()=>Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,String(v).trim()]));
  next.addEventListener('click',()=>{if(valid(cur))show(cur+1,true)});
  prev.addEventListener('click',()=>show(cur-1,true));
  form.addEventListener('input',e=>e.target.removeAttribute('aria-invalid'));
  form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();(cur<panels.length-1?next:send).click()}});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!valid(cur))return;
    const d=data();send.disabled=true;send.textContent='Envoi…';
    const renderRecap=()=>{recap.replaceChildren();Object.keys(LABELS).forEach(k=>{if(!d[k])return;const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=LABELS[k];dd.textContent=d[k];row.append(dt,dd);recap.append(row)})};
    try{
      const r=await fetch('/api/demande',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
      if(!r.ok)throw new Error(r.status);
      renderRecap();form.hidden=true;done.hidden=false;done.focus();
    }catch(_){
      const body='Bonjour,\n\nJe souhaite recevoir une proposition.\n\n'+Object.keys(LABELS).filter(k=>d[k]).map(k=>LABELS[k]+' : '+d[k]).join('\n')+'\n\nCordialement,';
      document.getElementById('reqMailto').href='mailto:contact@malahieude.fr?subject='+encodeURIComponent('Demande de proposition - syndic de copropriété')+'&body='+encodeURIComponent(body);
      fail.hidden=false;send.disabled=false;send.textContent='Envoyer ma demande';
    }
  });
  show(0);
})();

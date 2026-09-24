document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>q.parentElement.classList.toggle('open')));
const menuBtn=document.querySelector('.menu-btn'),menu=document.getElementById('mobileMenu');
if(menuBtn&&menu){
  const setMenu=open=>{menu.classList.toggle('open',open);menuBtn.setAttribute('aria-expanded',open);menuBtn.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');menuBtn.textContent=open?'✕':'☰';};
  menuBtn.addEventListener('click',()=>setMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
}

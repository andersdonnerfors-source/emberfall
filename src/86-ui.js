// ================= Glass UI: shared components (panel, header, tabs, button, row, tooltip, bottom sheet) =================
const uiToken=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function uiEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
// A glass window with a header (title + close) and optional tabs. Fill `el.body`, then attach `el` to the page.
function uiPanel(title,o){o=o||{};const el=uiEl('div','panel glass'),h=uiEl('div','g-head'),b=uiEl('div','g-body');h.appendChild(uiEl('span','g-title',title));
 if(o.onClose){const x=uiEl('button','x','✕');x.setAttribute('aria-label','Close');x.onclick=o.onClose;h.appendChild(x)}
 el.appendChild(h);el.head=h;
 if(o.tabs&&o.tabs.length){const t=uiEl('div','g-tabs');o.tabs.forEach((n,i)=>{const k=uiEl('button',i?'':'on',n);k.onclick=()=>{[...t.children].forEach(c=>c.classList.toggle('on',c===k));if(o.onTab)o.onTab(i)};t.appendChild(k)});el.appendChild(t);el.tabs=t}
 el.appendChild(b);el.body=b;return el}
// A bottom sheet of tappable rows (>=48 px). Returns {el, close()}; it opens at once and removes itself on close.
function uiSheet(title,rows){const el=uiEl('div','sheet panel glass'),done=()=>{el.classList.remove('open');setTimeout(()=>el.remove(),220)};
 el.appendChild(uiEl('div','g-head',title));
 for(const r of rows){const b=uiEl('button','g-row');if(r.icon)b.appendChild(uiEl('span','g-ic',r.icon));b.appendChild(uiEl('span','',r.label));b.onclick=()=>{done();if(r.onTap)r.onTap()};el.appendChild(b)}
 document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('open'));return {el,close:done}}

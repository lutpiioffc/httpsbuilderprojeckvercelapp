const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ls={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
let projects=ls.get('dz_projects',[]),builds=ls.get('dz_builds',[]),cfg=ls.get('dz_cfg',{api:'http://localhost:3000'}),active=null;
builds.forEach(b=>{if(b.state==='building')b.state='failed'});
const save=()=>{ls.set('dz_projects',projects);ls.set('dz_builds',builds)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const ext=p=>(p.split('.').pop()||'').toLowerCase();
const MIME={html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',json:'application/json',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',mp3:'audio/mpeg',mp4:'video/mp4',txt:'text/plain'};
const IC={grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',phone:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',code:'<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',sun:'<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',menu:'<path d="M3 12h18M3 6h18M3 18h18"/>'};
const svg=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
function toast(m,t=''){const e=document.createElement('div');e.className='toast '+t;e.textContent=m;$('#toasts').append(e);setTimeout(()=>e.remove(),4500)}
const dl=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)};

/* ---------- navigasi & tema ---------- */
const NAV=[['dashboard','Dashboard','grid'],['zip2apk','ZIP → APK','phone'],['html2apk','HTML → APK','file'],['zip2web','ZIP → Website','globe'],['html2web','HTML → Website','code'],['files','File Manager','folder'],['history','Riwayat Project','clock'],['settings','Pengaturan','sliders'],['help','Bantuan','help']];
$('#nav').innerHTML=NAV.map(([k,t,i])=>`<button data-go="${k}" data-t="${t}">${svg(i)}${t}</button>`).join('');
$$('[data-i]').forEach(e=>e.innerHTML=svg(e.dataset.i));
function go(v){$$('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));$$('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.go===v));$('#title').textContent=$(`.nav [data-go=${v}]`).dataset.t;$('#side').classList.remove('open');
 if(v==='files')renderFiles();if(v==='html2web')setTimeout(()=>['html','css','js'].forEach(k=>ed[k].refresh()),60);renderHistory();scrollTo(0,0)}
$('#nav').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.go)};
$('#burger').onclick=()=>$('#side').classList.toggle('open');
const setTheme=t=>{document.documentElement.dataset.theme=t;ls.set('dz_theme',t)};
const flip=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
setTheme(ls.get('dz_theme','dark'));$('#theme').onclick=flip;$('#theme2').onclick=flip;
$('#quick').innerHTML=NAV.slice(1,5).map(([k,t])=>`<button class="btn" data-go="${k}" data-t="${t}">${t}</button>`).join('');
$('#quick').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.go)};

/* ---------- ZIP util ---------- */
async function readZip(f){const zip=await JSZip.loadAsync(f);Object.keys(zip.files).forEach(n=>{if(n.startsWith('__MACOSX')||/(^|\/)\.DS_Store$/.test(n))zip.remove(n)});return zip}
function info(zip){const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir),c={html:0,css:0,js:0,asset:0};
 names.forEach(n=>{const e=ext(n);e==='html'||e==='htm'?c.html++:e==='css'?c.css++:e==='js'?c.js++:c.asset++});
 const idx=names.filter(n=>/(^|\/)index\.html?$/i.test(n)).sort((a,b)=>a.split('/').length-b.split('/').length)[0]||names.find(n=>/\.html?$/i.test(n))||null;
 return{names,c,idx,base:idx?idx.slice(0,idx.lastIndexOf('/')+1):''}}
async function preview(zip,idx,frame){
 const urls={},names=Object.keys(zip.files).filter(n=>!zip.files[n].dir);
 const rel=(from,p)=>{if(/^(https?:|data:|blob:|#|\/\/|mailto:|javascript:)/i.test(p))return null;try{return decodeURIComponent(new URL(p,'http://x/'+from).pathname.slice(1))}catch{return null}};
 const mk=async(n,txt)=>{const t=MIME[ext(n)]||'application/octet-stream';urls[n]=URL.createObjectURL(new Blob([txt!=null?txt:await zip.file(n).async('arraybuffer')],{type:t}))};
 for(const n of names)if(!/\.(css|html?|js)$/i.test(n))await mk(n);
 for(const n of names.filter(n=>/\.css$/i.test(n))){const s=(await zip.file(n).async('string')).replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g,(m,p)=>{const r=rel(n,p);return r&&urls[r]?`url(${urls[r]})`:m});await mk(n,s)}
 for(const n of names.filter(n=>/\.js$/i.test(n)))await mk(n);
 const d=new DOMParser().parseFromString(await zip.file(idx).async('string'),'text/html');
 d.querySelectorAll('[src],[href]').forEach(e=>{const a=e.hasAttribute('src')?'src':'href',r=rel(idx,e.getAttribute(a));if(r&&urls[r])e.setAttribute(a,urls[r])});
 frame.src=URL.createObjectURL(new Blob(['<!DOCTYPE html>'+d.documentElement.outerHTML],{type:'text/html'}))}
async function hostZip(zip,i){const out=new JSZip();for(const n of i.names)if(n.startsWith(i.base))out.file(n.slice(i.base.length),await zip.file(n).async('uint8array'));
 if(!out.file('index.html')&&i.idx)out.file('index.html',await zip.file(i.idx).async('string'));return out.generateAsync({type:'blob',compression:'DEFLATE'})}

/* ---------- view generator ---------- */
const dz=(p,t,s)=>`<label class="drop" id="${p}-drop"><input type="file" hidden><b>${t}</b><span>${s}</span></label>`;
const cfgHTML=p=>`<div class="grid2"><label>Nama Aplikasi<input id="${p}-name" value="My App"></label><label>Package Name<input id="${p}-pkg" value="com.dimz.myapp"></label><label>Versi<input id="${p}-ver" value="1.0.0"></label><label>Version Code<input id="${p}-code" type="number" min="1" value="1"></label><label class="full">Ikon aplikasi (gambar, opsional)<input id="${p}-icon" type="file" accept="image/*"></label></div>`;
const left=(p,up)=>`<div class="glass pad"><h3>1. Upload</h3>${up}<div class="chips" id="${p}-info"></div><div class="list small" id="${p}-tree"></div></div>`;
const prev=p=>`<div class="glass pad"><h3>Preview</h3><iframe class="frame" id="${p}-frame" sandbox="allow-scripts allow-modals allow-forms"></iframe></div>`;
const apkView=(p,up)=>`<div class="cols">${left(p,up)}<div class="glass pad"><h3>2. Pengaturan Aplikasi</h3>${cfgHTML(p)}<div class="bar"><i id="${p}-bar"></i></div><div class="row"><button class="btn pri" id="${p}-build" disabled>Build APK</button></div><pre class="log" id="${p}-log" hidden></pre><div id="${p}-dl"></div></div></div>${prev(p)}`;
$('#v-zip2apk').innerHTML=apkView('za',dz('za','Drag & drop file ZIP','atau klik untuk memilih'));
$('#v-html2apk').innerHTML=apkView('ha',dz('ha','Drag & drop HTML (+ CSS/JS/gambar)','boleh memilih beberapa file'));
$('#v-zip2web').innerHTML=`<div class="cols">${left('zw',dz('zw','Drag & drop file ZIP website','atau klik untuk memilih'))}<div class="glass pad"><h3>2. Hasil</h3><p class="mu">index.html dideteksi otomatis; folder pembungkus dibuang sehingga ZIP siap di-upload ke hosting.</p><div class="row"><button class="btn pri need-zw" id="zw-dl" disabled>Download ZIP siap hosting</button></div></div></div>${prev('zw')}`;

const chips=(c,idx)=>`<span class="chip">HTML ${c.html}</span><span class="chip">CSS ${c.css}</span><span class="chip">JS ${c.js}</span><span class="chip">Aset ${c.asset}</span><span class="chip ${idx?'ok':'err'}">${idx?'index: '+esc(idx):'index.html tidak ada'}</span>`;
const S={};
function addProject(name,type,data){projects=projects.filter(p=>!(p.name===name&&p.type===type));projects.unshift({id:Date.now()+'',name,type,time:Date.now(),data});projects=projects.slice(0,50);save()}
async function setZip(p,zip,name){const i=info(zip);S[p]={zip,i,name};active={zip,name};
 $(`#${p}-info`).innerHTML=chips(i.c,i.idx);
 $(`#${p}-tree`).innerHTML=i.names.slice(0,80).map(n=>`<div>${esc(n)}</div>`).join('')+(i.names.length>80?`<div>… +${i.names.length-80} file lainnya</div>`:'');
 if(!i.idx)return toast('Tidak ada file HTML di project','err');
 $(`#${p}-name`)&&($(`#${p}-name`).value=name.slice(0,40));
 try{await preview(zip,i.idx,$(`#${p}-frame`))}catch(e){toast('Preview gagal: '+e.message,'err')}
 addProject(name,p);$$('.need-'+p).forEach(b=>b.disabled=false);$(`#${p}-build`)&&($(`#${p}-build`).disabled=false);toast(`Project dimuat: ${i.names.length} file`)}
function drop(id,accept,cb,multi){const z=$('#'+id),i=z.querySelector('input');i.accept=accept;i.multiple=!!multi;
 ['dragover','dragenter'].forEach(v=>z.addEventListener(v,e=>{e.preventDefault();z.classList.add('hot')}));
 ['dragleave','drop'].forEach(v=>z.addEventListener(v,e=>{e.preventDefault();z.classList.remove('hot')}));
 z.addEventListener('drop',e=>cb([...e.dataTransfer.files]));i.onchange=()=>{cb([...i.files]);i.value=''}}
const zipHandler=p=>async([f])=>{if(!f)return;if(!/\.zip$/i.test(f.name))return toast('File harus berformat .zip','err');try{await setZip(p,await readZip(f),f.name.replace(/\.zip$/i,''))}catch(e){toast('ZIP tidak valid: '+e.message,'err')}};
drop('za-drop','.zip',zipHandler('za'));drop('zw-drop','.zip',zipHandler('zw'));
drop('ha-drop','.html,.htm,.css,.js,.json,image/*',async fs=>{const main=fs.find(f=>/\.html?$/i.test(f.name));if(!main)return toast('Pilih minimal satu file HTML','err');const z=new JSZip();fs.forEach(f=>z.file(f===main?'index.html':f.name,f));await setZip('ha',z,main.name.replace(/\.html?$/i,''))},true);
$('#zw-dl').onclick=async()=>{const s=S.zw;if(s)dl(await hostZip(s.zip,s.i),s.name+'-hosting.zip')};

/* ---------- build APK ---------- */
async function toPng(f){const b=await createImageBitmap(f),c=document.createElement('canvas');c.width=c.height=192;c.getContext('2d').drawImage(b,0,0,192,192);return new Promise(r=>c.toBlob(r,'image/png'))}
async function build(p){const s=S[p];if(!s)return;const g=k=>$(`#${p}-${k}`).value.trim(),pkg=g('pkg');
 if(!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg))return toast('Package name tidak valid (contoh: com.dimz.app)','err');
 if(!g('name'))return toast('Nama aplikasi wajib diisi','err');
 const bar=$(`#${p}-bar`),log=$(`#${p}-log`),btn=$(`#${p}-build`);$(`#${p}-dl`).innerHTML='';log.hidden=false;log.textContent='';btn.disabled=true;bar.style.width='3%';
 const rec={id:Date.now()+'',name:g('name'),pkg,ver:g('ver'),state:'building',time:Date.now()};builds.unshift(rec);save();renderHistory();
 try{const fd=new FormData();fd.append('name',g('name'));fd.append('package',pkg);fd.append('version',g('ver'));fd.append('code',g('code'));
  const ic=$(`#${p}-icon`).files[0];if(ic)fd.append('icon',await toPng(ic),'icon.png');
  fd.append('project',await s.zip.generateAsync({type:'blob',compression:'DEFLATE'}),'project.zip');
  let r;try{r=await fetch(cfg.api+'/api/build',{method:'POST',body:fd})}catch{throw new Error('Tidak bisa terhubung ke build server ('+cfg.api+'). Jalankan server dulu (lihat README).')}
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Server menolak project');rec.job=j.id;
  for(;;){await new Promise(r=>setTimeout(r,1500));const st=await(await fetch(`${cfg.api}/api/status/${j.id}`)).json();if(st.error&&!st.state)throw new Error(st.error);
   bar.style.width=st.progress+'%';log.textContent=st.log||'';log.scrollTop=1e9;
   if(st.state==='done'){rec.state='done';$(`#${p}-dl`).innerHTML=`<a class="btn pri" href="${cfg.api}/api/download/${j.id}">⬇ Download APK</a>`;toast('Build APK berhasil!');break}
   if(st.state==='failed')throw new Error(st.error||'Build gagal')}
 }catch(e){rec.state='failed';toast('Build gagal: '+e.message,'err');log.textContent+='\n'+e.message}
 btn.disabled=false;save();renderHistory()}
$('#za-build').onclick=()=>build('za');$('#ha-build').onclick=()=>build('ha');

/* ---------- editor HTML -> website ---------- */
const ed={},DEF={html:'<h1>Halo Dunia 👋</h1>\n<button id="b">Klik saya</button>',css:'body{font-family:system-ui;background:#0b0a1a;color:#fff;display:grid;place-items:center;height:100vh;margin:0;gap:12px}\nbutton{padding:12px 22px;border:0;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#38bdf8);color:#fff;font-size:16px}',js:'document.getElementById("b").onclick=()=>alert("DIMZ BUILDER STUDIO")'};
const saved=ls.get('dz_editor',DEF);let edT;
[['html','htmlmixed'],['css','css'],['js','javascript']].forEach(([k,m])=>{ed[k]=CodeMirror($('#ed-'+k),{value:saved[k]??DEF[k],mode:m,theme:'material-darker',lineNumbers:true,lineWrapping:true});ed[k].on('change',()=>{clearTimeout(edT);edT=setTimeout(upd,350)})});
const val=k=>ed[k].getValue(),head='<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DIMZ Project</title>';
const single=()=>`${head}<style>\n${val('css')}\n</style></head><body>\n${val('html')}\n<script>\n${val('js')}\n<\/script></body></html>`;
const multi=()=>`${head}<link rel="stylesheet" href="style.css"></head><body>\n${val('html')}\n<script src="script.js"><\/script></body></html>`;
function upd(){$('#ed-frame').srcdoc=single();ls.set('dz_editor',{html:val('html'),css:val('css'),js:val('js')})}
const edZip=()=>{const z=new JSZip();z.file('index.html',multi());z.file('style.css',val('css'));z.file('script.js',val('js'));return z};
$('#tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('#tabs .btn').forEach(x=>x.classList.toggle('on',x===b));['html','css','js'].forEach(k=>{$('#ed-'+k).hidden=k!==b.dataset.t;ed[k].refresh()})};
$('#ed-dl').onclick=()=>dl(new Blob([single()],{type:'text/html'}),'index.html');
$('#ed-zip').onclick=async()=>dl(await edZip().generateAsync({type:'blob',compression:'DEFLATE'}),'website.zip');
$('#ed-save').onclick=()=>{const n=prompt('Nama project:','project-'+(projects.filter(p=>p.type==='ed').length+1));if(n){addProject(n,'ed',{html:val('html'),css:val('css'),js:val('js')});renderHistory();toast('Project disimpan')}};
$('#ed-apk').onclick=async()=>{await setZip('ha',edZip(),'editor-project');go('html2apk')};
upd();

/* ---------- file manager ---------- */
function renderFiles(){const box=$('#f-list');if(!active){$('#f-name').textContent='';box.innerHTML='<p class="mu">Belum ada project. Upload ZIP/HTML terlebih dahulu.</p>';return}
 const names=Object.keys(active.zip.files).filter(n=>!active.zip.files[n].dir);$('#f-name').textContent=`· ${active.name} (${names.length} file)`;
 box.innerHTML=names.map(n=>`<div><span>${esc(n)}</span><span><button class="btn sm" data-v="${esc(n)}">Lihat</button><button class="btn sm" data-d="${esc(n)}">Unduh</button><button class="btn sm dng" data-x="${esc(n)}">Hapus</button></span></div>`).join('')}
$('#f-list').onclick=async e=>{const b=e.target.closest('button');if(!b||!active)return;const n=b.dataset.v||b.dataset.d||b.dataset.x,f=active.zip.file(n);
 if(b.dataset.x!==undefined){active.zip.remove(n);renderFiles();return toast('File dihapus dari project (belum mengubah ZIP asli)')}
 if(b.dataset.d!==undefined)return dl(await f.async('blob'),n.split('/').pop());
 const v=$('#f-view');if(!/^(html?|css|js|json|txt|md|svg|xml)$/.test(ext(n)))return toast('Berkas biner tidak bisa ditampilkan');v.hidden=false;v.textContent=(await f.async('string')).slice(0,100000)};
$('#f-zip').onclick=async()=>active?dl(await active.zip.generateAsync({type:'blob',compression:'DEFLATE'}),active.name+'.zip'):toast('Belum ada project','err');

/* ---------- riwayat ---------- */
const badge=s=>`<em class="bd ${s}">${{done:'Berhasil',failed:'Gagal',building:'Proses'}[s]||s}</em>`;
function renderHistory(){const L={za:'ZIP→APK',ha:'HTML→APK',zw:'ZIP→Website',ed:'Editor'};
 $('#s-p').textContent=projects.length;$('#s-b').textContent=builds.length;$('#s-ok').textContent=builds.filter(b=>b.state==='done').length;$('#s-last').textContent=projects[0]?projects[0].name:'-';
 const br=b=>`<div><span><b>${esc(b.name)}</b> <small class="mu">${esc(b.pkg)} · v${esc(b.ver)} · ${new Date(b.time).toLocaleString('id-ID')}</small></span><span>${badge(b.state)}${b.state==='done'&&b.job?` <a class="btn sm" href="${cfg.api}/api/download/${b.job}">APK</a>`:''}</span></div>`,none='<p class="mu">Belum ada data.</p>';
 $('#d-builds').innerHTML=builds.slice(0,6).map(br).join('')||none;$('#h-builds').innerHTML=builds.map(br).join('')||none;
 $('#h-projects').innerHTML=projects.map(p=>`<div><span><b>${esc(p.name)}</b> <small class="mu">${L[p.type]} · ${new Date(p.time).toLocaleString('id-ID')}</small></span><span>${p.type==='ed'?`<button class="btn sm" data-o="${p.id}">Buka</button>`:''}<button class="btn sm dng" data-r="${p.id}">Hapus</button></span></div>`).join('')||none}
$('#h-projects').onclick=e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.r){projects=projects.filter(p=>p.id!==b.dataset.r);save();renderHistory()}
 if(b.dataset.o){const p=projects.find(x=>x.id===b.dataset.o);['html','css','js'].forEach(k=>ed[k].setValue(p.data[k]||''));go('html2web')}};

/* ---------- pengaturan & server ---------- */
$('#api').value=cfg.api;
async function ping(){const e=$('#srv');try{const j=await(await fetch(cfg.api+'/api/health')).json(),ok=j.sdk&&j.gradle;e.className='chip '+(ok?'ok':'warn');e.textContent=ok?'Build server siap':'Server aktif · Android SDK/Gradle belum siap'}catch{e.className='chip err';e.textContent='Build server offline'}}
$('#api-save').onclick=()=>{cfg.api=$('#api').value.trim().replace(/\/+$/,'');ls.set('dz_cfg',cfg);ping();toast('Pengaturan disimpan')};
$('#wipe').onclick=()=>{if(confirm('Hapus semua riwayat dan pengaturan?')){localStorage.clear();location.reload()}};
go('dashboard');ping();setInterval(ping,15000);

// DIMZ BUILDER STUDIO - build server: ZIP/HTML -> project Android WebView -> Gradle assembleDebug -> APK
const express=require('express'),multer=require('multer'),AdmZip=require('adm-zip'),cors=require('cors'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {spawn,execSync}=require('child_process');
const PORT=process.env.PORT||3000,SDK=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||'',GRADLE=process.env.GRADLE_CMD||'gradle';
const WORK=path.join(__dirname,'work'),ROOT=path.join(__dirname,'..');fs.mkdirSync(path.join(WORK,'uploads'),{recursive:true});
const up=multer({dest:path.join(WORK,'uploads'),limits:{fileSize:100*1024*1024}}),jobs={},app=express();
app.use(cors());
for(const f of ['index.html','style.css','script.js'])app.get('/'+(f==='index.html'?'':f),(q,r)=>r.sendFile(path.join(ROOT,f)));
app.use('/assets',express.static(path.join(ROOT,'assets')));

app.get('/api/health',(q,r)=>{let g=true;try{execSync(GRADLE+' --version',{stdio:'ignore'})}catch{g=false}r.json({ok:true,sdk:!!SDK&&fs.existsSync(SDK),gradle:g})});
app.post('/api/build',up.fields([{name:'project',maxCount:1},{name:'icon',maxCount:1}]),(req,res)=>{
 const b=req.body,pkg=String(b.package||''),name=String(b.name||'').trim().slice(0,60);
 if(!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg))return res.status(400).json({error:'Package name tidak valid'});
 if(!name)return res.status(400).json({error:'Nama aplikasi wajib diisi'});
 if(!req.files||!req.files.project)return res.status(400).json({error:'File project tidak ada'});
 const id=crypto.randomBytes(8).toString('hex');jobs[id]={state:'queued',progress:0,log:'',error:null,t:Date.now()};
 const o={pkg,name,ver:String(b.version||'1.0.0').replace(/[^\w.\-]/g,'')||'1.0.0',code:Math.max(1,parseInt(b.code)||1)};
 run(id,req.files.project[0].path,req.files.icon&&req.files.icon[0].path,o).catch(e=>{jobs[id].state='failed';jobs[id].error=e.message});
 res.json({id})});
app.get('/api/status/:id',(q,r)=>{const j=jobs[q.params.id];if(!j)return r.status(404).json({error:'Job tidak ditemukan'});r.json({state:j.state,progress:j.progress,log:j.log.slice(-3000),error:j.error})});
app.get('/api/download/:id',(q,r)=>{const j=jobs[q.params.id];if(!j||j.state!=='done')return r.status(404).send('APK tidak tersedia');r.download(j.apk,j.fileName)});

const xml=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/^([@?])/,'\\$1');
async function run(id,zipPath,iconPath,o){
 const j=jobs[id],log=s=>{j.log+=s;if(j.log.length>20000)j.log=j.log.slice(-20000)},dir=path.join(WORK,id);
 j.state='building';j.progress=5;
 const www=path.join(dir,'app/src/main/assets/www');fs.mkdirSync(www,{recursive:true});
 const ents=new AdmZip(zipPath).getEntries().filter(e=>!e.isDirectory&&!e.entryName.startsWith('__MACOSX'));
 const names=ents.map(e=>e.entryName);
 const idx=names.filter(n=>/(^|\/)index\.html?$/i.test(n)).sort((a,b)=>a.split('/').length-b.split('/').length)[0]||names.find(n=>/\.html?$/i.test(n));
 if(!idx)throw new Error('Tidak ada file HTML di project');
 const base=idx.slice(0,idx.lastIndexOf('/')+1);
 for(const e of ents){if(!e.entryName.startsWith(base))continue;const t=path.resolve(www,e.entryName.slice(base.length));if(!t.startsWith(www+path.sep))continue;fs.mkdirSync(path.dirname(t),{recursive:true});fs.writeFileSync(t,e.getData())}
 if(!fs.existsSync(path.join(www,'index.html')))fs.copyFileSync(path.join(www,path.basename(idx)),path.join(www,'index.html'));
 const w=(f,c)=>{const p=path.join(dir,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,c)};
 let icon=false;if(iconPath){const h=fs.readFileSync(iconPath).subarray(0,4);if(h[0]===0x89&&h[1]===0x50){w('app/src/main/res/mipmap-xxhdpi/ic_launcher.png','');fs.copyFileSync(iconPath,path.join(dir,'app/src/main/res/mipmap-xxhdpi/ic_launcher.png'));icon=true}}
 w('settings.gradle',"pluginManagement{repositories{google();mavenCentral();gradlePluginPortal()}}\ndependencyResolutionManagement{repositories{google();mavenCentral()}}\nrootProject.name='app'\ninclude ':app'\n");
 w('build.gradle',"plugins{id 'com.android.application' version '8.2.2' apply false}\n");
 w('gradle.properties','org.gradle.jvmargs=-Xmx1536m\nandroid.useAndroidX=false\n');
 w('local.properties','sdk.dir='+SDK.replace(/\\/g,'\\\\')+'\n');
 w('app/build.gradle',`plugins{id 'com.android.application'}
android{namespace '${o.pkg}'
 compileSdk 34
 defaultConfig{applicationId '${o.pkg}';minSdk 21;targetSdk 34;versionCode ${o.code};versionName '${o.ver}'}
 compileOptions{sourceCompatibility JavaVersion.VERSION_17;targetCompatibility JavaVersion.VERSION_17}}
`);
 w('app/src/main/res/values/strings.xml',`<resources><string name="app_name">${xml(o.name)}</string></resources>`);
 w('app/src/main/AndroidManifest.xml',`<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:label="@string/app_name" ${icon?'android:icon="@mipmap/ic_launcher"':''} android:usesCleartextTraffic="true" android:theme="@android:style/Theme.DeviceDefault.NoActionBar"><activity android:name=".MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`);
 w('app/src/main/java/'+o.pkg.replace(/\./g,'/')+'/MainActivity.java',`package ${o.pkg};
import android.app.Activity;import android.os.Bundle;import android.webkit.*;
public class MainActivity extends Activity{
 private WebView w;
 @Override protected void onCreate(Bundle b){super.onCreate(b);w=new WebView(this);setContentView(w);
  WebSettings s=w.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);s.setMediaPlaybackRequiresUserGesture(false);
  w.setWebViewClient(new WebViewClient());w.setWebChromeClient(new WebChromeClient());w.loadUrl("file:///android_asset/www/index.html");}
 @Override public void onBackPressed(){if(w.canGoBack())w.goBack();else super.onBackPressed();}
}`);
 fs.rm(zipPath,()=>{});if(iconPath)fs.rm(iconPath,()=>{});
 j.progress=15;log('Menjalankan Gradle assembleDebug...\n');
 await new Promise((ok,no)=>{let n=0;const p=spawn(GRADLE,['assembleDebug','--no-daemon','--console=plain'],{cwd:dir,shell:process.platform==='win32',env:{...process.env,ANDROID_HOME:SDK,ANDROID_SDK_ROOT:SDK}});
  const on=d=>{log(d.toString());j.progress=Math.min(95,15+(++n))};p.stdout.on('data',on);p.stderr.on('data',on);
  p.on('error',e=>no(new Error('Gradle tidak bisa dijalankan: '+e.message)));p.on('close',c=>c?no(new Error('Gradle gagal (kode '+c+'). Lihat log.')):ok())});
 const apk=path.join(dir,'app/build/outputs/apk/debug/app-debug.apk');if(!fs.existsSync(apk))throw new Error('APK tidak ditemukan setelah build');
 j.apk=apk;j.fileName=o.name.replace(/[^\w\-]+/g,'_')+'-'+o.ver+'.apk';j.progress=100;j.state='done'}
setInterval(()=>{for(const [id,j] of Object.entries(jobs))if(Date.now()-j.t>3600e3){fs.rm(path.join(WORK,id),{recursive:true,force:true},()=>{});delete jobs[id]}},600e3);
app.listen(PORT,()=>console.log(`DIMZ BUILDER STUDIO -> http://localhost:${PORT}  (ANDROID_HOME=${SDK||'BELUM DISET'})`));

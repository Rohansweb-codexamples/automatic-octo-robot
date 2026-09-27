import {SplendidGrandPiano,ElectricPiano,DrumMachine,Soundfont,Reverb} from "https://unpkg.com/smplr/dist/index.mjs";

const AC=window.AudioContext||window.webkitAudioContext;
let ctx,master,compressor,piano,electric,bass,drums,drums909,playing=false,timer,step=0,importedBuffer=null;
const DBKEY="rohansMusicStudioV2Projects";
let currentId="default-v2";
const tracks=[
 {id:"drums",name:"Drums",kind:"drums",instrument:"TR-808"},
 {id:"bass",name:"Bass",kind:"bass",instrument:"acoustic_bass"},
 {id:"piano",name:"Piano",kind:"piano",instrument:"Grand Piano"},
 {id:"melody",name:"Melody",kind:"piano",instrument:"Electric Piano"}
];
let selectedTrack="drums";
const defaultPattern=()=>({
 drums:[0,4,8,12].map(x=>x),snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,4,8,12],piano:[0,4,8,12],melody:[2,6,10,14]
});
const patterns=defaultPattern();
const notes=["C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5","D5"];
const loopPresets={
"House Groove":{bpm:124,drums:[0,4,8,12],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,3,8,11],piano:[0,4,8,12],melody:[2,6,10,14]},
"Trap":{bpm:140,drums:[0,7,8,10,14],snare:[4,12],hat:[0,1,2,3,5,6,7,8,9,10,11,13,14,15],bass:[0,5,8,13],piano:[0,6,10,14],melody:[3,7,11,15]},
"Pop":{bpm:112,drums:[0,4,8,12],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,4,8,12],piano:[0,4,8,12],melody:[1,5,9,13]},
"EDM":{bpm:128,drums:[0,2,4,6,8,10,12,14],snare:[4,12],hat:[1,3,5,7,9,11,13,15],bass:[0,2,4,6,8,10,12,14],piano:[0,4,8,12],melody:[3,7,11,15]},
"Lo-Fi":{bpm:86,drums:[0,7,8,14],snare:[4,12],hat:[2,6,10,14],bass:[0,6,8,14],piano:[0,5,9,13],melody:[2,8,12]},
"Rock":{bpm:108,drums:[0,4,8,12],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,4,8,12],piano:[0,4,8,12],melody:[0,8]}
};

function blankProject(name="My V2 Project"){return {name,bpm:120,patterns:structuredClone(patterns),roll:{},trackVolumes:{drums:90,bass:80,piano:80,melody:75},instrument:"Grand Piano",created:Date.now()}}
function getProjects(){try{return JSON.parse(localStorage.getItem(DBKEY)||"[]")}catch{return[]}}
function setProjects(x){localStorage.setItem(DBKEY,JSON.stringify(x))}
function ensureProject(){let ps=getProjects();if(!ps.length){ps=[{id:currentId,...blankProject()}];setProjects(ps)}return ps}
let project=(()=>{const ps=ensureProject();return ps.find(x=>x.id===currentId)||ps[0]})();
currentId=project.id;

async function initAudio(){
 if(ctx)return;
 ctx=new AC();
 compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-10;compressor.knee.value=18;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.15;
 master=ctx.createGain();master.gain.value=.8;master.connect(compressor).connect(ctx.destination);
 piano=SplendidGrandPiano(ctx,{volume:105,velocity:105});
 electric=ElectricPiano(ctx,{instrument:"WurlitzerEP200",volume:100,velocity:105});
 bass=Soundfont(ctx,{instrument:"acoustic_bass",volume:110,velocity:105});
 drums=DrumMachine(ctx,{instrument:"TR-808",volume:112});
 drums909=DrumMachine(ctx,{instrument:"TR-909",volume:108});
 document.getElementById("state").textContent="Loading V2 samples...";
 try{await Promise.all([piano.ready,electric.ready,bass.ready,drums.ready,drums909.ready]);document.getElementById("state").textContent="V2 samples ready"}catch(e){console.warn(e);document.getElementById("state").textContent="Some samples still loading"}
 if(ctx.state==="suspended")await ctx.resume();
}

function drum(which,note){const d=which==="909"?drums909:drums;if(!d)return;try{d.start({note,velocity:112})}catch{try{d.start(note)}catch{}}}
function playBass(note="C2",duration=.45){if(bass)bass.start({note,velocity:112,duration})}
function playPiano(note="C4",duration=.7,ep=false){const inst=ep?electric:piano;if(inst)inst.start({note,velocity:112,duration})}

function beatSound(track,at=step){
 if(track==="drums"&&project.patterns.drums.includes(at))drum(project.instrument==="TR-909"?"909":"808","kick");
 if(track==="snare"&&project.patterns.snare.includes(at))drum(project.instrument==="TR-909"?"909":"808","snare");
 if(track==="hat"&&project.patterns.hat.includes(at))drum(project.instrument==="TR-909"?"909":"808","closed-hihat");
 if(track==="bass"&&project.patterns.bass.includes(at))playBass(["C2","G1","A1","F1"][Math.floor(at/4)%4]);
 if(track==="piano"&&project.patterns.piano.includes(at))playPiano(["C4","E4","G4","B4"][Math.floor(at/4)%4],.65,project.instrument==="Electric Piano");
 if(track==="melody"&&project.patterns.melody.includes(at))playPiano(["E5","G5","A5","B5"][Math.floor(at/4)%4],.4,project.instrument==="Electric Piano");
}
function tick(){document.querySelectorAll(".step").forEach((x,i)=>x.classList.toggle("current",i%16===step));beatSound("drums");beatSound("snare");beatSound("hat");beatSound("bass");beatSound("piano");beatSound("melody");step=(step+1)%16}
async function start(){await initAudio();if(playing)return;playing=true;step=0;document.getElementById("state").textContent="Playing V2";tick();timer=setInterval(tick,60000/project.bpm/4)}
function stop(){playing=false;clearInterval(timer);document.getElementById("state").textContent="Stopped";document.querySelectorAll(".current").forEach(x=>x.classList.remove("current"))}

function drawGrid(){
 const grid=document.getElementById("grid");grid.innerHTML="";
 ["drums","snare","hat","bass","piano","melody"].forEach((id,r)=>{
  const row=document.createElement("div");row.className="row";const lab=document.createElement("label");lab.textContent=id==="hat"?"Hi-Hat":id[0].toUpperCase()+id.slice(1);row.append(lab);
  for(let c=0;c<16;c++){const b=document.createElement("button");b.className="step"+(project.patterns[id].includes(c)?" on":"");b.onclick=async()=>{await initAudio();const a=project.patterns[id],i=a.indexOf(c);i>=0?a.splice(i,1):a.push(c);b.classList.toggle("on");autoSave()};row.append(b)}grid.append(row)
 })
}
function drawProjects(){const box=document.getElementById("projectList");box.innerHTML="";getProjects().forEach(p=>{const b=document.createElement("button");b.className="project-card"+(p.id===currentId?" active":"");b.textContent=p.name;b.onclick=()=>loadProject(p.id);box.append(b)})}
function drawMixer(){const m=document.getElementById("mixer");m.innerHTML="";["drums","bass","piano","melody"].forEach(id=>{const c=document.createElement("div");c.className="mix-card";c.innerHTML="<strong>"+id[0].toUpperCase()+id.slice(1)+"</strong><label>Volume <input data-track='"+id+"' type='range' min='0' max='100' value='"+(project.trackVolumes[id]??80)+"'></label>";m.append(c)});m.querySelectorAll("input").forEach(x=>x.oninput=()=>{project.trackVolumes[x.dataset.track]=+x.value;autoSave()})}
function drawLoops(){const box=document.getElementById("loopLibrary");box.innerHTML="";Object.entries(loopPresets).forEach(([name,p])=>{const c=document.createElement("div");c.className="loop-card";c.innerHTML="<strong>"+name+"</strong><span>"+p.bpm+" BPM • 6 tracks</span><button>Load Loop</button>";c.querySelector("button").onclick=()=>{project.bpm=p.bpm;["drums","snare","hat","bass","piano","melody"].forEach(k=>project.patterns[k]=[...(p[k]||[])]);document.getElementById("bpm").value=p.bpm;document.getElementById("bpmVal").textContent=p.bpm;drawGrid();autoSave()};box.append(c)})}
function drawInstruments(){const box=document.getElementById("instrumentCards");box.innerHTML="";[["Grand Piano","Sampled Steinway grand"],["Electric Piano","Wurlitzer EP200"],["808 Bass","Deep acoustic bass + low notes"],["TR-808","Classic sampled drum machine"],["TR-909","Classic 909 drum machine"]].forEach(([name,desc])=>{const c=document.createElement("div");c.className="instrument-card";c.innerHTML="<strong>"+name+"</strong><span>"+desc+"</span><button>Use</button>";c.querySelector("button").onclick=()=>{project.instrument=name;document.getElementById("instrumentSelect").value=name;autoSave()};box.append(c)})}
function drawRoll(){const box=document.getElementById("pianoRoll");box.innerHTML="";notes.slice().reverse().forEach(n=>{const l=document.createElement("div");l.className="roll-label";l.textContent=n;box.append(l);for(let c=0;c<16;c++){const b=document.createElement("button");b.className="roll-cell"+(project.roll[n]?.includes(c)?" on":"");b.onclick=()=>{project.roll[n]??=[];const i=project.roll[n].indexOf(c);i>=0?project.roll[n].splice(i,1):project.roll[n].push(c);b.classList.toggle("on");autoSave()};box.append(b)}})}
function drawKeys(){const k=document.getElementById("keys");k.innerHTML="";notes.slice(7,15).forEach(n=>{const b=document.createElement("button");b.className="key";b.textContent=n;b.onpointerdown=async()=>{await initAudio();playPiano(n,.8,project.instrument==="Electric Piano");b.classList.add("active")};b.onpointerup=()=>b.classList.remove("active");b.onpointerleave=()=>b.classList.remove("active");k.append(b)})}
function drawPads(){const box=document.getElementById("pads");box.innerHTML="";["Kick","Snare","Hat","Clap","808 Bass","Grand Piano","Electric Piano","Chord","Open Hat","Tom","Bell","Hit","Drop","Rise","Sub Bass","Crash"].forEach((n,i)=>{const b=document.createElement("button");b.className="pad";b.textContent=n;b.onclick=async()=>{await initAudio();b.classList.add("hit");setTimeout(()=>b.classList.remove("hit"),100);if(n==="Kick")drum("808","kick");else if(n==="Snare")drum("808","snare");else if(n==="Hat")drum("808","closed-hihat");else if(n==="Clap")drum("808","clap");else if(n==="Open Hat")drum("808","open-hihat");else if(n==="Tom")drum("808","tom-high");else if(n==="Crash")drum("808","crash");else if(n==="808 Bass"||n==="Sub Bass")playBass(n==="Sub Bass"?"C1":"C2",1);else if(n==="Electric Piano")playPiano("C4",.8,true);else if(n==="Chord")["C4","E4","G4"].forEach(x=>playPiano(x,.9));else playPiano(i%2?"G4":"C5",.7)};box.append(b)})}
function setupSelects(){const t=document.getElementById("trackSelect");t.innerHTML="";tracks.forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.name;t.append(o)});const s=document.getElementById("instrumentSelect");["Grand Piano","Electric Piano","808 Bass","TR-808","TR-909"].forEach(x=>{const o=document.createElement("option");o.textContent=x;s.append(o)});s.onchange=()=>{project.instrument=s.value;autoSave()}}
function saveProject(){let ps=getProjects(),i=ps.findIndex(x=>x.id===currentId);project.name=project.name||"My V2 Project";if(i<0)ps.push(project);else ps[i]=project;setProjects(ps);drawProjects();document.getElementById("projectStatus").textContent="Saved "+new Date().toLocaleTimeString()}
function autoSave(){saveProject()}
function loadProject(id){const p=getProjects().find(x=>x.id===id);if(!p)return;project=JSON.parse(JSON.stringify(p));currentId=p.id;document.getElementById("projectName").textContent=project.name;document.getElementById("bpm").value=project.bpm;document.getElementById("bpmVal").textContent=project.bpm;document.getElementById("instrumentSelect").value=project.instrument||"Grand Piano";drawProjects();drawGrid();drawMixer();drawRoll()}
function newProject(){const name=prompt("Project name","My V2 Project");if(!name)return;const p={id:"p-"+Date.now(),...blankProject(name)};let ps=getProjects();ps.push(p);setProjects(ps);loadProject(p.id)}
function deleteCurrent(){const ps=getProjects().filter(x=>x.id!==currentId);if(!ps.length){const p={id:"default-v2",...blankProject()};ps.push(p)}setProjects(ps);loadProject(ps[0].id)}
function duplicate(){const p={...JSON.parse(JSON.stringify(project)),id:"p-"+Date.now(),name:project.name+" Copy"};let ps=getProjects();ps.push(p);setProjects(ps);loadProject(p.id)}

async function renderWav(){
 await initAudio();document.getElementById("state").textContent="Rendering WAV...";
 const {renderOffline,SplendidGrandPiano,ElectricPiano,Soundfont,DrumMachine}=await import("https://unpkg.com/smplr/dist/index.mjs");
 const duration=8;
 const result=await renderOffline(async c=>{
   const p=SplendidGrandPiano(c,{volume:105}),ep=ElectricPiano(c,{instrument:"WurlitzerEP200",volume:100}),b=Soundfont(c,{instrument:"acoustic_bass",volume:110}),d=DrumMachine(c,{instrument:project.instrument==="TR-909"?"TR-909":"TR-808",volume:112});
   await Promise.all([p.ready,ep.ready,b.ready,d.ready]);
   const beat=60/project.bpm/4;
   for(let s=0;s<16;s++){const t=s*beat;if(project.patterns.drums.includes(s))d.start({note:"kick",time:t});if(project.patterns.snare.includes(s))d.start({note:"snare",time:t});if(project.patterns.hat.includes(s))d.start({note:"closed-hihat",time:t});if(project.patterns.bass.includes(s))b.start({note:["C2","G1","A1","F1"][Math.floor(s/4)%4],time:t,duration:.45});if(project.patterns.piano.includes(s))(project.instrument==="Electric Piano"?ep:p).start({note:["C4","E4","G4","B4"][Math.floor(s/4)%4],time:t,duration:.65})}
 });
 result.downloadWav16("rohan-music-v2.wav");document.getElementById("state").textContent="WAV exported"
}
async function renderMp3(){
 await initAudio();document.getElementById("state").textContent="Rendering MP3...";
 const {renderOffline,SplendidGrandPiano,ElectricPiano,Soundfont,DrumMachine}=await import("https://unpkg.com/smplr/dist/index.mjs");
 const result=await renderOffline(async c=>{
   const p=SplendidGrandPiano(c,{volume:105}),ep=ElectricPiano(c,{instrument:"WurlitzerEP200",volume:100}),b=Soundfont(c,{instrument:"acoustic_bass",volume:110}),d=DrumMachine(c,{instrument:project.instrument==="TR-909"?"TR-909":"TR-808",volume:112});
   await Promise.all([p.ready,ep.ready,b.ready,d.ready]);const beat=60/project.bpm/4;
   for(let s=0;s<16;s++){const t=s*beat;if(project.patterns.drums.includes(s))d.start({note:"kick",time:t});if(project.patterns.snare.includes(s))d.start({note:"snare",time:t});if(project.patterns.hat.includes(s))d.start({note:"closed-hihat",time:t});if(project.patterns.bass.includes(s))b.start({note:"C2",time:t,duration:.45});if(project.patterns.piano.includes(s))(project.instrument==="Electric Piano"?ep:p).start({note:"C4",time:t,duration:.65})}
 });
 const ab=result.audioBuffer,enc=new lamejs.Mp3Encoder(2,ab.sampleRate,192),left=ab.getChannelData(0),right=ab.numberOfChannels>1?ab.getChannelData(1):left,block=1152,chunks=[];
 for(let i=0;i<left.length;i+=block){const l=new Int16Array(Math.min(block,left.length-i)),r=new Int16Array(l.length);for(let j=0;j<l.length;j++){l[j]=Math.max(-32768,Math.min(32767,left[i+j]*32767));r[j]=Math.max(-32768,Math.min(32767,right[i+j]*32767))}const mp=enc.encodeBuffer(l,r);if(mp.length)chunks.push(new Int8Array(mp))}
 const end=enc.flush();if(end.length)chunks.push(new Int8Array(end));const blob=new Blob(chunks,{type:"audio/mpeg"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rohan-music-v2.mp3";a.click();document.getElementById("state").textContent="MP3 exported"
}

document.getElementById("play").onclick=start;document.getElementById("stop").onclick=stop;document.getElementById("save").onclick=saveProject;document.getElementById("newProject").onclick=newProject;document.getElementById("deleteProject").onclick=deleteCurrent;document.getElementById("duplicateProject").onclick=duplicate;document.getElementById("exportWav").onclick=renderWav;document.getElementById("exportMp3").onclick=renderMp3;document.getElementById("fullscreen").onclick=()=>document.documentElement.requestFullscreen?.();
document.getElementById("bpm").oninput=e=>{project.bpm=+e.target.value;document.getElementById("bpmVal").textContent=e.target.value;autoSave()};
document.getElementById("random").onclick=()=>{Object.keys(project.patterns).forEach(k=>project.patterns[k]=Array.from({length:16},(_,i)=>Math.random()>.7?i:null).filter(x=>x!==null));drawGrid();autoSave()};
document.getElementById("clearTrack").onclick=()=>{project.patterns[document.getElementById("trackSelect").value]=[];drawGrid();autoSave()};
document.getElementById("addTrack").onclick=()=>alert("V2 has Drums, Bass, Piano and Melody tracks ready. Use the instrument selector to change the sound rack.");
document.getElementById("clearRoll").onclick=()=>{project.roll={};drawRoll();autoSave()};
document.getElementById("playImported").onclick=async()=>{if(!importedBuffer)return;await initAudio();const s=ctx.createBufferSource();s.buffer=importedBuffer;s.connect(master);s.start()};
document.getElementById("audio").onchange=async e=>{const f=e.target.files[0];if(!f)return;await initAudio();importedBuffer=await ctx.decodeAudioData(await f.arrayBuffer());document.getElementById("audioName").textContent=f.name+" • Ready"};
document.addEventListener("keydown",async e=>{const map={a:"C4",s:"D4",d:"E4",f:"F4",g:"G4",h:"A4",j:"B4",k:"C5",l:"D5"};if(map[e.key]&&!e.repeat){await initAudio();playPiano(map[e.key],.8,project.instrument==="Electric Piano")}});

setupSelects();document.getElementById("projectName").textContent=project.name;document.getElementById("bpm").value=project.bpm;document.getElementById("bpmVal").textContent=project.bpm;document.getElementById("instrumentSelect").value=project.instrument||"Grand Piano";drawGrid();drawProjects();drawLoops();drawInstruments();drawMixer();drawRoll();drawKeys();drawPads();

const cv=document.getElementById("visualizer"),cx=cv.getContext("2d");function vis(){cv.width=cv.clientWidth*devicePixelRatio;cv.height=58*devicePixelRatio;cx.clearRect(0,0,cv.width,cv.height);cx.beginPath();for(let x=0;x<cv.width;x+=6)cx.lineTo(x,29+Math.sin(x*.02+Date.now()/220)*(playing?14:4)+Math.sin(x*.05+Date.now()/400)*4);cx.strokeStyle="#ffb000";cx.lineWidth=2*devicePixelRatio;cx.stroke();requestAnimationFrame(vis)}vis();

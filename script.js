const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null,playing=false,timer=null,step=0,importedBuffer=null,history=[],future=[];
const KEY="rohansMusicStudioV4";
const SONG_SECONDS=180;
const notes=["C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5","D5"];
const tracks=[
 ["drums","Drums","Drum Kit"],["bass","Bass","808 Bass"],["piano","Piano","Grand Piano"],["melody","Melody","Synth Lead"]
];
const packs={
"Pop Essentials":{bpm:118,drums:[0,4,8,12],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,4,8,12],piano:[0,4,8,12],melody:[2,6,10,14]},
"EDM Energy":{bpm:128,drums:[0,2,4,6,8,10,12,14],snare:[4,12],hat:[1,3,5,7,9,11,13,15],bass:[0,2,4,6,8,10,12,14],piano:[0,4,8,12],melody:[3,7,11,15]},
"Trap Nation":{bpm:140,drums:[0,7,8,10,14],snare:[4,12],hat:[0,1,2,3,5,6,7,8,9,10,11,13,14,15],bass:[0,5,8,13],piano:[0,6,10,14],melody:[3,7,11,15]},
"Lo-Fi Dreams":{bpm:86,drums:[0,7,8,14],snare:[4,12],hat:[2,6,10,14],bass:[0,6,8,14],piano:[0,5,9,13],melody:[2,8,12]},
"Rock Room":{bpm:108,drums:[0,4,8,12],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,4,8,12],piano:[0,4,8,12],melody:[0,8]},
"Cinematic":{bpm:92,drums:[0,8],snare:[6,14],hat:[2,6,10,14],bass:[0,8],piano:[0,4,8,12],melody:[1,5,9,13]}
};
const loops={"House Loop":packs["Pop Essentials"],"Night Drive":packs["EDM Energy"],"Late Night":packs["Lo-Fi Dreams"],"Stadium Rock":packs["Rock Room"],"Trap Wave":packs["Trap Nation"],"Film Intro":packs["Cinematic"]};
function fresh(){return{name:"My Music",bpm:120,patterns:{drums:[0,4,8,12],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,4,8,12],piano:[0,4,8,12],melody:[2,6,10,14]},roll:{"C4":[0],"E4":[4],"G4":[8],"B4":[12]},vol:{drums:90,bass:80,piano:80,melody:75},instrument:"Grand Piano"}}
function loadData(){try{return JSON.parse(localStorage.getItem(KEY))||fresh()}catch{return fresh()}}
let project=loadData();
function clone(){return JSON.parse(JSON.stringify(project))}
function save(){history.push(JSON.stringify(project));if(history.length>30)history.shift();future=[];localStorage.setItem(KEY,JSON.stringify(project));setState("Saved")}
function setState(s){const e=document.getElementById("state");if(e)e.textContent=s}
function ensureAudio(){if(!ctx){ctx=new AC();master=ctx.createGain();master.gain.value=.8;master.connect(ctx.destination)}if(ctx.state==="suspended")ctx.resume();return ctx}
function freq(note){const m=note.match(/^([A-G])([#b]?)(-?\d)$/);if(!m)return 261.63;const names={C:0,D:2,E:4,F:5,G:7,A:9,B:11};let n=names[m[1]]+(m[2]==="#"?1:m[2]==="b"?-1:0);return 440*Math.pow(2,(n+(+m[3]-4)*12-9)/12)}
function synth(note,d,type,vol,when=0,engine="piano",destination=null){
 ensureAudio();if(!destination)destination=master;const now=ctx.currentTime+when,f=freq(note),gain=ctx.createGain();gain.gain.setValueAtTime(.0001,now);
 const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=engine==="bass"?900:engine==="pad"?2400:7000;
 let oscs=[];
 const add=(wave,mult,detune=0)=>{const o=ctx.createOscillator();o.type=wave;o.frequency.value=f*mult;o.detune.value=detune;o.connect(filter);o.start(now);o.stop(now+d+.05);oscs.push(o)};
 if(engine==="piano"){add("triangle",1);add("sine",2,3)}
 else if(engine==="electric"){add("sine",1);add("triangle",2,5)}
 else if(engine==="bass"){add("sawtooth",1);add("sine",.5)}
 else if(engine==="lead"){add("sawtooth",1);add("square",2,-7)}
 else if(engine==="pad"){add("sawtooth",1,-9);add("sawtooth",1,9);add("sine",.5)}
 else if(engine==="strings"){add("sawtooth",1,-5);add("sawtooth",1,5)}
 else if(engine==="guitar"){add("triangle",1);add("square",2,-12)}
 else if(engine==="organ"){add("sine",1);add("sine",2);add("sine",3)}
 else if(engine==="bell"){add("sine",1);add("sine",2.7);add("sine",4.1)}
 else {add(type||"triangle",1)}
 filter.connect(gain).connect(destination);
 const attack=engine==="pad"||engine==="strings"?.12:.015;
 const release=Math.min(.25,d*.3);
 gain.gain.exponentialRampToValueAtTime(Math.max(.002,vol),now+attack);
 gain.gain.exponentialRampToValueAtTime(.0001,now+d+release);
}
function noise(d=.12,vol=.18,when=0,destination=null){ensureAudio();if(!destination)destination=master;const n=ctx.createBufferSource(),b=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*d)),ctx.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;n.buffer=b;const g=ctx.createGain();g.gain.setValueAtTime(vol,ctx.currentTime+when);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+when+d);const f=ctx.createBiquadFilter();f.type="highpass";f.frequency.value=1800;n.connect(f).connect(g).connect(destination);n.start(ctx.currentTime+when)}
function drum(kind,when=0,destination=master){
 ensureAudio();const t=ctx.currentTime+when;
 if(kind==="kick"){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(145,t);o.frequency.exponentialRampToValueAtTime(45,t+.18);g.gain.setValueAtTime(.85,t);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g).connect(destination);o.start(t);o.stop(t+.34)}
 else if(kind==="snare"){noise(.16,.28,when,destination);synth("D3",.08,"triangle",.045,when,"guitar",destination)}
 else if(kind==="hat"){noise(.055,.13,when,destination)}
 else if(kind==="clap"){noise(.09,.2,when,destination);noise(.07,.13,when+.045,destination);noise(.05,.1,when+.09,destination)}
 else if(kind==="crash"){noise(.65,.22,when,destination)}
 else synth(kind==="tom"?"G2":"C2",.2,"sine",.22,when,"bass",destination)
}
const engineFor=(instrument)=>{
 const map={"Grand Piano":"piano","Electric Piano":"electric","808 Bass":"bass","Drum Kit":"drums","Synth Lead":"lead","Synth Pad":"pad","Strings":"strings","Guitar":"guitar","Organ":"organ","Bell":"bell"};
 return map[instrument]||"piano";
};
function playTrack(id,s,when=0,destination=master){
 const p=project.patterns;
 if(id==="drums"&&p.drums.includes(s))drum("kick",when,destination);
 if(id==="snare"&&p.snare.includes(s))drum("snare",when,destination);
 if(id==="hat"&&p.hat.includes(s))drum("hat",when,destination);
 if(id==="bass"&&p.bass.includes(s))synth(["C2","G1","A1","F1"][Math.floor(s/4)],.36,"sawtooth",.16,when,"bass",destination);
 if(id==="piano"&&p.piano.includes(s))["C4","E4","G4","B4"][Math.floor(s/4)%4]&&synth(["C4","E4","G4","B4"][Math.floor(s/4)%4],.58,"triangle",.18,when,engineFor(project.instrument),destination);
 if(id==="melody"&&p.melody.includes(s))synth(["E5","G5","A5","B5","D6"][Math.floor(s/2)%5],.38,"square",.11,when,"lead",destination);
 Object.entries(project.roll||{}).forEach(([n,a])=>{if(a.includes(s))synth(n,.34,"triangle",.09,when,"piano",destination)});
}
function tick(){document.querySelectorAll(".step").forEach((x,i)=>x.classList.toggle("current",i%16===step));tracks.forEach(t=>playTrack(t[0],step));step=(step+1)%16}
function start(){ensureAudio();if(playing)return;playing=true;setState("Playing");tick();timer=setInterval(tick,60000/project.bpm/4)}
function stop(){playing=false;clearInterval(timer);timer=null;setState("Stopped");document.querySelectorAll(".current").forEach(x=>x.classList.remove("current"))}
function drawTimeline(){
 const box=document.getElementById("timeline");box.innerHTML="";const wrap=document.createElement("div");wrap.className="timeline-grid";
 const ruler=document.createElement("div");ruler.className="time-ruler";ruler.innerHTML="<span>TRACK</span>"+Array.from({length:16},(_,i)=>"<span>"+(i+1)+"</span>").join("");wrap.append(ruler);
 tracks.forEach(t=>{const lane=document.createElement("div");lane.className="lane";lane.innerHTML="<div class='lane-name'>"+t[1]+"</div>";
   for(let i=0;i<16;i++){const c=document.createElement("div");c.className="clip "+t[0];if(project.patterns[t[0]]?.includes(i)){c.textContent=t[1];c.title=t[1]+" • step "+(i+1)}lane.append(c)}wrap.append(lane)});box.append(wrap)
}
function drawGrid(){
 const box=document.getElementById("grid");box.innerHTML="";
 ["drums","snare","hat","bass","piano","melody"].forEach(id=>{const row=document.createElement("div");row.className="step-row";row.innerHTML="<label>"+(id==="hat"?"Hi-Hat":id[0].toUpperCase()+id.slice(1))+"</label>";
 for(let i=0;i<16;i++){const b=document.createElement("button");b.className="step"+(project.patterns[id].includes(i)?" on":"");b.onclick=()=>{const k=project.patterns[id].indexOf(i);k>=0?project.patterns[id].splice(k,1):project.patterns[id].push(i);drawTimeline();drawGrid();save()};row.append(b)}box.append(row)})
}
function drawRoll(){const box=document.getElementById("pianoRoll");box.innerHTML="";notes.slice().reverse().forEach(n=>{const l=document.createElement("div");l.className="roll-label";l.textContent=n;box.append(l);for(let i=0;i<16;i++){const b=document.createElement("button");b.className="roll-cell"+(project.roll[n]?.includes(i)?" on":"");b.onclick=()=>{project.roll[n]??=[];const k=project.roll[n].indexOf(i);k>=0?project.roll[n].splice(k,1):project.roll[n].push(i);synth(n,.45,"triangle",.12,0,"piano");drawRoll();save()};box.append(b)}})}
function drawKeys(){const k=document.getElementById("keys");k.innerHTML="";notes.slice(7,15).forEach(n=>{const b=document.createElement("button");b.className="key";b.textContent=n;b.onpointerdown=()=>{synth(n,.75,"triangle",.2,0,engineFor(project.instrument));b.classList.add("active")};b.onpointerup=()=>b.classList.remove("active");b.onpointerleave=()=>b.classList.remove("active");k.append(b)})}
function drawPads(){const box=document.getElementById("pads");box.innerHTML="";["Kick","Snare","Hat","Clap","Bass","Piano","Synth","Chord","Open Hat","Tom","Bell","Hit","Drop","Rise","Sub Bass","Crash"].forEach((n,i)=>{const b=document.createElement("button");b.className="pad";b.textContent=n;b.onclick=()=>{ensureAudio();b.classList.add("hit");setTimeout(()=>b.classList.remove("hit"),90);if(n==="Kick")drum("kick");else if(n==="Snare")drum("snare");else if(n==="Hat"||n==="Open Hat")noise(n==="Hat"?.06:.16,n==="Hat"?.13:.18);else if(n==="Clap")drum("clap");else if(n==="Crash")drum("crash");else if(n==="Tom")drum("tom");else if(n==="Bass"||n==="Sub Bass")synth(n==="Bass"?"C2":"C1",.55,"sawtooth",.2,0,"bass");else if(n==="Chord")["C4","E4","G4"].forEach(x=>synth(x,.75,"triangle",.11));else if(n==="Piano")synth("C4",.8,"triangle",.2,0,"piano");else if(n==="Synth")synth("G4",.5,"square",.16,0,"lead");else if(n==="Bell")synth("C5",.8,"sine",.16,0,"bell");else if(n==="Drop")["G4","E4","C4"].forEach((x,j)=>synth(x,.45,"sawtooth",.13,j*.08,"lead"));else if(n==="Rise")["C4","D4","E4","G4"].forEach((x,j)=>synth(x,.3,"sawtooth",.1,j*.07,"lead"));else synth(i%2?"G4":"C5",.5,"triangle",.12)};box.append(b)})}
function applyPack(p){project.bpm=p.bpm;["drums","snare","hat","bass","piano","melody"].forEach(k=>project.patterns[k]=[...p[k]]);document.getElementById("bpm").value=p.bpm;drawGrid();drawTimeline();save()}
function drawPacks(){const box=document.getElementById("soundPacks");box.innerHTML="";Object.entries(packs).forEach(([n,p])=>{const d=document.createElement("div");d.className="pack";d.innerHTML="<b>"+n+"</b><small>"+p.bpm+" BPM</small><button>Use Pack</button>";d.querySelector("button").onclick=()=>applyPack(p);box.append(d)})}
function drawLibrary(){const box=document.getElementById("loopLibrary");box.innerHTML="";Object.entries(loops).forEach(([n,p])=>{const d=document.createElement("div");d.className="library-item";d.innerHTML="<b>"+n+"</b><span>"+p.bpm+" BPM • 4-bar pattern</span><button>Load Loop</button>";d.querySelector("button").onclick=()=>applyPack(p);box.append(d)})}
function drawInstruments(){const box=document.getElementById("instrumentCards");box.innerHTML="";[["Grand Piano","Piano"],["Electric Piano","Electric"],["808 Bass","Bass"],["Drum Kit","Drums"],["Synth Lead","Synth"],["Synth Pad","Pad"],["Strings","Strings"],["Guitar","Guitar"],["Organ","Organ"],["Bell","Bell"]].forEach(([n])=>{const d=document.createElement("div");d.className="library-item";d.innerHTML="<b>"+n+"</b><span>Distinct built-in synthesis engine</span><button>Use</button>";d.querySelector("button").onclick=()=>{project.instrument=n;document.getElementById("instrumentSelect").value=n;drawKeys();save();setState(n+" loaded")};box.append(d)})}
function drawMixer(){const box=document.getElementById("mixerList");box.innerHTML="";tracks.forEach(t=>{const d=document.createElement("div");d.className="mix";d.innerHTML="<b>"+t[1]+"</b><input type='range' min='0' max='100' value='"+(project.vol[t[0]]||80)+"'>";d.querySelector("input").oninput=e=>{project.vol[t[0]]=+e.target.value;save()};box.append(d)})}
function drawProjects(){const box=document.getElementById("projectList");box.innerHTML="";const d=document.createElement("div");d.className="library-item";d.innerHTML="<b>"+project.name+"</b><span>Saved locally in this browser</span>";box.append(d)}
function setup(){
 document.querySelectorAll(".nav[data-section]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".drawer").forEach(d=>d.classList.remove("active"));document.getElementById(b.dataset.section)?.classList.add("active");document.querySelectorAll(".nav").forEach(n=>n.classList.remove("active"));b.classList.add("active")});
 document.getElementById("openProject").onclick=()=>document.getElementById("projects").classList.add("active");
 document.getElementById("play").onclick=start;document.getElementById("play2").onclick=start;document.getElementById("stop").onclick=stop;document.getElementById("stop2").onclick=stop;
 document.getElementById("save").onclick=save;
 document.getElementById("newProject").onclick=()=>{const n=prompt("Project name","My New Song");if(n){project=fresh();project.name=n;save();render()}};
 document.getElementById("duplicateProject").onclick=()=>{project={...clone(),name:project.name+" Copy"};save();render()};
 document.getElementById("deleteProject").onclick=()=>{project=fresh();save();render()};
 document.getElementById("fullscreen").onclick=()=>document.documentElement.requestFullscreen?.();
 document.getElementById("bpm").oninput=e=>{project.bpm=Math.max(50,Math.min(200,+e.target.value||120));save();if(playing){stop();start()}};
 document.getElementById("masterVol").oninput=e=>{ensureAudio();master.gain.value=+e.target.value/100};
 document.getElementById("clearTrack").onclick=()=>{project.patterns[document.getElementById("trackSelect").value]=[];drawGrid();drawTimeline();save()};
 document.getElementById("clearRoll").onclick=()=>{project.roll={};drawRoll();save()};
 document.getElementById("random").onclick=()=>{["drums","snare","hat","bass","piano","melody"].forEach(k=>project.patterns[k]=Array.from({length:16},(_,i)=>Math.random()>.72?i:null).filter(x=>x!==null));drawGrid();drawTimeline();save()};
 document.getElementById("record").onclick=()=>setState("Record-ready: use the arrangement and export controls");
 document.getElementById("playImported").onclick=()=>{if(!importedBuffer){setState("Choose an audio file first");return}ensureAudio();const s=ctx.createBufferSource();s.buffer=importedBuffer;s.connect(master);s.start();setState("Imported audio playing")};
 document.getElementById("audio").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{ensureAudio();importedBuffer=await ctx.decodeAudioData(await f.arrayBuffer());document.getElementById("audioName").textContent=f.name+" • Ready";setState("Audio loaded")}catch(err){setState("Audio could not be decoded")}};
 document.getElementById("trackSelect").onchange=e=>document.getElementById("selectedTrackTitle").textContent=e.target.options[e.target.selectedIndex].textContent;
 document.getElementById("instrumentSelect").onchange=e=>{project.instrument=e.target.value;drawKeys();save();setState(e.target.value+" loaded")};
 document.getElementById("prevStep").onclick=()=>{step=(step+15)%16;tick()};document.getElementById("nextStep").onclick=()=>{step=(step+1)%16;tick()};
 document.addEventListener("keydown",e=>{if(e.target.matches("input,select,textarea"))return;const m={a:"C4",s:"D4",d:"E4",f:"F4",g:"G4",h:"A4",j:"B4",k:"C5",l:"D5"};if(m[e.key]&&!e.repeat){synth(m[e.key],.6,"triangle",.16,0,engineFor(project.instrument));}if(e.code==="Space"){e.preventDefault();playing?stop():start()}});
}
function render(){document.getElementById("projectName").textContent=project.name;document.getElementById("bpm").value=project.bpm;const ts=document.getElementById("trackSelect");ts.innerHTML=tracks.map(t=>"<option value='"+t[0]+"'>"+t[1]+"</option>").join("");const ins=["Grand Piano","Electric Piano","808 Bass","Drum Kit","Synth Lead","Synth Pad","Strings","Guitar","Organ","Bell"];document.getElementById("instrumentSelect").innerHTML=ins.map(x=>"<option>"+x+"</option>").join("");document.getElementById("instrumentSelect").value=project.instrument||"Grand Piano";drawTimeline();drawGrid();drawRoll();drawKeys();drawPads();drawPacks();drawLibrary();drawInstruments();drawMixer();drawProjects()}
function offlineRender(seconds){
 const sr=44100,o=new OfflineAudioContext(2,Math.floor(sr*seconds),sr),mg=o.createGain();mg.gain.value=Math.max(.05,Math.min(1,+document.getElementById("masterVol").value/100||.8));mg.connect(o.destination);
 const ofreq=n=>freq(n);
 const ot=(n,t,d,w,v,eng="piano")=>{const f=ofreq(n),filter=o.createBiquadFilter(),g=o.createGain();filter.type="lowpass";filter.frequency.value=eng==="bass"?900:eng==="pad"?2400:7000;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.002,v),t+(eng==="pad"||eng==="strings"?.12:.015));g.gain.exponentialRampToValueAtTime(.0001,t+d+.18);const add=(wave,mult,det=0)=>{const q=o.createOscillator();q.type=wave;q.frequency.value=f*mult;q.detune.value=det;q.connect(filter);q.start(t);q.stop(Math.min(seconds,t+d+.2))};if(eng==="piano"){add("triangle",1);add("sine",2,3)}else if(eng==="electric"){add("sine",1);add("triangle",2,5)}else if(eng==="bass"){add("sawtooth",1);add("sine",.5)}else if(eng==="lead"){add("sawtooth",1);add("square",2,-7)}else if(eng==="pad"){add("sawtooth",1,-9);add("sawtooth",1,9);add("sine",.5)}else if(eng==="strings"){add("sawtooth",1,-5);add("sawtooth",1,5)}else if(eng==="guitar"){add("triangle",1);add("square",2,-12)}else if(eng==="organ"){add("sine",1);add("sine",2);add("sine",3)}else if(eng==="bell"){add("sine",1);add("sine",2.7);add("sine",4.1)}else add(w||"triangle",1);filter.connect(g).connect(mg)};
 const nd=(t,d,v)=>{const b=o.createBuffer(1,Math.max(1,Math.floor(sr*d)),sr),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;const s=o.createBufferSource(),g=o.createGain(),f=o.createBiquadFilter();f.type="highpass";f.frequency.value=1600;s.buffer=b;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f).connect(g).connect(mg);s.start(t)};
 const dk=(kind,t)=>{if(kind==="kick"){const q=o.createOscillator(),g=o.createGain();q.frequency.setValueAtTime(145,t);q.frequency.exponentialRampToValueAtTime(45,t+.18);g.gain.setValueAtTime(.8,t);g.gain.exponentialRampToValueAtTime(.0001,t+.3);q.connect(g).connect(mg);q.start(t);q.stop(Math.min(seconds,t+.32))}else if(kind==="snare"){nd(t,.16,.27)}else if(kind==="hat"){nd(t,.05,.12)}else if(kind==="clap"){nd(t,.09,.2);nd(t+.05,.06,.12)}else nd(t,.35,.18)};
 const beat=60/project.bpm/4,phrase=beat*16;
 for(let base=0;base<seconds;base+=phrase){for(let s=0;s<16;s++){const t=base+s*beat;if(t>=seconds)break;
   if(project.patterns.drums.includes(s))dk("kick",t);if(project.patterns.snare.includes(s))dk("snare",t);if(project.patterns.hat.includes(s))dk("hat",t);
   if(project.patterns.bass.includes(s))ot(["C2","G1","A1","F1"][Math.floor(s/4)],t,.4,"sawtooth",.14,"bass");
   if(project.patterns.piano.includes(s))ot(["C4","E4","G4","B4"][Math.floor(s/4)%4],t,.58,"triangle",.15,engineFor(project.instrument));
   if(project.patterns.melody.includes(s))ot(["E5","G5","A5","B5","D6"][Math.floor(s/2)%5],t,.38,"square",.1,"lead");
   Object.entries(project.roll||{}).forEach(([n,a])=>{if(a.includes(s))ot(n,t,.34,"triangle",.08,"piano")});
 } }
 return o.startRendering()
}
function audioWav(b){const ch=b.numberOfChannels,rate=b.sampleRate,len=b.length*ch*2,buf=new ArrayBuffer(44+len),v=new DataView(buf);const s=(o,x)=>{for(let i=0;i<x.length;i++)v.setUint8(o+i,x.charCodeAt(i))};s(0,"RIFF");v.setUint32(4,36+len,true);s(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,rate,true);v.setUint32(28,rate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,len,true);let p=44;for(let i=0;i<b.length;i++)for(let c=0;c<ch;c++){let x=Math.max(-1,Math.min(1,b.getChannelData(c)[i]));v.setInt16(p,x<0?x*32768:x*32767,true);p+=2}return new Blob([buf],{type:"audio/wav"})}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
async function exportWav(){try{setState("Rendering 3-minute WAV...");const b=await offlineRender(SONG_SECONDS);downloadBlob(audioWav(b),"rohan-music-studio-3min.wav");setState("3-minute WAV downloaded")}catch(e){console.error(e);setState("WAV export failed")}}
async function exportMp3(){try{if(!window.lamejs){setState("MP3 encoder unavailable");return}setState("Rendering 3-minute MP3...");const b=await offlineRender(SONG_SECONDS),sr=b.sampleRate,enc=new lamejs.Mp3Encoder(2,sr,192),L=b.getChannelData(0),R=b.getChannelData(1),out=[],block=1152;for(let i=0;i<L.length;i+=block){const n=Math.min(block,L.length-i),l=new Int16Array(n),r=new Int16Array(n);for(let j=0;j<n;j++){l[j]=Math.max(-32768,Math.min(32767,L[i+j]*32767));r[j]=Math.max(-32768,Math.min(32767,R[i+j]*32767))}const x=enc.encodeBuffer(l,r);if(x.length)out.push(new Uint8Array(x))}const end=enc.flush();if(end.length)out.push(new Uint8Array(end));downloadBlob(new Blob(out,{type:"audio/mpeg"}),"rohan-music-studio-3min.mp3");setState("3-minute MP3 downloaded")}catch(e){console.error(e);setState("MP3 export failed")}}
document.getElementById("exportWav").onclick=exportWav;document.getElementById("exportMp3").onclick=exportMp3;
setup();render();
const cv=document.getElementById("visualizer"),cx=cv.getContext("2d");function visual(){cv.width=Math.max(100,cv.clientWidth*devicePixelRatio);cv.height=22*devicePixelRatio;cx.clearRect(0,0,cv.width,cv.height);cx.beginPath();for(let x=0;x<cv.width;x+=5){const y=11*devicePixelRatio+Math.sin(x*.03+Date.now()/180)*(playing?8:2)*devicePixelRatio;x?cx.lineTo(x,y):cx.moveTo(x,y)}cx.strokeStyle="#ffad00";cx.lineWidth=1.5*devicePixelRatio;cx.stroke();requestAnimationFrame(visual)}visual();
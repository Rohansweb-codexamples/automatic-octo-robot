const AC=window.AudioContext||window.webkitAudioContext;
let ctx,master,compressor,playing=false,step=0,timer,importedBuffer=null;
const tracks=["Kick","Snare","Hi-Hat","Clap"];
const pattern=tracks.map(()=>Array(16).fill(false));
[0,4,8,12].forEach(i=>pattern[0][i]=true);
[4,12].forEach(i=>pattern[1][i]=true);
for(let i=0;i<16;i+=2)pattern[2][i]=true;
[4,12].forEach(i=>pattern[3][i]=true);

function audio(){
  if(!ctx){
    ctx=new AC();
    compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-12; compressor.knee.value=18; compressor.ratio.value=5;
    compressor.attack.value=.003; compressor.release.value=.12;
    master=ctx.createGain(); master.gain.value=.72;
    master.connect(compressor).connect(ctx.destination);
  }
  if(ctx.state==="suspended")ctx.resume();
}
function env(g,peak,attack,decay){
  const t=ctx.currentTime;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(.0001,t);
  g.gain.linearRampToValueAtTime(peak,t+attack);
  g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);
}
function synth(freq,dur=.4,type="sawtooth",gain=.12,detune=0){
  audio(); const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
  o.type=type;o.frequency.value=freq;o.detune.value=detune;
  f.type="lowpass";f.frequency.value=4200;f.Q.value=.7;
  o.connect(f).connect(g).connect(master);env(g,gain,.008,dur);
  o.start();o.stop(ctx.currentTime+dur+.03);
}
function kick(){
  audio();const o=ctx.createOscillator(),g=ctx.createGain();
  o.type="sine";o.frequency.setValueAtTime(155,ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(48,ctx.currentTime+.12);
  o.connect(g).connect(master);env(g,.85,.002,.22);o.start();o.stop(ctx.currentTime+.25);
}
function noiseHit(duration,gain,startFreq,endFreq){
  audio();const b=ctx.createBuffer(1,ctx.sampleRate*duration,ctx.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.6);
  const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  n.buffer=b;f.type="bandpass";f.frequency.value=startFreq;f.Q.value=0.8;
  if(endFreq)f.frequency.exponentialRampToValueAtTime(endFreq,ctx.currentTime+duration);
  n.connect(f).connect(g).connect(master);env(g,gain,.001,duration*.9);n.start();n.stop(ctx.currentTime+duration+.02);
}
function snare(){noiseHit(.22,.34,1900,1200);synth(185,.09,"triangle",.12)}
function hat(){noiseHit(.055,.16,8500,6500)}
function clap(){noiseHit(.18,.28,1400,900)}
function drum(t){if(t==="kick")kick();else if(t==="snare")snare();else if(t==="hi-hat")hat();else if(t==="clap")clap()}

function drawGrid(){
 const grid=document.getElementById("grid");grid.innerHTML="";
 tracks.forEach((name,r)=>{const row=document.createElement("div");row.className="row";
 const lab=document.createElement("label");lab.textContent=name;row.append(lab);
 for(let c=0;c<16;c++){const b=document.createElement("button");b.className="step"+(pattern[r][c]?" on":"");
 b.onclick=()=>{pattern[r][c]=!pattern[r][c];b.classList.toggle("on")};row.append(b)}grid.append(row)})
}
drawGrid();

function tick(){
 document.querySelectorAll(".step").forEach((x,i)=>x.classList.toggle("current",i%16===step));
 pattern.forEach((row,i)=>{if(row[step])drum(tracks[i].toLowerCase())});
 step=(step+1)%16;
}
function start(){
 audio();if(playing)return;playing=true;step=0;
 document.getElementById("state").textContent="Playing";
 const bpm=+document.getElementById("bpm").value;
 tick();timer=setInterval(tick,60000/bpm/4);
}
function stop(){playing=false;clearInterval(timer);document.getElementById("state").textContent="Stopped";document.querySelectorAll(".current").forEach(x=>x.classList.remove("current"))}
document.getElementById("play").onclick=start;
document.getElementById("stop").onclick=stop;
document.getElementById("clear").onclick=()=>{pattern.forEach(r=>r.fill(false));drawGrid()};
document.getElementById("random").onclick=()=>{pattern.forEach(row=>row.forEach((_,i)=>row[i]=Math.random()>.72));drawGrid()};
document.getElementById("bpm").oninput=e=>document.getElementById("bpmVal").textContent=e.target.value;

const notes=[
["C4",261.63],["D4",293.66],["E4",329.63],["F4",349.23],["G4",392],["A4",440],["B4",493.88],
["C5",523.25],["D5",587.33],["E5",659.25],["F5",698.46],["G5",783.99],["A5",880],["B5",987.77]
];
const keys=document.getElementById("keys");
notes.forEach(([n,f],i)=>{const k=document.createElement("button");k.className="key";k.textContent=n;
k.onpointerdown=()=>{audio();synth(f,.55,"triangle",.18,-4);synth(f*2,.28,"sine",.035,4);k.classList.add("active")};
k.onpointerup=()=>k.classList.remove("active");k.onpointerleave=()=>k.classList.remove("active");keys.append(k)});

const padNames=["808 Bass","Lead","Chord","Kick","Snare","Clap","Hat","FX","Pluck","Bell","Tom","Rise","Drop","Vocal","Noise","Hit"];
const pads=document.getElementById("pads");
pads.innerHTML="";
padNames.forEach((n,i)=>{const p=document.createElement("button");p.className="pad";p.textContent=n;
p.onclick=()=>{
 audio();p.classList.add("hit");setTimeout(()=>p.classList.remove("hit"),100);
 if(i===3)kick();else if(i===4)snare();else if(i===5)clap();else if(i===6)hat();
 else if(i===0)synth(55,.7,"sine",.32);
 else if(i===1)synth(220*Math.pow(2,(i%5)/12),.35,"sawtooth",.13);
 else if(i===2){[261.63,329.63,392].forEach(f=>synth(f,.65,"triangle",.055))}
 else if(i===8)synth(440,.4,"triangle",.12);
 else if(i===9)synth(880,.55,"sine",.09);
 else if(i===10)synth(150,.2,"sine",.16);
 else if(i===11){synth(330,.5,"sawtooth",.08);synth(660,.7,"sawtooth",.05)}
 else if(i===12){synth(65,.9,"sine",.25);noiseHit(.35,.16,1800,700)}
 else noiseHit(.25,.12,5000,900);
};pads.append(p)});

document.querySelectorAll(".sound").forEach(b=>b.onclick=()=>drum(b.dataset.type));
document.getElementById("fullscreen").onclick=()=>document.documentElement.requestFullscreen?.();

document.getElementById("save").onclick=()=>{
 localStorage.musicStudio=JSON.stringify({pattern,bpm:document.getElementById("bpm").value});
 document.getElementById("state").textContent="Project saved";
};
const saved=localStorage.musicStudio;
if(saved){try{const s=JSON.parse(saved);s.pattern.forEach((r,i)=>r.forEach((v,j)=>pattern[i][j]=v));document.getElementById("bpm").value=s.bpm;document.getElementById("bpmVal").textContent=s.bpm;drawGrid()}catch{}}

document.getElementById("audio").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 document.getElementById("audioName").textContent=file.name;
 audio();
 try{
   importedBuffer=await ctx.decodeAudioData(await file.arrayBuffer());
   document.getElementById("audioName").textContent=file.name+" • Ready";
   document.getElementById("state").textContent="Audio loaded";
 }catch{document.getElementById("state").textContent="Audio format not supported"}
};
function playImported(){
 if(!importedBuffer)return;
 audio();const s=ctx.createBufferSource();s.buffer=importedBuffer;s.connect(master);s.start();
}
document.getElementById("audioName")?.addEventListener("dblclick",playImported);

document.getElementById("export").onclick=()=>{
 const data=JSON.stringify({name:"Rohans Music Studio",bpm:+document.getElementById("bpm").value,pattern});
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));a.download="rohan-music-project.json";a.click();
};

const cv=document.getElementById("visualizer"),cx=cv.getContext("2d");
function vis(){
 cv.width=cv.clientWidth*devicePixelRatio;cv.height=70*devicePixelRatio;cx.clearRect(0,0,cv.width,cv.height);
 cx.beginPath();for(let x=0;x<cv.width;x+=6){let y=35+Math.sin(x*.018+Date.now()/250)*12*(playing?1:.25)+Math.sin(x*.051+Date.now()/430)*5;cx.lineTo(x,y)}
 cx.strokeStyle="#ffb000";cx.lineWidth=2*devicePixelRatio;cx.stroke();requestAnimationFrame(vis)
}vis();

const map={a:261.63,s:293.66,d:329.63,f:349.23,g:392,h:440,j:493.88,k:523.25,l:587.33};
document.onkeydown=e=>{if(map[e.key]&&!e.repeat){audio();synth(map[e.key],.42,"triangle",.16)}};

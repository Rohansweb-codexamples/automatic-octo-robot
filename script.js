import { SplendidGrandPiano, DrumMachine } from "https://unpkg.com/smplr/dist/index.mjs";

const AC=window.AudioContext||window.webkitAudioContext;
let ctx,master,compressor,playing=false,step=0,timer,importedBuffer=null,piano,drums;
let instrumentsReady=false;

const tracks=["Kick","Snare","Hi-Hat","Clap"];
const pattern=tracks.map(()=>Array(16).fill(false));
[0,4,8,12].forEach(i=>pattern[0][i]=true);
[4,12].forEach(i=>pattern[1][i]=true);
for(let i=0;i<16;i+=2)pattern[2][i]=true;
[4,12].forEach(i=>pattern[3][i]=true);

async function audio(){
  if(!ctx){
    ctx=new AC();
    compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-10;
    compressor.knee.value=18;
    compressor.ratio.value=4;
    compressor.attack.value=.003;
    compressor.release.value=.15;
    master=ctx.createGain();
    master.gain.value=.82;
    master.connect(compressor).connect(ctx.destination);

    piano=SplendidGrandPiano(ctx,{velocity:105,volume:105});
    drums=DrumMachine(ctx,{instrument:"TR-808",volume:112});
    document.getElementById("state").textContent="Loading real V1 sounds...";
    try{
      await Promise.all([piano.ready,drums.ready]);
      instrumentsReady=true;
      document.getElementById("state").textContent="V1 real samples ready";
    }catch(err){
      console.error(err);
      document.getElementById("state").textContent="Sample loading failed";
    }
  }
  if(ctx.state==="suspended")await ctx.resume();
}

function playDrum(type){
  if(!drums||!instrumentsReady)return;
  const names={kick:"kick",snare:"snare", "hi-hat":"closed-hihat",clap:"clap"};
  const note=names[type]||type;
  try{drums.start({note,velocity:112});}
  catch(e){
    try{drums.start(note);}
    catch(err){console.warn("Drum sample unavailable:",note,err);}
  }
}

function drum(t){playDrum(t)}

function drawGrid(){
 const grid=document.getElementById("grid");grid.innerHTML="";
 tracks.forEach((name,r)=>{
   const row=document.createElement("div");row.className="row";
   const lab=document.createElement("label");lab.textContent=name;row.append(lab);
   for(let c=0;c<16;c++){
     const b=document.createElement("button");
     b.className="step"+(pattern[r][c]?" on":"");
     b.onclick=async()=>{await audio();pattern[r][c]=!pattern[r][c];b.classList.toggle("on");if(pattern[r][c])playDrum(tracks[r].toLowerCase())};
     row.append(b);
   }
   grid.append(row);
 });
}
drawGrid();

function tick(){
 document.querySelectorAll(".step").forEach((x,i)=>x.classList.toggle("current",i%16===step));
 pattern.forEach((row,i)=>{if(row[step])playDrum(tracks[i].toLowerCase())});
 step=(step+1)%16;
}

async function start(){
 await audio();
 if(!instrumentsReady)return;
 if(playing)return;
 playing=true;step=0;
 document.getElementById("state").textContent="Playing V1";
 const bpm=+document.getElementById("bpm").value;
 tick();
 timer=setInterval(tick,60000/bpm/4);
}
function stop(){
 playing=false;
 clearInterval(timer);
 document.getElementById("state").textContent=instrumentsReady?"Stopped":"Ready";
 document.querySelectorAll(".current").forEach(x=>x.classList.remove("current"));
}

document.getElementById("play").onclick=start;
document.getElementById("stop").onclick=stop;
document.getElementById("clear").onclick=()=>{
 pattern.forEach(r=>r.fill(false));
 drawGrid();
};
document.getElementById("random").onclick=()=>{
 pattern.forEach((row,r)=>row.forEach((_,i)=>row[i]=Math.random()>(r===2?.55:.72)));
 drawGrid();
};
document.getElementById("bpm").oninput=e=>document.getElementById("bpmVal").textContent=e.target.value;

const notes=[
"C4","D4","E4","F4","G4","A4","B4",
"C5","D5","E5","F5","G5","A5","B5"
];
const keys=document.getElementById("keys");
notes.forEach(n=>{
 const k=document.createElement("button");
 k.className="key";
 k.textContent=n;
 const down=async()=>{
   await audio();
   if(!piano||!instrumentsReady)return;
   piano.start({note:n,velocity:112,duration:.9});
   k.classList.add("active");
 };
 k.onpointerdown=down;
 k.onpointerup=()=>k.classList.remove("active");
 k.onpointerleave=()=>k.classList.remove("active");
 keys.append(k);
});

const padNames=["808 Bass","Grand Piano","Chord","Kick","Snare","Clap","Hat","Open Hat","Pluck","Bell","Tom","Rise","Drop","Piano Hit","Noise","808 Hit"];
const pads=document.getElementById("pads");
pads.innerHTML="";
const padActions=[
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"C2",velocity:118,duration:1.2});},
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"C4",velocity:115,duration:.9});},
 async()=>{await audio();if(piano&&instrumentsReady)["C4","E4","G4"].forEach((n,i)=>piano.start({note:n,velocity:95,time:ctx.currentTime+i*.025,duration:1.1}));},
 async()=>{await audio();playDrum("kick");},
 async()=>{await audio();playDrum("snare");},
 async()=>{await audio();playDrum("clap");},
 async()=>{await audio();playDrum("hi-hat");},
 async()=>{await audio();try{drums.start({note:"open-hihat",velocity:110});}catch{}},
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"E5",velocity:100,duration:.5});},
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"C6",velocity:105,duration:.7});},
 async()=>{await audio();try{drums.start({note:"tom-high",velocity:110});}catch{}},
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"G5",velocity:100,duration:1.2});},
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"C2",velocity:118,duration:1.5});},
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"C5",velocity:118,duration:.8});},
 async()=>{await audio();try{drums.start({note:"shaker",velocity:105});}catch{}},
 async()=>{await audio();if(piano&&instrumentsReady)piano.start({note:"C1",velocity:120,duration:1.8});}
];

padNames.forEach((n,i)=>{
 const p=document.createElement("button");
 p.className="pad";
 p.textContent=n;
 p.onclick=async()=>{
   p.classList.add("hit");
   setTimeout(()=>p.classList.remove("hit"),120);
   await padActions[i]();
 };
 pads.append(p);
});

document.querySelectorAll(".sound").forEach(b=>b.onclick=async()=>{await audio();playDrum(b.dataset.type)});

document.getElementById("fullscreen").onclick=()=>document.documentElement.requestFullscreen?.();

document.getElementById("save").onclick=()=>{
 localStorage.musicStudio=JSON.stringify({pattern,bpm:document.getElementById("bpm").value});
 document.getElementById("state").textContent="V1 project saved";
};

const saved=localStorage.musicStudio;
if(saved){
 try{
   const s=JSON.parse(saved);
   s.pattern.forEach((r,i)=>r.forEach((v,j)=>pattern[i][j]=v));
   document.getElementById("bpm").value=s.bpm;
   document.getElementById("bpmVal").textContent=s.bpm;
   drawGrid();
 }catch{}
}

document.getElementById("audio").onchange=async e=>{
 const file=e.target.files[0];
 if(!file)return;
 document.getElementById("audioName").textContent=file.name+" • Loading";
 await audio();
 try{
   importedBuffer=await ctx.decodeAudioData(await file.arrayBuffer());
   document.getElementById("audioName").textContent=file.name+" • Ready";
   document.getElementById("state").textContent="Audio loaded";
 }catch{
   document.getElementById("state").textContent="Audio format not supported";
 }
};

function playImported(){
 if(!importedBuffer||!ctx)return;
 const s=ctx.createBufferSource();
 s.buffer=importedBuffer;
 s.connect(master);
 s.start();
}
document.getElementById("audioName")?.addEventListener("dblclick",playImported);

document.getElementById("export").onclick=()=>{
 const data=JSON.stringify({name:"Rohans Music Studio V1",bpm:+document.getElementById("bpm").value,pattern});
 const a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));
 a.download="rohan-music-project-v1.json";
 a.click();
};

const cv=document.getElementById("visualizer"),cx=cv.getContext("2d");
function vis(){
 cv.width=cv.clientWidth*devicePixelRatio;
 cv.height=70*devicePixelRatio;
 cx.clearRect(0,0,cv.width,cv.height);
 cx.beginPath();
 for(let x=0;x<cv.width;x+=6){
   let y=35+Math.sin(x*.018+Date.now()/250)*12*(playing?1:.25)+Math.sin(x*.051+Date.now()/430)*5;
   cx.lineTo(x,y);
 }
 cx.strokeStyle="#ffb000";
 cx.lineWidth=2*devicePixelRatio;
 cx.stroke();
 requestAnimationFrame(vis);
}
vis();

const map={a:"C4",s:"D4",d:"E4",f:"F4",g:"G4",h:"A4",j:"B4",k:"C5",l:"D5"};
document.onkeydown=async e=>{
 if(map[e.key]&&!e.repeat){
   await audio();
   if(piano&&instrumentsReady)piano.start({note:map[e.key],velocity:112,duration:.8});
 }
};


const COURSE=[
{id:1,title:"Begrüßungen",desc:"Hallo sagen und höflich reagieren",icon:"👋",lessons:[
 {type:"choice",prompt:"Was bedeutet „Bok“?",answer:"Hallo",options:["Hallo","Danke","Bitte","Gute Nacht"],hr:"Bok"},
 {type:"choice",prompt:"Wie sagt man „Danke“?",answer:"Hvala",options:["Molim","Hvala","Dobro","Bok"],hr:"Hvala"},
 {type:"input",prompt:"Übersetze: Guten Tag",answer:"Dobar dan",hr:"Dobar dan"},
 {type:"choice",prompt:"Was bedeutet „Doviđenja“?",answer:"Auf Wiedersehen",options:["Guten Morgen","Auf Wiedersehen","Entschuldigung","Willkommen"],hr:"Doviđenja"}
]},
{id:2,title:"Zahlen & Alltag",desc:"Zahlen, Zeit und kleine Angaben",icon:"🔢",lessons:[
 {type:"choice",prompt:"Was bedeutet „jedan“?",answer:"eins",options:["eins","zwei","drei","fünf"],hr:"jedan"},
 {type:"input",prompt:"Übersetze: zwei",answer:"dva",hr:"dva"},
 {type:"choice",prompt:"Welche Zahl ist „četiri“?",answer:"vier",options:["zwei","drei","vier","fünf"],hr:"četiri"},
 {type:"input",prompt:"Übersetze: heute",answer:"danas",hr:"danas"}
]},
{id:3,title:"Im Café",desc:"Getränke bestellen und bezahlen",icon:"☕",lessons:[
 {type:"choice",prompt:"Was bedeutet „voda“?",answer:"Wasser",options:["Wasser","Kaffee","Milch","Saft"],hr:"voda"},
 {type:"input",prompt:"Übersetze: Einen Kaffee, bitte.",answer:"Jednu kavu, molim",hr:"Jednu kavu, molim"},
 {type:"choice",prompt:"Was bedeutet „račun“?",answer:"Rechnung",options:["Tisch","Speisekarte","Rechnung","Tasse"],hr:"račun"},
 {type:"input",prompt:"Übersetze: Danke schön",answer:"Hvala lijepa",hr:"Hvala lijepa"}
]},
{id:4,title:"Unterwegs",desc:"Nach Orten und Wegen fragen",icon:"🧭",lessons:[
 {type:"choice",prompt:"Was bedeutet „Gdje je…?“",answer:"Wo ist…?",options:["Wie heißt…?","Wo ist…?","Wann kommt…?","Wie viel kostet…?"],hr:"Gdje je"},
 {type:"input",prompt:"Übersetze: Wo ist der Bahnhof?",answer:"Gdje je kolodvor",hr:"Gdje je kolodvor"},
 {type:"choice",prompt:"Was bedeutet „lijevo“?",answer:"links",options:["rechts","geradeaus","links","zurück"],hr:"lijevo"},
 {type:"input",prompt:"Übersetze: rechts",answer:"desno",hr:"desno"}
]},
{id:5,title:"Erste Gespräche",desc:"Dich vorstellen und Fragen stellen",icon:"💬",lessons:[
 {type:"choice",prompt:"Was bedeutet „Kako si?“",answer:"Wie geht es dir?",options:["Wie heißt du?","Wie geht es dir?","Wo wohnst du?","Was machst du?"],hr:"Kako si"},
 {type:"input",prompt:"Übersetze: Mir geht es gut.",answer:"Dobro sam",hr:"Dobro sam"},
 {type:"choice",prompt:"Was bedeutet „Zovem se Ana“?",answer:"Ich heiße Ana",options:["Ich sehe Ana","Ich heiße Ana","Ich kenne Ana","Ich suche Ana"],hr:"Zovem se Ana"},
 {type:"input",prompt:"Übersetze: Ich komme aus Deutschland.",answer:"Dolazim iz Njemačke",hr:"Dolazim iz Njemačke"}
]}
];

const DEFAULT={xp:0,hearts:5,streak:1,completed:[],unlocked:1,mistakes:{},correct:0,total:0,dailyXp:0,lastDay:""};
let state=load();
let unit=null,queue=[],idx=0,selected="",checked=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function load(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem("korak-v2"))}}catch{return {...DEFAULT}}}
function save(){localStorage.setItem("korak-v2",JSON.stringify(state))}
function norm(s){return String(s).trim().toLocaleLowerCase("hr").replace(/[.!?,]/g,"").replace(/\s+/g," ")}
function today(){return new Date().toISOString().slice(0,10)}
function initDay(){if(state.lastDay!==today()){state.dailyXp=0;state.lastDay=today();save()}}

function nav(id){
 $$(".view").forEach(v=>v.classList.toggle("active",v.id===id));
 $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.nav===id));
 if(id==="review")renderReview();
 if(id==="profile")renderProfile();
 scrollTo({top:0,behavior:"smooth"});
}
$$("[data-nav]").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.nav)));

function renderHome(){
 $("#xp").textContent=state.xp; $("#hearts").textContent=state.hearts; $("#streak").textContent=state.streak;
 $("#dailyXp").textContent=state.dailyXp;
 const p=Math.min(100,Math.round(state.dailyXp/40*100));
 $("#dailyPercent").textContent=p+"%"; $("#dailyRing").style.setProperty("--p",p);
 const path=$("#path"); path.innerHTML="";
 COURSE.forEach(u=>{
  const locked=u.id>state.unlocked, done=state.completed.includes(u.id);
  const prog=done?100:0;
  const a=document.createElement("article"); a.className="unit"+(locked?" locked":"");
  a.innerHTML=`<div class="unit-head"><div><span class="unit-icon">${done?"✅":u.icon}</span><span><h3>Einheit ${u.id}: ${u.title}</h3><p>${u.desc}</p></span></div><button ${locked?"disabled":""}>${locked?"Gesperrt":done?"Nochmal":"Starten"}</button></div><div class="unit-progress"><div style="width:${prog}%"></div></div>`;
  a.querySelector("button").addEventListener("click",()=>startLesson(u.id));
  path.appendChild(a);
 });
}

function startLesson(id,reviewOnly=false){
 unit=COURSE.find(x=>x.id===id)||COURSE[0];
 state.hearts=5;
 queue=reviewOnly
   ? Object.keys(state.mistakes).map(k=>findQuestion(k)).filter(Boolean)
   : unit.lessons.map((q,i)=>({...q,key:`${unit.id}-${i}`,repeat:0}));
 if(!queue.length){nav("review");return}
 idx=0; nav("lesson"); renderQuestion(); renderHome();
}
function findQuestion(key){
 const [uid,qi]=key.split("-").map(Number),u=COURSE.find(x=>x.id===uid),q=u?.lessons[qi];
 return q?{...q,key,repeat:0}:null;
}
function renderQuestion(){
 if(idx>=queue.length){finish();return}
 const q=queue[idx]; selected=""; checked=false;
 $("#lessonHearts").textContent=state.hearts;
 $("#lessonProgress").style.width=`${idx/queue.length*100}%`;
 $("#exerciseType").textContent=q.type==="choice"?"Wähle die richtige Antwort":"Schreibe die Übersetzung";
 $("#prompt").textContent=q.prompt;
 $("#answers").innerHTML="";
 $("#feedback").className="feedback hidden";
 $("#checkAnswer").classList.remove("hidden"); $("#nextAnswer").classList.add("hidden"); $("#checkAnswer").disabled=true;
 const sp=$("#speakBtn"); sp.classList.toggle("hidden",!q.hr); sp.onclick=()=>speak(q.hr);
 if(q.type==="choice"){
  q.options.forEach(o=>{const b=document.createElement("button");b.className="choice";b.textContent=o;b.onclick=()=>{if(checked)return;selected=o;$$(".choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("#checkAnswer").disabled=false};$("#answers").appendChild(b)})
 }else{
  const i=document.createElement("input");i.className="text-input";i.placeholder="Antwort eingeben";i.autocomplete="off";i.oninput=()=>{selected=i.value;$("#checkAnswer").disabled=!norm(selected)};i.onkeydown=e=>{if(e.key==="Enter"&&!$("#checkAnswer").disabled)check()};$("#answers").appendChild(i);setTimeout(()=>i.focus(),80)
 }
}
function check(){
 if(checked)return; checked=true;
 const q=queue[idx],ok=norm(selected)===norm(q.answer); state.total++;
 $("#checkAnswer").classList.add("hidden");$("#nextAnswer").classList.remove("hidden");
 if(ok){
  state.correct++; state.xp+=10; state.dailyXp+=10; delete state.mistakes[q.key];
  $("#feedback").className="feedback ok"; $("#feedback").textContent="Richtig! +10 XP";
 }else{
  state.hearts=Math.max(0,state.hearts-1); state.mistakes[q.key]=(state.mistakes[q.key]||0)+1;
  $("#feedback").className="feedback no"; $("#feedback").textContent=`Richtig wäre: ${q.answer}`;
  if((q.repeat||0)<2)queue.push({...q,repeat:(q.repeat||0)+1});
 }
 $("#lessonHearts").textContent=state.hearts; save(); renderHome();
}
function finish(){
 if(unit && !state.completed.includes(unit.id)){state.completed.push(unit.id);state.xp+=25;state.dailyXp+=25}
 if(unit)state.unlocked=Math.min(COURSE.length,Math.max(state.unlocked,unit.id+1));
 save(); renderHome(); nav("home");
 setTimeout(()=>alert("Lektion geschafft! +25 Bonus-XP 🎉"),50);
}
function speak(text){
 if(!("speechSynthesis" in window))return alert("Sprachausgabe wird auf diesem Gerät nicht unterstützt.");
 speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang="hr-HR";u.rate=.82;speechSynthesis.speak(u);
}
function renderReview(){
 const box=$("#reviewList"),keys=Object.keys(state.mistakes);
 if(!keys.length){box.innerHTML=`<div class="review-empty"><h3>Alles geschafft 🎉</h3><p>Aktuell gibt es keine schwierigen Wörter.</p></div>`;return}
 box.innerHTML=`<button id="startReview" class="primary" style="margin-top:20px">Alle wiederholen</button>`;
 $("#startReview").onclick=()=>startLesson(1,true);
 keys.forEach(k=>{const q=findQuestion(k);if(!q)return;const d=document.createElement("div");d.className="review-item";d.innerHTML=`<div><b>${q.hr||q.answer}</b><small>${q.answer} · ${state.mistakes[k]} Fehler</small></div><button>🔊</button>`;d.querySelector("button").onclick=()=>speak(q.hr||q.answer);box.appendChild(d)})
}
function renderProfile(){
 $("#profileXp").textContent=state.xp;$("#profileLessons").textContent=state.completed.length;
 $("#accuracy").textContent=state.total?Math.round(state.correct/state.total*100)+"%":"–";
 $("#learnedWords").textContent=state.completed.reduce((n,id)=>n+(COURSE.find(x=>x.id===id)?.lessons.length||0),0);
}
$("#checkAnswer").onclick=check;$("#nextAnswer").onclick=()=>{idx++;renderQuestion()};
$("#closeLesson").onclick=()=>{if(confirm("Lektion wirklich verlassen?"))nav("home")};
$("#resetProgress").onclick=()=>{if(confirm("Gesamten Fortschritt zurücksetzen?")){state={...DEFAULT,lastDay:today()};save();renderHome();renderProfile()}};
initDay();renderHome();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));

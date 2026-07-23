
const COURSE=window.COURSE_DATA,KEY="korak-a1-v3",DAY=86400000,INTERVALS=[0,1,3,7,14,30,60,90];
let state=load(),active=null,queue=[],pos=0,answer="",checked=false,reviewMode=false;
const $=s=>document.querySelector(s);

const SITUATIONS={
1:[
 {prompt:"Jemand sagt morgens zu dir: „Dobro jutro!“ Was antwortest du?",answer:"Dobro jutro!",options:["Dobro jutro!","Laku noć!","Hvala!","Doviđenja!"],spoken:"Dobro jutro"},
 {prompt:"Du verabschiedest dich und möchtest „Bis bald“ sagen.",answer:"Vidimo se!",options:["Vidimo se!","Kako si?","Dobar dan!","Molim!"],spoken:"Vidimo se"},
 {prompt:"Jemand fragt: „Kako si?“ Was ist eine passende Antwort?",answer:"Dobro sam, hvala.",options:["Dobro sam, hvala.","Doviđenja.","Laku noć.","Zovem se Ana."],spoken:"Dobro sam, hvala"}
],
2:[
 {prompt:"Jemand bedankt sich mit „Hvala“. Was antwortest du?",answer:"Nema na čemu.",options:["Nema na čemu.","Žao mi je.","Dobra večer.","Ne razumijem."],spoken:"Nema na čemu"},
 {prompt:"Du möchtest höflich um Entschuldigung bitten.",answer:"Oprostite.",options:["Oprostite.","Hvala lijepa.","U redu.","Bok."],spoken:"Oprostite"},
 {prompt:"Jemand sagt „Žao mi je“. Welche Antwort passt?",answer:"U redu.",options:["U redu.","Dobar tek.","Koliko košta?","Vidimo se."],spoken:"U redu"}
],
3:[
 {prompt:"Jemand fragt: „Kako se zoveš?“ Was antwortest du?",answer:"Zovem se Ana.",options:["Zovem se Ana.","Odakle si?","Govorim njemački.","Dobar dan."],spoken:"Zovem se Ana"},
 {prompt:"Jemand sagt: „Drago mi je.“ Welche Antwort passt?",answer:"I meni je drago.",options:["I meni je drago.","Ne razumijem.","Jednu kavu, molim.","Laku noć."],spoken:"I meni je drago"},
 {prompt:"Jemand fragt: „Odakle si?“ Was antwortest du?",answer:"Dolazim iz Njemačke.",options:["Dolazim iz Njemačke.","Živim u Berlinu.","Kako se zoveš?","Hvala lijepa."],spoken:"Dolazim iz Njemačke"}
],
4:[
 {prompt:"Du hast einen Satz nicht verstanden. Was sagst du?",answer:"Ne razumijem.",options:["Ne razumijem.","Razumijem.","Dobro sam.","Dobar tek."],spoken:"Ne razumijem"},
 {prompt:"Die Person spricht zu schnell. Was bittest du?",answer:"Govorite sporije, molim.",options:["Govorite sporije, molim.","Govorite li engleski?","Kako se kaže...?","Odakle si?"],spoken:"Govorite sporije, molim"},
 {prompt:"Du möchtest wissen, was ein Wort bedeutet.",answer:"Što to znači?",options:["Što to znači?","Kako si?","Koliko košta?","Kada stiže?"],spoken:"Što to znači"}
],
5:[
 {prompt:"Du möchtest zwei Kaffee bestellen. Welche Zahl brauchst du?",answer:"dva",options:["dva","tri","pet","osam"],spoken:"dva"},
 {prompt:"Ihr seid vier Personen. Welche Zahl passt?",answer:"četiri",options:["četiri","jedan","šest","sedam"],spoken:"četiri"}
],
6:[
 {prompt:"Etwas kostet zwanzig Euro. Welche Zahl hörst du?",answer:"dvadeset",options:["dvadeset","dvanaest","trideset","deset"],spoken:"dvadeset"},
 {prompt:"Du möchtest die Zahl hundert sagen.",answer:"sto",options:["sto","tisuća","devet","jedanaest"],spoken:"sto"}
],
7:[
 {prompt:"Du möchtest fragen, wie spät es ist.",answer:"Koliko je sati?",options:["Koliko je sati?","Kada stiže?","Kakvo je vrijeme?","Koliko košta?"],spoken:"Koliko je sati"},
 {prompt:"Es ist 2:30 Uhr. Was sagst du?",answer:"pola tri",options:["pola tri","dva sata","jedan sat","ponoć"],spoken:"pola tri"}
],
8:[
 {prompt:"Heute ist Freitag, morgen ist ...",answer:"subota",options:["subota","četvrtak","nedjelja","utorak"],spoken:"subota"},
 {prompt:"Welcher Tag kommt nach Sonntag?",answer:"ponedjeljak",options:["ponedjeljak","petak","srijeda","subota"],spoken:"ponedjeljak"}
],
9:[
 {prompt:"Du sprichst über deine Mutter und deinen Vater zusammen.",answer:"roditelji",options:["roditelji","obitelj","sestra","brat"],spoken:"roditelji"},
 {prompt:"Du möchtest „meine Schwester“ erwähnen. Welches Wort brauchst du?",answer:"sestra",options:["sestra","majka","kći","sin"],spoken:"sestra"}
],
10:[
 {prompt:"Du möchtest eine Suppe bestellen.",answer:"juha",options:["juha","salata","riža","jaje"],spoken:"juha"},
 {prompt:"Du isst kein Fleisch, aber Fisch. Welches Wort bedeutet Fisch?",answer:"riba",options:["riba","meso","sir","kruh"],spoken:"riba"}
],
11:[
 {prompt:"Du möchtest eine Tomate kaufen.",answer:"rajčica",options:["rajčica","mrkva","naranča","jabuka"],spoken:"rajčica"},
 {prompt:"Welches Wort brauchst du für Kartoffel?",answer:"krumpir",options:["krumpir","grožđe","luk","banana"],spoken:"krumpir"}
],
12:[
 {prompt:"Im Café möchtest du höflich einen Kaffee bestellen.",answer:"Jednu kavu, molim.",options:["Jednu kavu, molim.","Račun, molim.","Trebam pomoć.","Dobar tek."],spoken:"Jednu kavu, molim"},
 {prompt:"Du hast Durst und möchtest Wasser.",answer:"Vodu, molim.",options:["Vodu, molim.","Kavu, molim.","Mlijeko je.","Hvala lijepa."],spoken:"Vodu, molim"}
],
13:[
 {prompt:"Der Kellner fragt, was du möchtest. Wie beginnst du deine Bestellung?",answer:"Želio bih naručiti.",options:["Želio bih naručiti.","Račun, molim.","Što to znači?","Gdje je hotel?"],spoken:"Želio bih naručiti"},
 {prompt:"Du möchtest wissen, was der Kellner empfiehlt.",answer:"Što preporučujete?",options:["Što preporučujete?","Je li ovo ljuto?","Koliko je sati?","Kada polazi?"],spoken:"Što preporučujete"},
 {prompt:"Nach dem Essen möchtest du sagen, dass es lecker ist.",answer:"Ukusno je.",options:["Ukusno je.","Otvoreno je.","Hladno je.","Preskupo je."],spoken:"Ukusno je"}
],
14:[
 {prompt:"Du möchtest im Restaurant bezahlen.",answer:"Račun, molim.",options:["Račun, molim.","Jelovnik, molim.","Jednu kartu, molim.","Pomoć!"],spoken:"Račun, molim"},
 {prompt:"Du möchtest mit Karte zahlen.",answer:"Mogu li platiti karticom?",options:["Mogu li platiti karticom?","Plaćam gotovinom.","Koliko traje vožnja?","Imam rezervaciju."],spoken:"Mogu li platiti karticom"},
 {prompt:"Du bekommst ein Gericht, das du nicht bestellt hast.",answer:"Ovo nisam naručio.",options:["Ovo nisam naručio.","Sve je bilo odlično.","Dobar tek.","Bez mesa, molim."],spoken:"Ovo nisam naručio"}
],
15:[
 {prompt:"Du findest etwas zu teuer und fragst nach einem Rabatt.",answer:"Imate li popust?",options:["Imate li popust?","Trebam liječnika.","Gdje je kolodvor?","Kada stiže?"],spoken:"Imate li popust"},
 {prompt:"Du brauchst im Geschäft Hilfe.",answer:"Trebam pomoć.",options:["Trebam pomoć.","Plaćam gotovinom.","Vidimo se.","Dobro sam."],spoken:"Trebam pomoć"}
],
16:[
 {prompt:"An der Rezeption möchtest du sagen, dass du reserviert hast.",answer:"Imam rezervaciju.",options:["Imam rezervaciju.","Gdje je centar?","Jednu kavu, molim.","Ne razumijem."],spoken:"Imam rezervaciju"},
 {prompt:"Du suchst dein Hotelzimmer.",answer:"Gdje je moja soba?",options:["Gdje je moja soba?","Gdje je kolodvor?","Koliko košta?","Kako si?"],spoken:"Gdje je moja soba"}
],
17:[
 {prompt:"Jemand erklärt dir: zuerst geradeaus, dann links. Was bedeutet „lijevo“?",answer:"links",options:["links","rechts","geradeaus","zurück"],spoken:"lijevo"},
 {prompt:"Du möchtest nach dem Bahnhof fragen.",answer:"Gdje je kolodvor?",options:["Gdje je kolodvor?","Kada polazi?","Koliko košta?","Kakvo je vrijeme?"],spoken:"Gdje je kolodvor"}
],
18:[
 {prompt:"Am Schalter möchtest du eine Fahrkarte kaufen.",answer:"Jednu kartu, molim.",options:["Jednu kartu, molim.","Jednu kavu, molim.","Račun, molim.","Jelovnik, molim."],spoken:"Jednu kartu, molim"},
 {prompt:"Du möchtest wissen, wann der Zug abfährt.",answer:"Kada polazi?",options:["Kada polazi?","Kada stiže?","Koliko košta?","Gdje je kolodvor?"],spoken:"Kada polazi"}
],
19:[
 {prompt:"Draußen scheint die Sonne. Wie beschreibst du das Wetter?",answer:"Sunčano je.",options:["Sunčano je.","Oblačno je.","Hladno je.","Kiša je."],spoken:"Sunčano je"},
 {prompt:"Du möchtest nach dem Wetter fragen.",answer:"Kakvo je vrijeme?",options:["Kakvo je vrijeme?","Koliko je sati?","Kako si?","Kada stiže?"],spoken:"Kakvo je vrijeme"}
],
20:[
 {prompt:"Du hast starke Kopfschmerzen. Was sagst du beim Arzt?",answer:"Boli me glava.",options:["Boli me glava.","Boli me trbuh.","Imam rezervaciju.","Ne razumijem."],spoken:"Boli me glava"},
 {prompt:"Du brauchst dringend einen Arzt.",answer:"Trebam liječnika.",options:["Trebam liječnika.","Trebam pomoć u trgovini.","Račun, molim.","Gdje je centar?"],spoken:"Trebam liječnika"}
]
};

function load(){try{return Object.assign({xp:0,streak:1,bestStreak:1,completed:[],unlocked:1,items:{},lastStudy:null,total:0,correct:0,lastLesson:1},JSON.parse(localStorage.getItem(KEY)))}catch{return {xp:0,streak:1,bestStreak:1,completed:[],unlocked:1,items:{},lastStudy:null,total:0,correct:0,lastLesson:1}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function show(id){
 ["dashboard","course","lesson","done"].forEach(v=>$("#"+v).classList.toggle("active",v===id));
 document.querySelectorAll(".bottomNav [data-screen]").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));
 if(id==="dashboard")renderDashboard();
 if(id==="course")renderHome();
 scrollTo(0,0)
}
function norm(s){return String(s).trim().toLocaleLowerCase("hr").replace(/[.!?,]/g,"").replace(/\s+/g," ")}
function key(l,i){return l+"-"+i}
function st(k){return state.items[k]||{box:0,due:0,seen:0,correct:0,wrong:0}}
function schedule(k,ok){let s=st(k);s.seen++;if(ok){s.correct++;s.box=Math.min(INTERVALS.length-1,s.box+1)}else{s.wrong++;s.box=Math.max(0,s.box-2)}s.due=Date.now()+INTERVALS[s.box]*DAY;state.items[k]=s}
function due(){let a=[];COURSE.forEach(l=>l.items.forEach((it,i)=>{let k=key(l.id,i),s=st(k);if(s.seen&&s.due<=Date.now())a.push({...it,key:k,lessonId:l.id})}));return a}
function renderHome(){
 $("#xp").textContent=state.xp;$("#streak").textContent=state.streak;$("#dueCount").textContent=due().length+" Wiederholungen fällig";
 let box=$("#lessons");box.innerHTML="";
 COURSE.forEach(l=>{let locked=l.id>state.unlocked,done=state.completed.includes(l.id),a=document.createElement("article");a.className="unit"+(locked?" locked":"");
 a.innerHTML=`<div class="unitHead"><div><h3>${l.id}. ${l.title}</h3><p>${l.description} · 22–27 Aufgaben inklusive Situationen</p></div><button ${locked?"disabled":""}>${done?"Wiederholen":"Starten"}</button></div><div class="progress"><div style="width:${done?100:0}%"></div></div>`;
 a.querySelector("button").onclick=()=>startLesson(l.id);box.appendChild(a)})
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function distract(cur,field){return shuffle([...new Set(COURSE.flatMap(l=>l.items.map(x=>x[field])).filter(x=>x!==cur))]).slice(0,3)}
function make(l){
 let e=[];
 l.items.forEach((it,i)=>{
  let k=key(l.id,i);
  e.push({type:"choice-de",prompt:`Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:k,item:it});
  e.push({type:"input-hr",prompt:`Übersetze ins Kroatische: ${it.de}`,answer:it.hr,spoken:it.hr,key:k,item:it});
 });
 [0,2,4,6].forEach(i=>{let it=l.items[i];e.push({type:"listen",prompt:"Hören und schreiben",answer:it.hr,spoken:it.hr,key:key(l.id,i),item:it})});
 (SITUATIONS[l.id]||[]).forEach((s,i)=>e.push({type:"choice-hr",prompt:s.prompt,answer:s.answer,options:s.options,spoken:s.spoken,key:`s-${l.id}-${i}`,item:{hr:s.answer,de:s.prompt}}));
 due().slice(0,4).forEach(it=>e.push({type:"choice-de",prompt:`Wiederholung: Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:it.key,item:it}));
 return shuffle(e)
}
function startLesson(id){state.lastLesson=id;save();active=COURSE.find(l=>l.id===id);reviewMode=false;queue=make(active);pos=0;show("lesson");renderQ()}
function startReview(){
 let d=due();if(!d.length)return alert("Heute ist noch keine Wiederholung fällig.");
 active=null;reviewMode=true;queue=shuffle(d.flatMap(it=>[
  {type:"choice-de",prompt:`Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:it.key,item:it},
  {type:"input-hr",prompt:`Übersetze ins Kroatische: ${it.de}`,answer:it.hr,spoken:it.hr,key:it.key,item:it}
 ]));pos=0;show("lesson");renderQ()
}
function renderQ(){
 if(pos>=queue.length)return finish();
 checked=false;answer="";let q=queue[pos];
 $("#counter").textContent=`${pos+1}/${queue.length}`;$("#bar").style.width=pos/queue.length*100+"%";
 $("#prompt").textContent=q.type==="listen"?"Tippe auf Anhören und schreibe den kroatischen Ausdruck.":q.prompt;
 $("#kind").textContent=q.type==="choice-de"?"Kroatisch verstehen":q.type==="choice-hr"?"In der Situation reagieren":q.type==="listen"?"Hören und schreiben":"Ins Kroatische übersetzen";
 $("#feedback").className="feedback hidden";$("#check").classList.remove("hidden");$("#next").classList.add("hidden");$("#check").disabled=true;
 $("#speak").onclick=()=>speak(q.spoken);
 let a=$("#answerArea");a.innerHTML="";
 if(q.type==="choice-de"||q.type==="choice-hr"){
  shuffle(q.options).forEach(o=>{let b=document.createElement("button");b.className="choice";b.textContent=o;b.onclick=()=>{if(checked)return;answer=o;[...a.children].forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("#check").disabled=false};a.appendChild(b)})
 }else{
  let i=document.createElement("input");i.className="textInput";i.placeholder="Kroatische Antwort";i.autocomplete="off";i.autocapitalize="sentences";
  i.oninput=()=>{answer=i.value;$("#check").disabled=!norm(answer)};
  i.onkeydown=e=>{if(e.key==="Enter"&&!$("#check").disabled)check()};
  a.appendChild(i);setTimeout(()=>i.focus(),50)
 }
}
function speak(t){
 if(!("speechSynthesis"in window))return;
 let u=new SpeechSynthesisUtterance(t);u.lang="hr-HR";u.rate=.78;
 let v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith("hr"));if(v)u.voice=v;
 speechSynthesis.cancel();speechSynthesis.speak(u)
}
function retryFor(q){
 if(q.type==="choice-de")return {...q,type:"input-hr",prompt:`Übersetze ins Kroatische: ${q.item.de}`,answer:q.item.hr,spoken:q.item.hr};
 if(q.type==="input-hr"||q.type==="listen")return {...q,type:"choice-hr",prompt:`Welche kroatische Antwort bedeutet „${q.item.de}“?`,answer:q.item.hr,options:[q.item.hr,...distract(q.item.hr,"hr")],spoken:q.item.hr};
 return {...q};
}
function check(){
 if(checked)return;checked=true;
 let q=queue[pos],ok=norm(answer)===norm(q.answer);state.total=(state.total||0)+1;if(ok)state.correct=(state.correct||0)+1;
 if(ok){state.xp+=8;$("#feedback").className="feedback ok";$("#feedback").textContent="Richtig! +8 XP"}
 else{$("#feedback").className="feedback no";$("#feedback").textContent=`Richtig wäre: ${q.answer}`;queue.splice(Math.min(queue.length,pos+3),0,retryFor(q))}
 schedule(q.key,ok);save();renderHome();$("#check").classList.add("hidden");$("#next").classList.remove("hidden")
}
function finish(){
 if(!reviewMode&&active){if(!state.completed.includes(active.id)){state.completed.push(active.id);state.xp+=30}state.unlocked=Math.min(COURSE.length,Math.max(state.unlocked,active.id+1))}
 save();renderHome();$("#doneText").textContent=reviewMode?"Deine fälligen Wiederholungen sind erledigt.":"Du hast Wörter verstanden, selbst übersetzt und in kurzen Situationen angewendet.";show("done")
}
$("#check").onclick=check;$("#next").onclick=()=>{pos++;renderQ()};$("#close").onclick=()=>show("course");$("#homeBtn").onclick=()=>show("dashboard");$("#reviewBtn").onclick=startReview;

function wrongItems(){
 const rows=[];
 COURSE.forEach(l=>l.items.forEach((it,i)=>{
   const k=key(l.id,i),s=st(k);
   if((s.wrong||0)>0)rows.push({...it,key:k,lessonId:l.id,wrong:s.wrong,seen:s.seen||0});
 }));
 return rows.sort((a,b)=>b.wrong-a.wrong);
}
function renderDashboard(){
 const completed=state.completed.length,total=COURSE.length,p=Math.round(completed/total*100);
 $("#xp").textContent=state.xp;$("#streak").textContent=state.streak;
 $("#progressPercent").textContent=p+"%";$("#progressRing").style.setProperty("--p",p);
 $("#doneLessons").textContent=`${completed} / ${total}`;$("#heroXp").textContent=state.xp;
 $("#heroStreak").textContent=`${state.streak} Tag${state.streak===1?"":"e"}`;
 $("#a1Progress").style.width=p+"%";$("#a1Count").textContent=`${completed} / ${total}`;
 const d=due();$("#dueQuickText").textContent=d.length+" fällig";$("#dueCountDashboard").textContent=d.length;
 $("#accuracy").textContent=state.total?Math.round((state.correct||0)/state.total*100)+"%":"–";
 $("#learnedItems").textContent=Object.values(state.items).filter(x=>(x.seen||0)>0).length;
 $("#bestStreak").textContent=`${Math.max(state.bestStreak||1,state.streak||1)} Tag${Math.max(state.bestStreak||1,state.streak||1)===1?"":"e"}`;
 const preview=$("#wrongPreview"),wrong=wrongItems().slice(0,4);preview.innerHTML="";
 if(!wrong.length){preview.innerHTML='<p class="emptyText">Noch keine häufig falsch beantworteten Begriffe.</p>'}
 else wrong.forEach(w=>{const div=document.createElement("div");div.className="wrongItem";div.innerHTML=`<div><b>${w.hr}</b><small>${w.de} · ${w.wrong} Fehler</small></div><span>›</span>`;preview.appendChild(div)})
 $("#wrongPracticeBtn").disabled=!wrong.length;
}
function startWrongPractice(){
 const wrong=wrongItems();
 if(!wrong.length)return alert("Noch keine häufig falsch beantworteten Fragen vorhanden.");
 active=null;reviewMode=true;
 queue=shuffle(wrong.flatMap(it=>[
  {type:"choice-de",prompt:`Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:it.key,item:it},
  {type:"input-hr",prompt:`Übersetze ins Kroatische: ${it.de}`,answer:it.hr,spoken:it.hr,key:it.key,item:it}
 ]));
 pos=0;show("lesson");renderQ()
}
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>show(b.dataset.screen));
$("#continueBtn").onclick=()=>startLesson(state.lastLesson||1);
$("#continueQuick").onclick=()=>startLesson(state.lastLesson||1);
$("#dueQuick").onclick=startReview;
$("#wrongQuick").onclick=startWrongPractice;
$("#wrongPracticeBtn").onclick=startWrongPractice;
$("#bottomWrong").onclick=startWrongPractice;
$("#statsQuick").onclick=()=>document.querySelector(".dashboardColumns").scrollIntoView({behavior:"smooth"});
$("#bottomStats").onclick=()=>{show("dashboard");setTimeout(()=>document.querySelector(".dashboardColumns").scrollIntoView({behavior:"smooth"}),50)};

show("dashboard");renderDashboard();renderHome();if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));

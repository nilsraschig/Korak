const DATA=window.KORAK_DATA,LESSONS=DATA.lessons,KEY="korak-v5",OLD_KEY="korak-a1-v3",DAY=86400000,INTERVALS=[0,1,3,7,14,30,60,90];
let state=load(),active=null,queue=[],pos=0,answer="",checked=false,mode="lesson";
const $=s=>document.querySelector(s),lessonById=id=>LESSONS.find(l=>l.id===id);
function defaults(){return {xp:0,streak:1,bestStreak:1,completed:[],items:{},lastStudy:null,total:0,correct:0,lastLesson:"a1-1-1",selectedLevel:"A1"}}
function load(){
 try{
  const current=JSON.parse(localStorage.getItem(KEY)||"null");
  if(current)return Object.assign(defaults(),current);
  const old=JSON.parse(localStorage.getItem(OLD_KEY)||"null");
  if(old){const s=Object.assign(defaults(),old);s.completed=(old.completed||[]).map(n=>`a1-${Math.floor((n-1)/5)+1}-${((n-1)%5)+1}`).filter(id=>lessonById(id));s.lastLesson=s.completed.at(-1)||"a1-1-1";localStorage.setItem(KEY,JSON.stringify(s));return s}
 }catch(e){}
 return defaults()
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function show(id){
 ["dashboard","course","lesson","done"].forEach(v=>$("#"+v).classList.toggle("active",v===id));
 document.querySelectorAll(".bottomNav [data-screen]").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));
 if(id==="dashboard")renderDashboard();if(id==="course")renderCourse();scrollTo(0,0)
}
function norm(s){return String(s||"").trim().toLocaleLowerCase("hr").replace(/[.!?,;:„“"']/g,"").replace(/\s+/g," ")}
function itemKey(lid,i){return `${lid}-${i}`}
function st(k){return state.items[k]||{box:0,due:0,seen:0,correct:0,wrong:0}}
function schedule(k,ok){let s=st(k);s.seen++;if(ok){s.correct++;s.box=Math.min(INTERVALS.length-1,s.box+1)}else{s.wrong++;s.box=Math.max(0,s.box-2)}s.due=Date.now()+INTERVALS[s.box]*DAY;state.items[k]=s}
function learningLessons(){return LESSONS.filter(l=>!l.isTest)}
function due(){let out=[];learningLessons().forEach(l=>l.items.forEach((it,i)=>{const k=itemKey(l.id,i),s=st(k);if(s.seen&&s.due<=Date.now())out.push({...it,key:k,lessonId:l.id})}));return out}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function pool(field){return [...new Set(learningLessons().flatMap(l=>l.items.map(x=>x[field])))]}
function distract(cur,field){return shuffle(pool(field).filter(x=>x!==cur)).slice(0,3)}
function levelLessons(level){return LESSONS.filter(l=>l.level===level)}
function chapterLessons(chapterId){return LESSONS.filter(l=>l.chapterId===chapterId&&!l.isTest)}
function chapterUnlocked(chapter,index){
 if(index===0)return true;
 const prev=DATA.levels.find(x=>x.id===chapter.level).chapters[index-1];
 return state.completed.includes(prev.testId)
}
function lessonUnlocked(lesson,chapter,index){
 if(!chapterUnlocked(chapter,index))return false;
 if(lesson.number===chapterLessons(chapter.id)[0].number)return true;
 const chapterAll=LESSONS.filter(l=>l.chapterId===chapter.id);
 const idx=chapterAll.findIndex(x=>x.id===lesson.id);
 return idx===0||state.completed.includes(chapterAll[idx-1].id)
}
function nextLesson(){
 const level=state.selectedLevel||"A1",list=levelLessons(level);
 return list.find(l=>!state.completed.includes(l.id)&&isUnlocked(l))||list[0]
}
function isUnlocked(l){
 const lev=DATA.levels.find(x=>x.id===l.level),ci=lev.chapters.findIndex(c=>c.id===l.chapterId),ch=lev.chapters[ci];
 return lessonUnlocked(l,ch,ci)
}
function renderDashboard(){
 const all=LESSONS.length,done=state.completed.filter(id=>lessonById(id)).length,p=Math.round(done/all*100);
 $("#xp").textContent=state.xp;$("#streak").textContent=state.streak;$("#progressPercent").textContent=p+"%";$("#progressRing").style.setProperty("--p",p);
 $("#doneLessons").textContent=`${done} / ${all}`;$("#heroXp").textContent=state.xp;$("#heroStreak").textContent=`${state.streak} Tag${state.streak===1?"":"e"}`;
 ["A1","A2"].forEach(level=>{const list=levelLessons(level),d=list.filter(l=>state.completed.includes(l.id)).length,lp=Math.round(d/list.length*100);$(`#${level.toLowerCase()}Progress`).style.width=lp+"%";$(`#${level.toLowerCase()}Count`).textContent=`${d} / ${list.length}`});
 document.querySelectorAll(".levelCard[data-level]").forEach(b=>b.classList.toggle("activeLevel",b.dataset.level===state.selectedLevel));
 const d=due();$("#dueQuickText").textContent=d.length+" fällig";$("#dueCountDashboard").textContent=d.length;
 $("#accuracy").textContent=state.total?Math.round((state.correct||0)/state.total*100)+"%":"–";$("#learnedItems").textContent=Object.values(state.items).filter(x=>x.seen>0).length;
 const bs=Math.max(state.bestStreak||1,state.streak||1);$("#bestStreak").textContent=`${bs} Tag${bs===1?"":"e"}`;
 const preview=$("#wrongPreview"),wrong=wrongItems().slice(0,4);preview.innerHTML=wrong.length?"":'<p>Noch keine häufig falsch beantworteten Begriffe.</p>';
 wrong.forEach(w=>{const div=document.createElement("div");div.className="wrongItem";div.innerHTML=`<div><b>${w.hr}</b><small>${w.de} · ${w.wrong} Fehler</small></div><span>›</span>`;preview.appendChild(div)});
 $("#wrongPracticeBtn").disabled=!wrong.length
}
function renderCourse(){
 const level=DATA.levels.find(x=>x.id===state.selectedLevel)||DATA.levels[0];
 $("#courseTitle").textContent=level.title;$("#courseDescription").textContent=`${level.chapters.length} Kapitel · ${levelLessons(level.id).length} Lektionen inklusive Kapiteltests`;
 $("#dueCount").textContent=due().length+" Wiederholungen fällig";
 const host=$("#chapters");host.innerHTML="";
 level.chapters.forEach((chapter,ci)=>{
  const chapterAll=LESSONS.filter(l=>l.chapterId===chapter.id),completed=chapterAll.filter(l=>state.completed.includes(l.id)).length,locked=!chapterUnlocked(chapter,ci);
  const section=document.createElement("section");section.className="chapter"+(locked?" chapterLocked":"");
  section.innerHTML=`<div class="chapterHead"><div class="chapterIcon">${chapter.icon}</div><div><p class="eyebrow">Kapitel ${ci+1}</p><h2>${chapter.title}</h2><p>${chapter.description}</p></div><strong>${completed}/${chapterAll.length}</strong></div><div class="chapterProgress"><div style="width:${Math.round(completed/chapterAll.length*100)}%"></div></div><div class="lessonList"></div>`;
  const list=section.querySelector(".lessonList");
  chapterAll.forEach(l=>{
   const unlocked=lessonUnlocked(l,chapter,ci),done=state.completed.includes(l.id),row=document.createElement("article");
   row.className="unit"+(!unlocked?" locked":"")+(l.isTest?" testUnit":"");
   row.innerHTML=`<div class="lessonSymbol">${l.isTest?"✓":chapter.icon}</div><div class="unitText"><h3>${l.title}</h3><p>${l.description}${l.isTest?" · ca. 30 gemischte Aufgaben":" · 20+ Aufgaben"}</p></div><button ${unlocked?"":"disabled"}>${done?"Wiederholen":l.isTest?"Test starten":"Starten"}</button>`;
   row.querySelector("button").onclick=()=>startLesson(l.id);list.appendChild(row)
  });
  host.appendChild(section)
 })
}
function makeNormal(l){
 let e=[];
 l.items.forEach((it,i)=>{const k=itemKey(l.id,i);e.push({type:"choice-de",prompt:`Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:k,item:it});e.push({type:"input-hr",prompt:`Übersetze ins Kroatische: ${it.de}`,answer:it.hr,spoken:it.hr,key:k,item:it})});
 [0,2,4,6].forEach(i=>{const it=l.items[i];e.push({type:"listen",prompt:"Hören und schreiben",answer:it.hr,spoken:it.hr,key:itemKey(l.id,i),item:it})});
 if(l.dialogue&&l.dialogue.length>=2){const a=l.dialogue[0][1],b=l.dialogue[1][1];e.push({type:"dialogue",prompt:`Dialog ergänzen:\nA: ${a}\nB: …`,answer:b,options:[b,...distract(b,"hr")],spoken:a,key:`dialog-${l.id}`,item:{hr:b,de:"Passende Antwort im Dialog"}})}
 due().slice(0,3).forEach(it=>e.push({type:"choice-de",prompt:`Wiederholung: Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:it.key,item:it}));
 return shuffle(e)
}
function makeTest(l){
 const source=chapterLessons(l.chapterId),items=shuffle(source.flatMap(x=>x.items.map((it,i)=>({...it,key:itemKey(x.id,i)})))).slice(0,15);
 return shuffle(items.flatMap((it,i)=>i<8?[
  {type:"choice-de",prompt:`Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:it.key,item:it},
  {type:"input-hr",prompt:`Übersetze ins Kroatische: ${it.de}`,answer:it.hr,spoken:it.hr,key:it.key,item:it}
 ]:[
  {type:"listen",prompt:"Hören und schreiben",answer:it.hr,spoken:it.hr,key:it.key,item:it},
  {type:"choice-hr",prompt:`Welche kroatische Antwort bedeutet „${it.de}“?`,answer:it.hr,options:[it.hr,...distract(it.hr,"hr")],spoken:it.hr,key:it.key,item:it}
 ]))
}
function startLesson(id){
 const l=lessonById(id);if(!l||!isUnlocked(l))return;
 active=l;mode=l.isTest?"test":"lesson";state.lastLesson=id;state.selectedLevel=l.level;save();queue=l.isTest?makeTest(l):makeNormal(l);pos=0;show("lesson");renderQ()
}
function startReview(){
 const d=due();if(!d.length)return alert("Heute ist noch keine Wiederholung fällig.");
 active=null;mode="review";queue=shuffle(d.flatMap(it=>[{type:"choice-de",prompt:`Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:it.key,item:it},{type:"input-hr",prompt:`Übersetze ins Kroatische: ${it.de}`,answer:it.hr,spoken:it.hr,key:it.key,item:it}]));pos=0;show("lesson");renderQ()
}
function renderQ(){
 if(pos>=queue.length)return finish();checked=false;answer="";const q=queue[pos];
 $("#counter").textContent=`${pos+1}/${queue.length}`;$("#bar").style.width=(pos/queue.length*100)+"%";
 $("#prompt").textContent=q.type==="listen"?"Tippe auf Anhören und schreibe den kroatischen Ausdruck.":q.prompt;
 $("#kind").textContent=q.type==="choice-de"?"Kroatisch verstehen":q.type==="choice-hr"?"Ins Kroatische wählen":q.type==="dialogue"?"Dialog vervollständigen":q.type==="listen"?"Hören und schreiben":"Ins Kroatische übersetzen";
 const tip=$("#grammarTip");tip.className="grammarTip"+(active&&active.grammar&&pos===0?"":" hidden");tip.textContent=active&&active.grammar?"💡 "+active.grammar:"";
 $("#feedback").className="feedback hidden";$("#check").classList.remove("hidden");$("#next").classList.add("hidden");$("#check").disabled=true;$("#speak").onclick=()=>speak(q.spoken);
 const a=$("#answerArea");a.innerHTML="";
 if(["choice-de","choice-hr","dialogue"].includes(q.type)){shuffle(q.options).forEach(o=>{const b=document.createElement("button");b.className="choice";b.textContent=o;b.onclick=()=>{if(checked)return;answer=o;[...a.children].forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("#check").disabled=false};a.appendChild(b)})}
 else{const i=document.createElement("input");i.className="textInput";i.placeholder="Kroatische Antwort";i.autocomplete="off";i.oninput=()=>{answer=i.value;$("#check").disabled=!norm(answer)};i.onkeydown=e=>{if(e.key==="Enter"&&!$("#check").disabled)check()};a.appendChild(i);setTimeout(()=>i.focus(),50)}
}
function speak(t){if(!("speechSynthesis"in window))return;const u=new SpeechSynthesisUtterance(t);u.lang="hr-HR";u.rate=.78;const v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith("hr"));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u)}
function retryFor(q){if(q.type==="choice-de")return {...q,type:"input-hr",prompt:`Übersetze ins Kroatische: ${q.item.de}`,answer:q.item.hr,spoken:q.item.hr};return {...q,type:"choice-hr",prompt:`Welche kroatische Antwort bedeutet „${q.item.de}“?`,answer:q.item.hr,options:[q.item.hr,...distract(q.item.hr,"hr")],spoken:q.item.hr}}
function check(){
 if(checked)return;checked=true;const q=queue[pos],ok=norm(answer)===norm(q.answer);state.total++;if(ok)state.correct++;
 if(ok){state.xp+=8;$("#feedback").className="feedback ok";$("#feedback").textContent="Richtig! +8 XP"}else{$("#feedback").className="feedback no";$("#feedback").textContent=`Richtig wäre: ${q.answer}`;queue.splice(Math.min(queue.length,pos+3),0,retryFor(q))}
 schedule(q.key,ok);save();$("#check").classList.add("hidden");$("#next").classList.remove("hidden")
}
function finish(){
 if(active){if(!state.completed.includes(active.id)){state.completed.push(active.id);state.xp+=active.isTest?60:30}}
 save();renderCourse();renderDashboard();$("#doneText").textContent=mode==="review"?"Deine fälligen Wiederholungen sind erledigt.":active&&active.isTest?"Kapiteltest abgeschlossen. Das nächste Kapitel ist jetzt freigeschaltet.":"Du hast neue Wörter, Hörübungen und eine praktische Situation trainiert.";show("done")
}
function wrongItems(){const rows=[];learningLessons().forEach(l=>l.items.forEach((it,i)=>{const k=itemKey(l.id,i),s=st(k);if(s.wrong>0)rows.push({...it,key:k,wrong:s.wrong})}));return rows.sort((a,b)=>b.wrong-a.wrong)}
function startWrongPractice(){const wrong=wrongItems();if(!wrong.length)return alert("Noch keine häufig falsch beantworteten Fragen vorhanden.");active=null;mode="wrong";queue=shuffle(wrong.flatMap(it=>[{type:"choice-de",prompt:`Was bedeutet „${it.hr}“?`,answer:it.de,options:[it.de,...distract(it.de,"de")],spoken:it.hr,key:it.key,item:it},{type:"input-hr",prompt:`Übersetze ins Kroatische: ${it.de}`,answer:it.hr,spoken:it.hr,key:it.key,item:it}]));pos=0;show("lesson");renderQ()}
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>show(b.dataset.screen));
document.querySelectorAll(".levelCard[data-level]").forEach(b=>b.onclick=()=>{state.selectedLevel=b.dataset.level;save();show("course")});
$("#continueBtn").onclick=()=>startLesson((nextLesson()||{}).id);$("#continueQuick").onclick=()=>startLesson((nextLesson()||{}).id);
$("#dueQuick").onclick=startReview;$("#reviewBtn").onclick=startReview;$("#wrongQuick").onclick=startWrongPractice;$("#wrongPracticeBtn").onclick=startWrongPractice;$("#bottomWrong").onclick=startWrongPractice;
$("#statsQuick").onclick=()=>document.querySelector(".dashboardColumns").scrollIntoView({behavior:"smooth"});$("#bottomStats").onclick=()=>{show("dashboard");setTimeout(()=>document.querySelector(".dashboardColumns").scrollIntoView({behavior:"smooth"}),50)};
$("#check").onclick=check;$("#next").onclick=()=>{pos++;renderQ()};$("#close").onclick=()=>show("course");$("#homeBtn").onclick=()=>show("course");
show("dashboard");if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));

import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#09090B",surf:"#111114",card:"#18181C",card2:"#1E1E24",
  bdr:"rgba(255,255,255,.07)",bdr2:"rgba(255,255,255,.13)",
  txt:"#F4F4F6",dim:"#A1A1AA",muted:"#52525B",
  blue:"#3B82F6",blueD:"rgba(59,130,246,.12)",blueB:"rgba(59,130,246,.22)",
  lav:"#8B5CF6",lavD:"rgba(139,92,246,.12)",
  grn:"#22C55E",grnD:"rgba(34,197,94,.1)",
  amb:"#F59E0B",ambD:"rgba(245,158,11,.1)",
  red:"#EF4444",redD:"rgba(239,68,68,.1)",
};
const DISC_COLORS=["#3B82F6","#8B5CF6","#22C55E","#F59E0B","#EF4444","#06B6D4","#EC4899","#F97316","#14B8A6","#6366F1"];
const DAYS_LABELS=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const SLOT_LABELS=["06h","07h","08h","09h","10h","11h","12h","13h","14h","15h","16h","17h","18h","19h","20h","21h"];
const CAL_DAYS=[{n:"Seg",d:21},{n:"Ter",d:22},{n:"Qua",d:23,today:true},{n:"Qui",d:24},{n:"Sex",d:25},{n:"Sáb",d:26,dim:true},{n:"Dom",d:27,dim:true}];
const CAL_TIMES=["07h","08h","09h","10h","11h","12h","13h","14h","15h","16h","17h","18h","19h","20h"];
const DEFAULT_AVAIL={0:[1,2,3,12,13,14],1:[12,13,14],2:[1,2,3,12,13,14],3:[1,2,3,12,13],4:[12,13,14],5:[2,3,4],6:[]};
const INIT_DISCS=[
  {id:0,name:"Algoritmos e Estruturas de Dados",type:"Graduação",horas:8,prioridade:"Alta",prova:"2025-11-15",color:"#3B82F6",prog:48,
   modules:[{name:"Análise de complexidade (Big O)",status:"done",est:3},{name:"Arrays e listas ligadas",status:"done",est:4},{name:"Pilhas, filas e deques",status:"done",est:4},{name:"Árvores binárias e BST",status:"prog",est:5},{name:"Grafos — BFS e DFS",status:"pend",est:6},{name:"Algoritmos de ordenação",status:"pend",est:4}]},
  {id:1,name:"Cálculo Diferencial e Integral",type:"Graduação",horas:8,prioridade:"Alta",prova:"2025-11-20",color:"#8B5CF6",prog:30,
   modules:[{name:"Limites e continuidade",status:"done",est:4},{name:"Derivadas e regras",status:"prog",est:5},{name:"Integrais indefinidas",status:"pend",est:5},{name:"Integrais definidas",status:"pend",est:5},{name:"Séries e sequências",status:"pend",est:6}]},
];
const RECALL_QS=["Explique a diferença entre BFS e DFS em termos de estrutura de dados e casos de uso.","Qual a complexidade de tempo do BFS em um grafo com V e E?","Quando usar DFS ao invés de BFS? Dê um exemplo concreto."];
const AI_RESPS=["Reagendei para hoje às 21h! 🔔","Ok, redistribuí o conteúdo para a próxima semana.","Em Cálculo faltam 3 módulos: Integrais, Séries e Taylor. ~11h no total.","**Quiz:** Qual a complexidade de espaço de BFS com V vértices?","Reduzi sua carga em 25% e reorganizei o plano."];

/* ── STYLES ── */
const inp={width:"100%",background:C.card2,border:`1px solid ${C.bdr}`,borderRadius:7,padding:"8px 10px",fontFamily:"inherit",fontSize:13,color:C.txt,outline:"none",boxSizing:"border-box"};
const sel={...inp,cursor:"pointer",appearance:"none"};
const ta={...inp,resize:"vertical",minHeight:70,lineHeight:1.5};
const lbl={fontSize:11,fontWeight:500,color:C.dim,display:"block",marginBottom:4};
const hint={fontSize:11,color:C.muted,marginTop:3,lineHeight:1.5};
const card={background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"12px 14px"};

/* ── CALENDAR GENERATOR ── */
function generateCalendar(disciplines,availSlots){
  const events=[];
  if(!disciplines.length) return events;
  const available=[];
  for(let col=0;col<7;col++){
    const slots=availSlots[col]||DEFAULT_AVAIL[col]||[];
    slots.forEach(slot=>available.push({col,slot}));
  }
  available.sort((a,b)=>a.col!==b.col?a.col-b.col:a.slot-b.slot);
  if(!available.length) return events;
  const priBonus={Alta:2,Média:0,Baixa:-1};
  const weights=disciplines.map(d=>Math.max(1,d.horas+(priBonus[d.prioridade]||0)));
  const totalWeight=weights.reduce((a,b)=>a+b,0);
  const allocations=weights.map((w,i)=>({disc:disciplines[i],count:Math.max(1,Math.round((w/totalWeight)*available.length*0.88)),used:0}));
  allocations.sort((a,b)=>{const p={Alta:0,Média:1,Baixa:2};return (p[a.disc.prioridade]||1)-(p[b.disc.prioridade]||1);});
  const queue=[];
  for(let pass=0;pass<30;pass++) allocations.forEach(a=>{if(a.used<a.count){queue.push({...a});a.used++;}});
  const colLastDisc={};const placed=new Set();const sessionCount={};
  const methodFor=(mod,disc)=>{
    const days=disc.prova?Math.max(0,Math.ceil((new Date(disc.prova)-Date.now())/86400000)):99;
    if(days<14) return "🧠 Recall intensivo";
    if(!mod) return "📖 Leitura";
    if(mod.status==="done") return "🔁 Espaçada";
    if(mod.status==="prog") return "🧠 Active Recall";
    return "🛠 Prática";
  };
  const pickMod=(disc,sc)=>{
    const mods=disc.modules||[];
    const inProg=mods.find(m=>m.status==="prog");
    const pend=mods.filter(m=>m.status==="pend");
    const done=mods.filter(m=>m.status==="done");
    if(sc%3===2&&done.length) return {mod:done[sc%done.length],isReview:true};
    if(inProg) return {mod:inProg,isReview:false};
    if(pend.length) return {mod:pend[sc%pend.length],isReview:false};
    if(done.length) return {mod:done[sc%done.length],isReview:true};
    return {mod:null,isReview:false};
  };
  let qi=0;
  for(const {col,slot} of available){
    if(qi>=queue.length) break;
    const key=`${col}-${slot}`;
    if(placed.has(key)) continue;
    const alloc=queue[qi];const disc=alloc.disc;
    if(colLastDisc[col]===disc.id&&disciplines.length>1){
      let sw=false;
      for(let k=qi+1;k<Math.min(qi+5,queue.length);k++){
        if(queue[k].disc.id!==disc.id){const t=queue[qi];queue[qi]=queue[k];queue[k]=t;sw=true;break;}
      }
      if(!sw){qi++;continue;}
    }
    const sc=sessionCount[disc.id]||0;
    const {mod,isReview}=pickMod(disc,sc);
    const meth=methodFor(mod,disc);
    const shortName=disc.name.split(" ").slice(0,2).join(" ");
    events.push({col,slot,disc:shortName,discFull:disc.name,c:disc.color,topic:isReview?`🔁 Revisão — ${mod?.name||"módulo anterior"}`:(mod?.name||disc.name),meth,done:false,discId:disc.id});
    colLastDisc[col]=disc.id;sessionCount[disc.id]=sc+1;placed.add(key);qi++;
  }
  return events;
}


/* ── METHODS DATA ── */
const METHODS_DATA=[
  {id:"espacada",icon:"🔁",name:"Repetição Espaçada",tagline:"Revisar no momento exato antes de esquecer",color:C.blue,colorD:C.blueD,
   what:"Ao invés de revisar todo dia, você revisa em intervalos crescentes: 1 dia → 3 → 7 → 15 → 30 dias. O algoritmo FSRS calcula o intervalo ideal para cada flashcard com base na sua dificuldade histórica.",
   when:"Para qualquer conteúdo que precisa ficar na memória de longo prazo: vocabulário, fórmulas, definições, teoremas.",
   how:["Estude o conteúdo novo pela primeira vez","Crie um flashcard com pergunta e resposta","O sistema agenda a revisão no momento certo","Avalie sua resposta (fácil/ok/difícil) — o intervalo ajusta","Com o tempo o intervalo pode chegar a semanas"],
   science:"Efeito de espaçamento: a memória se consolida durante o sono. Revisar 24h depois é mais eficaz do que logo após aprender.",
   effectiveness:"★★★ Altíssima para memorização de longo prazo"},
  {id:"recall",icon:"🧠",name:"Active Recall",tagline:"Forçar o cérebro a buscar — não a reconhecer",color:C.grn,colorD:C.grnD,
   what:"Em vez de reler o material (que dá falsa sensação de conhecimento), você fecha tudo e tenta recordar ativamente. Pode ser respondendo flashcards, fazendo perguntas, ou escrevendo o que lembra sem consultar.",
   when:"Em todas as revisões. Substituir releitura passiva por active recall aumenta a retenção em até 2× segundo estudos de 2025.",
   how:["Estude o material normalmente","Feche o livro completamente","Escreva ou diga em voz alta tudo que lembra","Compare com o original — marque o que errou","Foque a próxima revisão exatamente nos erros"],
   science:"O esforço de tentar recordar — mesmo falhando — fortalece a memória mais do que reler a resposta. Errar faz parte do processo.",
   effectiveness:"★★★ Altíssima — melhor ROI por minuto de estudo"},
  {id:"interleaving",icon:"🔀",name:"Interleaving",tagline:"Misturar matérias estrategicamente na mesma sessão",color:"#06B6D4",colorD:"rgba(6,182,212,.1)",
   what:"Em vez de estudar uma matéria até o fim, você alterna entre disciplinas ou tópicos diferentes numa mesma sessão. Parece mais difícil — e é. Essa dificuldade extra é o que consolida o aprendizado.",
   when:"Quando você tem 2+ matérias para estudar. Especialmente útil antes de provas com múltiplos assuntos.",
   how:["Planeje sessões com 2-3 matérias diferentes","Estude 25–40 min de uma matéria","Troque para outra sem finalizar o tópico anterior","Volte para a primeira depois de um intervalo","Observe como o retorno parece mais difícil — isso é bom"],
   science:"Interleaving melhora a discriminação entre conceitos parecidos. Estudantes performam até 43% melhor em testes com múltiplos assuntos.",
   effectiveness:"★★★ Altíssima para provas com múltiplos assuntos"},
  {id:"feynman",icon:"🗣",name:"Técnica de Feynman",tagline:"Se você não consegue explicar simples, não entendeu",color:C.amb,colorD:C.ambD,
   what:"Escolha um conceito. Tente explicá-lo como se estivesse ensinando alguém que nunca ouviu falar. Onde você travar ou usar jargão — esses são seus pontos cegos. Volte ao material só nesses pontos.",
   when:"Para entender conceitos complexos em profundidade: algoritmos, teoremas, leis. Não para memorização pura.",
   how:["Escreva o nome do conceito no topo de uma folha","Explique em linguagem simples, como para um iniciante","Identifique onde você travou ou usou jargão","Volte ao material só nesses pontos","Repita até explicar fluentemente sem notas"],
   science:"Richard Feynman (Nobel de Física) usava isso para identificar lacunas no próprio conhecimento. A incapacidade de explicar simples é sintoma — não causa — de não entender.",
   effectiveness:"★★☆ Alta para compreensão profunda"},
  {id:"pomodoro",icon:"⏱",name:"Pomodoro",tagline:"25 minutos de foco real valem mais que 3 horas vagando",color:C.red,colorD:C.redD,
   what:"Trabalhe por 25 minutos com foco total. Depois, 5 minutos de pausa completa. A cada 4 pomodoros, pausa longa de 15–30 minutos. A unidade é o pomodoro — não a hora.",
   when:"Para qualquer sessão de estudo. Especialmente útil quando você tende a procrastinar. Funciona melhor combinado com Active Recall ou Prática.",
   how:["Decida a tarefa exata que vai executar","Remova distrações (silenciar notificações, fechar abas)","Inicie o timer: 25 minutos de foco total","Ao tocar: marque ✓ e descanse 5 minutos","A cada 4 ✓: pausa longa de 15–30 minutos"],
   science:"Explora a Lei de Parkinson: o trabalho expande para preencher o tempo disponível. Limitando o tempo, você aumenta o foco e reduz a procrastinação.",
   effectiveness:"★★☆ Alta para consistência e produtividade diária"},
  {id:"pratica",icon:"🛠",name:"Prática Deliberada",tagline:"Resolver problemas no limite da sua competência atual",color:"#F97316",colorD:"rgba(249,115,22,.1)",
   what:"Não é praticar o que você já sabe — é praticar exatamente o que está no limite da sua competência. Com feedback imediato, identificando erros e corrigindo.",
   when:"Para matérias com exercícios práticos: algoritmos, matemática, física, programação. Depois de entender a teoria básica.",
   how:["Identifique o tipo de problema que você ainda erra","Faça 5–10 exercícios desse tipo específico","Verifique cada resposta imediatamente","Analise o erro — foi conceito, cálculo ou interpretação?","Repita com problemas similares até dominar"],
   science:"Anders Ericsson mostrou que 1.000 horas de prática deliberada superam 10.000 horas de prática aleatória para construir expertise.",
   effectiveness:"★★★ Essencial para matérias com exercícios"},
  {id:"mindmap",icon:"🗺",name:"Mapas Mentais",tagline:"Organizar o conhecimento como o cérebro realmente funciona",color:C.lav,colorD:C.lavD,
   what:"Comece pelo conceito central no meio da folha. Crie ramificações para os tópicos principais com sub-ramos. Use cores, ícones e conexões visuais para ver as relações entre conceitos.",
   when:"Para revisar uma matéria inteira antes de provas. Para estruturar conteúdo antes de começar. Para conectar conceitos de diferentes módulos.",
   how:["Escreva o tema central no centro (ex: Cálculo Diferencial)","Crie ramos para grandes tópicos (Limites, Derivadas, Integrais)","Adicione sub-ramos com detalhes e exemplos","Use cores diferentes por área temática","Conecte ramos de áreas diferentes com setas"],
   science:"Mapas mentais ativam o pensamento associativo, como o hipocampo organiza memórias de longo prazo. Especialmente eficaz para pessoas com memória visual.",
   effectiveness:"★★☆ Alta para organização e revisão panorâmica"},
  {id:"pbl",icon:"📐",name:"Aprendizagem Baseada em Problemas",tagline:"Aprender o que você precisa para resolver um problema real",color:"#14B8A6",colorD:"rgba(20,184,166,.1)",
   what:"Ao invés de estudar teoria e depois procurar aplicações, você começa com um problema real. A necessidade de resolver o problema guia o que você precisa aprender.",
   when:"Para matérias aplicadas: engenharia, medicina, programação, negócios. Quando você tem projetos reais ou simulados.",
   how:["Encontre um problema real relacionado ao conteúdo","Tente resolver com o que já sabe — note onde trava","Estude especificamente o conteúdo para os pontos de travamento","Volte ao problema com o novo conhecimento","Documente e generalize para outros problemas similares"],
   science:"Contexto é memória. Conceitos aprendidos para resolver um problema específico são retidos com muito mais facilidade do que conceitos abstratos.",
   effectiveness:"★★☆ Alta para retenção com contexto real"},
];

/* ── HELPERS ── */
function Btn({children,onClick,style={},primary,sm,lav,grn,disabled}){
  const b={display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",
    fontSize:sm?11:13,fontWeight:500,padding:sm?"4px 10px":"7px 14px",
    borderRadius:7,cursor:disabled?"not-allowed":"pointer",
    border:`1px solid ${C.bdr}`,background:C.card,color:C.dim,
    transition:"all .12s",opacity:disabled?0.5:1,...style};
  if(primary) Object.assign(b,{background:C.blue,borderColor:C.blue,color:"#fff"});
  if(lav) Object.assign(b,{background:C.lavD,borderColor:"rgba(139,92,246,.25)",color:C.lav});
  if(grn) Object.assign(b,{background:C.grnD,borderColor:"rgba(34,197,94,.2)",color:C.grn});
  return <button style={b} onClick={disabled?undefined:onClick}>{children}</button>;
}
function Toast({message,visible,type}){
  const bgs={ok:C.grn,info:C.blue,warn:C.amb};
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:`translateX(-50%) translateY(${visible?0:60}px)`,opacity:visible?1:0,transition:"all .25s",background:bgs[type]||C.grn,color:type==="info"?"#fff":"#000",fontWeight:600,fontSize:13,padding:"8px 18px",borderRadius:30,zIndex:999,pointerEvents:"none",whiteSpace:"nowrap"}}>{message}</div>;
}
function Notice({children,type="info"}){
  const s={info:[C.blueD,"rgba(59,130,246,.18)"],warn:[C.ambD,"rgba(245,158,11,.18)"],grn:[C.grnD,"rgba(34,197,94,.18)"]};
  const[bg,bdr]=s[type];
  return <div style={{padding:"10px 12px",borderRadius:8,background:bg,border:`1px solid ${bdr}`,fontSize:12,color:C.dim,lineHeight:1.6,marginBottom:12}}>{children}</div>;
}
function StatCard({icon,iconBg,value,label,delta,deltaDir}){
  return <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:9,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
    <div style={{width:30,height:30,borderRadius:7,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{icon}</div>
    <div style={{flex:1}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:600,color:C.txt,lineHeight:1}}>{value}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{label}</div></div>
    {delta&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:deltaDir==="up"?C.grn:deltaDir==="dn"?C.red:C.muted}}>{delta}</div>}
  </div>;
}
function SchedGrid({slots,setSlots}){
  return <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,overflowX:"auto"}}>
    {DAYS_LABELS.map((d,di)=><div key={di}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,textAlign:"center",color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",paddingBottom:5,borderBottom:`1px solid ${C.bdr}`,marginBottom:4}}>{d}</div>
      {SLOT_LABELS.map((t,si)=><div key={si} title={t} onClick={()=>setSlots(p=>({...p,[`${di}-${si}`]:!p[`${di}-${si}`]}))} style={{height:17,borderRadius:3,cursor:"pointer",marginBottom:2,background:slots[`${di}-${si}`]?C.blueD:C.card,border:`1px solid ${slots[`${di}-${si}`]?"rgba(59,130,246,.28)":"transparent"}`,transition:"all .12s"}}/>)}
    </div>)}
  </div>;
}



/* ══ UX COMPONENTS ══ */
function EmptyState({icon,title,desc,cta,onCta}){
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,padding:"3rem 2rem",textAlign:"center"}}>
    <div style={{width:60,height:60,borderRadius:14,background:C.card,border:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:18}}>{icon}</div>
    <div style={{fontSize:15,fontWeight:700,color:C.txt,marginBottom:8}}>{title}</div>
    <div style={{fontSize:12,color:C.muted,lineHeight:1.7,maxWidth:300,marginBottom:22}}>{desc}</div>
    {cta&&<button onClick={onCta} style={{fontFamily:"inherit",fontSize:13,fontWeight:600,padding:"9px 20px",borderRadius:8,cursor:"pointer",background:C.blue,border:"none",color:"#fff"}}>{cta}</button>}
  </div>;
}
function CelebrationOverlay({visible,onDone}){
  useEffect(()=>{if(visible){const t=setTimeout(onDone,2800);return()=>clearTimeout(t);}return undefined;},[visible]);
  if(!visible) return null;
  const confColors=[C.blue,C.lav,C.grn,C.amb,C.red];
  return <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
    <div style={{textAlign:"center",animation:"celebIn .35s cubic-bezier(.34,1.56,.64,1)"}}>
      <div style={{fontSize:52,marginBottom:10,filter:"drop-shadow(0 0 20px rgba(34,197,94,.6))"}}>🎉</div>
      <div style={{fontSize:17,fontWeight:700,color:C.txt,marginBottom:5}}>Sessão concluída!</div>
      <div style={{fontSize:12,color:C.grn,fontFamily:"'JetBrains Mono',monospace"}}>+1 sessão · streak mantido 🔥</div>
    </div>
    {Array.from({length:16},(_,i)=><div key={i} style={{position:"absolute",left:`${6+i*5.8}%`,top:"-10px",width:8,height:8+(i%3)*4,borderRadius:i%2?2:"50%",background:confColors[i%5],animation:`conf${i%4} ${1.2+i*.08}s ease-in ${i*.06}s forwards`,opacity:0}}/>)}
  </div>;
}
function InlineEdit({value,onSave,style={}}){
  const[editing,setEditing]=useState(false);
  const[val,setVal]=useState(value);
  const ref=useRef(null);
  useEffect(()=>{if(editing&&ref.current)ref.current.focus();},[editing]);
  useEffect(()=>setVal(value),[value]);
  if(!editing) return <span onClick={()=>setEditing(true)} title="Clique para editar" style={{cursor:"text",borderBottom:"1px dashed rgba(255,255,255,.2)",paddingBottom:1,...style}}>{val||"—"}</span>;
  return <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} onBlur={()=>{setEditing(false);onSave(val);}} onKeyDown={e=>{if(e.key==="Enter"){setEditing(false);onSave(val);}if(e.key==="Escape"){setEditing(false);setVal(value);}}} style={{background:"transparent",border:"none",borderBottom:`1px solid ${C.blue}`,outline:"none",fontFamily:"inherit",color:C.txt,padding:"0 0 1px",fontSize:"inherit",fontWeight:"inherit",width:"100%"}}/>;
}
function Tip({label,children}){
  const[show,setShow]=useState(false);
  return <div style={{position:"relative",display:"inline-flex"}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
    {children}
    {show&&<div style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:C.card2,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"4px 8px",fontSize:11,color:C.txt,whiteSpace:"nowrap",zIndex:50,pointerEvents:"none",boxShadow:"0 4px 12px rgba(0,0,0,.4)"}}>
      {label}<div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"4px solid transparent",borderRight:"4px solid transparent",borderTop:`4px solid ${C.bdr2}`}}/>
    </div>}
  </div>;
}
function urgencyBorder(prova){
  if(!prova) return {};
  const d=Math.max(0,Math.ceil((new Date(prova)-Date.now())/86400000));
  if(d<=3) return {border:`1px solid ${C.red}`,boxShadow:"0 0 8px rgba(239,68,68,.2)"};
  if(d<=7) return {border:`1px solid ${C.amb}`,boxShadow:"0 0 6px rgba(245,158,11,.15)"};
  return {};
}
function calcETA(disc){
  const pending=disc.modules.filter(m=>m.status!=="done");
  if(!pending.length) return null;
  return Math.ceil(pending.reduce((a,m)=>a+(m.est||4),0)/Math.max(1,disc.horas));
}

/* ── GENERATING OVERLAY ── */
function GenOverlay({visible,onDone}){
  const[step,setStep]=useState(0);const[pct,setPct]=useState(10);
  const steps=["Curriculum Agent — organizando módulos","Pedagogy Agent — FSRS + interleaving…","Scheduler Agent — alocando slots reais","QA Agent — validando calendário","Montando visualização final"];
  useEffect(()=>{
    if(!visible){setStep(0);setPct(10);return;}
    const targets=[10,30,55,75,92,100];let i=1;
    const iv=setInterval(()=>{if(i>=targets.length){clearInterval(iv);setTimeout(onDone,500);return;}setPct(targets[i]);setStep(i);i++;},820);
    return()=>clearInterval(iv);
  },[visible]);
  if(!visible) return null;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(10px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:14,padding:32,textAlign:"center",width:360}}>
      <div style={{fontSize:28,marginBottom:12,animation:"spin 2s linear infinite",display:"block"}}>✦</div>
      <div style={{fontSize:15,fontWeight:700,color:C.txt,marginBottom:4}}>Gerando calendário personalizado</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Os agentes estão trabalhando para você</div>
      <div style={{display:"flex",flexDirection:"column",gap:7,textAlign:"left"}}>
        {steps.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:i<step?C.grn:i===step?C.txt:C.muted}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,width:14}}>{i<step?"✓":i===step?"⟳":"○"}</span>{s}
        </div>)}
      </div>
      <div style={{marginTop:18,height:2,background:C.bdr,borderRadius:1,overflow:"hidden"}}>
        <div style={{height:2,background:`linear-gradient(90deg,${C.blue},${C.lav})`,width:`${pct}%`,transition:"width .5s ease"}}/>
      </div>
    </div>
    <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
  </div>;
}

/* ── COLLAPSIBLE SIDEBAR ── */
function Sidebar({collapsed,onToggle,screen,setScreen,disciplines}){
  const W=collapsed?52:212;
  function Item({icon,label,id,badge}){
    const active=screen===id;
    return <button onClick={()=>setScreen(id)} title={collapsed?label:""} style={{display:"flex",alignItems:"center",gap:8,padding:collapsed?"8px 0":"7px 8px",borderRadius:7,cursor:"pointer",fontSize:12,color:active?C.blue:C.dim,border:"none",background:active?C.blueD:"transparent",width:"100%",textAlign:"left",transition:"all .12s",justifyContent:collapsed?"center":"flex-start",margin:"1px 0"}}>
      <span style={{fontSize:15,width:collapsed?undefined:16,textAlign:"center",flexShrink:0}}>{icon}</span>
      {!collapsed&&<span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden"}}>{label}</span>}
      {!collapsed&&badge!==undefined&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:active?C.blue:C.muted,background:active?C.blueB:C.card2,borderRadius:20,padding:"1px 6px"}}>{badge}</span>}
    </button>;
  }
  return <aside style={{width:W,background:C.surf,borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",overflowY:"auto",overflowX:"hidden",transition:"width .22s ease"}}>
    <div style={{padding:collapsed?"10px 0":"12px 12px 10px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${C.bdr}`,justifyContent:collapsed?"center":"flex-start",flexShrink:0}}>
      <div style={{width:24,height:24,borderRadius:6,background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>S</div>
      {!collapsed&&<span style={{fontSize:13,fontWeight:600,letterSpacing:"-0.02em",color:C.txt,flex:1,whiteSpace:"nowrap"}}>StudyAI</span>}
      {!collapsed&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,color:C.lav,background:C.lavD,border:"1px solid rgba(139,92,246,.2)",padding:"2px 6px",borderRadius:20}}>Beta</span>}
    </div>
    <button onClick={onToggle} title={collapsed?"Expandir sidebar":"Recolher sidebar"} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"7px",border:"none",background:"none",color:C.muted,cursor:"pointer",fontSize:13,flexShrink:0,borderBottom:`1px solid ${C.bdr}`}}>
      {collapsed?"»":"«"}
    </button>
    <div style={{padding:collapsed?"6px 4px":"10px 8px 4px",flexShrink:0}}>
      {!collapsed&&<span style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,padding:"0 4px",marginBottom:4,display:"block"}}>Estudo</span>}
      <Item icon="📅" label="Calendário" id="dashboard" badge={undefined}/>
      <Item icon="⏱" label="Sessão ativa" id="session"/>
      <Item icon="📈" label="Progresso" id="progress"/>
    </div>
    <div style={{padding:collapsed?"6px 4px":"10px 8px 4px",flexShrink:0}}>
      {!collapsed&&<span style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,padding:"0 4px",marginBottom:4,display:"block"}}>Configuração</span>}
      <Item icon="📚" label="Matérias" id="disciplines" badge={collapsed?undefined:disciplines.length}/>
      <Item icon="🧪" label="Metodologias" id="methods"/>
      <Item icon="⚙️" label="Configurações" id="settings"/>
    </div>
    {!collapsed&&<div style={{padding:"4px 8px 8px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px",marginBottom:6}}>
        <span style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted}}>Matérias</span>
        <button onClick={()=>setScreen("disciplines")} style={{width:17,height:17,borderRadius:4,background:C.card,border:`1px solid ${C.bdr}`,color:C.muted,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      </div>
      {disciplines.map(d=><div key={d.id} onClick={()=>setScreen("disciplines")} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 6px",borderRadius:7,cursor:"pointer",marginBottom:2}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:d.color,flexShrink:0}}/>
        <span style={{fontSize:11,color:C.dim,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted}}>{d.horas}h</span>
      </div>)}
    </div>}
    {!collapsed&&<div style={{marginTop:"auto",padding:10,borderTop:`1px solid ${C.bdr}`,flexShrink:0}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,padding:"10px 12px"}}>
        <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Progresso semanal</div>
        <div style={{height:3,background:C.card2,borderRadius:2,overflow:"hidden",marginBottom:5}}><div style={{height:3,background:C.grn,width:"68%",borderRadius:2}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>
          <span><strong style={{color:C.grn}}>17h</strong> feitas</span><span>meta: 26h</span>
        </div>
      </div>
    </div>}
  </aside>;
}


/* ── EVENT DRAWER ── */
function EventDrawer({ev,onClose,onStartSession}){
  const[checks,setChecks]=useState([false,false,false,false]);
  const[method,setMethod]=useState(0);
  if(!ev) return null;
  const methods=[["🔁","Rep. Espaçada","Revisão no momento certo"],["🧠","Active Recall","Testar sem consultar"],["🔀","Interleaving","Misturar matérias"],["🗣","Feynman","Explicar em voz alta"]];
  const items=["Revisar anotações","Resolver exercícios","Criar flashcards","Active recall final"];
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(3px)",zIndex:80}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:330,background:C.surf,borderLeft:`1px solid ${C.bdr}`,zIndex:81,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${C.bdr}`,flexShrink:0}}>
        <button onClick={onClose} style={{float:"right",width:22,height:22,borderRadius:5,background:C.card,border:`1px solid ${C.bdr}`,color:C.muted,cursor:"pointer",fontSize:12}}>✕</button>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",background:`${ev.c}22`,color:ev.c,borderRadius:4,padding:"2px 7px",display:"inline-block",marginBottom:5}}>{ev.disc}</div>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:3,lineHeight:1.3}}>{ev.topic}</div>
        <div style={{fontSize:11,color:C.muted}}>Metodologia: <strong style={{color:C.dim}}>{ev.meth}</strong></div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14}}>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8}}>Alterar metodologia</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
          {methods.map(([ic,nm,d],i)=><div key={i} onClick={()=>setMethod(i)} style={{background:method===i?C.blueD:C.card,border:`1px solid ${method===i?"rgba(59,130,246,.3)":C.bdr}`,borderRadius:8,padding:"8px 10px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:14,marginBottom:3}}>{ic}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.txt}}>{nm}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{d}</div>
          </div>)}
        </div>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8}}>Detalhes</div>
        {[["Matéria",ev.discFull||ev.disc],["Módulo",ev.topic.replace(/^🔁 /,"")],["Metodologia IA",ev.meth],["Carga cognitiva","Alta"],["Última revisão","14 dias atrás"],["Próxima revisão (FSRS)","em 7 dias"]].map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid rgba(255,255,255,.04)`}}>
          <span style={{fontSize:11,color:C.muted}}>{k}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.txt,textAlign:"right",maxWidth:180}}>{v}</span>
        </div>)}
        <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,margin:"14px 0 8px"}}>Checklist</div>
        {items.map((item,i)=><div key={i} onClick={()=>setChecks(p=>p.map((v,j)=>j===i?!v:v))} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 4px",borderRadius:6,cursor:"pointer"}}>
          <div style={{width:14,height:14,borderRadius:4,border:`1.5px solid ${checks[i]?C.grn:C.bdr2}`,background:checks[i]?C.grn:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",flexShrink:0}}>{checks[i]&&"✓"}</div>
          <span style={{fontSize:12,color:checks[i]?C.muted:C.dim,textDecoration:checks[i]?"line-through":"none"}}>{item}</span>
        </div>)}
      </div>
      <div style={{padding:"10px 14px",borderTop:`1px solid ${C.bdr}`,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onStartSession} style={{flex:1,fontFamily:"inherit",fontSize:13,fontWeight:600,background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:10,cursor:"pointer"}}>▶ Iniciar sessão</button>
        <button onClick={onClose} style={{fontFamily:"inherit",fontSize:12,background:C.card,color:C.muted,border:`1px solid ${C.bdr}`,borderRadius:8,padding:"10px 14px",cursor:"pointer"}}>Adiar</button>
      </div>
    </div>
  </>;
}

/* ── CALENDAR GRID ── */
function CalGrid({events,onClickEv}){
  return <div style={{overflowX:"auto",overflowY:"auto",flex:1,padding:"0 14px 14px"}}>
    <div style={{display:"grid",gridTemplateColumns:"44px repeat(7,1fr)",gap:3,marginBottom:3,minWidth:540}}>
      <div/>
      {CAL_DAYS.map((d,i)=><div key={i} style={{textAlign:"center",padding:"4px 0",opacity:d.dim?0.45:1}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:500,letterSpacing:"0.07em",textTransform:"uppercase",color:C.muted}}>{d.n}</div>
        <div style={{fontSize:13,fontWeight:600,marginTop:2,color:d.today?C.blue:C.dim,background:d.today?C.blueD:"transparent",width:d.today?22:"auto",height:d.today?22:"auto",borderRadius:d.today?"50%":0,display:"flex",alignItems:"center",justifyContent:"center",margin:d.today?"2px auto 0":"2px 0 0"}}>{d.d}</div>
      </div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"44px repeat(7,1fr)",gap:3,minWidth:540}}>
      <div style={{display:"flex",flexDirection:"column"}}>
        {CAL_TIMES.map((t,i)=><div key={i} style={{height:50,display:"flex",alignItems:"flex-start",paddingTop:2,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,justifyContent:"flex-end",paddingRight:5,borderTop:`1px solid rgba(255,255,255,.03)`}}>{t}</div>)}
      </div>
      {CAL_DAYS.map((_,ci)=>{
        const colEvs=events.filter(e=>e.col===ci);
        return <div key={ci} style={{display:"flex",flexDirection:"column",gap:3,opacity:CAL_DAYS[ci].dim?0.5:1,background:CAL_DAYS[ci].today?"rgba(59,130,246,.025)":"transparent",borderRadius:6}}>
          {CAL_TIMES.map((_,si)=>{
            const ev=colEvs.find(e=>e.slot===si);
            return <div key={si} style={{height:50,borderRadius:5,background:"rgba(255,255,255,.02)",border:`1px solid transparent`,position:"relative",cursor:"pointer"}}>
              {ev&&<div onClick={()=>onClickEv(ev)} style={{position:"absolute",inset:2,borderRadius:4,padding:"4px 6px",background:ev.c,color:"#fff",display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden",cursor:"pointer"}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,lineHeight:1.2}}>{ev.disc}</div>
                  <div style={{fontSize:9,opacity:0.85,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.topic}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:3,fontFamily:"'JetBrains Mono',monospace",fontSize:9,opacity:0.75}}>
                  <span style={{background:"rgba(0,0,0,.22)",borderRadius:2,padding:"1px 4px",fontSize:8}}>{ev.meth}</span>
                </div>
              </div>}
            </div>;
          })}
        </div>;
      })}
    </div>
  </div>;
}

/* ── METHODS SCREEN ── */

/* ── METHODS (compact inline data) ── */
const MD=[
  {id:"espacada",icon:"🔁",name:"Repetição Espaçada",tagline:"Revisar no momento exato antes de esquecer",color:"#3B82F6",colorD:"rgba(59,130,246,.12)",ef:"★★★ Altíssima — memorização de longo prazo",
   w:"Revisa em intervalos crescentes: 1→3→7→15→30 dias. O algoritmo FSRS calcula o intervalo ideal para cada card com base na dificuldade histórica.",
   wh:"Vocabulário, fórmulas, definições, teoremas — qualquer conteúdo de longo prazo.",
   h:["Estude o conteúdo pela primeira vez","Crie um flashcard (pergunta/resposta)","O sistema agenda a revisão no momento certo","Avalie: fácil/ok/difícil — o intervalo ajusta","Com o tempo o intervalo chega a semanas"],
   sc:"A memória consolida durante o sono. Revisar 24h depois é mais eficaz do que logo após aprender."},
  {id:"recall",icon:"🧠",name:"Active Recall",tagline:"Forçar o cérebro a buscar — não a reconhecer",color:"#22C55E",colorD:"rgba(34,197,94,.1)",ef:"★★★ Altíssima — melhor ROI por minuto",
   w:"Feche tudo e tente recordar ativamente. Pode ser flashcards, perguntas para si mesmo, ou escrever o que lembra sem consultar nada.",
   wh:"Em todas as revisões. Substitui releitura passiva e aumenta retenção em até 2×.",
   h:["Estude o material normalmente","Feche o livro completamente","Escreva tudo que lembra","Compare com o original — marque os erros","Foque a próxima revisão nos pontos errados"],
   sc:"O esforço de tentar recordar — mesmo falhando — fortalece a memória mais do que reler a resposta."},
  {id:"interleaving",icon:"🔀",name:"Interleaving",tagline:"Misturar matérias estrategicamente",color:"#06B6D4",colorD:"rgba(6,182,212,.1)",ef:"★★★ Altíssima para provas com múltiplos assuntos",
   w:"Alterna entre disciplinas ou tópicos na mesma sessão. Parece mais difícil — e é. Essa dificuldade extra é o que consolida o aprendizado.",
   wh:"Quando você tem 2+ matérias. Especialmente útil antes de provas com múltiplos assuntos.",
   h:["Planeje sessões com 2-3 matérias","Estude 25–40 min de uma matéria","Troque sem finalizar o tópico anterior","Volte para a primeira depois de um intervalo","Observe como o retorno parece mais difícil — isso é bom"],
   sc:"Melhora a discriminação entre conceitos parecidos. Estudantes performam até 43% melhor em testes com múltiplos assuntos."},
  {id:"feynman",icon:"🗣",name:"Técnica de Feynman",tagline:"Se não consegue explicar simples, não entendeu",color:"#F59E0B",colorD:"rgba(245,158,11,.1)",ef:"★★☆ Alta para compreensão profunda",
   w:"Explique o conceito como se estivesse ensinando alguém que nunca ouviu falar. Onde você travar ou usar jargão — são seus pontos cegos.",
   wh:"Para entender conceitos complexos: algoritmos, teoremas, leis. Não para memorização pura.",
   h:["Escreva o nome do conceito no topo","Explique em linguagem simples","Identifique onde travou ou usou jargão","Volte ao material só nesses pontos","Repita até explicar sem notas"],
   sc:"Richard Feynman (Nobel de Física) usava isso para mapear lacunas no próprio conhecimento."},
  {id:"pomodoro",icon:"⏱",name:"Pomodoro",tagline:"25 min de foco real valem mais que 3h vagando",color:"#EF4444",colorD:"rgba(239,68,68,.1)",ef:"★★☆ Alta para consistência diária",
   w:"25 min de foco total, 5 min de pausa. A cada 4 pomodoros, pausa longa de 15–30 min. A unidade é o pomodoro — não a hora.",
   wh:"Qualquer sessão de estudo. Especialmente quando você tende a procrastinar.",
   h:["Decida a tarefa exata","Remova distrações (silenciar tudo)","25 min de foco total","Ao tocar: marque ✓ e descanse 5 min","A cada 4 ✓: pausa de 15–30 min"],
   sc:"Lei de Parkinson: o trabalho expande para preencher o tempo disponível. Limitar o tempo força o foco."},
  {id:"pratica",icon:"🛠",name:"Prática Deliberada",tagline:"Resolver problemas no limite da sua competência",color:"#F97316",colorD:"rgba(249,115,22,.1)",ef:"★★★ Essencial para matérias com exercícios",
   w:"Não é praticar o que você já sabe — é praticar exatamente no limite da sua competência, com feedback imediato.",
   wh:"Algoritmos, matemática, física, programação. Depois de entender a teoria básica.",
   h:["Identifique o tipo de problema que você ainda erra","Faça 5–10 exercícios desse tipo","Verifique cada resposta imediatamente","Analise o erro — conceito, cálculo ou interpretação?","Repita até dominar"],
   sc:"Anders Ericsson: 1.000h de prática deliberada superam 10.000h de prática aleatória."},
  {id:"mindmap",icon:"🗺",name:"Mapas Mentais",tagline:"Organizar o conhecimento como o cérebro funciona",color:"#8B5CF6",colorD:"rgba(139,92,246,.12)",ef:"★★☆ Alta para revisão panorâmica",
   w:"Conceito central no meio, ramificações para tópicos principais, sub-ramos com detalhes. Use cores e conexões visuais.",
   wh:"Para revisar uma matéria inteira antes de provas. Para conectar conceitos de diferentes módulos.",
   h:["Escreva o tema central no meio","Crie ramos para grandes tópicos","Adicione sub-ramos com detalhes","Use cores diferentes por área","Conecte ramos de áreas diferentes com setas"],
   sc:"Ativa o pensamento associativo — como o hipocampo organiza memórias de longo prazo."},
  {id:"pbl",icon:"📐",name:"Aprendizagem por Problemas",tagline:"Aprender o que você precisa para resolver um problema real",color:"#14B8A6",colorD:"rgba(20,184,166,.1)",ef:"★★☆ Alta para retenção com contexto",
   w:"Começa com um problema real. A necessidade de resolvê-lo guia o que você precisa aprender — motivação e contexto integrados.",
   wh:"Engenharia, medicina, programação, negócios. Quando você tem projetos reais ou simulados.",
   h:["Encontre um problema real relacionado ao conteúdo","Tente resolver com o que já sabe","Estude o que falta para os pontos de travamento","Volte ao problema com o novo conhecimento","Documente e generalize para problemas similares"],
   sc:"Contexto é memória. Conceitos aprendidos para resolver um problema são retidos muito melhor do que abstratos."},
];

const RECALL_QS=["Explique BFS e DFS: estrutura de dados e casos de uso.","Qual a complexidade de tempo do BFS em grafo com V vértices e E arestas?","Quando usar DFS ao invés de BFS? Dê um exemplo concreto."];
const AI_RESPS=["Reagendei para hoje às 21h! 🔔","Redistribuí o conteúdo para a próxima semana.","Em Cálculo faltam 3 módulos: Integrais, Séries e Taylor. ~11h.","**Quiz:** Complexidade de espaço de BFS com V vértices?","Reduzi sua carga em 25% e reorganizei o plano."];

/* ── METHODS SCREEN ── */
function MethodsScreen(){
  const[sel,setSel]=useState(null);
  const m=sel&&MD.find(x=>x.id===sel);
  return <div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
    <div style={{marginBottom:18}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Referência</div>
      <div style={{fontSize:18,fontWeight:700,color:C.txt,marginBottom:4}}>Metodologias de Aprendizagem</div>
      <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>Guia das técnicas aplicadas pelo Pedagogy Agent. Clique para ver como usar na prática.</div>
    </div>
    {!sel&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
      {MD.map(md=><div key={md.id} onClick={()=>setSel(md.id)} style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:md.color}}/>
        <div style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:7}}>
          <div style={{width:32,height:32,borderRadius:8,background:md.colorD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{md.icon}</div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.txt,marginBottom:2}}>{md.name}</div><div style={{fontSize:11,color:C.muted,lineHeight:1.4}}>{md.tagline}</div></div>
        </div>
        <div style={{fontSize:11,color:C.dim,lineHeight:1.5,marginBottom:8}}>{md.w.slice(0,90)}…</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:md.color}}>{md.ef}</span>
          <span style={{fontSize:11,color:C.blue}}>Ver →</span>
        </div>
      </div>)}
    </div>}
    {sel&&m&&<div>
      <button onClick={()=>setSel(null)} style={{fontFamily:"inherit",fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",padding:"0 0 16px"}}>← Voltar</button>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14,alignItems:"start"}}>
        <div>
          <div style={{background:m.colorD,border:`1px solid ${m.color}33`,borderRadius:11,padding:"18px 22px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:48,height:48,borderRadius:11,background:`${m.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{m.icon}</div>
              <div><div style={{fontSize:18,fontWeight:700,color:C.txt,marginBottom:3}}>{m.name}</div><div style={{fontSize:12,color:C.dim,fontStyle:"italic"}}>{m.tagline}</div></div>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:m.color,background:`${m.color}15`,border:`1px solid ${m.color}33`,borderRadius:20,padding:"2px 9px"}}>{m.ef}</span>
          </div>
          {[["O que é",m.w],["Quando usar",m.wh]].map(([t,v])=><div key={t} style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:9,padding:"11px 13px",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:C.txt,marginBottom:7,display:"flex",gap:6}}><span style={{color:m.color}}>●</span>{t}</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.65}}>{v}</div>
          </div>)}
          <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:9,padding:"11px 13px"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.txt,marginBottom:10,display:"flex",gap:6}}><span style={{color:m.color}}>●</span>Passo a passo</div>
            {m.h.map((step,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:7}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:m.colorD,border:`1px solid ${m.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,color:m.color,flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.5,paddingTop:2}}>{step}</div>
            </div>)}
          </div>
        </div>
        <div>
          <div style={{background:C.lavD,border:"1px solid rgba(139,92,246,.2)",borderRadius:9,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:C.lav,marginBottom:6}}>🧬 Por que funciona</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>{m.sc}</div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:9,padding:"11px 13px"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.txt,marginBottom:8}}>Outras metodologias</div>
            {MD.filter(x=>x.id!==sel).slice(0,5).map(x=><div key={x.id} onClick={()=>setSel(x.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 4px",borderRadius:6,cursor:"pointer",marginBottom:2}}>
              <span style={{fontSize:13}}>{x.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:11,color:C.txt}}>{x.name}</div><div style={{fontSize:10,color:C.muted}}>{x.ef}</div></div>
              <span style={{fontSize:10,color:C.blue}}>→</span>
            </div>)}
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── MAIN APP ── */
export default function StudyAI(){
  const[page,setPage]=useState("landing");
  const[screen,setScreen]=useState("dashboard");
  const[collapsed,setCollapsed]=useState(false);
  const[disciplines,setDisciplines]=useState(INIT_DISCS);
  const[calEvents,setCalEvents]=useState(()=>generateCalendar(INIT_DISCS,DEFAULT_AVAIL));
  const[drawerEv,setDrawerEv]=useState(null);
  const[genVisible,setGenVisible]=useState(false);
  const[toast,setToastState]=useState({msg:"",visible:false,type:"ok"});
  const[settingsTab,setSettingsTab]=useState("profile");
  const[wkOffset,setWkOffset]=useState(0);
  const[aiMessages,setAiMessages]=useState([
    {role:"ai",text:"Olá! Aderência em 84% esta semana 🎯\n\nSessão de Grafos — BFS/DFS ficou em aberto. Reagendo para hoje às 20h?"},
    {role:"ai",text:"Revisão de Limites com 14 dias de atraso no FSRS. Adicionei 25 min no sábado."},
  ]);
  const[aiInput,setAiInput]=useState("");
  const aiIdx=useRef(0);
  const[timerOn,setTimerOn]=useState(false);
  const[timerSec,setTimerSec]=useState(45*60);
  const timerRef=useRef(null);
  const TOTAL=45*60;
  const[recallIdx,setRecallIdx]=useState(0);
  const[recallAns,setRecallAns]=useState("");
  const[clChecks,setClChecks]=useState([true,false,false,false,false]);
  const[aicMsgs,setAicMsgs]=useState(["🧠 Active Recall ativo — feche o material e explique BFS/DFS com suas palavras.","💡 BFS usa fila (FIFO). DFS usa pilha. Ambos O(V+E)."]);
  const[aicInput,setAicInput]=useState("");
  const aicIdx=useRef(0);
  const[notifToggles,setNotifToggles]=useState([true,true,true,false,true]);
  const[methodSel,setMethodSel]=useState([true,true,true,false,false,false,false,false]);
  const[userAvail,setUserAvail]=useState(()=>{const s={};DAYS_LABELS.forEach((_,di)=>SLOT_LABELS.forEach((_,si)=>{s[`${di}-${si}`]=DEFAULT_AVAIL[di]?.includes(si)||false;}));return s;});
  const[focusMode,setFocusMode]=useState(false);
  const[celebrating,setCelebrating]=useState(false);

  function showToast(msg,type="ok"){setToastState({msg,visible:true,type});setTimeout(()=>setToastState(p=>({...p,visible:false})),3000);}
  function goApp(s){setPage("app");setScreen(s||"dashboard");}
  function regenCalendar(discs,avail){
    const slotMap={};
    DAYS_LABELS.forEach((_,di)=>{slotMap[di]=SLOT_LABELS.map((_,si)=>avail[`${di}-${si}`]?si:null).filter(s=>s!==null);});
    setCalEvents(generateCalendar(discs,slotMap));
  }

  useEffect(()=>{
    if(timerOn){timerRef.current=setInterval(()=>{setTimerSec(s=>{if(s<=1){clearInterval(timerRef.current);setTimerOn(false);setCelebrating(true);return TOTAL;}return s-1;});},1000);}
    else clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[timerOn]);

  useEffect(()=>{
    function onKey(e){
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA") return;
      if(e.key===" "&&screen==="session"){e.preventDefault();setTimerOn(p=>!p);}
      if(e.key==="Escape"){setDrawerEv(null);setFocusMode(false);}
      if(e.key==="ArrowRight"&&screen==="session"){setRecallIdx(p=>(p+1)%RECALL_QS.length);setRecallAns("");}
      if(e.key==="f"&&screen==="session"){setFocusMode(p=>!p);}
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[screen,timerOn]);

  function fmtTime(s){return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}

  function sendAI(){
    if(!aiInput.trim()) return;
    const msg=aiInput.trim();
    setAiMessages(p=>[...p,{role:"user",text:msg}]);
    setAiInput("");
    setTimeout(()=>{setAiMessages(p=>[...p,{role:"ai",text:AI_RESPS[aiIdx.current%AI_RESPS.length]}]);aiIdx.current++;},750);
  }
  function sendAIC(){
    if(!aicInput.trim()) return;
    const r=["BFS: fila (FIFO), O(V+E). DFS: pilha, menos memória na prática.","Quase! BFS garante menor nº de arestas — não menor peso.","Excelente! Próxima: complexidade de espaço de BFS?"];
    setAicMsgs(p=>[...p,"Você: "+aicInput.trim()]);
    const cur=aicInput;setAicInput("");
    setTimeout(()=>{setAicMsgs(p=>[...p,r[aicIdx.current%r.length]]);aicIdx.current++;},700);
  }

  const mn=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const baseWk=new Date(2026,6,21);baseWk.setDate(baseWk.getDate()+wkOffset*7);
  const baseWkE=new Date(baseWk);baseWkE.setDate(baseWkE.getDate()+6);
  const weekLabel=`${baseWk.getDate()}–${baseWkE.getDate()} ${mn[baseWk.getMonth()]}, ${baseWk.getFullYear()}`;

  const hmLvls=[0,0,1,2,3,4,2,1,0,3,4,2,1,0,2,3,4,1,0,2,3,0,1,2,4,3,2,1,0,0,1,2,3,4,2,1,0,3,4,0,1,2,3,4,2,3,1,0,2,3,4,0,1,2,3,4,0,1,2,3,4,3,2,1,0,2,3,4,0,1,2,3,4,0,1,2,3,4,2,1,0,3,4,2];
  const hmCols=["rgba(255,255,255,.06)","rgba(34,197,94,.18)","rgba(34,197,94,.4)","rgba(34,197,94,.65)",C.grn];

  /* ── LANDING ── */
  if(page==="landing") return <>
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",color:C.txt,fontSize:13}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3rem",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:400,height:200,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(59,130,246,.1) 0%,transparent 65%)",top:"45%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",maxWidth:460}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:5,background:C.blueD,border:"1px solid rgba(59,130,246,.22)",color:C.blue,fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",padding:"3px 10px",borderRadius:20,marginBottom:18}}>✦ Beta · 2026</div>
          <h1 style={{fontSize:34,fontWeight:700,color:"#fff",lineHeight:1.12,letterSpacing:"-0.04em",marginBottom:12}}>Estude com a inteligência<br/>de um <span style={{color:C.blue}}>tutor pessoal</span></h1>
          <p style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:24}}>StudyAI constrói e adapta seu calendário aplicando repetição espaçada, interleaving e active recall — com agentes de IA que aprendem com seu progresso.</p>
          <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap",justifyContent:"center"}}>
            {["Calendário gerado por IA","FSRS — repetição espaçada","Interleaving automático","Adapta ao seu ritmo"].map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}><span style={{color:C.grn}}>✓</span>{f}</div>)}
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <Btn primary onClick={()=>goApp("dashboard")} style={{fontSize:13,padding:"10px 22px"}}>Começar agora →</Btn>
            <Btn onClick={()=>goApp("dashboard")} style={{fontSize:13,padding:"10px 18px"}}>Ver demo ao vivo</Btn>
          </div>
        </div>
      </div>
      <div style={{width:360,flexShrink:0,background:C.surf,borderLeft:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",justifyContent:"center",padding:"2.5rem 2rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:26}}>
          <div style={{width:24,height:24,borderRadius:6,background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>S</div>
          <span style={{fontSize:14,fontWeight:600,color:C.txt}}>StudyAI</span>
        </div>
        <div style={{fontSize:15,fontWeight:700,color:C.txt,marginBottom:4}}>Bem-vindo de volta</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Entre para continuar seu plano</div>
        <button onClick={()=>goApp("dashboard")} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:10,borderRadius:8,background:C.card,border:`1px solid ${C.bdr}`,color:C.dim,fontSize:13,fontWeight:500,cursor:"pointer",marginBottom:8,fontFamily:"inherit"}}>
          <span>G</span> Continuar com Google
        </button>
        <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0"}}><div style={{flex:1,height:1,background:C.bdr}}/><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>ou com e-mail</span><div style={{flex:1,height:1,background:C.bdr}}/></div>
        <div style={{marginBottom:10}}><label style={lbl}>E-mail</label><input style={inp} type="email" placeholder="voce@email.com"/></div>
        <div style={{marginBottom:14}}><label style={lbl}>Senha</label><input style={inp} type="password" placeholder="••••••••"/></div>
        <Btn primary onClick={()=>goApp("dashboard")} style={{width:"100%",justifyContent:"center",fontSize:13,padding:10}}>Entrar</Btn>
        <div style={{marginTop:14,textAlign:"center",fontSize:11,color:C.muted}}>
          Não tem conta? <span style={{color:C.blue,cursor:"pointer"}} onClick={()=>goApp("dashboard")}>Criar agora</span>
        </div>
      </div>
    </div>
    <Toast {...toast}/>
  </>;

  /* ── APP ── */
  const LABELS={dashboard:"Calendário",session:"Sessão ativa",progress:"Progresso",disciplines:"Matérias",methods:"Metodologias",settings:"Configurações"};
  const SUBS={dashboard:`Semana 30 · ${weekLabel}`,session:"Grafos — BFS/DFS · módulo 5",progress:"Últimas 4 semanas",disciplines:`${disciplines.length} matérias`,methods:"8 técnicas",settings:"Preferências"};

  return <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",fontSize:13,color:C.txt,overflow:"hidden"}}>
    <Sidebar collapsed={collapsed} onToggle={()=>setCollapsed(p=>!p)} screen={screen} setScreen={setScreen} disciplines={disciplines}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
      {/* TOPBAR */}
      <div style={{height:48,background:C.surf,borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",padding:"0 1.25rem",gap:8,flexShrink:0}}>
        <span style={{fontSize:13,fontWeight:600,color:C.txt}}>{LABELS[screen]}</span>
        <span style={{fontSize:11,color:C.muted,marginLeft:4}}>{SUBS[screen]}</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {screen==="dashboard"&&<Btn primary sm onClick={()=>setGenVisible(true)}>⚡ Replanejar</Btn>}
          <button onClick={()=>showToast("Sem novas notificações","info")} style={{width:28,height:28,borderRadius:7,background:C.card,border:`1px solid ${C.bdr}`,color:C.dim,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>🔔</button>
          <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${C.blue},${C.lav})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",cursor:"pointer"}}>U</div>
        </div>
      </div>

      {/* ── DASHBOARD ── */}
      {screen==="dashboard"&&<div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
        {disciplines.length===0
          ?<EmptyState icon="📅" title="Calendário vazio" desc="Adicione suas matérias para que o StudyAI gere um calendário personalizado com repetição espaçada e interleaving." cta="Ir para Matérias" onCta={()=>setScreen("disciplines")}/>
          :<><div style={{padding:"10px 16px 8px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,flexShrink:0}}>
          <StatCard icon="📅" iconBg={C.blueD} value={calEvents.length} label="sessões esta semana" delta="+3" deltaDir="up"/>
          <StatCard icon="⏱" iconBg={C.lavD} value="17h" label="tempo planejado" delta="+2h" deltaDir="up"/>
          <StatCard icon="✅" iconBg={C.grnD} value="84%" label="aderência" delta="−4%" deltaDir="dn"/>
          <StatCard icon="🔁" iconBg={C.ambD} value={calEvents.filter(e=>e.meth.includes("Espaçada")).length} label="revisões espaçadas" delta="+5" deltaDir="up"/>
        </div>
        <div style={{flex:1,display:"flex",overflow:"hidden",margin:"0 16px 14px",border:`1px solid ${C.bdr}`,borderRadius:10}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"8px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>setWkOffset(p=>p-1)} style={{width:24,height:24,borderRadius:5,background:C.card,border:`1px solid ${C.bdr}`,color:C.dim,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>{weekLabel}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>Semana 30 · Prova em 18 dias</div></div>
                <button onClick={()=>setWkOffset(p=>p+1)} style={{width:24,height:24,borderRadius:5,background:C.card,border:`1px solid ${C.bdr}`,color:C.dim,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                <button onClick={()=>setWkOffset(0)} style={{width:34,height:24,borderRadius:5,background:C.card,border:`1px solid ${C.bdr}`,color:C.blue,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600}}>HOJ</button>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {disciplines.slice(0,4).map(d=><div key={d.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.muted}}><div style={{width:7,height:7,borderRadius:2,background:d.color}}/>{d.name.split(" ")[0]}</div>)}
              </div>
            </div>
            <CalGrid events={calEvents} onClickEv={ev=>setDrawerEv(ev)}/>
          </div>
          {/* AI Panel */}
          <div style={{width:245,flexShrink:0,background:C.surf,borderLeft:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"9px 12px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:C.lav,boxShadow:`0 0 5px ${C.lav}`,flexShrink:0,animation:"pulse-lav 2.2s infinite"}}/>
              <div><div style={{fontSize:12,fontWeight:600,color:C.txt}}>Assistente IA</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted}}>Orchestrator · ativo</div></div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:9,display:"flex",flexDirection:"column",gap:7}}>
              {aiMessages.map((m,i)=><div key={i}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3,color:m.role==="ai"?C.lav:C.blue,textAlign:m.role==="user"?"right":"left"}}>{m.role==="ai"?"StudyAI":"Você"}</div>
                <div style={{fontSize:11,lineHeight:1.5,padding:"6px 8px",borderRadius:8,background:m.role==="ai"?C.card:C.blueD,border:`1px solid ${m.role==="ai"?C.bdr:"rgba(59,130,246,.18)"}`,color:C.txt,textAlign:m.role==="user"?"right":"left",whiteSpace:"pre-wrap"}}>{m.text}</div>
                {i===0&&m.role==="ai"&&<div style={{display:"flex",gap:5,marginTop:4}}>
                  <button onClick={()=>{setAiMessages(p=>[...p,{role:"user",text:"Sim, reagenda!"}]);setTimeout(()=>setAiMessages(p=>[...p,{role:"ai",text:"Reagendei para hoje às 21h! 🔔"}]),750);}} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,background:C.card,border:`1px solid ${C.bdr}`,color:C.muted,borderRadius:3,padding:"2px 7px",cursor:"pointer"}}>✓ Sim</button>
                  <button onClick={()=>{setAiMessages(p=>[...p,{role:"user",text:"Vou pular."}]);setTimeout(()=>setAiMessages(p=>[...p,{role:"ai",text:"Redistribuí para a próxima semana."}]),750);}} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,background:C.card,border:`1px solid ${C.bdr}`,color:C.muted,borderRadius:3,padding:"2px 7px",cursor:"pointer"}}>✗ Pular</button>
                </div>}
              </div>)}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"0 9px 7px"}}>
              {["⏱ Quanto falta?","🧠 Quiz","😓 Sobrecarregado"].map((c,i)=><button key={i} onClick={()=>{setAiMessages(p=>[...p,{role:"user",text:c}]);setTimeout(()=>setAiMessages(p=>[...p,{role:"ai",text:AI_RESPS[(aiIdx.current++)%AI_RESPS.length]}]),750);}} style={{fontSize:10,color:C.muted,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:20,padding:"2px 7px",cursor:"pointer"}}>{c}</button>)}
            </div>
            <div style={{padding:"7px 9px",borderTop:`1px solid ${C.bdr}`}}>
              <div style={{display:"flex",alignItems:"flex-end",gap:5,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,padding:"5px 5px 5px 9px"}}>
                <textarea value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAI();}}} placeholder="Pergunte sobre seu plano…" rows={1} style={{flex:1,background:"none",border:"none",outline:"none",fontFamily:"inherit",fontSize:11,color:C.txt,resize:"none",lineHeight:1.4,maxHeight:50}}/>
                <button onClick={sendAI} style={{width:22,height:22,borderRadius:5,background:C.lav,border:"none",color:"#fff",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>↑</button>
              </div>
            </div>
          </div>
        </div></>}
      </div>}

      {/* ── SESSION ── */}
      {screen==="session"&&<div style={{flex:1,overflowY:"auto",padding:"1.5rem",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Sessão ativa</div><div style={{fontSize:18,fontWeight:700,color:C.txt}}>BFS e DFS — Algoritmos</div></div>
          <div style={{display:"flex",gap:8}}>
            <Tip label="Modo foco (tecla F)"><button onClick={()=>setFocusMode(true)} style={{width:28,height:28,borderRadius:7,background:C.card,border:`1px solid ${C.bdr}`,color:C.dim,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>⛶</button></Tip>
            <Btn sm onClick={()=>setScreen("dashboard")}>← Calendário</Btn>
          </div>
        </div>
        {/* Focus Mode Overlay */}
        {focusMode&&<div style={{position:"fixed",inset:0,background:C.bg,zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18}}>
          <button onClick={()=>setFocusMode(false)} style={{position:"absolute",top:16,right:16,width:32,height:32,borderRadius:8,background:C.card,border:`1px solid ${C.bdr}`,color:C.dim,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted}}>Grafos — BFS e DFS</div>
          <div style={{position:"relative",width:200,height:200}}>
            <svg width="200" height="200" style={{transform:"rotate(-90deg)"}}>
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="7"/>
              <defs><linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={C.blue}/><stop offset="100%" stopColor={C.lav}/></linearGradient></defs>
              <circle cx="100" cy="100" r="88" fill="none" stroke="url(#fg)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={2*Math.PI*88} strokeDashoffset={2*Math.PI*88*(1-timerSec/TOTAL)}
                style={{transition:"stroke-dashoffset .5s ease",filter:timerOn?"drop-shadow(0 0 8px #3B82F6)":"none"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:42,fontWeight:300,color:C.txt,lineHeight:1}}>{fmtTime(timerSec)}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:5,textTransform:"uppercase",letterSpacing:"0.15em"}}>{timerOn?"foco":"pausado"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setTimerSec(TOTAL);setTimerOn(false);}} style={{width:42,height:42,borderRadius:10,border:`1px solid ${C.bdr}`,background:C.card,color:C.dim,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>↺</button>
            <button onClick={()=>setTimerOn(p=>!p)} style={{width:58,height:58,borderRadius:14,background:timerOn?"rgba(239,68,68,.15)":C.blue,border:timerOn?`1px solid ${C.red}`:"none",color:"#fff",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}}>{timerOn?"⏸":"▶"}</button>
            <button onClick={()=>showToast("Próxima fase: intervalo","info")} style={{width:42,height:42,borderRadius:10,border:`1px solid ${C.bdr}`,background:C.card,color:C.dim,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>⏭</button>
          </div>
          <div style={{fontSize:11,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>Space = play/pause · → = próxima pergunta · Esc = sair</div>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 295px",gap:14}}>
          <div>
            {/* Timer card */}
            <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"14px",textAlign:"center",marginBottom:12,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-40,left:"50%",transform:"translateX(-50%)",width:260,height:130,background:"radial-gradient(ellipse,rgba(59,130,246,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
              <div style={{display:"inline-flex",alignItems:"center",gap:5,fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",background:`${C.blue}22`,color:C.blue,borderRadius:4,padding:"2px 7px",marginBottom:9}}>Algoritmos e Estruturas de Dados</div>
              <div style={{fontSize:15,fontWeight:700,color:C.txt,marginBottom:3}}>Grafos — BFS e DFS</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:18}}>Módulo 5 · Active Recall + Prática · 45 min</div>
              <div style={{position:"relative",width:134,height:134,margin:"0 auto 18px"}}>
                <svg width="134" height="134" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="67" cy="67" r="58" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5"/>
                  <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={C.blue}/><stop offset="100%" stopColor={C.lav}/></linearGradient></defs>
                  <circle cx="67" cy="67" r="58" fill="none" stroke="url(#rg)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={2*Math.PI*58} strokeDashoffset={2*Math.PI*58*(1-timerSec/TOTAL)}
                    style={{transition:"stroke-dashoffset .5s ease",filter:timerOn?"drop-shadow(0 0 5px #3B82F6)":"none"}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:28,fontWeight:400,color:C.txt,lineHeight:1}}>{fmtTime(timerSec)}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:3,textTransform:"uppercase",letterSpacing:"0.1em"}}>{timerOn?"foco":"pausado"}</div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:10}}>
                <button onClick={()=>{setTimerSec(TOTAL);setTimerOn(false);}} style={{width:32,height:32,borderRadius:7,border:`1px solid ${C.bdr}`,background:C.card2,color:C.dim,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>↺</button>
                <button onClick={()=>setTimerOn(p=>!p)} style={{width:42,height:42,borderRadius:9,background:timerOn?"rgba(239,68,68,.15)":C.blue,border:timerOn?`1px solid ${C.red}`:"none",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .2s"}}>{timerOn?"⏸":"▶"}</button>
                <button onClick={()=>showToast("Próxima fase: intervalo","info")} style={{width:32,height:32,borderRadius:7,border:`1px solid ${C.bdr}`,background:C.card2,color:C.dim,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>⏭</button>
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:5}}>
                {[0,1,2,3].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<2?C.blue:i===2?C.blue:C.card2,boxShadow:i===2?`0 0 5px ${C.blue}`:"none"}}/>)}
              </div>
            </div>
            {/* Checklist */}
            <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"11px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                <span style={{fontSize:13,fontWeight:600,color:C.txt}}>Checklist</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.grn}}>{clChecks.filter(Boolean).length}/{clChecks.length}</span>
              </div>
              {["Revisar anotações sobre Grafos","Implementar BFS em Python","Implementar DFS iterativo","Active recall: BFS×DFS sem consultar","Marcar sessão como concluída"].map((item,i)=><div key={i} onClick={()=>setClChecks(p=>p.map((v,j)=>j===i?!v:v))} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 3px",borderRadius:5,cursor:"pointer"}}>
                <div style={{width:13,height:13,borderRadius:3,border:`1.5px solid ${clChecks[i]?C.grn:"rgba(255,255,255,.13)"}`,background:clChecks[i]?C.grn:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#000",flexShrink:0}}>{clChecks[i]&&"✓"}</div>
                <span style={{fontSize:12,color:clChecks[i]?C.muted:C.dim,textDecoration:clChecks[i]?"line-through":"none"}}>{item}</span>
              </div>)}
            </div>
          </div>
          <div>
            {/* AI Coach */}
            <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,marginBottom:10,overflow:"hidden"}}>
              <div style={{padding:"9px 12px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:C.lav,boxShadow:`0 0 5px ${C.lav}`,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>Agente de Estudo</span>
              </div>
              <div style={{padding:9,display:"flex",flexDirection:"column",gap:6,maxHeight:160,overflowY:"auto"}}>
                {aicMsgs.map((m,i)=><div key={i} style={{fontSize:11,color:C.txt,background:C.card2,border:`1px solid ${C.bdr}`,borderRadius:7,padding:"6px 8px",lineHeight:1.5}}>{m}</div>)}
              </div>
              <div style={{padding:"7px 9px",borderTop:`1px solid ${C.bdr}`,display:"flex",gap:5}}>
                <input value={aicInput} onChange={e=>setAicInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAIC()} placeholder="Dúvida ou resposta…" style={{flex:1,background:"none",border:"none",outline:"none",fontFamily:"inherit",fontSize:11,color:C.txt}}/>
                <button onClick={sendAIC} style={{width:20,height:20,borderRadius:4,background:C.lav,border:"none",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
              </div>
            </div>
            {/* Active Recall */}
            <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"11px 13px"}}>
              <div style={{fontSize:12,fontWeight:600,color:C.txt,marginBottom:8}}>🧠 Active Recall</div>
              <div style={{background:C.card2,border:`1px solid ${C.bdr}`,borderRadius:7,padding:"7px 9px",fontSize:12,color:C.txt,lineHeight:1.5,marginBottom:8}}>{RECALL_QS[recallIdx]}</div>
              <textarea value={recallAns} onChange={e=>setRecallAns(e.target.value)} placeholder="Escreva sua resposta…" style={{...ta,minHeight:50,marginBottom:7}}/>
              <div style={{display:"flex",gap:6}}>
                <Btn primary sm onClick={()=>{if(!recallAns.trim()){showToast("Escreva sua resposta primeiro","warn");return;}showToast("Registrado — IA avaliando 🧠","info");setTimeout(()=>{setRecallIdx(p=>(p+1)%RECALL_QS.length);setRecallAns("");},1200);}}>✓ Verificar</Btn>
                <Btn sm onClick={()=>{setRecallIdx(p=>(p+1)%RECALL_QS.length);setRecallAns("");}}>→ Próxima</Btn>
              </div>
            </div>
          </div>
        </div>
      </div>}

      {/* ── DISCIPLINES ── */}
      {screen==="disciplines"&&<div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Gestão</div><div style={{fontSize:18,fontWeight:700,color:C.txt,marginBottom:4}}>Matérias</div><div style={{fontSize:12,color:C.dim}}>Calendário gerado proporcionalmente às horas de cada matéria.</div></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn sm onClick={()=>showToast("Importar ementa em PDF","info")}>📎 Importar PDF</Btn>
            <Btn primary sm onClick={()=>{const color=DISC_COLORS[disciplines.length%DISC_COLORS.length];const d={id:Date.now(),name:"Nova matéria",type:"Graduação",horas:4,prioridade:"Média",prova:"",color,prog:0,modules:[]};const next=[...disciplines,d];setDisciplines(next);regenCalendar(next,userAvail);showToast("Matéria adicionada — clique no nome para editar","ok");}}>+ Nova matéria</Btn>
          </div>
        </div>
        {disciplines.length===0
          ?<EmptyState icon="📚" title="Nenhuma matéria ainda" desc="Adicione sua primeira disciplina para que o StudyAI gere um calendário personalizado com base nas suas horas e módulos." cta="+ Adicionar primeira matéria" onCta={()=>{const color=DISC_COLORS[0];const d={id:Date.now(),name:"Nova matéria",type:"Graduação",horas:4,prioridade:"Média",prova:"",color,prog:0,modules:[]};setDisciplines([d]);regenCalendar([d],userAvail);showToast("Clique no nome para editar","ok");}}/>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
          {disciplines.map(d=>{
            const daysLeft=d.prova?Math.max(0,Math.ceil((new Date(d.prova)-Date.now())/86400000)):null;
            const sessWk=calEvents.filter(e=>e.discId===d.id).length;
            const eta=calcETA(d);
            const uB=urgencyBorder(d.prova);
            return <div key={d.id} style={{background:C.card,borderRadius:10,overflow:"hidden",...(Object.keys(uB).length?uB:{border:`1px solid ${C.bdr}`})}}>
              <div style={{height:3,background:d.color}}/>
              <div style={{padding:"11px 13px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:9}}>
                  <div style={{flex:1,minWidth:0,marginRight:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:2}}>
                      <InlineEdit value={d.name} onSave={v=>setDisciplines(p=>p.map(x=>x.id===d.id?{...x,name:v}:x))} style={{fontSize:13,fontWeight:700,color:C.txt}}/>
                    </div>
                    <div style={{fontSize:11,color:C.muted}}>{d.type} · {d.modules.length} mód. · {sessWk}/sem</div>
                  </div>
                  <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                    {daysLeft!==null&&daysLeft<=7&&<Tip label={`Prova em ${daysLeft} dias!`}><span style={{fontSize:12,cursor:"default"}}>⚠️</span></Tip>}
                    <button onClick={()=>{const next=disciplines.filter(x=>x.id!==d.id);setDisciplines(next);regenCalendar(next,userAvail);showToast("Removida","warn");}} style={{width:20,height:20,borderRadius:4,background:C.card2,border:`1px solid ${C.bdr}`,color:C.muted,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:9}}>
                  {[[`${d.horas}h`,"por semana",d.color],[`${d.prog}%`,"concluído",C.grn],[daysLeft!==null?`${daysLeft}d`:"—","para a prova",daysLeft!==null&&daysLeft<=3?C.red:C.amb]].map(([v,l,c],i)=><div key={i} style={{background:C.card2,borderRadius:5,padding:"5px 7px",textAlign:"center"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:c,lineHeight:1}}>{v}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{l}</div>
                  </div>)}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4}}><span style={{color:C.muted}}>Progresso</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:C.txt}}>{d.prog}%</span></div>
                <div style={{height:3,background:C.card2,borderRadius:2,marginBottom:9,overflow:"hidden"}}><div style={{height:3,background:d.color,width:`${d.prog}%`,borderRadius:2,transition:"width .6s ease"}}/></div>
                {eta&&<div style={{background:C.card2,border:`1px solid ${C.bdr}`,borderRadius:6,padding:"5px 8px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:11}}>🎯</span>
                  <span style={{fontSize:11,color:C.dim}}>Conclui em <strong style={{color:C.txt}}>{eta} {eta===1?"semana":"semanas"}</strong> no ritmo atual</span>
                </div>}
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {d.modules.slice(0,4).map((m,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.dim}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:m.status==="done"?C.grn:m.status==="prog"?C.blue:C.muted,flexShrink:0}}/>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                    <span onClick={()=>setDisciplines(p=>p.map(x=>x.id===d.id?{...x,modules:x.modules.map((mm,j)=>j===i?{...mm,status:mm.status==="done"?"pend":mm.status==="prog"?"done":"prog"}:mm)}:x))} title="Clique para mudar status" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,padding:"1px 4px",borderRadius:3,cursor:"pointer",background:m.status==="done"?C.grnD:m.status==="prog"?C.blueD:C.card2,color:m.status==="done"?C.grn:m.status==="prog"?C.blue:C.muted}}>{m.status==="done"?"✓ feito":m.status==="prog"?"→ em curso":"pendente"}</span>
                  </div>)}
                  {d.modules.length>4&&<div style={{fontSize:10,color:C.muted,paddingLeft:11}}>+{d.modules.length-4} módulos</div>}
                </div>
              </div>
              <div style={{padding:"7px 13px",borderTop:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:11,color:C.muted}}><strong style={{color:C.dim}}>{sessWk}</strong> sessões esta semana</div>
                <Btn sm onClick={()=>setScreen("session")}>▶ Estudar</Btn>
              </div>
            </div>;
          })}
        </div>}
      </div>}

      {/* ── PROGRESS ── */}
      {screen==="progress"&&<div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Analytics</div><div style={{fontSize:18,fontWeight:700,color:C.txt}}>Progresso</div></div>
          <div style={{display:"flex",gap:8}}>
            <select style={{...sel,width:145,padding:"5px 9px",fontSize:12}}><option>Últimas 4 semanas</option><option>Este mês</option><option>Semestre</option></select>
            <Btn sm onClick={()=>showToast("Exportando PDF…","ok")}>Exportar PDF</Btn>
          </div>
        </div>
        {disciplines.length===0
          ?<EmptyState icon="📈" title="Sem dados ainda" desc="Complete algumas sessões de estudo para ver seu progresso, heatmap e insights dos agentes aqui." cta="Ver matérias" onCta={()=>setScreen("disciplines")}/>
          :<><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          <StatCard icon="🔥" iconBg={C.ambD} value="7" label="dias consecutivos" delta="recorde" deltaDir="up"/>
          <StatCard icon="📚" iconBg={C.blueD} value="68h" label="total do mês" delta="+12h" deltaDir="up"/>
          <StatCard icon="🎯" iconBg={C.grnD} value="84%" label="aderência geral" delta="estável" deltaDir="neu"/>
          <StatCard icon="🧠" iconBg={C.lavD} value="134" label="revisões feitas" delta="+28" deltaDir="up"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
          <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"11px 13px"}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:9,paddingBottom:5,borderBottom:`1px solid ${C.bdr}`}}>Mapa de atividade — 12 semanas</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:5,fontSize:10,color:C.muted,textAlign:"center"}}>
              {["S","T","Q","Q","S","S","D"].map((d,i)=><div key={i}>{d}</div>)}
            </div>
            {Array.from({length:12},(_,w)=><div key={w} style={{display:"flex",gap:2,marginBottom:3}}>
              {Array.from({length:7},(_,d)=>{const lv=hmLvls[w*7+d]||0;return <div key={d} style={{flex:1,height:16,borderRadius:3,background:hmCols[lv]}}/>;})}</div>)}
            <div style={{display:"flex",gap:7,alignItems:"center",marginTop:7}}>
              <span style={{fontSize:10,color:C.muted}}>Menos</span>
              {hmCols.map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:c}}/>)}
              <span style={{fontSize:10,color:C.muted}}>Mais</span>
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"11px 13px"}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:9,paddingBottom:5,borderBottom:`1px solid ${C.bdr}`}}>Sessões por matéria — esta semana</div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {disciplines.map(d=>{const cnt=calEvents.filter(e=>e.discId===d.id).length;const mx=Math.max(...disciplines.map(x=>calEvents.filter(e=>e.discId===x.id).length),1);return <div key={d.id} style={{display:"flex",alignItems:"center",gap:9}}>
                <span style={{fontSize:11,color:C.dim,width:110,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
                <div style={{flex:1,height:5,background:C.card2,borderRadius:3,overflow:"hidden"}}><div style={{height:5,background:d.color,width:`${Math.round((cnt/mx)*100)}%`,borderRadius:3}}/></div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,width:18,textAlign:"right",flexShrink:0}}>{cnt}</span>
              </div>;})}
            </div>
          </div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"11px 13px"}}>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:9,paddingBottom:5,borderBottom:`1px solid ${C.bdr}`}}>Insights dos agentes</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {[["📈","Suas sessões de manhã têm aderência 18% maior. O Scheduler priorizou esses slots para módulos de alta carga.","Pedagogy Agent · há 2h"],["⚠️","Você tem 18 flashcards com revisão atrasada. Prioridade alta para esta semana.","Progress Agent · hoje"],["🏆","7 dias consecutivos! Próximo marco: 14 dias.","Notification Agent · ontem"]].map(([ico,txt,meta],i)=><div key={i} style={{background:C.card2,border:`1px solid ${C.bdr}`,borderRadius:7,padding:"9px 11px",display:"flex",gap:9}}>
              <span style={{fontSize:13,flexShrink:0,marginTop:1}}>{ico}</span>
              <div><div style={{fontSize:12,color:C.txt,lineHeight:1.5,marginBottom:2}}>{txt}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{meta}</div></div>
            </div>)}
          </div>
        </div></>}
      </div>}

      {/* ── METHODS ── */}
      {screen==="methods"&&<MethodsScreen/>}

      {/* ── SETTINGS ── */}
      {screen==="settings"&&<div style={{flex:1,overflowY:"auto",padding:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
          <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Sistema</div><div style={{fontSize:18,fontWeight:700,color:C.txt}}>Configurações</div></div>
          <Btn primary sm onClick={()=>{regenCalendar(disciplines,userAvail);showToast("Salvo e calendário atualizado!","ok");}}>Salvar alterações</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"150px 1fr",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {[["profile","Perfil"],["notif","Notificações"],["horarios","Horários"],["ia","IA & Agentes"]].map(([id,l])=><button key={id} onClick={()=>setSettingsTab(id)} style={{fontSize:12,color:settingsTab===id?C.blue:C.dim,padding:"6px 9px",borderRadius:6,cursor:"pointer",border:"none",background:settingsTab===id?C.blueD:"transparent",textAlign:"left",width:"100%"}}>{l}</button>)}
          </div>
          <div>
            {settingsTab==="profile"&&<div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
                <div><label style={lbl}>Nome</label><input style={inp} defaultValue="Estudante"/></div>
                <div><label style={lbl}>E-mail</label><input style={inp} defaultValue="estudante@email.com"/></div>
              </div>
              <div><label style={lbl}>Bio para a IA</label><textarea style={ta} defaultValue="Estudo Engenharia no 4º semestre. Prefiro exemplos práticos. Meu melhor horário é de manhã."/></div>
            </div>}
            {settingsTab==="notif"&&<div>
              {[["Lembrete de sessão","Notificar 10 min antes de cada bloco"],["Relatório semanal","Domingo às 20h — resumo da semana"],["Revisão atrasada","Avisar quando revisão espaçada está vencida"],["Streak em risco","Alertar se não houver sessão até 21h"],["Silêncio noturno","Sem notificações entre 23h–7h"]].map(([l,d],i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.bdr}`}}>
                <div><div style={{fontSize:12,color:C.txt,marginBottom:1}}>{l}</div><div style={{fontSize:11,color:C.muted}}>{d}</div></div>
                <div onClick={()=>setNotifToggles(p=>p.map((v,j)=>j===i?!v:v))} style={{position:"relative",width:32,height:17,cursor:"pointer",flexShrink:0}}>
                  <div style={{position:"absolute",inset:0,borderRadius:17,background:notifToggles[i]?C.blue:"rgba(255,255,255,.13)",transition:"background .18s"}}/>
                  <div style={{position:"absolute",top:3,left:3,width:11,height:11,borderRadius:"50%",background:"#fff",transition:"transform .18s",transform:notifToggles[i]?"translateX(15px)":"translateX(0)"}}/>
                </div>
              </div>)}
            </div>}
            {settingsTab==="horarios"&&<div>
              <div style={{fontSize:12,color:C.dim,marginBottom:10,lineHeight:1.6}}>Clique nos slots para marcar disponibilidade. O calendário regenera ao salvar.</div>
              <SchedGrid slots={userAvail} setSlots={setUserAvail}/>
              <div style={{display:"flex",gap:7,marginTop:9}}>
                <Btn sm onClick={()=>{const n={};DAYS_LABELS.forEach((_,di)=>SLOT_LABELS.forEach((_,si)=>{n[`${di}-${si}`]=true;}));setUserAvail(n);}}>Selecionar todos</Btn>
                <Btn sm onClick={()=>setUserAvail({})}>Limpar</Btn>
              </div>
            </div>}
            {settingsTab==="ia"&&<div>
              <div style={{marginBottom:9}}><label style={lbl}>Modelo principal</label><select style={sel}><option>Claude Sonnet 4.6 (recomendado)</option><option>Claude Opus 4.6 (mais poderoso)</option><option>Claude Haiku 4.5 (mais rápido)</option></select></div>
              <div style={{marginBottom:9}}><label style={lbl}>Agressividade do replanejamento</label><select style={sel}><option>Conservador</option><option>Balanceado</option><option>Agressivo</option></select></div>
              <div style={{marginBottom:14}}><label style={lbl}>Personalidade do assistente</label><select style={sel}><option>Motivacional</option><option>Direto e objetivo</option><option>Socrático</option></select></div>
              <div style={{height:1,background:C.bdr,marginBottom:12}}/>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted,marginBottom:9}}>Agentes ativos</div>
              {[["Curriculum Agent","Parseia ementas e organiza módulos"],["Pedagogy Agent","Aplica FSRS, interleaving e active recall"],["Progress Agent","Monitora aderência e gera insights"],["QA Agent","Valida calendários antes de entregar"]].map(([nm,d],i)=>{
                const[on,setOn]=useState(true);
                return <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.bdr}`}}>
                  <div><div style={{fontSize:12,color:C.txt,marginBottom:1}}>{nm}</div><div style={{fontSize:11,color:C.muted}}>{d}</div></div>
                  <div onClick={()=>setOn(p=>!p)} style={{position:"relative",width:32,height:17,cursor:"pointer",flexShrink:0}}>
                    <div style={{position:"absolute",inset:0,borderRadius:17,background:on?C.blue:"rgba(255,255,255,.13)",transition:"background .18s"}}/>
                    <div style={{position:"absolute",top:3,left:3,width:11,height:11,borderRadius:"50%",background:"#fff",transition:"transform .18s",transform:on?"translateX(15px)":"translateX(0)"}}/>
                  </div>
                </div>;
              })}
            </div>}
          </div>
        </div>
      </div>}
    </div>

    {drawerEv&&<EventDrawer ev={drawerEv} onClose={()=>setDrawerEv(null)} onStartSession={()=>{setDrawerEv(null);setScreen("session");}}/>}
    <GenOverlay visible={genVisible} onDone={()=>{setGenVisible(false);regenCalendar(disciplines,userAvail);showToast("Calendário gerado! ✦","ok");}}/>
    <CelebrationOverlay visible={celebrating} onDone={()=>setCelebrating(false)}/>
    <Toast {...toast}/>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      *{box-sizing:border-box;}
      @keyframes pulse-lav{0%,100%{opacity:1}50%{opacity:.35}}
      @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      @keyframes celebIn{from{opacity:0;transform:scale(.5) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes conf0{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(700px) rotate(720deg)}}
      @keyframes conf1{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(640px) rotate(-540deg)}}
      @keyframes conf2{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(750px) rotate(900deg) translateX(30px)}}
      @keyframes conf3{0%{opacity:1;transform:translateY(0) rotate(45deg)}100%{opacity:0;transform:translateY(680px) rotate(-720deg) translateX(-20px)}}
      ::-webkit-scrollbar{width:4px;height:4px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
    `}</style>
  </div>;
}

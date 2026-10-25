'use strict';
(() => {
 const filter=document.getElementById('chapter-filter');
 if(filter){
  const update=()=>document.querySelectorAll('.library-chapter').forEach(s=>{s.hidden=filter.value!=='all'&&s.dataset.chapter!==filter.value;});
  filter.addEventListener('change',update);
  const hash=location.hash.match(/^#chapter-(\d+)$/);if(hash){filter.value=hash[1];update();}
 }
 const toggle=document.getElementById('presentation-toggle');
 if(toggle){
  const slides=[...document.querySelectorAll('.lesson-step')],controls=document.getElementById('slide-controls');
  const fullButton=document.getElementById('slide-fullscreen'),jump=document.getElementById('slide-jump');
  const answerButton=document.getElementById('slide-answer'),notice=document.getElementById('presentation-notice');
  const initialStep=location.hash.match(/^#step-(\d+)$/);
  let active=initialStep?Math.max(0,Math.min(slides.length-1,Number(initialStep[1])-1)):0;
  let present=new URLSearchParams(location.search).get('present')==='1',focusMode=false;
  slides.forEach((slide,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1}. ${slide.querySelector('h2').textContent}`;jump.append(option);});
  const fullscreen=()=>Boolean(document.fullscreenElement)||focusMode;
  const syncFullscreen=()=>{
   const on=fullscreen();document.body.classList.toggle('fullscreen-lesson',on);
   fullButton.textContent=on?'Exit full screen':'Full screen';
   fullButton.setAttribute('aria-pressed',String(on));
  };
  const syncAnswer=()=>{
   const answer=slides[active].querySelector('.question-box details');
   answerButton.textContent=answer.open?'Hide answer':'Show answer';answerButton.setAttribute('aria-expanded',String(answer.open));
   answerButton.setAttribute('aria-controls',answer.id);
  };
  slides.forEach((slide,i)=>{const answer=slide.querySelector('.question-box details');answer.id=`slide-answer-${i+1}`;answer.addEventListener('toggle',syncAnswer);});
  const render=()=>{
   document.body.classList.toggle('presentation',present);controls.hidden=!present;
   slides.forEach((slide,i)=>{slide.hidden=present&&i!==active;});
   document.getElementById('slide-status').textContent=`${active+1} / ${slides.length}`;
   document.getElementById('slide-prev').disabled=active===0;document.getElementById('slide-next').disabled=active===slides.length-1;
   jump.value=active;syncAnswer();syncFullscreen();
   toggle.textContent=present?'退出演示 / Read all':'演示模式 / Present';toggle.setAttribute('aria-pressed',String(present));
  };
  const scrollToSlide=()=>{
   slides[active].style.scrollMarginTop=`${controls.offsetHeight+16}px`;
   slides[active].scrollIntoView({block:'start'});
  };
  const goTo=index=>{
   active=Math.max(0,Math.min(slides.length-1,index));render();
   history.replaceState(null,'',`#step-${active+1}`);scrollToSlide();
  };
  const exitFullscreen=async()=>{
   if(document.fullscreenElement)await document.exitFullscreen();
   focusMode=false;notice.textContent='';syncFullscreen();
  };
  const setPresent=async value=>{
   if(!value)await exitFullscreen();present=value;render();
   const url=new URL(location.href);url.searchParams.set('present',value?'1':'0');history.replaceState(null,'',url);
   if(value)scrollToSlide();
  };
  const toggleFullscreen=async()=>{
   if(fullscreen()){await exitFullscreen();scrollToSlide();return;}
   notice.textContent='';
   try{
    if(!document.documentElement.requestFullscreen)throw new Error('Fullscreen unavailable');
    await document.documentElement.requestFullscreen();
   }catch{
    focusMode=true;notice.textContent='已进入专注演示；此浏览器不支持网页全屏。可在外部浏览器打开使用全屏。';
   }
   syncFullscreen();scrollToSlide();
  };
  document.addEventListener('fullscreenchange',()=>{syncFullscreen();if(present)scrollToSlide();});
  toggle.addEventListener('click',()=>setPresent(!present));
  document.getElementById('slide-exit').addEventListener('click',()=>setPresent(false));
  fullButton.addEventListener('click',toggleFullscreen);
  document.getElementById('slide-prev').addEventListener('click',()=>goTo(active-1));
  document.getElementById('slide-next').addEventListener('click',()=>goTo(active+1));
  jump.addEventListener('change',()=>goTo(Number(jump.value)));
  answerButton.addEventListener('click',()=>{const answer=slides[active].querySelector('.question-box details');answer.open=!answer.open;syncAnswer();});
  document.addEventListener('keydown',event=>{
   if(!present||event.altKey||event.ctrlKey||event.metaKey||event.target.isContentEditable||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
   if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();goTo(active+1);}
   if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();goTo(active-1);}
   if(event.key==='Home'){event.preventDefault();goTo(0);}
   if(event.key==='End'){event.preventDefault();goTo(slides.length-1);}
   if(event.key.toLowerCase()==='f'){event.preventDefault();toggleFullscreen();}
   if(event.key==='Escape'&&focusMode){event.preventDefault();exitFullscreen();}
  });
  window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#step-(\d+)$/);if(m)goTo(Number(m[1])-1);});
  render();
 }
 const bubble=document.getElementById('bubble-lab');
 if(bubble){
  let values,index,pass,swapped,done;
  const display=()=>{const box=document.getElementById('bubble-values');box.replaceChildren();values.forEach((value,i)=>{const cell=document.createElement('div');cell.className='array-cell'+(!done&&(i===index||i===index+1)?' active':'');cell.textContent=value;box.append(cell);});document.getElementById('bubble-next').disabled=done;};
  const reset=()=>{values=[4,7,2,1];index=0;pass=1;swapped=false;done=false;document.getElementById('bubble-status').textContent='Pass 1: compare the first two highlighted values.';display();};
  document.getElementById('bubble-next').addEventListener('click',()=>{
   const left=values[index],right=values[index+1],change=left>right;
   if(change){[values[index],values[index+1]]=[right,left];swapped=true;}
   let message=`Pass ${pass}: compared ${left} and ${right}; ${change?'swapped':'kept their order'}.`;
   index++;
   if(index===values.length-1){
    if(!swapped){done=true;message+=' No swaps in this pass: sorting is complete.';}
    else{pass++;index=0;swapped=false;message+=` Begin pass ${pass}.`;}
   }
   document.getElementById('bubble-status').textContent=message;display();
  });document.getElementById('bubble-reset').addEventListener('click',reset);reset();
 }
 const array=document.getElementById('array-lab');
 if(array){
  const data=[[4,7],[2,20],[0,6]],table=document.createElement('table'),body=table.createTBody();let step=0,total=0;
  data.forEach((row,r)=>{const tr=body.insertRow();const th=document.createElement('th');th.scope='row';th.textContent=`Student ${r+1}`;tr.append(th);row.forEach(v=>{tr.insertCell().textContent=v;});});
  document.getElementById('array-table').append(table);
  const clear=()=>{[...table.querySelectorAll('td')].forEach(td=>{td.style.background='';});};
  document.getElementById('array-next').addEventListener('click',()=>{
   const row=Math.floor(step/2),col=step%2;if(col===0)total=0;total+=data[row][col];clear();body.rows[row].cells[col+1].style.background='#e4ddff';
   document.getElementById('array-status').textContent=`Student = ${row+1}, Quiz = ${col+1}: add ${data[row][col]}; Total = ${total}.`+(col===1?` Output row total ${total}.`:'');
   step++;document.getElementById('array-next').disabled=step===6;
  });
  document.getElementById('array-reset').addEventListener('click',()=>{step=0;total=0;clear();document.getElementById('array-next').disabled=false;document.getElementById('array-status').textContent='Before the first row: Total = 0.';});
  document.getElementById('array-status').textContent='Before the first row: Total = 0.';
 }
 const sql=document.getElementById('sql-lab');
 if(sql){
  const books=[['Algorithms',12,true],['Programming',18,false],['Logic',9,true],['Databases',15,true]];
  const update=()=>{
   const input=document.getElementById('sql-price'),price=Number(input.value),stock=document.getElementById('sql-stock').checked,desc=document.getElementById('sql-order').value==='desc';
   if(input.value===''||!Number.isFinite(price)||!input.checkValidity()){document.getElementById('sql-query').textContent='Enter a price from 0 to 100.';document.getElementById('sql-result').replaceChildren();return;}
   const rows=books.filter(b=>b[1]>=price&&(!stock||b[2])).sort((a,b)=>desc?b[1]-a[1]:a[1]-b[1]);
   document.getElementById('sql-query').textContent=`SELECT Title, Price\nFROM BOOK\nWHERE Price >= ${price}${stock?' AND InStock = TRUE':''}\nORDER BY Price ${desc?'DESCENDING':'ASCENDING'};`;
   const out=document.getElementById('sql-result');out.replaceChildren();const caption=document.createElement('p');caption.textContent=`${rows.length} matching records`;out.append(caption);
   const table=document.createElement('table'),head=table.createTHead().insertRow();['Title','Price'].forEach(x=>{const th=document.createElement('th');th.scope='col';th.textContent=x;head.append(th);});const body=table.createTBody();
   rows.forEach(b=>{const tr=body.insertRow();b.slice(0,2).forEach(x=>{tr.insertCell().textContent=x;});});out.append(table);
  };sql.addEventListener('input',update);update();
 }
})();

(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const count = {days:$("#days"),hours:$("#hours"),minutes:$("#minutes"),seconds:$("#seconds")};
  function setCountdown(){
    const remaining=Math.max(0,new Date(WEDDING_DATE).getTime()-Date.now());
    count.days.textContent=String(Math.floor(remaining/86400000)).padStart(2,"0");
    count.hours.textContent=String(Math.floor((remaining%86400000)/3600000)).padStart(2,"0");
    count.minutes.textContent=String(Math.floor((remaining%3600000)/60000)).padStart(2,"0");
    count.seconds.textContent=String(Math.floor((remaining%60000)/1000)).padStart(2,"0");
  }
  setCountdown(); setInterval(setCountdown,1000);

  const nav=$("#siteNav"), progress=$("#scrollProgress"), topBtn=$("#backToTop");
  function onScroll(){
    const y=window.scrollY, scrollable=document.documentElement.scrollHeight-window.innerHeight;
    nav.classList.toggle("scrolled",y>45);
    topBtn.classList.toggle("visible",y>650);
    progress.style.width=`${scrollable>0?Math.min(100,(y/scrollable)*100):0}%`;
  }
  onScroll(); window.addEventListener("scroll",onScroll,{passive:true});

  const reveals=$$(".reveal");
  if("IntersectionObserver" in window){
    const obs=new IntersectionObserver((entries,o)=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");o.unobserve(e.target)}}),{threshold:.12,rootMargin:"0px 0px -30px 0px"});
    reveals.forEach(el=>obs.observe(el));
  }else reveals.forEach(el=>el.classList.add("visible"));
  $(".hero .reveal")?.classList.add("visible");

  $$(".faq-question").forEach(btn=>btn.addEventListener("click",()=>{
    const item=btn.closest(".faq-item"), answer=$(".faq-answer",item), open=item.classList.contains("open");
    $$(".faq-item.open").forEach(other=>{if(other!==item){other.classList.remove("open");$(".faq-answer",other).style.maxHeight=null}});
    item.classList.toggle("open",!open);
    answer.style.maxHeight=!open?`${answer.scrollHeight}px`:null;
  }));

  const form=$("#rsvpForm"), setupNote=$("#setupNote"), submitBtn=$("#submitBtn"),
        submitText=$(".submit-text"), submitLoading=$(".submit-loading"), success=$("#successScreen"),
        successMessage=$("#successMessage"), successDate=$("#successDate"),
        pText=$("#formProgressText"), pPct=$("#formProgressPercent"), pBar=$("#formProgressBar"),
        summaryName=$("#summaryName"), summaryAttendance=$("#summaryAttendance");

  let currentStep=1;
  const TOTAL_STEPS=2;
  if(RSVP_ENDPOINT && RSVP_ENDPOINT.trim()) setupNote?.classList.add("hidden");

  const selected=name=>$(`input[name="${name}"]:checked`)?.value||"";

  function summary(){
    if(summaryName) summaryName.textContent=$("#fullName")?.value.trim()||"Guest";
    if(summaryAttendance) summaryAttendance.textContent=selected("data[Attendance]")||"Not selected yet";
  }

  function showStep(step){
    currentStep=step;
    $$(".form-step").forEach(s=>s.classList.toggle("active",Number(s.dataset.step)===step));
    const pct=Math.round((step/TOTAL_STEPS)*100);
    if(pText) pText.textContent=`Step ${step} of ${TOTAL_STEPS}`;
    if(pPct) pPct.textContent=`${pct}%`;
    if(pBar) pBar.style.width=`${pct}%`;
    if(step===TOTAL_STEPS) summary();
  }

  function validateStep(step){
    if(step===1){
      const name=$("#fullName");
      if(!name.value.trim()){name.focus();name.reportValidity();return false;}
    }
    return true;
  }

  $$(".next-step").forEach(btn=>btn.addEventListener("click",()=>{
    if(validateStep(currentStep)) showStep(Number(btn.dataset.next));
  }));
  $$(".prev-step").forEach(btn=>btn.addEventListener("click",()=>showStep(Number(btn.dataset.prev))));

  $$("input[name=\"data[Attendance]\"]").forEach(i=>i.addEventListener("change",summary));
  $("#fullName")?.addEventListener("input",summary);

  form?.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!selected("data[Attendance]")){
      alert("Please choose Going or Not Going.");
      return;
    }
    if(!form.reportValidity()) return;
    if(!RSVP_ENDPOINT || !RSVP_ENDPOINT.trim()){
      alert("RSVP storage is not connected yet. Open config.js and paste your SheetDB endpoint into RSVP_ENDPOINT.");
      return;
    }

    const attendance=selected("data[Attendance]");
    submitBtn.disabled=true;
    submitText.classList.add("hidden");
    submitLoading.classList.remove("hidden");
    try{
      const response=await fetch(RSVP_ENDPOINT,{method:"POST",body:new FormData(form)});
      if(!response.ok) throw new Error(`Submission failed (${response.status})`);

      form.classList.add("hidden");
      $(".form-progress-wrap")?.classList.add("hidden");
      success.classList.remove("hidden");

      if(attendance==="Going"){
        if(successMessage) successMessage.textContent="We’re so excited to celebrate our special day with you.";
        if(successDate){
          successDate.hidden=false;
          successDate.innerHTML='See you on <strong>December 5, 2026.</strong>';
        }
      }else{
        if(successMessage) successMessage.textContent="Thank you for letting us know. We’ll miss celebrating with you in person.";
        if(successDate) successDate.hidden=true;
      }

      success.scrollIntoView({behavior:"smooth",block:"center"});
      form.reset();
      summary();
    }catch(err){
      console.error(err);
      alert("Your RSVP could not be submitted. Please check the endpoint in config.js and try again.");
    }finally{
      submitBtn.disabled=false;
      submitText.classList.remove("hidden");
      submitLoading.classList.add("hidden");
    }
  });

  summary();
  showStep(1);
})();

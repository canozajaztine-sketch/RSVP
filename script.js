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

  const form=$("#rsvpForm"), guestTypeGroup=$("#guestTypeGroup"), familyGroup=$("#familyMembersGroup"),
        familyMembers=$("#familyMembers"), hiddenMembers=$("#familyMembersHidden"), addMember=$("#addMember"),
        familyCount=$("#familyCount"), setupNote=$("#setupNote"), submitBtn=$("#submitBtn"),
        submitText=$(".submit-text"), submitLoading=$(".submit-loading"), success=$("#successScreen"),
        pText=$("#formProgressText"), pPct=$("#formProgressPercent"), pBar=$("#formProgressBar"),
        summaryName=$("#summaryName"), summaryAttendance=$("#summaryAttendance");

  let currentStep=1;
  const MAX_FAMILY_MEMBERS=2;
  if(RSVP_ENDPOINT && RSVP_ENDPOINT.trim()) setupNote.classList.add("hidden");

  const selected=name=>$(`input[name="${name}"]:checked`)?.value||"";

  function summary(){
    summaryName.textContent=$("#fullName").value.trim()||"Guest";
    summaryAttendance.textContent=selected("data[Attendance]")||"Not selected yet";
  }

  function showStep(step){
    currentStep=step;
    $$(".form-step").forEach(s=>s.classList.toggle("active",Number(s.dataset.step)===step));
    const pct=Math.round((step/3)*100);
    pText.textContent=`Step ${step} of 3`; pPct.textContent=`${pct}%`; pBar.style.width=`${pct}%`;
    if(step===3) summary();
  }

  function validateStep(step){
    if(step===1){
      const name=$("#fullName");
      if(!name.value.trim()){name.focus();name.reportValidity();return false;}
    }
    if(step===2 && !selected("data[Attendance]")){
      alert("Please choose whether you can attend.");
      return false;
    }
    return true;
  }

  $$(".next-step").forEach(btn=>btn.addEventListener("click",()=>{if(validateStep(currentStep))showStep(Number(btn.dataset.next))}));
  $$(".prev-step").forEach(btn=>btn.addEventListener("click",()=>showStep(Number(btn.dataset.prev))));

  function updateAttendance(){
    const value=selected("data[Attendance]");
    if(value==="Happily Accepts"){
      guestTypeGroup.classList.remove("hidden");
    }else{
      guestTypeGroup.classList.add("hidden");
      familyGroup.classList.add("hidden");
      $$('input[name="data[Guest Type]"]').forEach(i=>i.checked=false);
    }
    summary();
  }
  function updateGuestType(){
    familyGroup.classList.toggle("hidden",selected("data[Guest Type]")!=="Me & My Family");
  }

  $$('input[name="data[Attendance]"]').forEach(i=>i.addEventListener("change",updateAttendance));
  $$('input[name="data[Guest Type]"]').forEach(i=>i.addEventListener("change",updateGuestType));
  $("#fullName").addEventListener("input",summary);

  function updateFamilyCount(){
    const rows=$$(".family-row",familyMembers);
    const n=rows.length;
    familyCount.textContent=`${n} of ${MAX_FAMILY_MEMBERS}`;

    const atLimit=n>=MAX_FAMILY_MEMBERS;
    addMember.disabled=atLimit;
    addMember.textContent=atLimit ? "Maximum 2 reached" : "+ Add another person";

    const note=$("#familyLimitNote");
    if(note){
      note.textContent=atLimit
        ? "You’ve added the maximum of 2 family members."
        : "Maximum of 2 family members.";
    }
  }

  function createFamilyRow(){
    const row=document.createElement("div");
    row.className="family-row";

    const shell=document.createElement("div");
    shell.className="input-shell family-input-shell";

    const icon=document.createElement("span");
    icon.className="input-icon";
    icon.textContent="♡";

    const input=document.createElement("input");
    input.type="text";
    input.className="family-member";
    input.placeholder="Family member name";

    const remove=document.createElement("button");
    remove.type="button";
    remove.className="remove-member";
    remove.setAttribute("aria-label","Remove family member");
    remove.textContent="×";

    shell.append(icon,input,remove);
    row.appendChild(shell);
    return row;
  }

  addMember.addEventListener("click",()=>{
    if($$(".family-row",familyMembers).length>=MAX_FAMILY_MEMBERS) return;
    const row=createFamilyRow();
    familyMembers.appendChild(row);
    updateFamilyCount();
    $(".family-member",row)?.focus();
  });

  familyMembers.addEventListener("click",event=>{
    const button=event.target.closest(".remove-member");
    if(!button) return;
    const row=button.closest(".family-row");
    if(row) row.remove();
    updateFamilyCount();
  });

  function collectFamily(){
    hiddenMembers.value=$$(".family-member").map(i=>i.value.trim()).filter(Boolean).join(", ");
  }

  form.addEventListener("submit",async e=>{
    e.preventDefault(); collectFamily();
    if(!form.reportValidity()) return;
    if(!RSVP_ENDPOINT || !RSVP_ENDPOINT.trim()){
      alert("RSVP storage is not connected yet. Open config.js and paste your SheetDB endpoint into RSVP_ENDPOINT.");
      return;
    }

    submitBtn.disabled=true; submitText.classList.add("hidden"); submitLoading.classList.remove("hidden");
    try{
      const response=await fetch(RSVP_ENDPOINT,{method:"POST",body:new FormData(form)});
      if(!response.ok) throw new Error(`Submission failed (${response.status})`);
      form.classList.add("hidden"); $(".form-progress-wrap").classList.add("hidden"); success.classList.remove("hidden");
      success.scrollIntoView({behavior:"smooth",block:"center"});
      form.reset(); guestTypeGroup.classList.add("hidden"); familyGroup.classList.add("hidden"); summary();
    }catch(err){
      console.error(err);
      alert("Your RSVP could not be submitted. Please check the endpoint in config.js and try again.");
    }finally{
      submitBtn.disabled=false; submitText.classList.remove("hidden"); submitLoading.classList.add("hidden");
    }
  });

  summary(); updateFamilyCount(); showStep(1);
})();
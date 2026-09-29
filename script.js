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

  // Interactive dress-code guide
  const attireModal=$("#attireModal"), attireTitle=$("#attireModalTitle"),
        attireEyebrow=$("#attireModalEyebrow"), attireIntro=$("#attireModalIntro"),
        attirePalette=$("#attireModalPalette"), attireLooks=$("#attireLookGrid"), attireTip=$("#attireModalTip");

  const attireColors={
    burgundy:{name:"Burgundy",hex:"#7B1E31"},
    champagne:{name:"Champagne",hex:"#EAD9BD"},
    beige:{name:"Beige",hex:"#CBB89B"},
    brown:{name:"Soft Brown",hex:"#9B755D"},
    emerald:{name:"Emerald Green",hex:"#1F6B4F"},
    white:{name:"White — Couple Only",hex:"#FFFFFF"}
  };

  const attireData={
    couple:{
      eyebrow:"Bride & Groom",
      title:"White Is Reserved for the Couple",
      intro:"To keep the wedding look intentional, white, ivory, and very light cream are reserved exclusively for the Bride & Groom.",
      colors:["white"],
      looks:[
        {gender:"Bride",title:"Bridal White",kind:"dress",main:"#FFFFFF",accent:"#EAD9BD",text:"Wedding gown in bridal white with soft champagne details.",pieces:["White gown","Champagne accents","Elegant formal shoes"]},
        {gender:"Groom",title:"Classic White & Formal",kind:"suit",main:"#FFFFFF",accent:"#214233",text:"Formal groom styling centered on white with refined wedding accents.",pieces:["White formal top","Tailored trousers","Formal shoes"]}
      ],
      tip:"Guests and entourage: please avoid white, ivory, and very light cream so the couple remains visually distinct."
    },
    parents:{
      eyebrow:"Parents",
      title:"Elegant Formal Attire",
      intro:"Choose refined formal pieces in the wedding palette. Coordinated colors are encouraged, but exact matching is not required.",
      colors:["champagne","beige","brown","burgundy","emerald"],
      looks:[
        {gender:"Men",title:"Champagne Formal",kind:"suit",main:"#EAD9BD",accent:"#7B1E31",text:"A champagne or beige suit / formal Barong-inspired look with a burgundy accent and brown dress shoes.",pieces:["Champagne / beige top","Matching trousers","Burgundy accent","Brown shoes"]},
        {gender:"Women",title:"Emerald or Burgundy Formal",kind:"dress",main:"#1F6B4F",accent:"#EAD9BD",text:"An elegant midi or floor-length dress in emerald or burgundy, finished with champagne or beige accessories.",pieces:["Emerald / burgundy dress","Champagne accessories","Neutral heels"]}
      ],
      tip:"Keep the overall look elegant and formal. You may use one main wedding color and one coordinating accent."
    },
    sponsors:{
      eyebrow:"Principal Sponsors",
      title:"Classic Coordinated Formal Looks",
      intro:"For a polished Ninong & Ninang look, use the designated combinations below. These are the preferred sample outfits for our Principal Sponsors.",
      colors:["champagne","beige","burgundy","emerald","brown"],
      looks:[
        {gender:"Ninong / Men",title:"Champagne & Burgundy",kind:"barong",main:"#EAD9BD",accent:"#7B1E31",text:"Champagne or beige formal Barong / long-sleeve formal top, beige trousers, a subtle burgundy accent, and brown or dark dress shoes.",pieces:["Champagne #EAD9BD","Beige #CBB89B","Burgundy #7B1E31","Brown dress shoes"]},
        {gender:"Ninang / Women",title:"Emerald with Champagne",kind:"dress",main:"#1F6B4F",accent:"#EAD9BD",text:"Elegant emerald green formal dress with champagne or beige accessories. Burgundy may be used as an alternate main dress color.",pieces:["Emerald #1F6B4F","Alt: Burgundy #7B1E31","Champagne #EAD9BD","Neutral heels"]}
      ],
      tip:"Principal Sponsors do not need identical outfits. The goal is a coordinated formal look using these exact palette colors. Please avoid white, ivory, and very light cream."
    },
    bridesmaids:{
      eyebrow:"Bridesmaids / Maid & Matron of Honor",
      title:"Emerald Green Formal",
      intro:"The primary color is emerald green, styled in a more formal silhouette with soft wedding-palette accents.",
      colors:["emerald","champagne","beige","burgundy"],
      looks:[
        {gender:"Women",title:"Emerald Dress",kind:"dress",main:"#1F6B4F",accent:"#EAD9BD",text:"Formal emerald green dress, preferably midi to floor length, with champagne, beige, or restrained burgundy details.",pieces:["Emerald #1F6B4F","Champagne accents","Beige heels","Minimal burgundy detail"]}
      ],
      tip:"Emerald green should remain the dominant color so the bridal party looks coordinated in photos."
    },
    bestman:{
      eyebrow:"Best Man",
      title:"Full Beige / Champagne Suit",
      intro:"A complete coordinated suit look with burgundy as the defining accent color.",
      colors:["champagne","beige","burgundy","brown"],
      looks:[
        {gender:"Men",title:"Beige Suit & Burgundy Accent",kind:"suit",main:"#CBB89B",accent:"#7B1E31",text:"Full beige or champagne suit with matching trousers, burgundy tie or bow tie, boutonnière, and brown or dark dress shoes.",pieces:["Beige #CBB89B","Champagne #EAD9BD","Burgundy #7B1E31","Brown / dark shoes"]}
      ],
      tip:"Keep the jacket and trousers coordinated. Burgundy should appear in the tie or bow tie rather than as the main suit color."
    },
    groomsmen:{
      eyebrow:"Groomsmen",
      title:"Champagne, Beige & Burgundy",
      intro:"A relaxed but coordinated formal look using a light neutral base and burgundy accessories.",
      colors:["champagne","beige","burgundy","brown"],
      looks:[
        {gender:"Men",title:"Light Neutral with Burgundy",kind:"shirt",main:"#EAD9BD",accent:"#7B1E31",text:"Light champagne or beige long-sleeve shirt, beige trousers, burgundy suspenders and bow tie, with brown dress shoes.",pieces:["Champagne #EAD9BD","Beige #CBB89B","Burgundy #7B1E31","Brown shoes"]}
      ],
      tip:"Please keep the shirt and trousers in the light champagne/beige family so the burgundy accessories remain the visual accent."
    },
    guests:{
      eyebrow:"Wedding Guests",
      title:"Semi-Formal / Smart Casual",
      intro:"Dress polished but comfortable. You may choose any of the wedding colors below, with white, ivory, and very light cream reserved for the couple.",
      colors:["burgundy","champagne","beige","brown","emerald"],
      looks:[
        {gender:"Men",title:"Smart Casual Neutral",kind:"shirt",main:"#CBB89B",accent:"#7B1E31",text:"Polo or button-down in beige/champagne, paired with chinos or slacks in soft brown or a coordinating neutral.",pieces:["Polo / button-down","Chinos / slacks","Brown shoes","Optional burgundy accent"]},
        {gender:"Women",title:"Wedding-Palette Midi",kind:"dress",main:"#7B1E31",accent:"#EAD9BD",text:"Midi dress, skirt-and-blouse set, or polished jumpsuit in burgundy, emerald, champagne, beige, or soft brown.",pieces:["Midi dress / jumpsuit","Palette color","Polished flats / heels","Simple accessories"]}
      ],
      tip:"Please avoid shorts, slippers, tank tops, ripped jeans, jerseys, oversized streetwear, and overly casual outfits."
    }
  };

  function attireSvg(kind,main,accent){
    if(kind==="dress") return `<svg viewBox="0 0 180 220" aria-hidden="true"><circle cx="90" cy="28" r="18" fill="#c89b7b"/><path d="M68 53 Q90 42 112 53 L119 105 L153 196 Q90 216 27 196 L61 105 Z" fill="${main}"/><path d="M67 55 Q90 68 113 55" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><path d="M64 83 L39 130 M116 83 L141 130" stroke="#c89b7b" stroke-width="11" stroke-linecap="round"/></svg>`;
    if(kind==="barong") return `<svg viewBox="0 0 180 220" aria-hidden="true"><circle cx="90" cy="27" r="18" fill="#b98567"/><path d="M58 52 L122 52 L137 145 L115 150 L110 205 L70 205 L65 150 L43 145 Z" fill="${main}"/><path d="M90 55 V143" stroke="rgba(255,255,255,.65)" stroke-width="3"/><path d="M70 68 H110 M68 80 H112 M66 92 H114" stroke="rgba(255,255,255,.5)" stroke-width="2"/><rect x="63" y="145" width="54" height="60" rx="6" fill="#CBB89B"/><path d="M75 205 L65 217 M105 205 L115 217" stroke="#5b4636" stroke-width="8" stroke-linecap="round"/><circle cx="90" cy="61" r="6" fill="${accent}"/></svg>`;
    if(kind==="shirt") return `<svg viewBox="0 0 180 220" aria-hidden="true"><circle cx="90" cy="27" r="18" fill="#b98567"/><path d="M59 54 L121 54 L143 110 L125 120 L114 92 L110 145 L70 145 L66 92 L55 120 L37 110 Z" fill="${main}"/><path d="M84 54 L90 76 L96 54" fill="${accent}"/><rect x="62" y="144" width="56" height="61" rx="5" fill="#CBB89B"/><path d="M75 205 L66 217 M105 205 L114 217" stroke="#5b4636" stroke-width="8" stroke-linecap="round"/></svg>`;
    return `<svg viewBox="0 0 180 220" aria-hidden="true"><circle cx="90" cy="27" r="18" fill="#b98567"/><path d="M54 54 L126 54 L142 136 L116 143 L110 204 L70 204 L64 143 L38 136 Z" fill="${main}"/><path d="M75 54 L90 83 L105 54" fill="#fff" opacity=".86"/><path d="M90 68 L98 91 L90 113 L82 91 Z" fill="${accent}"/><path d="M90 113 V145" stroke="rgba(0,0,0,.12)" stroke-width="2"/><path d="M75 204 L66 217 M105 204 L114 217" stroke="#5b4636" stroke-width="8" stroke-linecap="round"/></svg>`;
  }

  function openAttireGuide(key){
    const data=attireData[key];
    if(!data || !attireModal) return;
    attireEyebrow.textContent=data.eyebrow;
    attireTitle.textContent=data.title;
    attireIntro.textContent=data.intro;
    attirePalette.innerHTML=data.colors.map(c=>{const x=attireColors[c];return `<span class="attire-color-chip"><i class="attire-color-dot" style="background:${x.hex}"></i>${x.name} <code>${x.hex}</code></span>`}).join("");
    attireLooks.innerHTML=data.looks.map(look=>`<article class="attire-look-card"><div class="attire-look-visual">${attireSvg(look.kind,look.main,look.accent)}</div><div class="attire-look-copy"><span class="attire-look-label">${look.gender}</span><h4>${look.title}</h4><p>${look.text}</p><div class="attire-piece-list">${look.pieces.map(piece=>`<span>${piece}</span>`).join("")}</div></div></article>`).join("");
    attireTip.innerHTML=`<strong>Style note:</strong> ${data.tip}`;
    attireModal.classList.add("open");
    attireModal.setAttribute("aria-hidden","false");
    document.body.classList.add("attire-modal-open");
    $(".attire-modal-close",attireModal)?.focus();
  }
  function closeAttireGuide(){
    if(!attireModal) return;
    attireModal.classList.remove("open");
    attireModal.setAttribute("aria-hidden","true");
    document.body.classList.remove("attire-modal-open");
  }
  $$("[data-attire-group]").forEach(btn=>btn.addEventListener("click",()=>openAttireGuide(btn.dataset.attireGroup)));
  $$("[data-attire-close]").forEach(btn=>btn.addEventListener("click",closeAttireGuide));
  document.addEventListener("keydown",e=>{if(e.key==="Escape" && attireModal?.classList.contains("open")) closeAttireGuide()});

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

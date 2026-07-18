/* ==========================================================
   animations.js
   Jaztine & Mary Ven Wedding Invitation

   Features
   ✔ Scroll Reveal
   ✔ Fade Animations
   ✔ FAQ Accordion
   ✔ Stagger Animation
========================================================== */

(() => {

    "use strict";

    // ======================================================
    // Scroll Reveal
    // ======================================================

    const animatedElements = document.querySelectorAll(

        ".fade-up, .fade-down, .fade-left, .fade-right, .zoom-in"

    );

    const revealObserver = new IntersectionObserver(

        (entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("show");

                    revealObserver.unobserve(entry.target);

                }

            });

        },

        {

            threshold:0.15

        }

    );

    animatedElements.forEach(element => {

        revealObserver.observe(element);

    });

    // ======================================================
    // Stagger Animation
    // ======================================================

    const staggerGroups = document.querySelectorAll(

        ".details-grid, .story-highlights, .timeline-wrapper, .color-palette, .attire-grid"

    );

    staggerGroups.forEach(group => {

        [...group.children].forEach((item,index)=>{

            item.style.transitionDelay =

                `${index * 120}ms`;

        });

    });

    // ======================================================
    // FAQ Accordion
    // ======================================================

    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(item => {

        const button = item.querySelector(".faq-question");

        button.addEventListener("click",()=>{

            faqItems.forEach(other=>{

                if(other!==item){

                    other.classList.remove("active");

                }

            });

            item.classList.toggle("active");

        });

    });

})();

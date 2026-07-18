/* ==========================================================
   navigation.js
   Jaztine & Mary Ven Wedding Invitation

   Features
   ✔ Smooth Scrolling
   ✔ Scroll Progress Indicator
   ✔ Back To Top Button

========================================================== */

(() => {

    "use strict";

    // ============================================
    // Elements
    // ============================================

    const backToTop = document.querySelector(".back-to-top");
    const progressBar = document.querySelector(".scroll-indicator");

    // ============================================
    // Smooth Scroll
    // ============================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {

        anchor.addEventListener("click", function (e) {

            const target = document.querySelector(
                this.getAttribute("href")
            );

            if (!target) return;

            e.preventDefault();

            target.scrollIntoView({

                behavior: "smooth",
                block: "start"

            });

        });

    });

    // ============================================
    // Scroll Effects
    // ============================================

    function handleScroll() {

        const scrollTop =
            window.pageYOffset ||
            document.documentElement.scrollTop;

        const documentHeight =
            document.documentElement.scrollHeight -
            document.documentElement.clientHeight;

        // ============================
        // Progress Bar
        // ============================

        if (progressBar) {

            const progress =
                (scrollTop / documentHeight) * 100;

            progressBar.style.width =
                progress + "%";

        }

        // ============================
        // Back To Top
        // ============================

        if (backToTop) {

            if (scrollTop > 500) {

                backToTop.classList.add("show");

            } else {

                backToTop.classList.remove("show");

            }

        }

    }

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    // ============================================
    // Back To Top Click
    // ============================================

    if (backToTop) {

        backToTop.addEventListener("click", function (e) {

            e.preventDefault();

            window.scrollTo({

                top: 0,
                behavior: "smooth"

            });

        });

    }

})();

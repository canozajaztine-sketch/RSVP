/* ==========================================================
   rsvp.js
   Part 1
   Multi-Step RSVP Form
========================================================== */

(() => {

    "use strict";

    // ======================================================
    // Elements
    // ======================================================

    const form = document.getElementById("rsvpForm");

    if (!form) return;

    const steps = [...document.querySelectorAll(".rsvp-step")];

    const progressItems = [
        ...document.querySelectorAll(".progress-step")
    ];

    const nextButtons = [
        ...document.querySelectorAll(".next-step")
    ];

    const prevButtons = [
        ...document.querySelectorAll(".prev-step")
    ];

    let currentStep = 0;

    // ======================================================
    // Show Step
    // ======================================================

    function showStep(index) {

        steps.forEach((step, i) => {

            step.classList.toggle(
                "active",
                i === index
            );

        });

        progressItems.forEach((item, i) => {

            if (i <= index) {

                item.classList.add("active");

            } else {

                item.classList.remove("active");

            }

        });

    }

    // ======================================================
    // Validation
    // ======================================================

    function validateStep(index) {

        const current = steps[index];

        const requiredFields =
            current.querySelectorAll("[required]");

        for (const field of requiredFields) {

            // Radio buttons
            if (field.type === "radio") {

                const radios =
                    current.querySelectorAll(
                        `input[name="${field.name}"]`
                    );

                const checked =
                    [...radios].some(
                        radio => radio.checked
                    );

                if (!checked) {

                    alert("Please select an option.");

                    return false;

                }

                continue;

            }

            // Text fields
            if (!field.value.trim()) {

                field.focus();

                alert("Please complete all required fields.");

                return false;

            }

        }

        return true;

    }

    // ======================================================
    // Next Buttons
    // ======================================================

    nextButtons.forEach(button => {

        button.addEventListener("click", () => {

            if (!validateStep(currentStep)) {

                return;

            }

            if (currentStep < steps.length - 1) {

                currentStep++;

                showStep(currentStep);

                window.scrollTo({

                    top: form.offsetTop - 40,

                    behavior: "smooth"

                });

            }

        });

    });

    // ======================================================
    // Previous Buttons
    // ======================================================

    prevButtons.forEach(button => {

        button.addEventListener("click", () => {

            if (currentStep > 0) {

                currentStep--;

                showStep(currentStep);

                window.scrollTo({

                    top: form.offsetTop - 40,

                    behavior: "smooth"

                });

            }

        });

    });

    // ======================================================
    // Prevent Submit
    // ======================================================

    form.addEventListener("submit", e => {

        e.preventDefault();

        if (!validateStep(currentStep)) {

            return;

        }

        console.log("Ready for SheetDB...");

    });

    // ======================================================
    // Initialize
    // ======================================================

    showStep(currentStep);

})();

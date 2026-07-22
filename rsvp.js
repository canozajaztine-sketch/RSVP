/* ==========================================================
   rsvp.js
   PART 1 - Form Logic & Family Members
========================================================== */

(() => {

    "use strict";

    // ======================================================
    // Elements
    // ======================================================

    const form = document.getElementById("rsvpForm");

    if (!form) return;

    const accept = document.getElementById("accept");
    const decline = document.getElementById("decline");

    const onlyMe = document.getElementById("me");
    const family = document.getElementById("family");

    const guestTypeGroup =
        document.getElementById("guestTypeGroup");

    const familyMembersGroup =
        document.getElementById("familyMembersGroup");

    const familyMembersContainer =
        document.getElementById("familyMembers");

    const addMemberBtn =
        document.getElementById("addMember");

    const hiddenMembers =
        document.getElementById("familyMembersHidden");

    const successScreen =
        document.querySelector(".success-screen");

    const submitButton =
        document.getElementById("submitBtn");

    const btnText =
        submitButton.querySelector(".btn-text");

    const btnLoader =
        submitButton.querySelector(".btn-loader");

    // ======================================================
    // Update Form
    // ======================================================

    function updateForm() {

        guestTypeGroup.classList.add("hidden");
        familyMembersGroup.classList.add("hidden");

        onlyMe.required = false;
        family.required = false;

        if (decline.checked) {

            onlyMe.checked = false;
            family.checked = false;

        }

        if (accept.checked) {

            guestTypeGroup.classList.remove("hidden");

            onlyMe.required = true;
            family.required = true;

        }

        if (family.checked) {

            familyMembersGroup.classList.remove("hidden");

        }

    }

    // ======================================================
    // Events
    // ======================================================

    accept.addEventListener("change", updateForm);
    decline.addEventListener("change", updateForm);

    onlyMe.addEventListener("change", updateForm);
    family.addEventListener("change", updateForm);

    // ======================================================
    // Create Remove Button
    // ======================================================

    function createRemoveButton(wrapper) {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "remove-member";

        button.setAttribute(
            "aria-label",
            "Remove family member"
        );

        button.innerHTML =
            '<i class="fa-solid fa-trash"></i>';

        button.addEventListener("click", () => {

            wrapper.remove();

        });

        return button;

    }

    // ======================================================
    // Add Family Member
    // ======================================================

    addMemberBtn.addEventListener("click", () => {

        const wrapper = document.createElement("div");

        wrapper.className =
            "family-member-wrapper";

        const input = document.createElement("input");

        input.type = "text";

        input.placeholder =
            "Family Member Name";

        input.className =
            "family-member";

        wrapper.appendChild(input);

        wrapper.appendChild(
            createRemoveButton(wrapper)
        );

        familyMembersContainer.appendChild(wrapper);

        input.focus();

    });

    // ======================================================
    // Validation
    // ======================================================

    function validateFamilyMembers() {

        if (!family.checked) {

            return true;

        }

        const members =
            [...document.querySelectorAll(".family-member")];

        return members.some(member =>
            member.value.trim() !== ""
        );

    }
       // ======================================================
    // Submit
    // ======================================================

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        if (!validateFamilyMembers()) {

            alert(
                "Please enter at least one family member."
            );

            familyMembersContainer
                .querySelector(".family-member")
                .focus();

            return;

        }

        // Combine family members

        const members =
            [...document.querySelectorAll(".family-member")];

        hiddenMembers.value =
            members
            .map(member => member.value.trim())
            .filter(Boolean)
            .join(", ");

        // Loading

        submitButton.disabled = true;

        btnText.classList.add("hidden");
        btnLoader.classList.remove("hidden");

        try {

            const response =
                await fetch(form.action, {

                    method: "POST",

                    body: new FormData(form)

                });

            if (!response.ok) {

                throw new Error();

            }

            // Reset form

            form.reset();

            // Remove extra family member fields

            const wrappers =
                familyMembersContainer.querySelectorAll(
                    ".family-member-wrapper"
                );

            wrappers.forEach((wrapper, index) => {

                if (index > 0) {

                    wrapper.remove();

                }

            });

            // Clear first input

            const firstInput =
                familyMembersContainer.querySelector(
                    ".family-member"
                );

            if (firstInput) {

                firstInput.value = "";

            }

            hiddenMembers.value = "";

            updateForm();

            form.style.display = "none";

            successScreen.classList.add("show");

            successScreen.scrollIntoView({

                behavior: "smooth",

                block: "center"

            });

            if (typeof confetti === "function") {

                confetti({

                    particleCount: 180,

                    spread: 80,

                    origin: {

                        y: 0.6

                    }

                });

            }

        }

        catch (error) {

            alert(
                "Unable to submit your RSVP. Please try again."
            );

            submitButton.disabled = false;

            btnText.classList.remove("hidden");

            btnLoader.classList.add("hidden");

        }

    });

    // ======================================================
    // Initialize
    // ======================================================

    updateForm();

})();
   
   

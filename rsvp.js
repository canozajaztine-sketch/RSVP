/* ==========================================================
   rsvp.js
   Wedding RSVP
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

        // Hide everything by default
        guestTypeGroup.classList.add("hidden");
        familyMembersGroup.classList.add("hidden");

        onlyMe.required = false;
        family.required = false;

        // Declined
        if (decline.checked) {

            onlyMe.checked = false;
            family.checked = false;

            return;

        }

        // Accepted
        if (accept.checked) {

            guestTypeGroup.classList.remove("hidden");

            onlyMe.required = true;
            family.required = true;

        }

        // Family selected
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
    // Add Family Member
    // ======================================================

    addMemberBtn.addEventListener("click", () => {

        const input = document.createElement("input");

        input.type = "text";

        input.placeholder = "Family Member Name";

        input.className =
            "form-control family-member";

        familyMembersContainer.appendChild(input);

    });

    // ======================================================
    // Submit
    // ======================================================

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

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

            form.reset();

            updateForm();

            form.style.display = "none";

            successScreen.classList.add("show");

            if (typeof confetti === "function") {

                confetti({
                    particleCount: 150,
                    spread: 70,
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

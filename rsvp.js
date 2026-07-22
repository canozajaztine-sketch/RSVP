/* ==========================================================
   rsvp.js
   Wedding RSVP
========================================================== */

(() => {

    "use strict";

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

    /* ==========================================
       Initial State
    ========================================== */

    guestTypeGroup.classList.add("hidden");
    familyMembersGroup.classList.add("hidden");

    /* ==========================================
       Attendance
    ========================================== */

    accept.addEventListener("change", () => {

        guestTypeGroup.classList.remove("hidden");

    });

    decline.addEventListener("change", () => {

        guestTypeGroup.classList.add("hidden");

        familyMembersGroup.classList.add("hidden");

        onlyMe.checked = false;
        family.checked = false;

    });

    /* ==========================================
       Guest Type
    ========================================== */

    onlyMe.addEventListener("change", () => {

        familyMembersGroup.classList.add("hidden");

    });

    family.addEventListener("change", () => {

        familyMembersGroup.classList.remove("hidden");

    });

    /* ==========================================
       Add Family Member
    ========================================== */

    addMemberBtn.addEventListener("click", () => {

        const input =
            document.createElement("input");

        input.type = "text";

        input.placeholder = "Family Member Name";

        input.className =
            "form-control family-member";

        familyMembersContainer.appendChild(input);

    });

    /* ==========================================
       Submit
    ========================================== */

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const members =
            [...document.querySelectorAll(".family-member")];

        hiddenMembers.value =
            members
            .map(member => member.value.trim())
            .filter(Boolean)
            .join(", ");

        const submitButton =
            form.querySelector('button[type="submit"]');

        const originalText =
            submitButton.innerHTML;

        submitButton.disabled = true;

        submitButton.innerHTML =
            "Submitting...";

        try {

            const response =
                await fetch(form.action, {

                    method: "POST",

                    body: new FormData(form)

                });

            if (!response.ok) {

                throw new Error();

            }

            form.style.display = "none";

            successScreen.classList.add("show");

            if (typeof confetti === "function") {

                confetti();

            }

        }

        catch (error) {

            alert(
                "Unable to submit your RSVP. Please try again."
            );

            submitButton.disabled = false;

            submitButton.innerHTML =
                originalText;

        }

    });

})();

/* ==========================================================
   countdown.js
   Jaztine & Mary Ven Wedding RSVP
   Wedding Date:
   December 21, 2026 | 3:00 PM
========================================================== */

(() => {

    "use strict";

    // ======================================================
    // Wedding Date
    // ======================================================

    const weddingDate = new Date(
        "December 21, 2026 15:00:00"
    ).getTime();

    // ======================================================
    // Countdown Elements
    // ======================================================

    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");

    if (
        !daysEl ||
        !hoursEl ||
        !minutesEl ||
        !secondsEl
    ) {
        console.warn(
            "Countdown elements not found."
        );
        return;
    }

    // ======================================================
    // Helper
    // ======================================================

    function pad(number) {
        return number.toString().padStart(2, "0");
    }

    // ======================================================
    // Update Countdown
    // ======================================================

    function updateCountdown() {

        const now = new Date().getTime();

        const distance = weddingDate - now;

        if (distance <= 0) {

            daysEl.textContent = "00";
            hoursEl.textContent = "00";
            minutesEl.textContent = "00";
            secondsEl.textContent = "00";

            clearInterval(timer);

            return;

        }

        const days = Math.floor(
            distance / (1000 * 60 * 60 * 24)
        );

        const hours = Math.floor(
            (distance % (1000 * 60 * 60 * 24))
            /
            (1000 * 60 * 60)
        );

        const minutes = Math.floor(
            (distance % (1000 * 60 * 60))
            /
            (1000 * 60)
        );

        const seconds = Math.floor(
            (distance % (1000 * 60))
            /
            1000
        );

        daysEl.textContent = pad(days);
        hoursEl.textContent = pad(hours);
        minutesEl.textContent = pad(minutes);
        secondsEl.textContent = pad(seconds);

    }

    // ======================================================
    // Initial Load
    // ======================================================

    updateCountdown();

    // ======================================================
    // Refresh Every Second
    // ======================================================

    const timer = setInterval(
        updateCountdown,
        1000
    );

})();

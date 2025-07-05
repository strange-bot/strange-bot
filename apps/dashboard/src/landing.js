/**
 * Adds fade-in animation classes to elements with the 'fade-in' class when they enter the viewport.
 */
function fadeInOnScroll() {
    document.querySelectorAll(".fade-in").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 60) {
            el.classList.add("opacity-100", "translate-y-0");
            el.classList.remove("opacity-0", "translate-y-6");
        }
    });
}
document.querySelectorAll(".fade-in").forEach((el) => {
    el.classList.add("opacity-0", "translate-y-6", "transition", "duration-700");
});
window.addEventListener("scroll", fadeInOnScroll);
window.addEventListener("DOMContentLoaded", fadeInOnScroll);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute("href")).scrollIntoView({
            behavior: "smooth",
        });
    });
});

/* eslint-env browser */

const sidebar = document.getElementById("sidebar");

if (sidebar) {
    window.onload = function () {
        const activeItem = document.getElementById("aside-active-item");
        activeItem?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    };

    const toggleSidebarMobile = (sidebar, sidebarBackdrop) => {
        const toggleSidebarMobileHamburger = document.getElementById(
            "toggleSidebarMobileHamburger",
        );
        const toggleSidebarMobileClose = document.getElementById("toggleSidebarMobileClose");
        sidebar.classList.toggle("hidden");
        sidebarBackdrop.classList.toggle("hidden");
        toggleSidebarMobileHamburger.classList.toggle("hidden");
        toggleSidebarMobileClose.classList.toggle("hidden");
    };

    const toggleSidebarMobileEl = document.getElementById("toggleSidebarMobile");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");

    toggleSidebarMobileEl.addEventListener("click", () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop);
    });

    sidebarBackdrop.addEventListener("click", () => {
        toggleSidebarMobile(sidebar, sidebarBackdrop);
    });
}

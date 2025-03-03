/* eslint-env browser */

document.addEventListener("DOMContentLoaded", function () {
    const tab = window.location.hash;
    if (tab) {
        const tabButton = document.querySelector(`[data-tabs-target="${tab}"]`);
        if (tabButton) tabButton.setAttribute("aria-selected", "true");
    }
});

document.querySelectorAll('[role="tab"]').forEach((tab) => {
    tab.addEventListener("click", function () {
        const tabId = this.getAttribute("data-tabs-target");
        history.pushState(null, null, tabId);
    });
});

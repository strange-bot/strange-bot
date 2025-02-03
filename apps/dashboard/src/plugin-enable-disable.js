/* eslint-env browser */

// Enable or disable the plugin based on the toggle
const pluginToggle = document.getElementById("plugin-toggle");

// Based on pluginToggle, enable or disable all other inputs/selects/checkboxes/buttons
function toggleInputs() {
    const inputs = document.querySelectorAll(
        "div#main-content input, div#main-content select, div#main-content button, div#main-content textarea, div#main-content checkbox, div#main-content button",
    );
    inputs.forEach((input) => {
        if (input === pluginToggle) return;
        input.disabled = !pluginToggle.checked;
    });
}

if (pluginToggle) {
    pluginToggle.addEventListener("click", async function () {
        const body = {
            plugin_toggle: pluginToggle.checked,
        };

        const response = await fetch(window.location.pathname, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Failed to enable/disable plugin: ${text}`);
            alert(`Failed to enable/disable plugin`);

            pluginToggle.checked = !pluginToggle.checked; // Reset the toggle
        }
    });

    document.addEventListener("DOMContentLoaded", toggleInputs);
    pluginToggle?.addEventListener("change", toggleInputs);
}

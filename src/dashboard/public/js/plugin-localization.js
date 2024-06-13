/* eslint-env browser */

document.addEventListener("DOMContentLoaded", function () {
    fetch("/admin/localizationBundle")
        .then((response) => response.json())
        .then((data) => {
            const localizationKeys = data;

            // Function to populate localization keys based on selected plugin and language
            function populateLocalizationKeys(pluginId, languageId) {
                const keys = localizationKeys[pluginId][languageId];
                const keysSection = document.getElementById("keysSection");
                keysSection.innerHTML = ""; // Clear previous content

                Object.keys(keys).forEach((key) => {
                    const keyHTML = `
                            <div class="flex items-center mb-4">
                                <div class="w-1/3 pr-2">
                                    <label for="${key}" class="text-sm font-semibold text-gray-900 dark:text-white">${key}:</label>
                                </div>
                                <div class="w-2/3">
                                    <input type="text" id="${key}" name="${key}" value="${keys[key]}" class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500 sm:text-sm">
                                </div>
                            </div>
                        `;
                    keysSection.insertAdjacentHTML("beforeend", keyHTML);
                });
            }

            // Event listener for plugin change
            document.getElementById("plugin").addEventListener("change", function () {
                const selectedPlugin = this.value;
                const selectedLanguage = document.getElementById("language").value;
                populateLocalizationKeys(selectedPlugin, selectedLanguage);
            });

            // Event listener for language change
            document.getElementById("language").addEventListener("change", function () {
                const selectedPlugin = document.getElementById("plugin").value;
                const selectedLanguage = this.value;
                populateLocalizationKeys(selectedPlugin, selectedLanguage);
            });

            // Event listener for save button click
            document.getElementById("saveBtn").addEventListener("click", function () {
                const plugin = document.getElementById("plugin").value;
                const language = document.getElementById("language").value;

                const keys = {};
                document.querySelectorAll("#keysSection input").forEach((input) => {
                    keys[input.name] = input.value;
                });

                fetch("/admin/localizationBundle", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        plugin,
                        language,
                        keys,
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            alert("Localization keys updated successfully!");
                        } else {
                            console.error("Failed to update localization keys:", data);
                            alert("Failed to update localization keys!");
                        }
                    })
                    .catch((error) => {
                        console.error("Error saving data:", error);
                        alert("Failed to update localization keys!");
                    });
            });

            // Trigger change event on page load to fetch keys for default selected plugin and language
            document.getElementById("plugin").dispatchEvent(new Event("change"));
        })
        .catch((error) => {
            console.error("Error fetching localizationKeys:", error);
        });
});

/* eslint-env browser */

function changeLanguage(languageCode) {
    console.log("Language code: ", languageCode);

    // Send the language code to the server
    fetch(`/api/language`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ language_code: languageCode }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to change language: ${response.statusText}`);
            }

            // Reload the page to apply the new language
            window.location.reload();
        })
        .catch((error) => {
            console.error(error);
            alert("Failed to change language");
        });
}

document.addEventListener("DOMContentLoaded", (event) => {
    let languageElems = document.querySelectorAll("#language-dropdown a");

    for (let option of languageElems) {
        const languageCode = option.getAttribute("href").substring(1); // Extract language code

        option.addEventListener("click", function (event) {
            event.preventDefault();
            changeLanguage(languageCode);
        });
    }
});

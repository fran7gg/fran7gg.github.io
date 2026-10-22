(function() {
    "use strict";

    const storageKey = "fran7_theme";
    const themes = ["auto", "light", "dark"];

    function aplicarTema(theme) {
        const selectedTheme = themes.includes(theme) ? theme : "auto";
        document.documentElement.dataset.fran7Theme = selectedTheme;
        document.documentElement.style.colorScheme =
            selectedTheme === "auto" ? "light dark" : selectedTheme;

        document.querySelectorAll('input[name="theme"]').forEach(function(input) {
            input.checked = input.value === selectedTheme;
        });
    }

    let savedTheme = "auto";
    try {
        savedTheme = localStorage.getItem(storageKey) || "auto";
    } catch (error) {
        savedTheme = "auto";
    }

    aplicarTema(savedTheme);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
            aplicarTema(savedTheme);
        }, { once: true });
    }

    document.addEventListener("change", function(event) {
        const input = event.target;
        if (!input.matches('input[name="theme"]') || !themes.includes(input.value)) {
            return;
        }

        try {
            localStorage.setItem(storageKey, input.value);
        } catch (error) {
            // Keep the selected theme for this page even when storage is unavailable.
        }

        aplicarTema(input.value);
    });
})();
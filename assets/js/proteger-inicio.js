(function() {
    "use strict";

    const AUTH_STORAGE_KEY = "fran7_loja_pocketbase_auth";

    function verificarAcesso() {
        if (!window.Fran7Session || !window.Fran7Session.estaAutenticado()) {
            window.location.replace("index.html");
        }
    }

    verificarAcesso();
    window.addEventListener("pageshow", verificarAcesso);
    window.addEventListener("fran7-auth-changed", verificarAcesso);
    window.addEventListener("storage", function(event) {
        if (event.key === AUTH_STORAGE_KEY) {
            verificarAcesso();
        }
    });
})();

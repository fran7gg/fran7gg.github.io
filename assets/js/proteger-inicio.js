(function() {
    "use strict";

    const AUTH_STORAGE_KEY = "fran7_loja_pocketbase_auth";

    function verificarAcesso() {
        if (!window.Fran7Session || !window.Fran7Session.estaAutenticado()) {
            const paginaAtual = window.location.pathname.toLowerCase();
            const ePaginaIndex = paginaAtual === "/" ||
                /(^|\/)index\.html$/.test(paginaAtual);
            const ePaginaAutenticacao = /(^|\/)(registo|redefinir-palavra-passe)\.html$/.test(paginaAtual);

            if (ePaginaIndex || ePaginaAutenticacao) {
                return;
            }

            window.location.replace("registo.html?modo=login");
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

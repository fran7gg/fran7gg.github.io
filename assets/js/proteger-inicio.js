(function() {
    "use strict";

    const AUTH_STORAGE_KEY = "fran7_loja_supabase_auth";

    let verificationInProgress = false;

    async function verificarAcesso() {
        if (verificationInProgress) {
            return;
        }
        verificationInProgress = true;
        let authenticated = false;
        try {
            const auth = window.Fran7Auth;
            authenticated = auth?.verificarSessao
                ? await auth.verificarSessao()
                : Boolean(window.Fran7Session?.estaAutenticado());
        } catch (error) {
            console.error("Não foi possível verificar a sessão FRAN7.", error);
        } finally {
            verificationInProgress = false;
        }
        if (!authenticated) {
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

    document.addEventListener("DOMContentLoaded", verificarAcesso, { once: true });
    window.addEventListener("pageshow", verificarAcesso);
    window.addEventListener("fran7-auth-changed", verificarAcesso);
    window.addEventListener("storage", function(event) {
        if (event.key === AUTH_STORAGE_KEY) {
            verificarAcesso();
        }
    });
})();

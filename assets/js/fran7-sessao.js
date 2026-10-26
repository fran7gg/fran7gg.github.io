(function() {
    "use strict";

    const AUTH_STORAGE_KEY = "fran7_loja_pocketbase_auth";

    function estaAutenticado() {
        try {
            const saved = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!saved) {
                return false;
            }

            const auth = JSON.parse(saved);
            const token = typeof auth.token === "string" ? auth.token : "";
            const userId = typeof auth.record?.id === "string" ? auth.record.id : "";
            const payload = token.split(".")[1];
            if (!token || !userId || !payload) {
                return false;
            }

            const claims = JSON.parse(atob(
                payload.replace(/-/g, "+").replace(/_/g, "/")
            ));
            return claims.id === userId &&
                Number.isFinite(claims.exp) &&
                claims.exp * 1000 > Date.now();
        } catch (error) {
            console.error("Não foi possível validar a sessão FRAN7.", error);
            return false;
        }
    }

    window.Fran7Session = { estaAutenticado: estaAutenticado };
})();

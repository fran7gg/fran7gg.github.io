(function() {
    "use strict";

    const hostname = window.location.hostname || "127.0.0.1";
    
    // Aceita localhost, 127.0.0.1, [::1] ou quando o ficheiro é aberto direto do disco (file://)
    const isLocalhost = hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        window.location.protocol === "file:";

    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const existingConfig = window.FRAN7_CHECKOUT_CONFIG || {};
    
    // Define este endpoint HTTPS quando o servidor PocketBase estiver hospedado na nuvem.
    const POCKETBASE_CLOUD_URL = "";

    // URL padrão local para o desenvolvimento
    const defaultLocalUrl = "http://127.0.0.1:8090";

    const configuredPocketBaseUrl = window.FRAN7_POCKETBASE_URL ||
        existingConfig.pocketBaseUrl ||
        (isLocalhost ? defaultLocalUrl : POCKETBASE_CLOUD_URL);

    const defaults = {
        pocketBaseUrl: String(configuredPocketBaseUrl).replace(/\/+$/, ""),
        collectionName: "encomendas",
        whatsappNumber: "244973560521",
        invoicePrefix: "FT",
        brandName: "FRAN7",
        slogan: "Grief & Glory",
        supportEmail: "fran7officiall@gmail.com",
        logoUrl: new URL("assets/images/logo.png.png", window.location.href).href,
        iban: "",
        multicaixaExpress: ""
    };

    window.FRAN7_CHECKOUT_CONFIG = Object.assign(
        defaults,
        window.FRAN7_CHECKOUT_CONFIG || {}
    );
})();
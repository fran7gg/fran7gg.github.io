(function() {
    "use strict";

    const hostname = window.location.hostname || "127.0.0.1";
    const isLocalhost = hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]";
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const existingConfig = window.FRAN7_CHECKOUT_CONFIG || {};
    // Set this HTTPS endpoint when the PocketBase server is hosted in the cloud.
    const POCKETBASE_CLOUD_URL = "";
    const configuredPocketBaseUrl = window.FRAN7_POCKETBASE_URL ||
        existingConfig.pocketBaseUrl ||
        (isLocalhost ? protocol + "//" + hostname + ":8090" : POCKETBASE_CLOUD_URL);
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
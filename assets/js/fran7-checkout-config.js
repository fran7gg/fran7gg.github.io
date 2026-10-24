(function() {
    "use strict";

    const hostname = window.location.hostname || "127.0.0.1";
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const defaults = {
        pocketBaseUrl: window.FRAN7_POCKETBASE_URL || protocol + "//" + hostname + ":8090",
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
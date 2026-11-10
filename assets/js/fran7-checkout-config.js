(function() {
    "use strict";

    const existingConfig = window.FRAN7_CHECKOUT_CONFIG || {};
    window.FRAN7_SUPABASE_CONFIG = Object.assign({
        url: "https://pqvnqloukcwwtavdyjry.supabase.co",
        anonKey: "sb_publishable_D5ybr1mKrFX57o-6jXKxXw_hxvmLM8U"
    }, window.FRAN7_SUPABASE_CONFIG || {});
    const supabaseConfig = window.FRAN7_SUPABASE_CONFIG;

    const defaults = {
        supabaseUrl: String(supabaseConfig.url || "https://pqvnqloukcwwtavdyjry.supabase.co").replace(/\/+$/, ""),
        supabaseAnonKey: String(supabaseConfig.anonKey || ""),
        whatsappNumber: "244973560521",
        invoicePrefix: "FT",
        brandName: "FRAN7",
        slogan: "Grief & Glory",
        supportEmail: "fran7officiall@gmail.com",
        logoUrl: new URL("FRAN7.JPG", window.location.href).href,
        iban: "",
        multicaixaExpress: ""
    };

    window.FRAN7_CHECKOUT_CONFIG = Object.assign(
        defaults,
        window.FRAN7_CHECKOUT_CONFIG || {}
    );
})();
(function() {
    "use strict";

    const config = window.FRAN7_CHECKOUT_CONFIG || {};
    let client = null;

    function getClient() {
        if (client) {
            return client;
        }
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error(
                "O Supabase ainda não está configurado. Adiciona a chave publishable/anon em FRAN7_SUPABASE_CONFIG."
            );
        }
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            throw new Error("A biblioteca Supabase não foi carregada.");
        }
        client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                detectSessionInUrl: true,
                persistSession: true
            }
        });
        return client;
    }

    window.Fran7Supabase = {
        getClient: getClient,
        isConfigured: function() {
            return Boolean(config.supabaseUrl && config.supabaseAnonKey);
        }
    };
})();

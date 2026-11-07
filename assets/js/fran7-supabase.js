(function() {
    "use strict";

    const config = window.FRAN7_CHECKOUT_CONFIG || {};
    let client = null;

    function fetchSupabase(input, init) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        const publishableKey = config.supabaseAnonKey;
        if (
            publishableKey &&
            publishableKey.startsWith("sb_publishable_") &&
            headers.get("Authorization") === "Bearer " + publishableKey
        ) {
            headers.delete("Authorization");
        }
        return window.fetch(input, Object.assign({}, init, { headers: headers }));
    }

    function getClient() {
        if (client) {
            return client;
        }
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error("O serviço está temporariamente indisponível. Tenta novamente mais tarde.");
        }
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            throw new Error("O serviço está temporariamente indisponível. Tenta novamente mais tarde.");
        }
        client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                detectSessionInUrl: true,
                persistSession: true
            },
            global: {
                fetch: fetchSupabase
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

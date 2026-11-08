(function() {
    "use strict";

    const AUTH_STORAGE_KEY = "fran7_loja_supabase_auth";
    const PROFILE_KEYS = [
        "usuarioFRAN7",
        "sessaoFRAN7",
        "cadastroFRAN7Concluido",
        "fran7_nome",
        "fran7_email",
        "fran7_telefone"
    ];
    let supabaseClient = null;
    let session = null;
    let profile = null;

    function getClient() {
        if (!supabaseClient) {
            if (!window.Fran7Supabase?.getClient) {
                throw new Error("O serviço está temporariamente indisponível. Tenta novamente mais tarde.");
            }
            supabaseClient = window.Fran7Supabase.getClient();
            supabaseClient.auth.onAuthStateChange(function(event, nextSession) {
                session = nextSession;
                if (!nextSession) {
                    profile = null;
                    clearLocalSession();
                    notifyAuthChanged();
                    return;
                }

                profile = profileFromUser(nextSession.user);
                saveLocalSession(nextSession.access_token, profile);
                notifyAuthChanged();
                window.setTimeout(function() {
                    loadProfile(nextSession.user).catch(function(error) {
                        console.error("Não foi possível carregar o perfil Supabase da loja.", error);
                    });
                }, 0);
            });
        }
        return supabaseClient;
    }

    function profileFromUser(user) {
        const metadata = user?.user_metadata || {};
        return {
            id: user?.id || "",
            nome: String(metadata.nome || ""),
            email: String(user?.email || ""),
            telefone: String(metadata.telefone || ""),
            aniversario: String(metadata.aniversario || "")
        };
    }

    async function loadProfile(user) {
        if (!user?.id) {
            return profile;
        }
        const client = getClient();
        const result = await client
            .from("fran7_profiles")
            .select("id,nome,telefone,aniversario")
            .eq("id", user.id)
            .maybeSingle();
        if (result.error) {
            throw result.error;
        }
        if (result.data) {
            profile = Object.assign(profileFromUser(user), result.data);
            saveLocalSession(session?.access_token || "", profile);
            notifyAuthChanged();
        }
        return profile;
    }

    async function loadProfileWithoutBlockingAuth(user) {
        try {
            await loadProfile(user);
        } catch (error) {
            console.error(
                "A sessão FRAN7 está ativa, mas não foi possível carregar o perfil do utilizador.",
                error
            );
        }
    }

    function saveLocalSession(token, record) {
        if (token && record?.id) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
                token: token,
                record: record
            }));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        if (record?.id) {
            guardarPerfil(record);
        }
    }

    function guardarPerfil(record) {
        const customer = profileFromUser({
            id: record.id,
            email: record.email,
            user_metadata: record
        });
        localStorage.setItem("usuarioFRAN7", JSON.stringify(customer));
        localStorage.setItem("fran7_nome", customer.nome);
        localStorage.setItem("fran7_email", customer.email);
        localStorage.setItem("fran7_telefone", customer.telefone);
        localStorage.setItem("sessaoFRAN7", "true");
        localStorage.setItem("cadastroFRAN7Concluido", "true");
    }

    function clearLocalSession() {
        PROFILE_KEYS.forEach(function(key) {
            localStorage.removeItem(key);
        });
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    function notifyAuthChanged() {
        window.dispatchEvent(new CustomEvent("fran7-auth-changed", {
            detail: { authenticated: estaAutenticado() }
        }));
    }

    function cachedSession() {
        try {
            const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
            if (!stored || typeof stored.token !== "string" || !stored.record?.id) {
                return null;
            }
            const payload = stored.token.split(".")[1];
            if (!payload) {
                return null;
            }
            const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
            if (claims.sub !== stored.record.id ||
                !Number.isFinite(claims.exp) ||
                claims.exp * 1000 <= Date.now()) {
                return null;
            }
            return stored;
        } catch (error) {
            console.error("A sessão Supabase guardada para a loja é inválida.", error);
            clearLocalSession();
            return null;
        }
    }

    function estaAutenticado() {
        const active = session || cachedSession();
        return Boolean(active?.access_token || active?.token);
    }

    function obterSessao() {
        const active = session;
        if (active?.access_token && active.user?.id) {
            return {
                token: active.access_token,
                record: profile || profileFromUser(active.user)
            };
        }
        const cached = cachedSession();
        return cached
            ? { token: cached.token, record: cached.record }
            : null;
    }

    async function verificarSessao() {
        const result = await getClient().auth.getSession();
        if (result.error) {
            throw result.error;
        }
        session = result.data.session;
        if (!session) {
            profile = null;
            clearLocalSession();
            return false;
        }
        profile = profileFromUser(session.user);
        saveLocalSession(session.access_token, profile);
        await loadProfileWithoutBlockingAuth(session.user);
        return true;
    }

    function limparSessao() {
        session = null;
        profile = null;
        clearLocalSession();
    }

    async function criarConta(dados) {
        const client = getClient();
        const result = await client.auth.signUp({
            email: String(dados.email || "").trim().toLowerCase(),
            password: dados.senha,
            options: {
                emailRedirectTo: new URL("registo.html?modo=login", window.location.href).href,
                data: {
                    nome: String(dados.nome || "").trim(),
                    telefone: String(dados.telefone || "").trim(),
                    aniversario: String(dados.aniversario || "")
                }
            }
        });
        if (result.error) {
            console.error("Supabase: não foi possível criar a conta FRAN7.", result.error);
            throw new Error("Não foi possível criar a conta. Verifica os dados e tenta novamente.");
        }
        if (result.data.session) {
            session = result.data.session;
            profile = profileFromUser(result.data.user);
            saveLocalSession(session.access_token, profile);
            await loadProfileWithoutBlockingAuth(result.data.user);
        }
        return profileFromUser(result.data.user);
    }

    async function entrar(email, senha) {
        const result = await getClient().auth.signInWithPassword({
            email: String(email || "").trim().toLowerCase(),
            password: senha
        });
        if (result.error) {
            console.error("Supabase: não foi possível iniciar sessão FRAN7.", result.error);
            if (result.error.code === "email_not_confirmed") {
                throw new Error("Confirma primeiro o endereço de e-mail através do link enviado e tenta iniciar sessão novamente.");
            }
            if (result.error.status === 400 || result.error.status === 401) {
                throw new Error("O e-mail ou a palavra-passe estão incorretos.");
            }
            throw new Error("Não foi possível iniciar sessão. Confirma os dados e tenta novamente mais tarde.");
        }
        session = result.data.session;
        profile = profileFromUser(result.data.user);
        saveLocalSession(session.access_token, profile);
        await loadProfileWithoutBlockingAuth(result.data.user);
        return profile;
    }

    async function solicitarRecuperacao(email) {
        const redirectTo = new URL("redefinir-palavra-passe.html", window.location.href).href;
        const result = await getClient().auth.resetPasswordForEmail(
            String(email || "").trim().toLowerCase(),
            { redirectTo: redirectTo }
        );
        if (result.error) {
            console.error("Supabase: não foi possível solicitar a recuperação da palavra-passe.", result.error);
            throw new Error("Não foi possível enviar o e-mail de recuperação. Tenta novamente mais tarde ou contacta o suporte.");
        }
    }

    async function redefinirPalavraPasse(token, password, passwordConfirm) {
        if (password !== passwordConfirm) {
            throw new Error("As palavras-passe não coincidem.");
        }
        const client = getClient();
        if (token) {
            const result = await client.auth.verifyOtp({
                token_hash: token,
                type: "recovery"
            });
            if (result.error) {
                throw new Error("O link expirou ou é inválido. Solicita um novo link de recuperação.");
            }
            session = result.data.session;
        } else {
            const result = await client.auth.getSession();
            if (result.error || !result.data.session) {
                throw new Error("O link expirou ou é inválido. Solicita um novo link de recuperação.");
            }
            session = result.data.session;
        }
        const result = await client.auth.updateUser({ password: password });
        if (result.error) {
            console.error("Supabase: não foi possível redefinir a palavra-passe.", result.error);
            throw new Error("Não foi possível redefinir a palavra-passe. Tenta novamente mais tarde.");
        }
        await client.auth.signOut();
    }

    async function terminarSessao() {
        const client = getClient();
        const result = await client.auth.signOut();
        if (result.error) {
            console.error("Supabase: não foi possível terminar a sessão.", result.error);
            throw new Error("Não foi possível terminar a sessão. Tenta novamente mais tarde.");
        }
        limparSessao();
        notifyAuthChanged();
    }

    async function excluirConta(password) {
        const client = getClient();
        const current = session || (await client.auth.getSession()).data.session;
        if (!current?.user?.email) {
            throw new Error("Inicia sessão novamente antes de eliminar a conta.");
        }
        const reauthenticated = await client.auth.signInWithPassword({
            email: current.user.email,
            password: password
        });
        if (reauthenticated.error ||
            reauthenticated.data.user?.id !== current.user.id) {
            throw new Error("A palavra-passe está incorreta. Confirma-a e tenta novamente.");
        }

        const deletion = await client.functions.invoke("fran7-delete-account", {
            method: "POST"
        });
        if (deletion.error) {
            console.error("Supabase não conseguiu eliminar a conta FRAN7.", deletion.error);
            throw new Error("Não foi possível eliminar a conta. Tenta novamente mais tarde ou contacta o suporte.");
        }

        const signOut = await client.auth.signOut({ scope: "local" });
        if (signOut.error) {
            console.error("A conta foi eliminada, mas não foi possível limpar a sessão local.", signOut.error);
        }
        limparSessao();
        notifyAuthChanged();
    }

    window.Fran7Auth = {
        criarConta: criarConta,
        entrar: entrar,
        solicitarRecuperacao: solicitarRecuperacao,
        redefinirPalavraPasse: redefinirPalavraPasse,
        excluirConta: excluirConta,
        terminarSessao: terminarSessao,
        guardarSessao: guardarPerfil,
        estaAutenticado: estaAutenticado,
        obterSessao: obterSessao,
        verificarSessao: verificarSessao,
        obterCliente: getClient
    };

    if (window.Fran7Supabase?.isConfigured()) {
        try {
            getClient().auth.getSession().then(function(result) {
                if (result.error) {
                    throw result.error;
                }
                session = result.data.session;
                if (session) {
                    profile = profileFromUser(session.user);
                    saveLocalSession(session.access_token, profile);
                    loadProfile(session.user).catch(function(error) {
                        console.error("Não foi possível carregar o perfil Supabase da loja.", error);
                    });
                } else {
                    clearLocalSession();
                }
                notifyAuthChanged();
            }).catch(function(error) {
                console.error("Não foi possível recuperar a sessão Supabase.", error);
            });
        } catch (error) {
            console.error("Não foi possível inicializar a autenticação Supabase.", error);
        }
    }
})();

(function() {
    "use strict";

    const POCKETBASE_URL = String(
        window.FRAN7_CHECKOUT_CONFIG?.pocketBaseUrl ||
        window.FRAN7_POCKETBASE_URL ||
        ""
    ).replace(/\/+$/, "");
    const POCKETBASE_HOST = window.location.hostname || "";
    const IS_GITHUB_PAGES = /(^|\.)github\.io$/i.test(POCKETBASE_HOST);
    const CONFIGURATION_ERROR = IS_GITHUB_PAGES
        ? "O PocketBase cloud ainda não está configurado. Define a URL pública em assets/js/fran7-checkout-config.js para ativar contas no site publicado."
        : "O PocketBase não está configurado. Define a URL em assets/js/fran7-checkout-config.js.";
    const COLLECTION = "usuarios_loja";
    const AUTH_STORAGE_KEY = "fran7_loja_pocketbase_auth";
    const SESSION_KEYS = [
        "usuarioFRAN7",
        "sessaoFRAN7",
        "cadastroFRAN7Concluido",
        "fran7_nome",
        "fran7_email",
        "fran7_telefone"
    ];

    if (typeof window.PocketBase !== "function") {
        throw new Error("A biblioteca PocketBase não foi carregada.");
    }

    function tokenExpirado(token) {
        if (!token) {
            return true;
        }

        try {
            const partes = token.split(".");
            if (partes.length !== 3) {
                return true;
            }
            const payload = JSON.parse(atob(
                partes[1].replace(/-/g, "+").replace(/_/g, "/")
            ));
            return !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now();
        } catch (error) {
            console.error("Não foi possível validar a sessão PocketBase da loja.", error);
            return true;
        }
    }

    function criarAuthStore() {
        let token = "";
        let record = null;
        const callbacks = [];

        function notificar() {
            callbacks.slice().forEach(function(callback) {
                callback(token, record);
            });
            window.dispatchEvent(new CustomEvent("fran7-auth-changed", {
                detail: { authenticated: Boolean(token && record) }
            }));
        }

        function carregar() {
            const saved = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!saved) {
                return;
            }
            try {
                const parsed = JSON.parse(saved);
                token = typeof parsed.token === "string" ? parsed.token : "";
                record = parsed.record && typeof parsed.record === "object"
                    ? parsed.record
                    : null;
            } catch (error) {
                console.error("A sessão PocketBase guardada para a loja está inválida.", error);
                localStorage.removeItem(AUTH_STORAGE_KEY);
            }
        }

        carregar();

        return {
            get token() {
                return token;
            },
            get record() {
                return record;
            },
            get model() {
                return record;
            },
            get isValid() {
                return !tokenExpirado(token);
            },
            get isSuperuser() {
                return false;
            },
            get isAuthRecord() {
                return this.isValid && Boolean(record);
            },
            save: function(nextToken, nextRecord) {
                token = nextToken || "";
                record = nextRecord || null;
                if (token) {
                    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
                        token: token,
                        record: record
                    }));
                } else {
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                }
                notificar();
            },
            clear: function() {
                token = "";
                record = null;
                localStorage.removeItem(AUTH_STORAGE_KEY);
                notificar();
            },
            onChange: function(callback, fireImmediately) {
                callbacks.push(callback);
                if (fireImmediately) {
                    callback(token, record);
                }
                return function() {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1) {
                        callbacks.splice(index, 1);
                    }
                };
            }
        };
    }

    const pb = POCKETBASE_URL
        ? new window.PocketBase(POCKETBASE_URL, criarAuthStore())
        : null;

    function exigirPocketBase() {
        if (!pb) {
            throw new Error(CONFIGURATION_ERROR);
        }
        return pb;
    }

    function guardarSessao(record) {
        const perfil = {
            id: record.id,
            nome: record.nome || "",
            email: record.email || "",
            telefone: record.telefone || "",
            aniversario: record.aniversario || ""
        };

        localStorage.setItem("usuarioFRAN7", JSON.stringify(perfil));
        localStorage.setItem("fran7_nome", perfil.nome);
        localStorage.setItem("fran7_email", perfil.email);
        localStorage.setItem("fran7_telefone", perfil.telefone);
        localStorage.setItem("sessaoFRAN7", "true");
        localStorage.setItem("cadastroFRAN7Concluido", "true");
        return perfil;
    }

    function limparSessao() {
        if (pb) {
            pb.authStore.clear();
        }
        SESSION_KEYS.forEach(function(key) {
            localStorage.removeItem(key);
        });
    }

    function mensagemErro(error, operacao) {
        if (operacao === "login" && error && error.status === 400) {
            return "O e-mail ou a palavra-passe estão incorretos.";
        }
        if (error && error.status === 0) {
            return "Não foi possível ligar ao PocketBase. Confirma que o servidor está ativo.";
        }
        if (error && error.status === 400) {
            const details = error.data && error.data.data;
            if (details && details.email) {
                return "Este e-mail já está registado ou não é válido.";
            }
            if (details && details.password) {
                return "A palavra-passe não cumpre os requisitos do PocketBase.";
            }
            return "Verifica os dados e tenta novamente.";
        }
        return "Não foi possível concluir a operação. Tenta novamente.";
    }

    async function criarConta(dados) {
        const client = exigirPocketBase();
        try {
            await client.collection(COLLECTION).create({
                email: dados.email,
                password: dados.senha,
                passwordConfirm: dados.senha,
                nome: dados.nome,
                telefone: dados.telefone,
                aniversario: dados.aniversario,
                consentimento: true,
                datadoconsentimento: new Date().toISOString()
            });
        } catch (error) {
            console.error("PocketBase: não foi possível criar a conta FRAN7.", error);
            throw new Error(mensagemErro(error, "cadastro"));
        }

        try {
            const auth = await client.collection(COLLECTION).authWithPassword(
                dados.email,
                dados.senha
            );
            return guardarSessao(auth.record);
        } catch (error) {
            console.error("PocketBase: a conta foi criada, mas o login automático falhou.", error);
            throw new Error(
                "A conta foi criada, mas não foi possível iniciar sessão. Tenta entrar com o teu e-mail e palavra-passe."
            );
        }
    }

    async function entrar(email, senha) {
        const client = exigirPocketBase();
        try {
            const auth = await client.collection(COLLECTION).authWithPassword(email, senha);
            return guardarSessao(auth.record);
        } catch (error) {
            console.error("PocketBase: não foi possível iniciar sessão FRAN7.", error);
            throw new Error(mensagemErro(error, "login"));
        }
    }

    function terminarSessao() {
        limparSessao();
    }

    if (pb && pb.authStore.isValid) {
        guardarSessao(pb.authStore.record);
    } else if (pb) {
        pb.authStore.clear();
        SESSION_KEYS.forEach(function(key) {
            localStorage.removeItem(key);
        });
    }

    window.Fran7PocketBaseAuth = {
        criarConta: criarConta,
        entrar: entrar,
        terminarSessao: terminarSessao,
        guardarSessao: guardarSessao,
        estaAutenticado: function() {
            return Boolean(pb && pb.authStore.isValid);
        },
        obterSessao: function() {
            if (!pb || !pb.authStore.isValid || !pb.authStore.record?.id) {
                return null;
            }
            return {
                token: pb.authStore.token,
                record: pb.authStore.record
            };
        }
    };
})();

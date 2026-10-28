(function() {
    "use strict";

    const MAX_HISTORICO = 6;
    const AI_FUNCTION_URL = "https://pqvnqloukcwwtavdyjry.supabase.co/functions/v1/fran7-ia";
    const historico = [];
    const openButton = document.getElementById("fran7AiOpen");
    const closeButton = document.getElementById("fran7AiClose");
    const chatWindow = document.getElementById("fran7AiWindow");
    const input = document.getElementById("fran7AiInput");
    const sendButton = document.getElementById("fran7AiSend");
    const messages = document.getElementById("fran7AiMessages");
    const form = document.getElementById("fran7AiForm");

    if (!openButton || !closeButton || !chatWindow || !input || !sendButton || !messages || !form) {
        throw new Error("Não foi possível iniciar o assistente FRAN7: faltam elementos da interface.");
    }

    function adicionarMensagem(texto, tipo) {
        const message = document.createElement("div");
        message.className = "fran7-ai-message " + tipo;
        message.textContent = texto;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    }

    function normalizar(texto) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function pedeTodosOsProdutos(texto) {
        return /\b(catalogo|todos|todas|lista completa|quais produtos|que produtos|que modelos|quais modelos|o que vende|o que tem na fran7|produtos da fran7|tudo que sabes|tudo o que sabes|tudo do site|apresenta tudo|tudo sobre a fran7)\b/.test(normalizar(texto));
    }

    const MENSAGEM_SUPORTE_UNICA =
        "Já consigo os seus dados e a mensagem. Vou chamar um agente humano da FRAN7 para acompanhar o seu pedido.\n\n" +
        "Pode ainda falar connosco por estes 5 meios:\n" +
        "• Site: https://fran7gg.github.io\n" +
        "• WhatsApp: https://wa.me/244973560521\n" +
        "• Instagram: https://instagram.com/fran7.official\n" +
        "• Email: fran7officiall@gmail.com\n" +
        "• Telefone: +244 973 560 521";

    function pedeSuporte(texto) {
        return /\b(suporte|atendente|agente|ajuda humana|ajuda dos trabalhadores|trabalhador|trabalhadores|funcionario|funcionarios|falar com alguem|problema com|problema no|reclamacao|denuncia|contactar a loja|enviar mensagem ao suporte)\b/.test(normalizar(texto));
    }


    async function enviarMensagemSuporte(nome, contacto, textoMensagem) {
        try {
            if (!window.Fran7PocketBaseAuth?.obterCliente) {
                throw new Error("O PocketBase da loja não está disponível.");
            }
            const pb = window.Fran7PocketBaseAuth.obterCliente();
            const data = {
                cliente_nome: String(nome || "Visitante").trim() || "Visitante",
                contacto: String(contacto || "").trim(),
                mensagem: String(textoMensagem || "").trim(),
                status: "pendente"
            };
            if (!data.contacto || !data.mensagem) {
                throw new Error("Contacto e mensagem são obrigatórios.");
            }
            if (pb.authStore.isValid && pb.authStore.record?.id) {
                data.user = pb.authStore.record.id;
            }
            const record = await pb.collection("suporte_mensagens").create(data);
            adicionarMensagem(MENSAGEM_SUPORTE_UNICA, "bot");
            return record;
        } catch (error) {
            console.error("Erro ao enviar mensagem de suporte:", error);
            adicionarMensagem(
                "Não foi possível enviar a mensagem ao suporte neste momento. Tente novamente ou contacte-nos diretamente pelo WhatsApp.",
                "bot"
            );
            return null;
        }
    }

    async function processarPedidoSuporte(question) {
        if (!pedeSuporte(question)) return false;

        const sessao = window.Fran7PocketBaseAuth?.obterSessao?.();
        const nome = String(sessao?.record?.nome || sessao?.record?.name || "Visitante").trim() || "Visitante";
        const contacto = String(sessao?.record?.telefone || sessao?.record?.email || "Não informado").trim() || "Não informado";
        await enviarMensagemSuporte(nome, contacto, question);
        return true;
    }

    function obterCatalogoReal() {
        return Array.from(document.querySelectorAll(".produto[data-product-id][data-product-name]"))
            .map(function(article) {
                const name = (article.dataset.productName || "").trim();
                const price = (article.dataset.productPrice || "").trim();
                const image = article.querySelector(".produto-imagem img")?.getAttribute("src") || "";
                if (!name) return null;
                return {
                    article: article,
                    name: name,
                    image: image,
                    price: price || "Consultar preço",
                    aliases: [normalizar(name)]
                };
            }).filter(Boolean);
    }

    function obterSugestoes(resposta) {
        const texto = normalizar(resposta);
        const pedeTodos = pedeTodosOsProdutos(resposta);
        const catalogo = obterCatalogoReal();

        return catalogo.filter(function(product) {
            return pedeTodos || product.aliases.some(function(alias) {
                return alias.length > 4 && texto.includes(alias);
            });
        }).slice(0, pedeTodos ? catalogo.length : 4);
    }

    function mostrarSugestoes(message, resposta) {
        const products = obterSugestoes(resposta);
        if (!products.length) return;

        const list = document.createElement("div");
        list.className = "fran7-ai-product-suggestions";
        list.setAttribute("aria-label", "Modelos sugeridos pela FRAN7 AI");

        products.forEach(function(product) {
            const card = document.createElement("article");
            card.className = "fran7-ai-product-card";
            card.setAttribute("aria-label", product.name + ", " + product.price);

            if (product.image) {
                const image = document.createElement("img");
                image.src = product.image;
                image.alt = product.name;
                image.loading = "lazy";
                card.appendChild(image);
            }

            const details = document.createElement("div");
            details.className = "fran7-ai-product-details";
            const name = document.createElement("strong");
            name.textContent = product.name;
            const price = document.createElement("span");
            price.textContent = product.price;
            const open = document.createElement("button");
            open.type = "button";
            open.className = "fran7-ai-product-open";
            open.textContent = "Ver modelo";
            open.addEventListener("click", function() {
                if (!window.Fran7Session?.estaAutenticado()) {
                    if (typeof window.mostrarAviso === "function") {
                        window.mostrarAviso();
                        return;
                    }
                    if (typeof window.mostrarNotificacao === "function" &&
                        typeof window.mostrarFormularioLogin === "function") {
                        window.mostrarNotificacao(
                            "Registo ou início de sessão",
                            "Para ver este modelo, primeiro cadastre-se ou inicie a sua sessão neste site.",
                            "INICIAR SESSÃO",
                            function() {
                                window.mostrarFormularioLogin();
                            },
                            true
                        );
                        return;
                    }
                    window.location.href = "registo.html?modo=login";
                    return;
                }

                if (!window.Fran7ProductDetail ||
                    typeof window.Fran7ProductDetail.open !== "function") {
                    console.error("FRAN7 AI: o detalhe do produto não está disponível nesta página.");
                    return;
                }

                chatWindow.hidden = true;
                openButton.setAttribute("aria-expanded", "false");
                window.Fran7ProductDetail.open(product.article);
            });
            details.append(name, price, open);
            card.appendChild(details);
            list.appendChild(card);
        });

        message.appendChild(list);
        messages.scrollTop = messages.scrollHeight;
    }

    function atualizarEstadoAvatar(estado) {
        chatWindow.classList.remove("is-thinking");
        if (estado) chatWindow.classList.add("is-" + estado);
    }

    async function consultarIA(question) {
        const response = await fetch(AI_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mensagem: question,
                historico: historico.map(function(message) {
                    return {
                        role: message.tipo === "assistant" ? "assistant" : "user",
                        content: message.texto
                    };
                })
            })
        });
        let result;
        try {
            result = await response.json();
        } catch (error) {
            throw new Error("O serviço de IA devolveu uma resposta inválida.");
        }

        if (!response.ok) {
            const message = typeof result.error === "string"
                ? result.error
                : "Não foi possível obter uma resposta da IA.";
            const retryAfter = response.headers.get("Retry-After") ||
                (Number.isFinite(Number(result.retryAfter)) ? String(result.retryAfter) : "");
            if (response.status === 429 && retryAfter) {
                throw new Error(message + " Tenta novamente dentro de " + retryAfter + " segundos.");
            }
            throw new Error(message);
        }
        if (typeof result.reply !== "string" || !result.reply.trim()) {
            throw new Error("A IA não devolveu uma resposta.");
        }
        return result.reply.trim();
    }

    async function enviar(texto) {
        const question = (texto || input.value).trim();
        if (!question || sendButton.disabled) return;

        adicionarMensagem(question, "user");
        input.value = "";
        input.disabled = true;
        sendButton.disabled = true;
        if (await processarPedidoSuporte(question)) {
            input.disabled = false;
            sendButton.disabled = false;
            input.focus();
            return;
        }
        atualizarEstadoAvatar("thinking");

        const typing = document.createElement("div");
        typing.className = "fran7-ai-message bot";
        typing.textContent = "A FRAN7 AI está a pensar...";
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;

        try {
            const reply = await consultarIA(question);
            const pedeTodos = pedeTodosOsProdutos(question);
            typing.remove();
            const replyMessage = adicionarMensagem(reply, "bot");
            mostrarSugestoes(replyMessage, pedeTodos ? "todos os produtos da FRAN7" : reply);
            historico.push(
                {tipo: "user", texto: question},
                {tipo: "assistant", texto: reply}
            );
            if (historico.length > MAX_HISTORICO) {
                historico.splice(0, historico.length - MAX_HISTORICO);
            }
        } catch (error) {
            atualizarEstadoAvatar("");
            console.error("FRAN7 AI:", error);
            typing.remove();
            adicionarMensagem(
                "Não consegui contactar a FRAN7 AI neste momento. " +
                    (error instanceof Error ? error.message : "Tenta novamente mais tarde."),
                "bot"
            );
        } finally {
            input.disabled = false;
            sendButton.disabled = false;
            input.focus();
        }
    }

    openButton.addEventListener("click", function() {
        chatWindow.hidden = false;
        openButton.setAttribute("aria-expanded", "true");
        input.focus();
    });

    closeButton.addEventListener("click", function() {
        atualizarEstadoAvatar("");
        chatWindow.hidden = true;
        openButton.setAttribute("aria-expanded", "false");
        openButton.focus();
    });


    form.addEventListener("submit", function(event) {
        event.preventDefault();
        enviar();
    });

    input.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    const avatar = chatWindow.querySelector(".fran7-ai-avatar-face");
    chatWindow.addEventListener("pointermove", function(event) {
        if (!avatar) return;
        const rect = avatar.getBoundingClientRect();
        const x = Math.max(-1.2, Math.min(1.2, (event.clientX - rect.left - rect.width / 2) / 28));
        const y = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / 24));
        avatar.style.setProperty("--eye-x", x.toFixed(2) + "px");
        avatar.style.setProperty("--eye-y", y.toFixed(2) + "px");
    });
    chatWindow.addEventListener("pointerleave", function() {
        if (!avatar) return;
        avatar.style.setProperty("--eye-x", "0px");
        avatar.style.setProperty("--eye-y", "0px");
    });

    document.querySelectorAll("[data-assistant-prompt]").forEach(function(button) {
        button.addEventListener("click", function() {
            enviar(button.dataset.assistantPrompt);
        });
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && !chatWindow.hidden) {
            chatWindow.hidden = true;
            openButton.setAttribute("aria-expanded", "false");
            openButton.focus();
        }
    });
})();

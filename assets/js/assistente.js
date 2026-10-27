(function() {
    "use strict";

    const PRODUTOS_FRAN7 = [
        {name: "Modelo FRAN7 01", price: "11.000 Kz", image: "assets/images/1.png", aliases: ["modelo 01", "modelo 1", "modelo fran7 01"]},
        {name: "Modelo FRAN7 02", price: "7.000 Kz", image: "assets/images/2.png", aliases: ["modelo 02", "modelo 2", "modelo fran7 02"]},
        {name: "Modelo FRAN7 03", price: "7.000 Kz", image: "assets/images/3.png", aliases: ["modelo 03", "modelo 3", "modelo fran7 03"]},
        {name: "Modelo FRAN7 04", price: "8.500 Kz", image: "assets/images/4.png", aliases: ["modelo 04", "modelo 4", "modelo fran7 04"]},
        {name: "Modelo FRAN7 05", price: "Consultar preço", image: "assets/images/mulheres,%20conjunto.jpg", aliases: ["modelo 05", "modelo 5", "modelo fran7 05"]},
        {name: "Meias FRAN7", price: "Consultar preço", image: "assets/images/meias.jpg", aliases: ["meias", "meias fran7"]},
        {name: "Modelo FRAN7 07", price: "Consultar preço", image: "assets/images/a1.jpeg", aliases: ["modelo 07", "modelo 7", "modelo fran7 07"]},
        {name: "Modelo FRAN7 08", price: "Consultar preço", image: "assets/images/a2.jpeg", aliases: ["modelo 08", "modelo 8", "modelo fran7 08"]},
        {name: "Modelo FRAN7 09", price: "Consultar preço", image: "assets/images/a3.jpeg", aliases: ["modelo 09", "modelo 9", "modelo fran7 09"]},
        {name: "Modelo FRAN7 10", price: "Consultar preço", image: "assets/images/WhatsApp%20Image%202026-10-04%20at%202.24.22%20PM.jpeg", aliases: ["modelo 10", "modelo fran7 10"]},
        {name: "Modelo FRAN7 11", price: "Consultar preço", image: "assets/images/WhatsApp%20Image%202026-10-04%20at%202.24.23%20PM.jpeg", aliases: ["modelo 11", "modelo fran7 11"]},
        {name: "Modelo FRAN7 12", price: "Consultar preço", image: "assets/images/WhatsApp%20Image%202026-10-04%20at%202.24.24%20PM.jpeg", aliases: ["modelo 12", "modelo fran7 12"]},
        {name: "T-shirt FRAN7 Tribal", price: "11.000 Kz", image: "assets/images/1.png", aliases: ["t shirt fran7 tribal", "camisola tribal"]},
        {name: "T-shirt FRAN7", price: "7.000 Kz", image: "assets/images/3.png", aliases: ["t shirt fran7"]},
        {name: "Boné FRAN7 Modelo 2", price: "7.000 Kz", image: "assets/images/CASTANHO.MODELO2.jpeg", images: ["assets/images/CINZA.MODELO2.jpeg"], colors: ["Castanho", "Cinza"], aliases: ["bone modelo 2", "bone modelo 02", "chapeu modelo 2", "chapeu modelo 02", "bone fran7 modelo 2"]},
        {name: "Boné FRAN7", price: "7.000 Kz", image: "assets/images/2.png", aliases: ["bone fran7"]},
        {name: "Boné FRAN7", price: "Consultar preço", image: "assets/images/4.png", aliases: ["bone fran7"]},
        {name: "FRAN7 Performance", price: "Consultar preço", image: "assets/images/WhatsApp%20Image%202026-10-04%20at%202.24.22%20PM.jpeg", aliases: ["fran7 performance"]},
        {name: "Conjunto Feminino FRAN7", price: "Consultar preço", image: "assets/images/mulheres,%20conjunto.jpg", aliases: ["conjunto feminino", "conjunto feminino fran7"]},
        {name: "T-shirt FRAN7 Crianças", price: "Consultar tamanho e preço", image: "assets/images/1.png", aliases: ["t shirt fran7 criancas", "camisola infantil"]},
        {name: "Boné FRAN7 Crianças", price: "Consultar tamanho e preço", image: "assets/images/2.png", aliases: ["bone fran7 criancas", "bone infantil"]}
    ];
    const MAX_HISTORICO = 6;
    const AI_FUNCTION_URL = "https://pqvnqloukcwwtavdyjry.supabase.co/functions/v1/fran7-ia";
    const historico = [];
    const openButton = document.getElementById("fran7AiOpen");
    const closeButton = document.getElementById("fran7AiClose");
    const chatWindow = document.getElementById("fran7AiWindow");
    const input = document.getElementById("fran7AiInput");
    const sendButton = document.getElementById("fran7AiSend");
    const voiceButton = document.getElementById("fran7AiVoice");
    const messages = document.getElementById("fran7AiMessages");
    const form = document.getElementById("fran7AiForm");

    if (!openButton || !closeButton || !chatWindow || !input || !sendButton || !voiceButton || !messages || !form) {
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

    function obterSugestoes(resposta) {
        const texto = normalizar(resposta);
        const pedeTodos = pedeTodosOsProdutos(resposta);
        const pageProducts = Array.from(document.querySelectorAll(".produto, .modelo, .favorito-card"));

        return PRODUTOS_FRAN7.map(function(product) {
            const article = pageProducts.find(function(candidate) {
                const candidateName = normalizar(candidate.dataset.productName ||
                    candidate.querySelector("h2, h3")?.textContent.trim() ||
                    candidate.querySelector("img")?.alt ||
                    "");
                const candidateImage = candidate.querySelector(
                    ".produto-imagem img, .modelo-imagem img, .favorito-card > img"
                )?.getAttribute("src");
                return candidateName === normalizar(product.name) &&
                    (!candidateImage || candidateImage === product.image);
            });
            const aliases = [product.name].concat(product.aliases || []).map(normalizar);
            const matched = aliases.some(function(alias) {
                return alias.length > 4 && texto.includes(alias);
            });
            return {
                article: article || criarArtigoProduto(product),
                name: product.name,
                image: product.image,
                price: product.price,
                aliases: aliases,
                matched: matched
            };
        }).filter(function(product) {
            return pedeTodos || product.matched;
        }).slice(0, pedeTodos ? PRODUTOS_FRAN7.length : 4);
    }

    function criarArtigoProduto(product) {
        const article = document.createElement("article");
        article.className = "produto";
        article.dataset.productName = product.name;
        article.dataset.productPrice = product.price;
        article.dataset.productDescription = "Modelo apresentado no catálogo FRAN7. Confirma cor, tamanho e disponibilidade com a equipa.";
        article.dataset.galleryImages = (product.images || []).join("|");
        article.dataset.galleryColors = (product.colors || []).join("|");
        if (!window.Fran7Session?.estaAutenticado()) {
            article.dataset.protegido = "true";
        }
        const imageContainer = document.createElement("div");
        imageContainer.className = "produto-imagem";
        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.name;
        imageContainer.appendChild(image);
        article.appendChild(imageContainer);
        return article;
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

    let reconhecimento = null;

    function atualizarEstadoAvatar(estado) {
        chatWindow.classList.remove("is-thinking", "is-listening", "is-speaking");
        if (estado) chatWindow.classList.add("is-" + estado);
    }

    function falar(texto) {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const fala = new SpeechSynthesisUtterance(texto);
        fala.lang = "pt-AO";
        fala.rate = 0.95;
        fala.pitch = 1;
        fala.onstart = function() { atualizarEstadoAvatar("speaking"); };
        fala.onend = function() { atualizarEstadoAvatar(""); };
        fala.onerror = function() { atualizarEstadoAvatar(""); };
        window.speechSynthesis.speak(fala);
    }

    function iniciarOuPararEscuta() {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            adicionarMensagem("O reconhecimento de voz não é suportado neste navegador. Pode escrever a mensagem normalmente.", "bot");
            return;
        }

        if (reconhecimento) {
            reconhecimento.stop();
            return;
        }

        reconhecimento = new Recognition();
        reconhecimento.lang = "pt-AO";
        reconhecimento.interimResults = true;
        reconhecimento.continuous = false;

        reconhecimento.onstart = function() {
            voiceButton.classList.add("is-listening");
            voiceButton.setAttribute("aria-label", "Parar reconhecimento de voz");
            atualizarEstadoAvatar("listening");
            input.placeholder = "A ouvir...";
        };

        reconhecimento.onresult = function(event) {
            let finalText = "";
            let interimText = "";
            for (let index = event.resultIndex; index < event.results.length; index++) {
                const transcript = event.results[index][0].transcript;
                if (event.results[index].isFinal) finalText += transcript;
                else interimText += transcript;
            }
            input.value = (finalText || interimText).trim();
            if (finalText.trim()) {
                reconhecimento.stop();
                enviar(finalText.trim());
            }
        };

        reconhecimento.onerror = function(event) {
            const motivo = event.error === "not-allowed"
                ? "Autorize o microfone para falar com a FRAN7 AI."
                : "Não consegui ouvir a mensagem. Tenta novamente ou escreve.";
            adicionarMensagem(motivo, "bot");
        };

        reconhecimento.onend = function() {
            reconhecimento = null;
            voiceButton.classList.remove("is-listening");
            voiceButton.setAttribute("aria-label", "Falar com o assistente");
            input.placeholder = "Escreve ou fala...";
            atualizarEstadoAvatar("");
        };

        try {
            reconhecimento.start();
        } catch (error) {
            reconhecimento = null;
            adicionarMensagem("O microfone já está em uso. Feche outros aplicativos de voz e tente novamente.", "bot");
            atualizarEstadoAvatar("");
        }
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
            falar(reply);
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
        if (reconhecimento) reconhecimento.stop();
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        atualizarEstadoAvatar("");
        chatWindow.hidden = true;
        openButton.setAttribute("aria-expanded", "false");
        openButton.focus();
    });

    voiceButton.addEventListener("click", iniciarOuPararEscuta);

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

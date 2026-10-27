(function() {
    "use strict";

    const COLLECTION = "avaliacao";
    const AUTH_STORAGE_KEY = "fran7_loja_pocketbase_auth";
    const POCKETBASE_URL = String(
        window.FRAN7_CHECKOUT_CONFIG?.pocketBaseUrl ||
        window.FRAN7_POCKETBASE_URL ||
        ""
    ).replace(/\/+$/, "");
    let productRecordsPromise = null;

    function getSession() {
        try {
            const authManager = window.Fran7PocketBaseAuth;
            if (authManager?.obterSessao) {
                const activeSession = authManager.obterSessao();
                if (activeSession?.token && activeSession.record?.id) {
                    return {
                        token: activeSession.token,
                        userId: activeSession.record.id
                    };
                }
            }

            const saved = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!saved) {
                return null;
            }
            const auth = JSON.parse(saved);
            const token = typeof auth.token === "string" ? auth.token : "";
            const userId = typeof auth.record?.id === "string" ? auth.record.id : "";
            const payload = token.split(".")[1];
            if (!token || !userId || !payload) {
                return null;
            }

            const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
            if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) {
                return null;
            }
            return { token: token, userId: userId };
        } catch (error) {
            console.error("A sessão PocketBase não pôde ser lida para a classificação.", error);
            return null;
        }
    }

    function criarClassificacao(productId, productName) {
        const widget = document.createElement("div");
        widget.className = "fran7-rating";
        widget.dataset.productId = productId;

        const summary = document.createElement("div");
        summary.className = "fran7-rating-summary";
        summary.setAttribute("aria-live", "polite");
        const summaryStars = document.createElement("span");
        summaryStars.className = "fran7-rating-summary-stars";
        summaryStars.setAttribute("aria-hidden", "true");
        for (let starNumber = 1; starNumber <= 5; starNumber += 1) {
            const summaryStar = document.createElement("span");
            summaryStar.className = "fran7-rating-summary-star";
            summaryStar.textContent = "★";
            summaryStars.appendChild(summaryStar);
        }
        const summaryText = document.createElement("span");
        summaryText.className = "fran7-rating-summary-text";
        summaryText.textContent = "A carregar avaliações...";
        summary.append(summaryStars, summaryText);

        const label = document.createElement("span");
        label.className = "fran7-rating-label";
        label.textContent = "Classifica este produto";

        const stars = document.createElement("div");
        stars.className = "fran7-rating-stars";
        stars.setAttribute("role", "group");
        stars.setAttribute("aria-label", "Classificar " + productName + " de 1 a 5 estrelas");

        for (let rating = 1; rating <= 5; rating += 1) {
            const star = document.createElement("button");
            star.className = "fran7-rating-star";
            star.type = "button";
            star.dataset.rating = String(rating);
            star.setAttribute("aria-label", rating + (rating === 1 ? " estrela" : " estrelas"));
            star.setAttribute("aria-pressed", "false");
            star.textContent = "★";
            stars.appendChild(star);
        }

        const note = document.createElement("p");
        note.className = "fran7-rating-note";
        note.textContent = productId
            ? ""
            : "A localizar este produto no catálogo...";

        const status = document.createElement("p");
        status.className = "fran7-rating-status";
        status.setAttribute("aria-live", "polite");

        widget.append(summary, label, stars, note, status);
        if (!productId) {
            setDisabled(widget, true);
        }
        return widget;
    }

    function setDisabled(widget, disabled) {
        widget.querySelectorAll(".fran7-rating-star").forEach(function(star) {
            star.disabled = disabled;
        });
    }

    function mostrarSelecao(widget, rating) {
        widget.querySelectorAll(".fran7-rating-star").forEach(function(star) {
            const value = Number(star.dataset.rating);
            star.classList.toggle("is-selected", value <= rating);
            star.setAttribute("aria-pressed", String(value === rating));
        });
    }

    function getProductIdentity(article) {
        const image = article.querySelector(
            ".produto-imagem img, .modelo-imagem img, .favorito-card > img, .fran7-ai-product-card > img"
        );
        const name = article.dataset.productName ||
            article.querySelector("h2, h3, .fran7-ai-product-details strong")?.textContent.trim() ||
            image?.alt ||
            "Produto FRAN7";
        const id = article.dataset.productId || "";
        return { id: id, name: name };
    }

    function normalizarNome(value) {
        return String(value || "").trim().toLocaleLowerCase("pt")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function obterProdutosPocketBase() {
        if (!productRecordsPromise) {
            productRecordsPromise = fetch(
                POCKETBASE_URL + "/api/collections/produtos_loja/records?perPage=500"
            ).then(function(response) {
                if (!response.ok) {
                    throw new Error("PocketBase respondeu " + response.status + " ao procurar o produto.");
                }
                return response.json();
            }).then(function(result) {
                if (!Array.isArray(result.items)) {
                    throw new TypeError("A resposta do PocketBase não contém uma lista de produtos.");
                }
                return result.items;
            }).catch(function(error) {
                productRecordsPromise = null;
                throw error;
            });
        }
        return productRecordsPromise;
    }

    async function resolverProduto(article, widget, productName) {
        if (article.dataset.productId || widget.dataset.resolving === "true") {
            return;
        }
        widget.dataset.resolving = "true";

        try {
            const products = await obterProdutosPocketBase();
            if (!widget.isConnected) {
                return;
            }
            const matchingProducts = products.filter(function(product) {
                return product.id && normalizarNome(product.texto) === normalizarNome(productName);
            });
            if (matchingProducts.length !== 1) {
                widget.querySelector(".fran7-rating-note").textContent = matchingProducts.length > 1
                    ? "Há vários produtos com este nome no PocketBase. Usa um nome único para ligar a classificação."
                    : "Produto não encontrado em produtos_loja. Adiciona-o com este nome para ativar a classificação.";
                return;
            }

            const productId = matchingProducts[0].id;
            article.dataset.productId = productId;
            widget.dataset.productId = productId;
            const favorite = article.querySelector("[data-favorite-name]");
            if (favorite) {
                favorite.dataset.favoriteProductId = productId;
            }
            widget.querySelector(".fran7-rating-note").textContent = "";
            setDisabled(widget, false);
            await carregarAvaliacao(widget, productId);
        } catch (error) {
            console.error("Não foi possível ligar o produto à coleção do PocketBase.", error);
            if (widget.isConnected) {
                widget.querySelector(".fran7-rating-note").textContent =
                    "Não foi possível procurar o produto. Verifica a ligação e as permissões de leitura.";
            }
        } finally {
            delete widget.dataset.resolving;
        }
    }

    function criarFiltro(productId, userId) {
        function escapar(valor) {
            return String(valor).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        }
        return "produto_id='" + escapar(productId) + "' && user_id='" + escapar(userId) + "'";
    }

    function criarFiltroProduto(productId) {
        const escaped = String(productId).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        return "produto_id='" + escaped + "'";
    }

    async function carregarResumo(widget, productId) {
        const summaryText = widget.querySelector(".fran7-rating-summary-text");
        const summaryStars = widget.querySelectorAll(".fran7-rating-summary-star");
        const ratings = [];
        let page = 1;
        let pages = 1;

        try {
            do {
                const params = new URLSearchParams({
                    filter: criarFiltroProduto(productId),
                    perPage: "200",
                    page: String(page),
                    fields: "rating,produto_id"
                });
                const response = await fetch(
                    POCKETBASE_URL + "/api/collections/" + COLLECTION + "/records?" + params.toString(),
                    { cache: "no-store" }
                );
                if (!response.ok) {
                    throw new Error("PocketBase respondeu " + response.status + " ao carregar as avaliações.");
                }
                const result = await response.json();
                if (!Array.isArray(result.items)) {
                    throw new TypeError("A resposta do PocketBase não contém uma lista de avaliações.");
                }
                result.items.forEach(function(record) {
                    const rating = Number(record.rating);
                    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
                        ratings.push(rating);
                    }
                });
                pages = Number(result.totalPages) || 1;
                page += 1;
            } while (page <= pages);

            if (!widget.isConnected) {
                return;
            }
            const count = ratings.length;
            const average = count
                ? ratings.reduce(function(total, rating) { return total + rating; }, 0) / count
                : 0;
            summaryStars.forEach(function(star, index) {
                const value = average - index;
                star.classList.toggle("is-filled", value >= 0.75);
                star.classList.toggle("is-half", value >= 0.25 && value < 0.75);
            });
            summaryText.textContent = count
                ? average.toLocaleString("pt-AO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) +
                    " · " + count + (count === 1 ? " avaliação" : " avaliações")
                : "Ainda sem avaliações";
            widget.querySelector(".fran7-rating-summary").setAttribute(
                "aria-label",
                count
                    ? "Avaliação média " + average.toFixed(1) + " de 5, baseada em " + count +
                        (count === 1 ? " avaliação" : " avaliações")
                    : "Este produto ainda não tem avaliações"
            );
        } catch (error) {
            console.error("Não foi possível carregar as avaliações públicas do produto.", error);
            if (widget.isConnected) {
                summaryText.textContent = "Avaliações indisponíveis";
                widget.querySelector(".fran7-rating-summary").setAttribute(
                    "aria-label",
                    "As avaliações deste produto não estão disponíveis."
                );
            }
        }
    }

    async function pedirRegisto(session, productId) {
        const params = new URLSearchParams({
            filter: criarFiltro(productId, session.userId),
            perPage: "1"
        });
        const response = await fetch(
            POCKETBASE_URL + "/api/collections/" + COLLECTION + "/records?" + params.toString(),
            { headers: { Authorization: session.token } }
        );
        if (!response.ok) {
            const detail = await response.json().catch(function() { return null; });
            throw new Error(mensagemErroPocketBase(response.status, detail, "consultar"));
        }
        const result = await response.json();
        return result.items?.[0] || null;
    }

    async function guardarAvaliacao(session, productId, rating, record) {
        const payload = {
            produto_id: productId,
            user_id: session.userId,
            rating: rating
        };
        const endpoint = record
            ? POCKETBASE_URL + "/api/collections/" + COLLECTION + "/records/" + encodeURIComponent(record.id)
            : POCKETBASE_URL + "/api/collections/" + COLLECTION + "/records";
        const response = await fetch(endpoint, {
            method: record ? "PATCH" : "POST",
            headers: {
                Authorization: session.token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const detail = await response.json().catch(function() { return null; });
            throw new Error(mensagemErroPocketBase(response.status, detail, "guardar"));
        }
        return response.json();
    }

    function mensagemErroPocketBase(status, detail, operation) {
        const userError = detail?.data?.user_id?.message || "";
        if (/relation records with the provided ids/i.test(userError)) {
            return "O campo user_id da coleção avaliacao não aponta para a coleção de utilizadores do site. Altera a relação para usuarios_loja (Single) e guarda as alterações.";
        }

        const fields = detail?.data
            ? Object.entries(detail.data).map(function(entry) {
                return entry[0] + ": " + entry[1].message;
            }).join("; ")
            : "";
        return "Não foi possível " + operation + " a avaliação (PocketBase " + status + "). " +
            (fields || detail?.message || "Verifica as regras da coleção avaliacao.");
    }

    async function carregarAvaliacao(widget, productId) {
        if (!productId) {
            return;
        }
        if (!POCKETBASE_URL) {
            widget.querySelector(".fran7-rating-summary-text").textContent =
                "Avaliações cloud indisponíveis";
            widget.querySelector(".fran7-rating-note").textContent =
                "A ligação ao PocketBase cloud ainda não está configurada.";
            setDisabled(widget, true);
            return;
        }
        await carregarResumo(widget, productId);
        const session = getSession();
        if (!session) {
            const note = widget.querySelector(".fran7-rating-note");
            note.textContent = "Inicia sessão para avaliar este produto. ";
            const loginLink = document.createElement("a");
            loginLink.href = "registo.html?modo=login";
            loginLink.textContent = "Entrar";
            note.appendChild(loginLink);
            widget.querySelectorAll(".fran7-rating-star").forEach(function(star) {
                star.disabled = true;
            });
            return;
        }

        widget.querySelector(".fran7-rating-note").textContent = "A carregar a tua avaliação...";
        try {
            const record = await pedirRegisto(session, productId);
            if (!widget.isConnected) {
                return;
            }
            widget.dataset.ratingRecordId = record?.id || "";
            widget.dataset.savedRating = record ? String(record.rating) : "";
            widget.querySelector(".fran7-rating-note").textContent = "";
            if (record) {
                mostrarSelecao(widget, Number(record.rating));
            }
        } catch (error) {
            console.error("Não foi possível carregar a avaliação do produto.", error);
            if (widget.isConnected) {
                widget.querySelector(".fran7-rating-note").textContent =
                    "Não foi possível carregar a avaliação. Verifica as regras da coleção.";
            }
        }
    }

    function mountCard(article) {
        if (article.querySelector(".fran7-rating")) {
            return;
        }

        const info = article.querySelector(
            ".produto-info, .modelo-info, .favorito-card-info, .fran7-ai-product-details"
        );
        if (!info) {
            return;
        }

        const identity = getProductIdentity(article);
        const widget = criarClassificacao(identity.id, identity.name);
        const title = info.querySelector("h2, h3");
        if (title) {
            title.insertAdjacentElement("afterend", widget);
        } else {
            info.prepend(widget);
        }
        if (identity.id) {
            carregarAvaliacao(widget, identity.id);
        } else {
            setDisabled(widget, true);
            resolverProduto(article, widget, identity.name);
        }
    }

    function mountAll(root) {
        if (root instanceof Element &&
            root.matches(".produto, .modelo, .favorito-card, .fran7-ai-product-card")) {
            mountCard(root);
        }
        root.querySelectorAll?.(".produto, .modelo, .favorito-card, .fran7-ai-product-card")
            .forEach(mountCard);
    }

    document.addEventListener("click", async function(event) {
        const star = event.target.closest(".fran7-rating-star");
        if (!star) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const widget = star.closest(".fran7-rating");
        const rating = Number(star.dataset.rating);
        const productId = widget?.dataset.productId;
        const session = getSession();
        if (!widget || !productId || !session ||
            !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return;
        }

        setDisabled(widget, true);
        widget.querySelector(".fran7-rating-status").textContent = "A guardar a tua avaliação...";
        try {
            const currentRecord = widget.dataset.ratingRecordId
                ? { id: widget.dataset.ratingRecordId }
                : await pedirRegisto(session, productId);
            const savedRecord = await guardarAvaliacao(session, productId, rating, currentRecord);
            widget.dataset.ratingRecordId = savedRecord.id;
            widget.dataset.savedRating = String(savedRecord.rating);
            mostrarSelecao(widget, rating);
            widget.querySelector(".fran7-rating-note").textContent = "";
            widget.querySelector(".fran7-rating-status").textContent =
                "Avaliaste este produto com " + rating +
                (rating === 1 ? " estrela." : " estrelas.");
            await carregarResumo(widget, productId);
        } catch (error) {
            console.error("Não foi possível guardar a avaliação do produto.", error);
            widget.querySelector(".fran7-rating-status").textContent =
                error.message || "Não foi possível guardar a avaliação. Verifica a ligação e as regras da coleção avaliacao.";
        } finally {
            setDisabled(widget, false);
        }
    }, true);

    const observer = new MutationObserver(function(records) {
        records.forEach(function(record) {
            record.addedNodes.forEach(function(node) {
                if (node instanceof Element) {
                    mountAll(node);
                }
            });
        });
    });

    document.addEventListener("DOMContentLoaded", function() {
        mountAll(document);
        observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });

    window.Fran7Ratings = {
        mount: function(container, productId, productName) {
            if (!(container instanceof HTMLElement)) {
                throw new TypeError("A classificação FRAN7 precisa de um elemento HTML.");
            }
            const widget = criarClassificacao(productId, productName);
            container.replaceChildren(widget);
            carregarAvaliacao(widget, productId);
        }
    };

    window.addEventListener("storage", function(event) {
        if (event.key !== AUTH_STORAGE_KEY) {
            return;
        }
        document.querySelectorAll(".fran7-rating").forEach(function(widget) {
            const productId = widget.dataset.productId;
            if (productId) {
                carregarAvaliacao(widget, productId);
            }
        });
    });

    window.addEventListener("fran7-auth-changed", function() {
        document.querySelectorAll(".fran7-rating").forEach(function(widget) {
            const productId = widget.dataset.productId;
            if (productId) {
                carregarAvaliacao(widget, productId);
            }
        });
    });
})();

(function() {
    "use strict";

    const MAX_COMMENT_LENGTH = 1000;
    const COMMENTS_PER_PRODUCT = 20;

    function showStatus(list, message, isError) {
        const status = document.createElement("p");
        status.className = "estado-comentarios";
        status.setAttribute("role", isError ? "alert" : "status");
        status.textContent = message;
        list.replaceChildren(status);
    }

    function addCommentElement(list, comment) {
        const item = document.createElement("div");
        item.className = "comentario";
        const author = document.createElement("strong");
        author.textContent = comment.author_name || "Cliente FRAN7";
        const text = document.createElement("p");
        text.textContent = comment.comment;
        item.append(author, text);
        list.appendChild(item);
    }

    async function loadComments(productId, list, toggle) {
        showStatus(list, "A carregar comentários...", false);
        try {
            const result = await window.Fran7Supabase.getClient()
                .from("fran7_product_comments")
                .select("author_name,comment,created_at", { count: "exact" })
                .eq("product_id", productId)
                .order("created_at", { ascending: false })
                .limit(COMMENTS_PER_PRODUCT);
            if (result.error) {
                throw result.error;
            }

            const comments = result.data || [];
            toggle.textContent = "Comentários (" + (result.count ?? comments.length) + ")";
            if (!comments.length) {
                showStatus(list, "Ainda não há comentários. Sê o primeiro a comentar.", false);
                return;
            }
            list.replaceChildren();
            comments.forEach(function(comment) {
                addCommentElement(list, comment);
            });
        } catch (error) {
            console.error("Não foi possível carregar os comentários do produto.", error);
            toggle.textContent = "Comentários";
            showStatus(list, "Não foi possível carregar os comentários. Tenta novamente mais tarde.", true);
        }
    }

    function redirectToLogin() {
        window.location.href = "registo.html?modo=login";
    }

    async function requestLogin() {
        if (!window.Fran7Notify?.confirm) {
            redirectToLogin();
            return;
        }
        const confirmed = await window.Fran7Notify.confirm(
            "Para comentar, inicia sessão ou cria uma conta FRAN7.",
            {
                title: "Entra na tua conta",
                confirmText: "Entrar / criar conta",
                cancelText: "Continuar a explorar"
            }
        );
        if (confirmed) {
            redirectToLogin();
        }
    }

    function createCommentsSection(article) {
        const productId = article.dataset.productId;
        if (!productId || article.querySelector(".comentarios-produto")) {
            return;
        }

        const section = document.createElement("section");
        section.className = "comentarios-produto";
        section.setAttribute("aria-label", "Comentários do produto");

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "comentarios-toggle";
        toggle.textContent = "Comentários";
        toggle.setAttribute("aria-expanded", "false");

        const content = document.createElement("div");
        content.className = "comentarios-conteudo";
        content.hidden = true;

        const list = document.createElement("div");
        list.className = "lista-comentarios";
        showStatus(list, "A carregar comentários...", false);

        const form = document.createElement("form");
        form.className = "comentario-form";
        const input = document.createElement("input");
        input.type = "text";
        input.name = "comment";
        input.maxLength = MAX_COMMENT_LENGTH;
        input.required = true;
        input.placeholder = "Escreve um comentário...";
        input.setAttribute("aria-label", "O teu comentário");
        const submit = document.createElement("button");
        submit.type = "submit";
        submit.textContent = "PUBLICAR";
        form.append(input, submit);
        const formStatus = document.createElement("p");
        formStatus.className = "estado-comentarios";
        formStatus.setAttribute("role", "status");

        toggle.addEventListener("click", function() {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            content.hidden = expanded;
        });

        form.addEventListener("submit", async function(event) {
            event.preventDefault();
            const text = input.value.trim();
            if (!text || text.length > MAX_COMMENT_LENGTH) {
                formStatus.textContent = "O comentário deve ter entre 1 e " + MAX_COMMENT_LENGTH + " caracteres.";
                return;
            }

            const auth = window.Fran7Auth;
            if (!auth?.estaAutenticado()) {
                await requestLogin();
                return;
            }

            submit.disabled = true;
            formStatus.textContent = "A publicar comentário...";
            try {
                const client = window.Fran7Supabase.getClient();
                const userResult = await client.auth.getUser();
                if (userResult.error) {
                    throw userResult.error;
                }
                const user = userResult.data.user;
                if (!user) {
                    await requestLogin();
                    return;
                }

                const result = await client.from("fran7_product_comments").insert({
                    product_id: productId,
                    user_id: user.id,
                    comment: text
                });
                if (result.error) {
                    throw result.error;
                }
                input.value = "";
                formStatus.textContent = "Comentário publicado.";
                await loadComments(productId, list, toggle);
            } catch (error) {
                console.error("Não foi possível publicar o comentário do produto.", error);
                formStatus.textContent = "Não foi possível publicar. Confirma a ligação e tenta novamente.";
            } finally {
                submit.disabled = false;
            }
        });

        content.append(list, form, formStatus);
        section.append(toggle, content);
        const info = article.querySelector(".produto-info");
        (info || article).appendChild(section);
        loadComments(productId, list, toggle);
    }

    function attachComments(products) {
        (products || []).forEach(createCommentsSection);
    }

    window.addEventListener("fran7-products-loaded", function(event) {
        attachComments(event.detail?.products);
    });

    document.querySelectorAll(".produto[data-product-id]").forEach(createCommentsSection);
})();

(function() {
    "use strict";

    const IMAGE_LIMIT = 8;
    const overlay = document.createElement("div");
    overlay.className = "fran7-product-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="fran7-product-panel" role="dialog" aria-modal="true" aria-labelledby="fran7ProductName">
            <button class="fran7-product-close" type="button" aria-label="Fechar detalhe do produto">×</button>
            <div class="fran7-product-top">
                <div class="fran7-product-gallery">
                    <div class="fran7-product-main-slot"></div>
                    <div class="fran7-product-thumbnails" aria-label="Fotografias do produto"></div>
                </div>
                <div class="fran7-product-details">
                    <p class="fran7-product-eyebrow">FRAN7 COLLECTION</p>
                    <p class="fran7-product-availability">Disponibilidade a confirmar</p>
                    <h2 class="fran7-product-name" id="fran7ProductName"></h2>
                    <p class="fran7-product-price"></p>
                    <p class="fran7-product-color" hidden></p>
                    <p class="fran7-product-description"></p>
                    <p class="fran7-product-note">Coleção Conceito — Detalhes em alta gramatura com assinatura interior "Grief &amp; Glory".</p>
                    <button class="fran7-product-add" type="button">ADICIONAR À SACOLA</button>
                </div>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector(".fran7-product-panel");
    const mainSlot = overlay.querySelector(".fran7-product-main-slot");
    const thumbnails = overlay.querySelector(".fran7-product-thumbnails");
    const closeButton = overlay.querySelector(".fran7-product-close");
    const addButton = overlay.querySelector(".fran7-product-add");
    const colorLabel = overlay.querySelector(".fran7-product-color");
    let currentProduct = null;
    let selectedImage = "";
    let selectedColor = "";
    let previousFocus = null;

    function obterPreco(valor) {
        if (window.Fran7Checkout) {
            return window.Fran7Checkout.parsePrice(valor) || 0;
        }
        const texto = String(valor || "").trim().replace(/\s|Kz|AOA/gi, "");
        const normalizado = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(texto)
            ? texto.replace(/\./g, "").replace(",", ".")
            : texto.replace(",", ".");
        const preco = Number(normalizado);
        return Number.isFinite(preco) && preco > 0 ? preco : 0;
    }

    function getProduct(article) {
        const image = article.querySelector(".produto-imagem img, .modelo-imagem img, .favorito-card > img");
        const name = article.dataset.productName ||
            article.querySelector("h2, h3")?.textContent.trim() ||
            image?.alt ||
            "Produto FRAN7";
        const price = article.dataset.productPrice ||
            article.querySelector(".preco, .modelo-preco, .produto-preco, .favorito-card-price")?.textContent.trim() ||
            "Consultar preço";
        const description = article.dataset.productDescription ||
            article.querySelector(".produto-info > p:not(.produto-etiqueta):not(.produto-preco), .modelo-info > p:not(.modelo-etiqueta):not(.modelo-preco)")?.textContent.trim() ||
            "Uma peça da coleção FRAN7. Confirma os detalhes e a disponibilidade connosco.";
        const imageSources = [
            image?.getAttribute("src") || "",
            ...(article.dataset.galleryImages || image?.dataset.galleryImages || "")
                .split("|")
                .map(function(src) { return src.trim(); })
                .filter(Boolean)
        ].slice(0, IMAGE_LIMIT);
        const viewLabels = (article.dataset.galleryViews || image?.dataset.galleryViews || "")
            .split("|")
            .map(function(label) { return label.trim(); });
        const colors = (article.dataset.galleryColors || image?.dataset.galleryColors || "")
            .split("|")
            .map(function(color) { return color.trim(); });
        const views = imageSources.map(function(src, index) {
            return {
                type: "image",
                src: src,
                label: viewLabels[index] || colors[index] || (index === 0 ? "Frente" : "Vista " + (index + 1)),
                color: colors[index] || "",
                side: /costas|traseira|back/i.test(viewLabels[index] || "") ? "back" : "front"
            };
        });
        const backImage = (article.dataset.productBackImage || "").trim();
        if (backImage && views.length < IMAGE_LIMIT) {
            views.splice(1, 0, {
                type: "image",
                src: backImage,
                label: "Costas",
                color: "",
                side: "back"
            });
            for (let index = 2; index < views.length; index += 1) {
                views[index].color = colors[index - 1] || "";
            }
        }
        const model = (article.dataset.productModel || "").trim();
        if (model) views.push({ type: "model", src: model, label: "3D", color: "" });

        return {
            article: article,
            name: name,
            price: price,
            description: description,
            views: views,
            modelFallback: image?.getAttribute("src") || "",
            reservar: article.dataset.productReserve === "true",
            id: article.dataset.productId || (name + "|" + (image?.getAttribute("src") || ""))
        };
    }

    function showView(view, product) {
        mainSlot.replaceChildren();
        if (!view || !view.src) {
            const placeholder = document.createElement("div");
            placeholder.className = "fran7-product-main-placeholder";
            placeholder.textContent = "Fotografia do produto";
            mainSlot.appendChild(placeholder);
            return;
        }

        if (view.type === "model") {
            if (!window.customElements?.get("model-viewer")) {
                console.warn("O visualizador 3D não está disponível; a imagem frontal será apresentada.");
                showView({
                    type: "image",
                    src: product.modelFallback,
                    label: "Frente",
                    side: "front"
                }, product);
                return;
            }

            const viewer = document.createElement("model-viewer");
            viewer.className = "fran7-product-model-viewer fran7-product-view-enter";
            viewer.setAttribute("src", view.src);
            viewer.setAttribute("alt", product.name);
            viewer.setAttribute("camera-controls", "");
            viewer.setAttribute("auto-rotate", "");
            viewer.setAttribute("shadow-intensity", "1");
            viewer.addEventListener("error", function() {
                console.error("Não foi possível carregar o modelo 3D do produto:", view.src);
                showView({
                    type: "image",
                    src: product.modelFallback,
                    label: "Frente",
                    side: "front"
                }, product);
            }, { once: true });
            mainSlot.appendChild(viewer);
            return;
        }

        const stage = document.createElement("div");
        stage.className = "fran7-product-image-stage fran7-product-view-enter";
        const image = document.createElement("img");
        image.className = "fran7-product-main-image";
        image.src = view.src;
        image.alt = product.name + " — " + view.label;
        stage.appendChild(image);
        mainSlot.appendChild(stage);
    }

    function renderGallery(product) {
        thumbnails.replaceChildren();
        thumbnails.hidden = product.views.length < 2;

        product.views.forEach(function(view, index) {
            const button = document.createElement("button");
            button.className = "fran7-product-thumbnail";
            button.type = "button";
            button.setAttribute("aria-label", view.label);
            button.setAttribute("aria-pressed", String(index === 0));
            button.dataset.viewIndex = String(index);

            if (view.type === "model") {
                button.classList.add("fran7-product-thumbnail-model");
                button.textContent = "3D";
            } else {
                const image = document.createElement("img");
                image.src = view.src;
                image.alt = "";
                button.appendChild(image);
            }
            const label = document.createElement("span");
            label.className = "fran7-product-thumbnail-label";
            label.textContent = view.label;
            button.appendChild(label);
            thumbnails.appendChild(button);
        });
        showView(product.views[0], product);
        atualizarCorSelecionada(0);
    }

    function atualizarCorSelecionada(index) {
        const galleryColor = currentProduct.views[index]?.color || "";
        if (galleryColor) selectedColor = galleryColor;
        colorLabel.textContent = selectedColor ? "Cor: " + selectedColor : "";
        colorLabel.hidden = !selectedColor;
    }

    function openProduct(article) {
        currentProduct = getProduct(article);
        previousFocus = document.activeElement;
        overlay.querySelector(".fran7-product-name").textContent = currentProduct.name;
        overlay.querySelector(".fran7-product-price").textContent = currentProduct.price;
        overlay.querySelector(".fran7-product-description").textContent = currentProduct.description;
        addButton.textContent = currentProduct.reservar ? "RESERVAR" : "ADICIONAR À SACOLA";
        selectedColor = "";
        renderGallery(currentProduct);
        selectedImage = currentProduct.views[0]?.src || "";
        overlay.hidden = false;
        document.body.style.overflow = "hidden";
        closeButton.focus();
    }

    function closeProduct() {
        overlay.hidden = true;
        document.body.style.overflow = "";
        if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    }

    document.addEventListener("click", function(event) {
        if (!event.target.closest) return;
        const purchaseButton = event.target.closest(".fran7-cart-add, .botao-produto");
        if (purchaseButton && purchaseButton.closest("[data-protegido='true']")) return;
        if (purchaseButton && !overlay.contains(purchaseButton)) {
            const article = purchaseButton.closest(".produto, .modelo, .favorito-card");
            if (article) {
                event.preventDefault();
                event.stopImmediatePropagation();
                openProduct(article);
                return;
            }
        }

        const article = event.target.closest(".produto, .modelo, .favorito-card");
        if (!article || overlay.contains(event.target)) return;
        if (event.target.closest("a, button, input, textarea, select, .comentarios-produto")) return;
        openProduct(article);
    }, true);

    thumbnails.addEventListener("click", function(event) {
        const button = event.target.closest(".fran7-product-thumbnail");
        if (!button) return;
        const viewIndex = Number(button.dataset.viewIndex);
        const view = currentProduct.views[viewIndex];
        if (!view) return;
        selectedImage = view.type === "image" ? view.src : currentProduct.modelFallback;
        showView(view, currentProduct);
        atualizarCorSelecionada(viewIndex);
        thumbnails.querySelectorAll(".fran7-product-thumbnail").forEach(function(item) {
            item.setAttribute("aria-pressed", String(item === button));
        });
    });

    addButton.addEventListener("click", function() {
        if (currentProduct.views.some(function(view) { return view.color; }) && !selectedColor) {
            window.alert("Seleciona a fotografia da cor que pretendes.");
            return;
        }

        const source = currentProduct.article.querySelector(".botao-produto");
        const price = obterPreco(currentProduct.price);
        const item = {
            nome: currentProduct.name,
            imagem: selectedImage || currentProduct.modelFallback || "",
            preco: price,
            cor: selectedColor
        };
        closeProduct();
        if (window.Fran7Cart && typeof window.Fran7Cart.add === "function") {
            window.Fran7Cart.add(item);
            return;
        }
        if (typeof window.adicionarAoCarrinho === "function") {
            window.adicionarAoCarrinho(
                { preventDefault: function() {} },
                currentProduct.name,
                price,
                item.imagem || source?.dataset.cartImage,
                selectedColor
            );
        }
    });

    closeButton.addEventListener("click", closeProduct);
    overlay.addEventListener("click", function(event) {
        if (event.target === overlay) closeProduct();
    });
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && !overlay.hidden) closeProduct();
    });

    window.Fran7ProductDetail = {
        open: function(article) {
            if (!(article instanceof HTMLElement) ||
                !article.matches(".produto, .modelo, .favorito-card")) {
                throw new TypeError("O detalhe FRAN7 precisa de um artigo de produto válido.");
            }
            openProduct(article);
        }
    };
})();

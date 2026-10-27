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
                    <div class="fran7-product-rating"></div>
                    <p class="fran7-product-color" hidden></p>
                    <div class="fran7-product-color-options" role="group" aria-label="Escolher cor"></div>
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
    const colorOptions = overlay.querySelector(".fran7-product-color-options");
    const availability = overlay.querySelector(".fran7-product-availability");
    let currentProduct = null;
    let selectedImage = "";
    let selectedColor = "";
    let previousFocus = null;
    let productLoadSequence = 0;

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

    function formatarPreco(valor) {
        const preco = obterPreco(valor);
        return preco ? preco.toLocaleString("pt-AO") + " Kz" : "Consultar preço";
    }

    function lerVariantes(article) {
        const raw = article.dataset.productVariants;
        if (!raw) {
            return [];
        }
        try {
            const variants = JSON.parse(raw);
            if (!Array.isArray(variants)) {
                throw new TypeError("As variantes do produto não são uma lista.");
            }
            return variants.filter(function(variant) {
                return variant && typeof variant.cor === "string" &&
                    (variant.tamanho === undefined || typeof variant.tamanho === "string");
            });
        } catch (error) {
            console.error("Não foi possível ler as variantes deste produto.", error);
            return [];
        }
    }

    async function carregarVariantesProduto(product) {
        if (!product.id) {
            return product.variants;
        }

        const baseUrl = String(
            window.FRAN7_POCKETBASE_URL ||
            window.FRAN7_CHECKOUT_CONFIG?.pocketBaseUrl ||
            ""
        ).replace(/\/+$/, "");
        if (!baseUrl) {
            throw new Error("A URL do PocketBase não está configurada.");
        }
        if (typeof window.PocketBase !== "function") {
            throw new Error("A biblioteca PocketBase não foi carregada.");
        }

        const pb = new window.PocketBase(baseUrl);
        const escapedId = product.id.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        const records = await pb.collection("variantes_produto").getFullList({
            filter: `produto_id = "${escapedId}"`
        });

        return records.map(function(variant) {
            if (typeof variant.cor !== "string" || !variant.cor.trim()) {
                console.error("Variante PocketBase ignorada: falta uma cor válida.", variant.id);
                return null;
            }
            const imageName = typeof variant.imagem === "string" ? variant.imagem.trim() : "";
            return {
                id: variant.id,
                cor: variant.cor.trim(),
                tamanho: typeof variant.tamanho === "string" ? variant.tamanho.trim() : "",
                preco: variant.preco,
                stock: variant.stock,
                imagem: imageName ? pb.files.getURL(variant, imageName) : ""
            };
        }).filter(Boolean);
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
        const variants = lerVariantes(article);
        const gallerySources = [
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
        const views = gallerySources.map(function(src, index) {
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
        const variantColor = (article.dataset.productColor || "").trim();
        const variantSize = (article.dataset.productSize || "").trim();
        const mainImage = article.dataset.productBaseImage ||
            image?.getAttribute("src") ||
            "";
        if (variants.length) {
            views.unshift({
                type: "image",
                src: mainImage,
                label: "Frente",
                color: "",
                side: "front"
            });
        } else {
            views.unshift({
                type: "image",
                src: mainImage,
                label: viewLabels[0] || "Frente",
                color: colors[0] || "",
                side: "front"
            });
        }
        const usableViews = variants.length
            ? views.filter(function(view, index) { return index === 0 || !view.color; })
            : views;

        return {
            article: article,
            name: name,
            price: price,
            description: description,
            views: usableViews.slice(0, IMAGE_LIMIT),
            modelFallback: mainImage,
            reservar: article.dataset.productReserve === "true",
            id: article.dataset.productId || "",
            variantColor: variantColor,
            variantSize: variantSize,
            variants: variants
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

    function normalizarOpcao(value) {
        return String(value || "").trim().toLocaleLowerCase("pt")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function definirCorPonto(dot, color) {
        const colors = {
            preto: "#111111",
            preta: "#111111",
            negro: "#111111",
            negra: "#111111",
            branco: "#ffffff",
            branca: "#ffffff",
            vermelho: "#d22f27",
            vermelha: "#d22f27",
            azul: "#2463eb",
            azulclaro: "#8bb8f2",
            azulmarinho: "#182b4d",
            azulescuro: "#17345c",
            azulroyal: "#2456a6",
            verde: "#21834a",
            verdeescuro: "#24543b",
            verdeoliva: "#737b35",
            amarelo: "#e3bd25",
            amarela: "#e3bd25",
            laranja: "#e67e22",
            rosa: "#e58ca8",
            roxo: "#7544a5",
            roxa: "#7544a5",
            lilas: "#aa8cc5",
            castanho: "#75452b",
            castanha: "#75452b",
            marrom: "#75452b",
            bege: "#d8c3a5",
            cinza: "#858585",
            cinzento: "#858585",
            cinzenta: "#858585",
            dourado: "#c5a13b",
            dourada: "#c5a13b",
            prateado: "#aeb4bb",
            prateada: "#aeb4bb"
        };
        const normalizedColor = normalizarOpcao(color).replace(/[\s_-]+/g, "");
        const mappedColor = colors[normalizedColor];
        const directColor = window.CSS && window.CSS.supports("color", color) ? color : "";
        const visibleColor = mappedColor || directColor || "#858585";
        dot.style.backgroundColor = visibleColor;
        const tag = dot.closest(".fran7-product-color-swatch");
        tag?.style.setProperty("--tag-color", visibleColor);
        const rgb = window.getComputedStyle(dot).backgroundColor.match(/[\d.]+/g);
        if (rgb && rgb.length >= 3) {
            const channels = rgb.slice(0, 3).map(function(channel) {
                const normalized = Number(channel) / 255;
                return normalized <= 0.04045
                    ? normalized / 12.92
                    : Math.pow((normalized + 0.055) / 1.055, 2.4);
            });
            const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
            tag?.style.setProperty("--tag-ink", luminance > 0.45 ? "#171717" : "#ffffff");
        }
        if (["branco", "branca", "bege", "dourado", "dourada"].includes(normalizedColor)) {
            dot.classList.add("is-light");
        }
    }

    function variantesDaCor(color) {
        return currentProduct.variants.filter(function(variant) {
            return normalizarOpcao(variant.cor) === normalizarOpcao(color);
        });
    }

    function variantesDisponiveisDaCor(color) {
        return variantesDaCor(color).filter(function(variant) {
            return Number(variant.stock) > 0;
        });
    }

    function imagemDaCor(color) {
        const variants = variantesDaCor(color);
        return variants.find(function(variant) {
            return Number(variant.stock) > 0 && variant.imagem;
        }) || variants.find(function(variant) {
            return Boolean(variant.imagem);
        }) || null;
    }

    function selecionarCor(color) {
        const colorVariants = variantesDaCor(color);
        const availableVariants = variantesDisponiveisDaCor(color);
        if (!colorVariants.length) {
            return;
        }

        selectedColor = colorVariants[0].cor;
        colorLabel.textContent = "Cor selecionada: " + selectedColor;
        colorLabel.hidden = false;
        availability.textContent = availableVariants.length
            ? "Disponível"
            : "Sem stock nesta cor.";

        const imageVariant = imagemDaCor(selectedColor);
        if (imageVariant?.imagem) {
            selectedImage = imageVariant.imagem;
            showView({
                type: "image",
                src: imageVariant.imagem,
                label: selectedColor,
                color: selectedColor,
                side: "front"
            }, currentProduct);
            thumbnails.querySelectorAll(".fran7-product-thumbnail").forEach(function(button) {
                button.setAttribute("aria-pressed", "false");
            });
        } else {
            selectedImage = currentProduct.modelFallback;
            showView({
                type: "image",
                src: selectedImage,
                label: "Frente",
                color: "",
                side: "front"
            }, currentProduct);
            thumbnails.querySelectorAll(".fran7-product-thumbnail").forEach(function(button) {
                button.setAttribute("aria-pressed", "false");
            });
        }

        let selectedTag = null;
        colorOptions.querySelectorAll(".fran7-product-color-swatch").forEach(function(button) {
            const isSelected =
                normalizarOpcao(button.dataset.color) === normalizarOpcao(selectedColor);
            button.setAttribute(
                "aria-pressed",
                String(isSelected)
            );
            button.classList.remove("is-dropping");
            if (isSelected) selectedTag = button;
        });
        colorOptions.classList.add("has-selection");
        if (selectedTag) {
            void selectedTag.offsetWidth;
            selectedTag.classList.add("is-dropping");
        }
        addButton.disabled = availableVariants.length === 0;
        addButton.textContent = currentProduct.reservar ? "RESERVAR" : "ADICIONAR À SACOLA";
    }

    function renderizarVariantes(product) {
        colorOptions.replaceChildren();
        colorOptions.hidden = product.variants.length === 0;
        colorLabel.hidden = product.variants.length > 0;
        availability.textContent = "Disponibilidade a confirmar";
        addButton.disabled = false;

        if (!product.variants.length) {
            return;
        }

        const colors = Array.from(new Map(product.variants.map(function(variant) {
            return [normalizarOpcao(variant.cor), variant.cor.trim()];
        })).values());
        colors.forEach(function(color, index) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "fran7-product-color-swatch";
            button.style.setProperty("--tag-index", String(index));
            button.dataset.color = color;
            button.setAttribute("aria-label", "Escolher cor " + color);
            button.setAttribute("aria-pressed", "false");
            button.title = color;
            const dot = document.createElement("span");
            dot.className = "fran7-product-color-dot";
            dot.setAttribute("aria-hidden", "true");
            const label = document.createElement("span");
            label.textContent = color;
            button.append(dot, label);
            definirCorPonto(dot, color);
            button.addEventListener("click", function() {
                selecionarCor(color);
            });
            colorOptions.appendChild(button);
        });

        const firstAvailableColor = colors.find(function(color) {
            return variantesDisponiveisDaCor(color).length > 0;
        });
        if (firstAvailableColor) {
            selecionarCor(firstAvailableColor);
        } else {
            selecionarCor(colors[0]);
        }
    }

    function atualizarCorSelecionada(index) {
        if (currentProduct.variants.length) {
            return;
        }
        const galleryColor = currentProduct.views[index]?.color || "";
        if (galleryColor) selectedColor = galleryColor;
        colorLabel.textContent = [
            selectedColor && "Cor: " + selectedColor,
            currentProduct.variantSize && "Tamanho: " + currentProduct.variantSize
        ].filter(Boolean).join(" · ");
        colorLabel.hidden = !selectedColor && !currentProduct.variantSize;
    }

    async function openProduct(article) {
        const loadSequence = ++productLoadSequence;
        currentProduct = getProduct(article);
        previousFocus = document.activeElement;
        overlay.querySelector(".fran7-product-name").textContent = currentProduct.name;
        overlay.querySelector(".fran7-product-description").textContent = currentProduct.description;
        if (window.Fran7Ratings) {
            window.Fran7Ratings.mount(
                overlay.querySelector(".fran7-product-rating"),
                currentProduct.id,
                currentProduct.name
            );
        }
        addButton.textContent = currentProduct.reservar ? "RESERVAR" : "ADICIONAR À SACOLA";
        selectedColor = currentProduct.variantColor;
        colorLabel.textContent = [
            selectedColor && "Cor: " + selectedColor,
            currentProduct.variantSize && "Tamanho: " + currentProduct.variantSize
        ].filter(Boolean).join(" · ");
        colorLabel.hidden = !selectedColor && !currentProduct.variantSize;
        renderGallery(currentProduct);
        selectedImage = currentProduct.views[0]?.src || "";
        colorOptions.replaceChildren();
        colorOptions.hidden = true;
        availability.textContent = currentProduct.id ? "A carregar cores…" : "Disponibilidade a confirmar";
        addButton.disabled = Boolean(currentProduct.id);
        overlay.hidden = false;
        document.body.style.overflow = "hidden";
        closeButton.focus();

        try {
            currentProduct.variants = await carregarVariantesProduto(currentProduct);
            if (loadSequence !== productLoadSequence || overlay.hidden) return;
            renderizarVariantes(currentProduct);
        } catch (error) {
            if (loadSequence !== productLoadSequence || overlay.hidden) return;
            console.error("Não foi possível carregar as variantes do produto.", error);
            colorOptions.replaceChildren();
            colorOptions.hidden = true;
            colorLabel.hidden = true;
            availability.textContent = "Erro ao carregar cores: " +
                (error instanceof Error ? error.message : String(error));
            addButton.disabled = true;
        }
    }

    function closeProduct() {
        productLoadSequence += 1;
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
        if (addButton.disabled) {
            return;
        }
        if (currentProduct.variants.length && !selectedColor) {
            window.Fran7Notify.alert("Escolhe uma cor disponível.", { title: "Escolhe uma cor" });
            return;
        }
        if (currentProduct.views.some(function(view) { return view.color; }) && !selectedColor) {
            window.Fran7Notify.alert("Seleciona a fotografia da cor que pretendes.", { title: "Escolhe uma cor" });
            return;
        }

        const source = currentProduct.article.querySelector(".botao-produto");
        const colorVariants = currentProduct.variants.length
            ? variantesDaCor(selectedColor)
            : [];
        const stockedVariant = colorVariants.find(function(variant) {
            return Number(variant.stock) > 0 &&
                variant.imagem === selectedImage;
        }) || colorVariants.find(function(variant) {
            return Number(variant.stock) > 0;
        });
        const variantPrice = obterPreco(stockedVariant?.preco);
        const price = variantPrice || obterPreco(currentProduct.price);
        const item = {
            nome: currentProduct.name,
            imagem: selectedImage || currentProduct.modelFallback || "",
            imagemBase: currentProduct.modelFallback || "",
            productId: currentProduct.id,
            preco: price,
            cor: selectedColor,
            tamanho: "",
            variantes: colorVariants
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
                selectedColor,
                item.tamanho,
                colorVariants,
                currentProduct.id,
                item.imagemBase
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

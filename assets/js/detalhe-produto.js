(function() {
    "use strict";

    const IMAGE_LIMIT = 5;
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
        const images = [
            image?.getAttribute("src") || "",
            ...(article.dataset.galleryImages || image?.dataset.galleryImages || "")
                .split("|")
                .map(function(src) { return src.trim(); })
                .filter(Boolean)
        ].slice(0, IMAGE_LIMIT);

        return {
            article: article,
            name: name,
            price: price,
            description: description,
            images: images,
            reservar: article.dataset.productReserve === "true",
            colors: (article.dataset.galleryColors || image?.dataset.galleryColors || "")
                .split("|")
                .map(function(color) { return color.trim(); }),
            id: article.dataset.productId || (name + "|" + (image?.getAttribute("src") || ""))
        };
    }

    function showImage(src, alt) {
        mainSlot.replaceChildren();
        if (!src) {
            const placeholder = document.createElement("div");
            placeholder.className = "fran7-product-main-placeholder";
            placeholder.textContent = "Fotografia do produto";
            mainSlot.appendChild(placeholder);
            return;
        }

        const image = document.createElement("img");
        image.className = "fran7-product-main-image";
        image.src = src;
        image.alt = alt;
        mainSlot.appendChild(image);
    }

    function renderGallery(product) {
        thumbnails.replaceChildren();
        const sources = product.images.slice();
        thumbnails.hidden = sources.length < 2;

        sources.forEach(function(src, index) {
            const button = document.createElement("button");
            button.className = "fran7-product-thumbnail";
            button.type = "button";
            const color = product.colors[index];
            button.setAttribute("aria-label", color ? "Cor: " + color : index === 0 ? "Fotografia principal" : "Fotografia adicional " + index);
            button.setAttribute("aria-pressed", String(index === 0));
            button.dataset.productImage = src;
            button.dataset.productIndex = String(index);

            const image = document.createElement("img");
            image.src = src;
            image.alt = color ? product.name + " — " + color : index === 0 ? product.name : product.name + " — fotografia " + (index + 1);
            button.appendChild(image);
            thumbnails.appendChild(button);
        });
        showImage(product.images[0], product.name);
        atualizarCorSelecionada(0);
    }

    function atualizarCorSelecionada(index) {
        const galleryColor = currentProduct.colors[index] || "";
        selectedColor = galleryColor;
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
        selectedImage = currentProduct.images[0] || "";
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
        selectedImage = button.dataset.productImage;
        showImage(selectedImage, currentProduct.name);
        atualizarCorSelecionada(Number(button.dataset.productIndex));
        thumbnails.querySelectorAll(".fran7-product-thumbnail").forEach(function(item) {
            item.setAttribute("aria-pressed", String(item === button));
        });
    });

    addButton.addEventListener("click", function() {
        if (currentProduct.colors.length > 0 && !selectedColor) {
            window.alert("Seleciona a fotografia da cor que pretendes.");
            return;
        }

        const source = currentProduct.article.querySelector(".botao-produto");
        const price = Number((currentProduct.price.match(/[\d.]+/) || ["0"])[0].replace(/\./g, "")) || 0;
        const item = {
            nome: currentProduct.name,
            imagem: selectedImage || currentProduct.images[0] || "",
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

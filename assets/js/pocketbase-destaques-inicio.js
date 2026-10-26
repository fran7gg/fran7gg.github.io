(function() {
    "use strict";

    const COLLECTION = "produtos_loja";
    const VARIANTS_COLLECTION = "variantes_produto";
    const CATEGORY = "destaques";
    const baseUrl = String(
        window.FRAN7_CHECKOUT_CONFIG?.pocketBaseUrl ||
        window.FRAN7_POCKETBASE_URL ||
        "http://127.0.0.1:8090"
    ).replace(/\/+$/, "");
    const grid = document.querySelector("#produtos .produtos-grid");

    function mostrarEstado(message) {
        if (!grid) {
            return;
        }
        const status = document.createElement("p");
        status.className = "estado-destaques";
        status.setAttribute("role", "status");
        status.textContent = message;
        grid.replaceChildren(status);
    }

    function normalizarCategoria(value) {
        const values = Array.isArray(value) ? value : [value];
        return values
            .filter(function(item) { return typeof item === "string"; })
            .map(function(item) {
                return item.trim().toLocaleLowerCase("pt")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
            });
    }

    function formatarPreco(value) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value.toLocaleString("pt-AO") + " Kz";
        }
        if (typeof value !== "string" || !value.trim()) {
            return "";
        }

        const text = value.trim();
        if (/Kz|AOA/i.test(text)) {
            return text;
        }
        const normalized = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)
            ? text.replace(/\./g, "").replace(",", ".")
            : text.replace(",", ".");
        const price = Number(normalized);
        return Number.isFinite(price)
            ? price.toLocaleString("pt-AO") + " Kz"
            : text;
    }

    function obterPrecoNumerico(value) {
        if (window.Fran7Checkout?.parsePrice) {
            return window.Fran7Checkout.parsePrice(value) || 0;
        }
        const normalized = String(value || "").trim()
            .replace(/\s|Kz|AOA/gi, "")
            .replace(/\./g, "")
            .replace(",", ".");
        const price = Number(normalized);
        return Number.isFinite(price) ? price : 0;
    }

    function obterImagemUrl(record, collection, fileName) {
        return baseUrl + "/api/files/" + collection + "/" +
            encodeURIComponent(record.id) + "/" + encodeURIComponent(fileName);
    }

    function criarCartao(record, variants) {
        const name = typeof record.texto === "string" ? record.texto.trim() : "";
        const imageName = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!record.id || !name || !imageName) {
            console.error("Produto em destaque ignorado: falta ID, nome ou imagem.", record.id);
            return null;
        }

        const productImage = obterImagemUrl(record, COLLECTION, imageName);
        const productVariants = variants.map(function(variant) {
            const variantImageName = typeof variant.imagem === "string" ? variant.imagem.trim() : "";
            return {
                id: variant.id,
                cor: typeof variant.cor === "string" ? variant.cor.trim() : "",
                tamanho: typeof variant.tamanho === "string" ? variant.tamanho.trim() : "",
                preco: variant.preco,
                stock: variant.stock,
                imagem: variantImageName
                    ? obterImagemUrl(variant, VARIANTS_COLLECTION, variantImageName)
                    : ""
            };
        }).filter(function(variant) {
            if (!variant.cor || !variant.tamanho) {
                console.error("Variante ignorada: preenche cor e tamanho no PocketBase.", variant.id);
                return false;
            }
            return true;
        });
        const defaultVariant = productVariants.find(function(variant) {
            return Number(variant.stock) > 0;
        }) || productVariants[0];
        const imageUrl = defaultVariant?.imagem || productImage;
        const priceSource = defaultVariant ? defaultVariant.preco : record.preco;
        const price = formatarPreco(priceSource);
        const priceNumber = obterPrecoNumerico(priceSource);
        const description = typeof record.descricao === "string"
            ? record.descricao.trim()
            : "";
        const stock = defaultVariant ? defaultVariant.stock : (record.stock ?? record.estoque);
        const outOfStock = stock !== null && stock !== "" &&
            Number.isFinite(Number(stock)) && Number(stock) <= 0;
        const article = document.createElement("article");
        article.className = "produto";
        article.dataset.productId = record.id;
        article.dataset.productName = name;
        article.dataset.productPrice = price;
        article.dataset.productBaseImage = productImage;
        article.dataset.productDescription = description;
        article.dataset.productReserve = "false";
        article.dataset.productVariants = JSON.stringify(productVariants);
        article.dataset.aiModel = name;

        const imageContainer = document.createElement("div");
        imageContainer.className = "produto-imagem";
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = name;
        image.loading = "lazy";
        imageContainer.appendChild(image);

        const favoriteWrapper = document.createElement("div");
        favoriteWrapper.className = "favorito-produto";
        const favorite = document.createElement("button");
        favorite.className = "botao-favorito";
        favorite.type = "button";
        favorite.dataset.favoriteName = name;
        favorite.dataset.favoriteProductId = record.id;
        favorite.dataset.favoritePrice = String(priceNumber);
        favorite.dataset.favoriteImage = imageUrl;
        favorite.dataset.favoriteBaseImage = productImage;
        favorite.dataset.favoriteVariants = JSON.stringify(productVariants);
        favorite.dataset.favoriteReserve = "false";
        favorite.setAttribute("aria-label", "Adicionar aos favoritos");
        favorite.setAttribute("aria-pressed", "false");
        favorite.innerHTML = '<span class="coracao" aria-hidden="true">♡</span>';
        favoriteWrapper.appendChild(favorite);
        imageContainer.appendChild(favoriteWrapper);

        const info = document.createElement("div");
        info.className = "produto-info";
        const tag = document.createElement("div");
        tag.className = "produto-tag";
        tag.textContent = "FRAN7 COLLECTION";
        const title = document.createElement("h3");
        title.textContent = name;
        const descriptionElement = document.createElement("p");
        descriptionElement.textContent = description || "Nova coleção";
        const priceElement = document.createElement("div");
        priceElement.className = "preco";
        priceElement.textContent = price || "Consultar preço";
        const add = document.createElement("a");
        add.href = "#";
        add.className = "botao-produto";
        add.textContent = productVariants.length
            ? "ESCOLHER OPÇÕES"
            : outOfStock ? "SEM STOCK" : "VER PRODUTO";
        if (outOfStock && productVariants.length === 0) {
            add.setAttribute("aria-disabled", "true");
            add.addEventListener("click", function(event) {
                event.preventDefault();
            });
        } else {
            add.addEventListener("click", function(event) {
                event.preventDefault();
                if (typeof window.adicionarAoCarrinho !== "function") {
                    console.error("A função de adicionar ao carrinho não está disponível.");
                    return;
                }
                window.adicionarAoCarrinho(event, name, priceNumber, imageUrl);
            });
        }

        info.append(tag, title, descriptionElement);
        info.append(priceElement, add);
        article.append(imageContainer, info);
        return article;
    }

    async function carregarDestaques() {
        if (!grid) {
            return;
        }
        mostrarEstado("A carregar destaques...");

        const response = await fetch(
            baseUrl + "/api/collections/" + COLLECTION + "/records?perPage=500"
        );
        if (!response.ok) {
            throw new Error("PocketBase respondeu " + response.status + ".");
        }
        const result = await response.json();
        if (!Array.isArray(result.items)) {
            throw new TypeError("A resposta do PocketBase não contém uma lista de produtos.");
        }

        const variantResponse = await fetch(
            baseUrl + "/api/collections/" + VARIANTS_COLLECTION + "/records?perPage=500"
        );
        if (!variantResponse.ok) {
            throw new Error("A coleção de variantes respondeu " + variantResponse.status + ".");
        }
        const variantResult = await variantResponse.json();
        if (!Array.isArray(variantResult.items)) {
            throw new TypeError("A resposta do PocketBase não contém uma lista de variantes.");
        }

        const records = result.items;
        const recordById = new Map(records.map(function(record) {
            return [record.id, record];
        }));
        const products = records.filter(function(record) {
            return normalizarCategoria(record.categoria).includes(CATEGORY);
        });
        const variantsByProduct = new Map();
        variantResult.items.forEach(function(variant) {
            if (!recordById.has(variant.produto_id)) {
                return;
            }
            const product = recordById.get(variant.produto_id);
            if (!normalizarCategoria(product.categoria).includes(CATEGORY)) {
                return;
            }
            if (!variantsByProduct.has(product.id)) {
                variantsByProduct.set(product.id, []);
            }
            variantsByProduct.get(product.id).push(variant);
        });
        const cards = products.map(function(record) {
            const variants = variantsByProduct.get(record.id);
            return criarCartao(record, variants || []);
        }).filter(Boolean);
        if (!cards.length) {
            mostrarEstado("Ainda não há produtos em destaque. No PocketBase, marca a categoria \"destaques\" nos produtos que queres mostrar aqui.");
            return;
        }
        grid.replaceChildren.apply(grid, cards);
        window.dispatchEvent(new CustomEvent("fran7-products-loaded", {
            detail: { products: cards }
        }));
    }

    carregarDestaques().catch(function(error) {
        console.error("Não foi possível carregar os destaques do PocketBase.", error);
        mostrarEstado("Não foi possível carregar os destaques. Abre o site pelo servidor local e verifica a ligação ao PocketBase.");
    });
})();

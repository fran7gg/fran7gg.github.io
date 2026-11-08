(function() {
    "use strict";

    const CATEGORY = "destaques";
    const productSearch = window.Fran7ProductSearch;
    const grid = document.querySelector("#produtos .produtos-grid");
    const searchForm = document.getElementById("pesquisaInicio");
    const searchInput = document.getElementById("pesquisarProdutos");
    const searchStatus = document.getElementById("pesquisaInicioEstado");
    const productsTitle = document.getElementById("produtosTitulo");
    const productsSubtitle = document.getElementById("produtosSubtitulo");
    const allProductsPageSize = 100;
    let highlightedProducts = null;
    let allProducts = null;
    let allProductsPromise = null;
    let searchSequence = 0;
    let searchTimer = null;

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

    function produtoCorresponde(record, query) {
        const variantColors = (record.fran7_variants || []).map(function(variant) {
            return variant.cor || "";
        }).join(" ");
        return productSearch.matches(query, [
            record.texto,
            record.descricao,
            record.categoria,
            variantColors
        ].join(" "));
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

    function criarCartao(record, variants) {
        const name = typeof record.texto === "string" ? record.texto.trim() : "";
        const imageName = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!record.id || !name || !imageName) {
            console.error("Produto em destaque ignorado: falta ID, nome ou imagem.", record.id);
            return null;
        }

        const productImage = imageName;
        const productVariants = variants.map(function(variant) {
            const variantImageName = typeof variant.imagem === "string" ? variant.imagem.trim() : "";
            return {
                id: variant.id,
                cor: typeof variant.cor === "string" ? variant.cor.trim() : "",
                tamanho: typeof variant.tamanho === "string" ? variant.tamanho.trim() : "",
                preco: variant.preco,
                stock: variant.stock,
                imagem: variantImageName
            };
        }).filter(function(variant) {
            if (!variant.cor) {
                console.error("Variante ignorada: preenche a cor no Supabase.", variant.id);
                return false;
            }
            return true;
        });
        const defaultVariant = productVariants.find(function(variant) {
            return variant.tamanho && Number(variant.stock) > 0;
        }) || productVariants.find(function(variant) {
            return Boolean(variant.tamanho);
        }) || null;
        const imageVariant = productVariants.find(function(variant) {
            return Number(variant.stock) > 0 && variant.imagem;
        }) || productVariants.find(function(variant) {
            return Boolean(variant.imagem);
        }) || defaultVariant;
        const imageUrl = imageVariant?.imagem || productImage;
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
        add.textContent = outOfStock && productVariants.length === 0
            ? "SEM STOCK"
            : "ESCOLHER OPÇÕES";
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

    function renderizarProdutos(records, emptyMessage) {
        const cards = records.map(function(record) {
            return criarCartao(record, record.fran7_variants || []);
        }).filter(Boolean);

        if (!cards.length) {
            mostrarEstado(emptyMessage);
            return;
        }

        grid.replaceChildren.apply(grid, cards);
        window.dispatchEvent(new CustomEvent("fran7-products-loaded", {
            detail: { products: cards }
        }));
    }

    async function carregarTodosProdutos() {
        if (allProducts) {
            return allProducts;
        }
        if (allProductsPromise) {
            return allProductsPromise;
        }

        allProductsPromise = (async function() {
            const client = window.Fran7Supabase.getClient();
            const records = [];
            let page = 0;
            let totalCount = 0;

            do {
                const from = page * allProductsPageSize;
                const to = from + allProductsPageSize - 1;
                const result = await client
                    .from("fran7_products")
                    .select("*, fran7_variants(*)", { count: "exact" })
                    .eq("ativo", true)
                    .order("created_at", { ascending: false })
                    .range(from, to);
                if (result.error) {
                    throw result.error;
                }

                const products = result.data || [];
                records.push.apply(records, products);
                totalCount = result.count || 0;
                page += 1;
            } while (page * allProductsPageSize < totalCount);

            allProducts = records;
            return allProducts;
        })().catch(function(error) {
            allProductsPromise = null;
            throw error;
        });

        return allProductsPromise;
    }

    function atualizarUrlPesquisa(query) {
        if (!window.history?.replaceState) {
            return;
        }
        const url = new URL(window.location.href);
        if (query) {
            url.searchParams.set("pesquisa", query);
        } else {
            url.searchParams.delete("pesquisa");
        }
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }

    async function pesquisarProdutos(query, sequence) {
        const normalizedQuery = productSearch.normalize(query);
        if (!normalizedQuery) {
            grid.removeAttribute("aria-busy");
            searchStatus.hidden = true;
            productsTitle.textContent = "DESTAQUES";
            productsSubtitle.textContent = "Peças selecionadas da FRAN7.";
            if (highlightedProducts) {
                renderizarProdutos(highlightedProducts, "Ainda não há produtos em destaque.");
            }
            return;
        }

        productsTitle.textContent = "RESULTADOS DA PESQUISA";
        productsSubtitle.textContent = "A pesquisar no catálogo completo da FRAN7.";
        searchStatus.hidden = false;
        searchStatus.textContent = "A procurar produtos...";
        grid.setAttribute("aria-busy", "true");

        try {
            const products = await carregarTodosProdutos();
            if (sequence !== searchSequence) {
                return;
            }
            const matches = products.filter(function(product) {
                return produtoCorresponde(product, normalizedQuery);
            });
            renderizarProdutos(matches, "Não encontrámos produtos com esse nome. Experimenta outros termos.");
            searchStatus.textContent = matches.length === 1
                ? "1 produto encontrado."
                : matches.length + " produtos encontrados.";
        } catch (error) {
            if (sequence !== searchSequence) {
                return;
            }
            console.error("Não foi possível pesquisar o catálogo de produtos.", error);
            mostrarEstado("Não foi possível pesquisar os produtos. Tenta novamente mais tarde.");
            searchStatus.textContent = "A pesquisa está temporariamente indisponível. Tenta novamente mais tarde.";
        } finally {
            if (sequence === searchSequence) {
                grid.removeAttribute("aria-busy");
            }
        }
    }

    function iniciarPesquisa() {
        if (!searchForm || !searchInput || !searchStatus || !productsTitle || !productsSubtitle) {
            return;
        }

        function agendarPesquisa() {
            const query = searchInput.value.trim();
            const sequence = ++searchSequence;
            atualizarUrlPesquisa(query);
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(function() {
                pesquisarProdutos(query, sequence);
            }, 180);
        }

        searchInput.addEventListener("input", agendarPesquisa);
        searchForm.addEventListener("submit", function(event) {
            event.preventDefault();
            window.clearTimeout(searchTimer);
            agendarPesquisa();
            searchInput.focus();
        });
        window.addEventListener("hashchange", function() {
            if (window.location.hash === "#pesquisarProdutos") {
                searchInput.focus({ preventScroll: true });
            }
        });
        if (window.location.hash === "#pesquisarProdutos") {
            searchInput.focus({ preventScroll: true });
        }

        const initialQuery = new URLSearchParams(window.location.search).get("pesquisa") || "";
        if (initialQuery) {
            searchInput.value = initialQuery;
            agendarPesquisa();
        }
    }

    async function carregarDestaques() {
        if (!grid) {
            return;
        }
        mostrarEstado("A carregar destaques...");

        const result = await window.Fran7Supabase.getClient()
            .from("fran7_products")
            .select("*, fran7_variants(*)")
            .eq("ativo", true)
            .contains("categoria", [CATEGORY])
            .order("created_at", { ascending: false });
        if (result.error) {
            throw result.error;
        }
        highlightedProducts = result.data || [];
        if (!searchInput?.value.trim()) {
            productsTitle.textContent = "DESTAQUES";
            productsSubtitle.textContent = "Peças selecionadas da FRAN7.";
            renderizarProdutos(highlightedProducts, "Ainda não há produtos em destaque.");
        }
    }

    iniciarPesquisa();
    carregarDestaques().catch(function(error) {
        console.error("Não foi possível carregar os destaques do Supabase.", error);
        if (!searchInput?.value.trim()) {
            mostrarEstado("Não foi possível carregar os destaques. Tenta novamente mais tarde ou contacta o suporte.");
        }
    });
})();

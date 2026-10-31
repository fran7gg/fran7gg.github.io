(function() {
    "use strict";

    const STORAGE_KEY = "fran7_cart_v1";
    const LOCATION_KEY = "fran7_cart_location_v1";
    const CITY_KEY = "fran7_cart_city_v1";
    const NOTE_KEY = "fran7_cart_note_v1";
    let items = [];

    function obterPreco(valor) {
        if (window.Fran7Checkout) {
            return window.Fran7Checkout.parsePrice(valor) || 0;
        }
        if (typeof valor === "number") {
            return Number.isFinite(valor) && valor > 0 ? valor : 0;
        }
        const texto = String(valor || "").trim().replace(/\s|Kz|AOA/gi, "");
        const normalizado = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(texto)
            ? texto.replace(/\./g, "").replace(",", ".")
            : texto.replace(",", ".");
        const preco = Number(normalizado);
        return Number.isFinite(preco) && preco > 0 ? preco : 0;
    }

    function tamanhoAutomatico(nome) {
        return /\b(bon[eé]|chap[eé]u|meias?|socks?)\b/i.test(nome);
    }

    function normalizarCor(valor) {
        return String(valor || "").trim().toLocaleLowerCase("pt")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function encontrarVariante(item, tamanho) {
        const size = String(tamanho || "").trim().toLocaleLowerCase("pt");
        return (item.variantes || []).find(function(variant) {
            return variant.tamanho.trim().toLocaleLowerCase("pt") === size &&
                (!item.cor || normalizarCor(variant.cor) === normalizarCor(item.cor)) &&
                Number(variant.stock) > 0;
        });
    }

    function variantesDaCor(item) {
        return (item.variantes || []).filter(function(variant) {
            return !item.cor || normalizarCor(variant.cor) === normalizarCor(item.cor);
        });
    }

    function temTamanhosRegistados(item) {
        return variantesDaCor(item).some(function(variant) {
            return variant.tamanho.trim() !== "";
        });
    }

    function chaveItem(item) {
        return [item.productId || item.nome, item.cor, item.tamanho].join("|");
    }

    function carregarCarrinho() {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);

            if (!Array.isArray(parsed)) {
                throw new TypeError("O conteúdo guardado para o carrinho não é uma lista.");
            }

            return parsed.filter(function(item) {
                return item &&
                    typeof item.nome === "string" &&
                    typeof item.imagem === "string" &&
                    Number.isFinite(Number(item.preco)) &&
                    Number.isInteger(Number(item.quantidade)) &&
                    Number(item.quantidade) > 0;
            }).map(function(item) {
                return {
                    nome: item.nome,
                    imagem: item.imagem,
                    imagemBase: typeof item.imagemBase === "string" ? item.imagemBase : "",
                    productId: typeof item.productId === "string" ? item.productId : "",
                    preco: obterPreco(item.preco),
                    quantidade: Number(item.quantidade),
                    cor: typeof item.cor === "string" ? item.cor : "",
                    tamanho: tamanhoAutomatico(item.nome)
                        ? "X"
                        : (typeof item.tamanho === "string" ? item.tamanho : ""),
                    variantes: Array.isArray(item.variantes)
                        ? item.variantes.filter(function(variant) {
                            return variant && typeof variant.cor === "string" &&
                                typeof variant.tamanho === "string";
                        })
                        : []
                };
            });
        } catch (error) {
            console.error("Não foi possível ler o carrinho guardado:", error);
            return [];
        }
    }

    function guardarCarrinho() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        renderizar();
        window.dispatchEvent(new CustomEvent("fran7-cart-updated", {
            detail: { items: items }
        }));
    }

    function enriquecerCarrinhoComVariantes(products) {
        const cards = Array.isArray(products)
            ? products
            : Array.from(document.querySelectorAll(
                ".produto[data-product-variants], .modelo[data-product-variants], .favorito-card[data-product-variants]"
            ));
        let changed = false;

        items.forEach(function(item) {
            if (Array.isArray(item.variantes) && item.variantes.length) {
                return;
            }
            const candidates = cards.map(function(card) {
                let variants = [];
                try {
                    variants = JSON.parse(card.dataset.productVariants || "[]");
                } catch (error) {
                    console.error("Não foi possível recuperar as variantes do produto.", error);
                }
                return { card: card, variants: variants };
            }).filter(function(candidate) {
                const name = candidate.card.dataset.productName ||
                    candidate.card.querySelector("h2, h3")?.textContent.trim();
                return candidate.variants.length &&
                    (!item.productId || candidate.card.dataset.productId === item.productId) &&
                    name === item.nome;
            });
            const exact = candidates.filter(function(candidate) {
                const cardImage = candidate.card.querySelector("img")?.src || "";
                const baseImage = candidate.card.dataset.productBaseImage || "";
                return candidate.variants.some(function(variant) {
                    return variant.imagem && variant.imagem === item.imagem;
                }) || cardImage === item.imagem || baseImage === item.imagem;
            });
            const match = exact.length === 1
                ? exact[0]
                : (item.productId && candidates.length === 1 ? candidates[0] : null);
            if (!match) {
                return;
            }

            const variants = match.variants.filter(function(variant) {
                return variant && typeof variant.cor === "string" &&
                    typeof variant.tamanho === "string";
            });
            if (!variants.length) {
                return;
            }
            item.productId = match.card.dataset.productId || "";
            item.imagemBase = match.card.dataset.productBaseImage ||
                match.card.querySelector("img")?.src ||
                item.imagem;
            item.variantes = variants;

            const selected = variants.find(function(variant) {
                return item.tamanho &&
                    variant.tamanho === item.tamanho &&
                    (!item.cor || normalizarCor(variant.cor) === normalizarCor(item.cor));
            });
            if (selected) {
                item.cor = selected.cor;
                item.tamanho = selected.tamanho;
                item.preco = obterPreco(selected.preco);
                item.imagem = selected.imagem || item.imagemBase;
            } else {
                const imageVariant = variants.find(function(variant) {
                    return variant.imagem && variant.imagem === item.imagem;
                });
                const colors = Array.from(new Set(variants.map(function(variant) {
                    return normalizarCor(variant.cor);
                })));
                if (!item.cor && imageVariant) {
                    item.cor = imageVariant.cor;
                } else if (!item.cor && colors.length === 1) {
                    item.cor = variants[0].cor;
                }
                const colorVariants = item.cor
                    ? variants.filter(function(variant) {
                        return normalizarCor(variant.cor) === normalizarCor(item.cor);
                    })
                    : [];
                const hasRegisteredSizes = colorVariants.some(function(variant) {
                    return variant.tamanho.trim() !== "";
                });
                const stockedColorVariant = colorVariants.find(function(variant) {
                    return Number(variant.stock) > 0;
                });
                item.tamanho = "";
                item.preco = hasRegisteredSizes
                    ? 0
                    : (obterPreco(stockedColorVariant?.preco) || item.preco);
                item.imagem = colorVariants.find(function(variant) {
                    return variant.imagem;
                })?.imagem || imageVariant?.imagem || item.imagemBase;
            }
            changed = true;
        });

        if (changed) {
            guardarCarrinho();
        }
    }

    function formatarPreco(valor) {
        if (!valor) {
            return "Consultar preço";
        }

        return Number(valor).toLocaleString("pt-AO") + " Kz";
    }

    function criarCampo(rotulo, placeholder, valor, aoAlterar) {
        const wrapper = document.createElement("div");
        wrapper.className = "fran7-cart-field";

        const id = "fran7-cart-" + rotulo.toLowerCase() + "-" + Math.random().toString(36).slice(2, 8);
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = rotulo;

        const input = document.createElement("input");
        input.id = id;
        input.type = "text";
        input.placeholder = placeholder;
        input.value = valor || "";
        input.dataset.cartOption = rotulo.toLowerCase();
        if (rotulo === "Tamanho" && input.value === "X") {
            input.disabled = true;
            input.setAttribute("aria-label", "Tamanho X (aplicado automaticamente)");
        }
        input.addEventListener("input", function() {
            aoAlterar(input.value.trim());
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
    }

    function mostrarAviso(mensagem) {
        const notice = document.getElementById("fran7CartNotice");
        const text = document.getElementById("fran7CartNoticeText");
        text.textContent = mensagem;
        notice.hidden = false;
    }

    async function exigirConta(acao) {
        if (window.Fran7Session?.estaAutenticado()) {
            return true;
        }

        if (!window.Fran7Notify) {
            throw new Error("O aviso de início de sessão não está disponível.");
        }

        const iniciarSessao = await window.Fran7Notify.confirm(
            "Para " + acao + ", inicia sessão ou cria uma conta FRAN7.",
            {
                title: "Entra na tua conta",
                confirmText: "Entrar / criar conta",
                cancelText: "Continuar a explorar"
            }
        );
        if (iniciarSessao) {
            window.location.href = "registo.html?modo=login";
        }
        return false;
    }

    function focarCampoEmFalta() {
        const itemEmFalta = items.find(function(item) {
            return !item.cor ||
                (!item.tamanho ||
                    (temTamanhosRegistados(item) && !encontrarVariante(item, item.tamanho)));
        });

        if (itemEmFalta) {
            const itemElement = [...document.querySelectorAll(".fran7-cart-item")]
                .find(function(element) {
                    return element.dataset.itemKey === chaveItem(itemEmFalta);
                });

            if (itemElement) {
                    const option = itemEmFalta.cor ? "tamanho" : "cor";
                    const input = itemElement.querySelector(
                        '[data-cart-option="' + option + '"]'
                    );
                    if (input) {
                    input.focus();
                    input.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
            return;
        }

        const city = document.getElementById("fran7CartCity");
        const location = document.getElementById("fran7CartLocation");
        const field = city && !city.value.trim() ? city : location;
        field.focus();
        field.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function renderizar() {
        const count = document.getElementById("fran7CartCount");
        const list = document.getElementById("fran7CartItems");
        const totalElement = document.getElementById("fran7CartTotal");
        const location = document.getElementById("fran7CartLocation");
        const city = document.getElementById("fran7CartCity");
        const note = document.getElementById("fran7CartNote");

        if (!count || !list || !totalElement) {
            return;
        }

        list.replaceChildren();

        if (items.length === 0) {
            const empty = document.createElement("p");
            empty.className = "fran7-cart-empty";
            empty.textContent = "O teu carrinho está vazio.";
            list.appendChild(empty);
        } else {
            items.forEach(function(item, index) {
                const card = document.createElement("article");
                card.className = "fran7-cart-item";
                card.dataset.itemKey = chaveItem(item);

                let image;
                if (item.imagem) {
                    image = document.createElement("img");
                    image.className = "fran7-cart-item-image";
                    image.src = item.imagem;
                    image.alt = item.nome;
                    image.addEventListener("error", function() {
                        const placeholder = document.createElement("div");
                        placeholder.className = "fran7-cart-item-image fran7-cart-item-placeholder";
                        placeholder.textContent = "Imagem indisponível";
                        placeholder.setAttribute("aria-label", "Imagem indisponível para " + item.nome);
                        image.replaceWith(placeholder);
                        console.error("Não foi possível carregar a imagem do produto na sacola:", item.imagem);
                    }, { once: true });
                } else {
                    image = document.createElement("div");
                    image.className = "fran7-cart-item-image fran7-cart-item-placeholder";
                    image.textContent = "Imagem indisponível";
                    image.setAttribute("aria-label", "Imagem indisponível para " + item.nome);
                }

                const details = document.createElement("div");
                details.className = "fran7-cart-item-content";

                const name = document.createElement("h3");
                name.className = "fran7-cart-item-name";
                name.textContent = item.nome;

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "fran7-cart-remove";
                remove.textContent = "×";
                remove.setAttribute("aria-label", "Remover " + item.nome + " da sacola");
                remove.addEventListener("click", function() {
                    items.splice(index, 1);
                    guardarCarrinho();
                });

                const price = document.createElement("p");
                price.className = "fran7-cart-item-price";
                price.textContent = item.preco
                    ? formatarPreco(item.preco * item.quantidade)
                    : "Preço a confirmar";

                const quantity = document.createElement("div");
                quantity.className = "fran7-cart-quantity";

                const decrease = document.createElement("button");
                decrease.type = "button";
                decrease.textContent = "−";
                decrease.setAttribute("aria-label", "Diminuir quantidade");
                decrease.addEventListener("click", function() {
                    if (items[index].quantidade <= 1) {
                        items.splice(index, 1);
                    } else {
                        items[index].quantidade -= 1;
                    }
                    guardarCarrinho();
                });

                const quantityValue = document.createElement("span");
                quantityValue.className = "fran7-cart-item-quantity";
                quantityValue.textContent = String(item.quantidade);

                const increase = document.createElement("button");
                increase.type = "button";
                increase.textContent = "+";
                increase.setAttribute("aria-label", "Aumentar quantidade");
                increase.addEventListener("click", function() {
                    items[index].quantidade += 1;
                    guardarCarrinho();
                });

                quantity.append(decrease, quantityValue, increase);
                details.append(name, price, quantity);

                const options = document.createElement("div");
                options.className = "fran7-cart-item-options";
                if (Array.isArray(item.variantes) && item.variantes.length) {
                    const colors = Array.from(new Map(item.variantes.map(function(variant) {
                        return [normalizarCor(variant.cor), variant.cor];
                    })).values());
                    if (colors.length > 1) {
                        const colorLabel = document.createElement("label");
                        colorLabel.className = "fran7-cart-field";
                        colorLabel.textContent = "Cor";
                        const colorSelect = document.createElement("select");
                        colorSelect.dataset.cartOption = "cor";
                        const colorPlaceholder = document.createElement("option");
                        colorPlaceholder.value = "";
                        colorPlaceholder.textContent = "Escolhe a cor";
                        colorSelect.appendChild(colorPlaceholder);
                        colors.forEach(function(color) {
                            const option = document.createElement("option");
                            option.value = color;
                            option.textContent = color;
                            option.selected = normalizarCor(item.cor) === normalizarCor(color);
                            colorSelect.appendChild(option);
                        });
                        colorSelect.addEventListener("change", function() {
                            item.cor = colorSelect.value;
                            item.tamanho = "";
                            const selectedColorVariant = variantesDaCor(item).find(function(variant) {
                                return Number(variant.stock) > 0;
                            });
                            item.preco = temTamanhosRegistados(item)
                                ? 0
                                : (obterPreco(selectedColorVariant?.preco) || item.preco);
                            item.imagem = selectedColorVariant?.imagem ||
                                item.imagemBase || item.imagem;
                            guardarCarrinho();
                        });
                        colorLabel.appendChild(colorSelect);
                        options.appendChild(colorLabel);
                    } else {
                        const color = document.createElement("p");
                        color.className = "fran7-cart-item-color";
                        color.textContent = "Cor: " + (item.cor || colors[0] || "—");
                        options.appendChild(color);
                    }
                    const sizeLabel = document.createElement("div");
                    sizeLabel.className = "fran7-cart-field";
                    const sizeCaption = document.createElement("label");
                    sizeCaption.textContent = "Tamanho";
                    const input = document.createElement("input");
                    const sizeList = document.createElement("datalist");
                    sizeList.id = "fran7-cart-sizes-" + index;
                    input.type = "text";
                    input.dataset.cartOption = "tamanho";
                    input.placeholder = "Escreve o teu tamanho";
                    input.autocomplete = "off";
                    input.value = item.tamanho || "";
                    input.setAttribute("list", sizeList.id);
                    sizeCaption.htmlFor = sizeList.id + "-input";
                    input.id = sizeCaption.htmlFor;
                    const colorVariants = variantesDaCor(item);
                    const hasRegisteredSizes = colorVariants.some(function(variant) {
                        return variant.tamanho.trim() !== "";
                    });
                    const stockedColorVariant = colorVariants.find(function(variant) {
                        return Number(variant.stock) > 0;
                    });
                    const sizes = Array.from(new Map(colorVariants
                        .filter(function(variant) { return variant.tamanho.trim() !== ""; })
                        .map(function(variant) {
                        return [variant.tamanho, variant];
                    })).values());
                    sizes.forEach(function(variant) {
                        const option = document.createElement("option");
                        option.value = variant.tamanho;
                        option.label = Number(variant.stock) > 0
                            ? variant.tamanho + " · " + Number(variant.stock) + " disponíveis"
                            : variant.tamanho + " · Sem stock";
                        if (Number(variant.stock) > 0) {
                            sizeList.appendChild(option);
                        }
                    });
                    input.disabled = colors.length > 1 && !item.cor;
                    input.addEventListener("input", function() {
                        const typedSize = input.value.trim();
                        const variant = colorVariants.find(function(entry) {
                            return entry.tamanho.trim().toLocaleLowerCase("pt") ===
                                typedSize.toLocaleLowerCase("pt") &&
                                Number(entry.stock) > 0;
                        });
                        const selectedVariant = variant ||
                            (!hasRegisteredSizes ? stockedColorVariant : null);
                        item.tamanho = variant?.tamanho || typedSize;
                        item.preco = selectedVariant
                            ? (obterPreco(selectedVariant.preco) ||
                                (!hasRegisteredSizes ? item.preco : 0))
                            : 0;
                        item.imagem = selectedVariant?.imagem || item.imagemBase || item.imagem;
                        price.textContent = selectedVariant
                            ? formatarPreco(item.preco * item.quantidade)
                            : (typedSize && hasRegisteredSizes
                                ? "Tamanho indisponível"
                                : "Preço a confirmar");
                        const itemImage = card.querySelector(".fran7-cart-item-image");
                        if (itemImage && itemImage.tagName === "IMG" && item.imagem) {
                            itemImage.src = item.imagem;
                        }
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
                        atualizarResumo();
                    });
                    input.addEventListener("change", guardarCarrinho);
                    sizeLabel.append(sizeCaption, input, sizeList);
                    options.appendChild(sizeLabel);
                } else {
                    options.appendChild(criarCampo("Cor", "Ex.: Preto, branco...", item.cor, function(value) {
                        items[index].cor = value;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
                    }));
                    options.appendChild(criarCampo("Tamanho", "Ex.: M, L, XL...", item.tamanho, function(value) {
                        items[index].tamanho = value;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
                    }));
                }
                details.appendChild(options);

                card.append(image, details, remove);
                list.appendChild(card);
            });
        }

        atualizarResumo();
        if (location) {
            location.value = localStorage.getItem(LOCATION_KEY) || "";
        }
        if (city) {
            city.value = localStorage.getItem(CITY_KEY) || "";
        }
        if (note) {
            note.value = localStorage.getItem(NOTE_KEY) || "";
        }
    }

    function atualizarResumo() {
        const count = document.getElementById("fran7CartCount");
        const subtotalElement = document.getElementById("fran7CartSubtotal");
        const discountBadge = document.getElementById("fran7CartDiscountBadge");
        const totalElement = document.getElementById("fran7CartTotal");
        const totalQuantity = items.reduce(function(total, item) {
            return total + item.quantidade;
        }, 0);
        const subtotal = items.reduce(function(total, item) {
            return total + item.preco * item.quantidade;
        }, 0);
        const totalPending = items.some(function(item) { return !item.preco; });
        const discount = window.Fran7Checkout
            ? window.Fran7Checkout.calculateDiscount(totalQuantity)
            : (totalQuantity >= 3 ? 2000 : totalQuantity === 2 ? 1500 : 0);

        if (count) count.textContent = String(totalQuantity);
        if (subtotalElement) {
            subtotalElement.textContent = totalPending
                ? formatarPreco(subtotal) + " + itens a confirmar"
                : formatarPreco(subtotal);
        }
        if (discountBadge) {
            discountBadge.hidden = discount === 0;
            discountBadge.textContent = totalQuantity >= 3
                ? "Desconto máximo de quantidade aplicado!"
                : "Desconto por volume aplicado!";
        }
        if (totalElement) {
            totalElement.textContent = totalPending
                ? "A confirmar"
                : formatarPreco(Math.max(0, subtotal - discount));
        }
    }

    async function abrirCarrinho() {
        if (!await exigirConta("aceder à sacola")) {
            return;
        }
        const overlay = document.getElementById("fran7CartOverlay");
        overlay.hidden = false;
        document.body.style.overflow = "hidden";
        requestAnimationFrame(function() {
            overlay.classList.add("open");
        });
    }

    function fecharCarrinho() {
        const overlay = document.getElementById("fran7CartOverlay");
        overlay.classList.remove("open");
        document.body.style.overflow = "";
        window.setTimeout(function() {
            if (!overlay.classList.contains("open")) {
                overlay.hidden = true;
            }
        }, 300);
    }

    async function adicionar(item) {
        if (!await exigirConta("adicionar produtos à sacola")) {
            return;
        }
        const nome = String(item.nome || "Produto FRAN7").trim();
        const imagem = String(item.imagem || "");
        const imagemBase = String(item.imagemBase || imagem);
        const productId = String(item.productId || "");
        const preco = obterPreco(item.preco);
        const cor = String(item.cor || "").trim();
        const tamanho = tamanhoAutomatico(nome)
            ? "X"
            : String(item.tamanho || "").trim();
        const variantes = Array.isArray(item.variantes) ? item.variantes : [];
        const existing = items.find(function(current) {
            return (current.productId || current.nome) === (productId || nome) &&
                current.cor === cor &&
                current.tamanho === tamanho;
        });

        if (existing) {
            existing.quantidade += 1;
            if (variantes.length) {
                existing.preco = preco;
                existing.imagem = imagem;
                existing.imagemBase = imagemBase;
                existing.variantes = variantes;
                existing.productId = productId || existing.productId || "";
            }
        } else {
            items.push({
                nome: nome,
                imagem: imagem,
                imagemBase: imagemBase,
                productId: productId,
                preco: preco,
                quantidade: 1,
                cor: cor,
                tamanho: tamanho,
                variantes: variantes
            });
        }

        guardarCarrinho();
        abrirCarrinho();
        window.setTimeout(focarCampoEmFalta, 350);
    }

    async function enviarPedido() {
        if (!await exigirConta("finalizar a compra")) {
            return;
        }

        const location = document.getElementById("fran7CartLocation").value.trim();
        const city = document.getElementById("fran7CartCity").value.trim();
        const note = document.getElementById("fran7CartNote").value.trim();
        const itemEmFalta = items.find(function(item) {
            return !item.cor || (!tamanhoAutomatico(item.nome) && !item.tamanho);
        });
        const tamanhoIndisponivel = items.find(function(item) {
            return temTamanhosRegistados(item) &&
                !tamanhoAutomatico(item.nome) &&
                item.tamanho &&
                !encontrarVariante(item, item.tamanho);
        });

        if (items.length === 0) {
            mostrarAviso("Adiciona pelo menos um produto ao carrinho antes de enviar o pedido.");
            return;
        }

        if (itemEmFalta || !city || !location) {
            mostrarAviso(itemEmFalta
                ? "Preenche a cor e o tamanho de cada produto. Chapéus e meias usam tamanho X."
                : (!city ? "Preenche a cidade de entrega." : "Preenche a localização de entrega."));
            return;
        }
        if (tamanhoIndisponivel) {
            mostrarAviso("O tamanho indicado não está disponível para este produto/cor. Escreve ou escolhe um tamanho disponível.");
            focarCampoEmFalta();
            return;
        }

        const button = document.querySelector(".fran7-cart-submit");
        button.disabled = true;
        button.textContent = "A registar encomenda...";
        try {
            if (!window.Fran7Checkout) {
                throw new Error("O serviço de checkout não está carregado.");
            }
            const result = await window.Fran7Checkout.finalize(items, {
                cidade: city,
                localizacao: location,
                comentario: note
            });
            if (!result) {
                return;
            }
            mostrarAviso("Pedido " + result.order.id_pedido + " registado. " +
                (result.pdfGerado ? "A fatura foi descarregada." : "Não foi possível gerar o PDF."));
        } catch (error) {
            console.error("Não foi possível registar o pedido FRAN7:", error);
            mostrarAviso("Não foi possível registar o pedido no PocketBase. " +
                "Confirma a ligação e tenta novamente. " + (error.message || ""));
        } finally {
            button.disabled = false;
            button.textContent = "FINALIZAR COMPRA";
        }
    }

    function montarInterface() {
        const header = document.querySelector(".cabecalho, .cabecalho-catalogo");

        if (!header) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "fran7-cart-trigger";
        button.setAttribute("aria-label", "Abrir sacola");
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 9h14l1 12H4L5 9Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="fran7-cart-count" id="fran7CartCount">0</span>
        `;
        button.addEventListener("click", abrirCarrinho);

        const backLink = header.querySelector(".voltar, .voltar-loja");
        if (backLink) {
            header.insertBefore(button, backLink);
        } else {
            header.appendChild(button);
        }

        const overlay = document.createElement("div");
        overlay.className = "fran7-cart-overlay";
        overlay.id = "fran7CartOverlay";
        overlay.hidden = true;
        overlay.innerHTML = `
            <section class="fran7-cart-panel" role="dialog" aria-modal="true" aria-labelledby="fran7CartTitle">
                <div class="fran7-cart-header">
                    <h2 class="fran7-cart-title" id="fran7CartTitle">MEU CARRINHO</h2>
                    <button type="button" class="fran7-cart-close" aria-label="Fechar carrinho">×</button>
                </div>
                <div class="fran7-cart-body" id="fran7CartItems"></div>
                <div class="fran7-cart-footer">
                    <div class="fran7-cart-field fran7-cart-location">
                        <label for="fran7CartCity">Cidade <span aria-hidden="true">*</span></label>
                        <input id="fran7CartCity" type="text" placeholder="Ex.: Luanda" autocomplete="address-level2" required>
                    </div>
                    <div class="fran7-cart-field fran7-cart-location">
                        <label for="fran7CartLocation">Bairro / localização <span aria-hidden="true">*</span></label>
                        <input id="fran7CartLocation" type="text" placeholder="Ex.: Benfica, Maianga..." autocomplete="street-address" required>
                    </div>
                    <div class="fran7-cart-field fran7-cart-note">
                        <label for="fran7CartNote">Comentário <span>(opcional)</span></label>
                        <textarea id="fran7CartNote" rows="2" maxlength="300" placeholder="Alguma indicação para o teu pedido?"></textarea>
                    </div>
                    <div class="fran7-cart-notice" id="fran7CartNotice" role="status" hidden>
                        <span id="fran7CartNoticeText"></span>
                        <button type="button" id="fran7CartNoticeAction">Preencher agora</button>
                    </div>
                    <div class="fran7-cart-summary-row">
                        <span>Subtotal</span>
                        <span id="fran7CartSubtotal">0 Kz</span>
                    </div>
                    <div class="fran7-cart-summary-row"><span>Entrega</span><span>Grátis</span></div>
                    <div class="fran7-cart-discount-badge" id="fran7CartDiscountBadge" hidden></div>
                    <div class="fran7-cart-total">
                        <span class="fran7-cart-total-label">
                            <span>TOTAL FINAL</span>
                            <span class="fran7-cart-total-note">Estimativa sujeita a confirmação.</span>
                        </span>
                        <span id="fran7CartTotal">0 Kz</span>
                    </div>
                    <button type="button" class="fran7-cart-submit">FINALIZAR COMPRA</button>
                </div>
            </section>
        `;
        document.body.appendChild(overlay);
        document.getElementById("fran7CartLocation").addEventListener("input", function(event) {
            localStorage.setItem(LOCATION_KEY, event.target.value);
        });
        document.getElementById("fran7CartCity").addEventListener("input", function(event) {
            localStorage.setItem(CITY_KEY, event.target.value);
        });
        document.getElementById("fran7CartNote").addEventListener("input", function(event) {
            localStorage.setItem(NOTE_KEY, event.target.value);
        });

        overlay.querySelector(".fran7-cart-close").addEventListener("click", fecharCarrinho);
        overlay.addEventListener("click", function(event) {
            if (event.target === overlay) {
                fecharCarrinho();
            }
        });
        overlay.querySelector(".fran7-cart-submit").addEventListener("click", enviarPedido);
        overlay.querySelector("#fran7CartNoticeAction").addEventListener("click", focarCampoEmFalta);

        document.addEventListener("keydown", function(event) {
            if (event.key === "Escape" && !overlay.hidden) {
                fecharCarrinho();
            }
        });

        document.addEventListener("click", function(event) {
            const addButton = event.target.closest(".fran7-cart-add");
            if (!addButton) {
                return;
            }

            adicionar({
                nome: addButton.dataset.cartName,
                imagem: addButton.dataset.cartImage,
                preco: addButton.dataset.cartPrice,
                cor: addButton.dataset.cartColor,
                tamanho: addButton.dataset.cartSize
            });
        });

        renderizar();
    }

    items = carregarCarrinho();
    window.addEventListener("fran7-products-loaded", function(event) {
        enriquecerCarrinhoComVariantes(event.detail?.products);
    });

    window.Fran7Cart = {
        add: adicionar,
        open: abrirCarrinho,
        getItems: function() {
            return items.map(function(item) {
                return Object.assign({}, item);
            });
        },
        reload: function() {
            items = carregarCarrinho();
            renderizar();
        },
        storageKey: STORAGE_KEY
    };

    window.addEventListener("storage", function(event) {
        if (event.key === STORAGE_KEY) {
            items = carregarCarrinho();
            renderizar();
        }

        if (event.key === LOCATION_KEY) {
            const location = document.getElementById("fran7CartLocation");
            if (location) {
                location.value = event.newValue || "";
            }
        }
        if (event.key === CITY_KEY) {
            const city = document.getElementById("fran7CartCity");
            if (city) {
                city.value = event.newValue || "";
            }
        }
        if (event.key === NOTE_KEY) {
            const note = document.getElementById("fran7CartNote");
            if (note) {
                note.value = event.newValue || "";
            }
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", montarInterface, { once: true });
    } else {
        montarInterface();
    }
})();

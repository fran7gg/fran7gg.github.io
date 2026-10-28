(function() {
    "use strict";

    const CONFIG = window.FRAN7_CHECKOUT_CONFIG || {};
    const ORDERS_KEY = "fran7_orders_v1";
    const PDF_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

    function parsePrice(value) {
        if (typeof value === "number") {
            return Number.isFinite(value) && value > 0 ? value : null;
        }
        if (typeof value !== "string") return null;

        const text = value.trim().replace(/\s|Kz|AOA/gi, "");
        if (!text || !/^[\d.,]+$/.test(text)) return null;

        let normalized = text;
        if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)) {
            normalized = text.replace(/\./g, "").replace(",", ".");
        } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) {
            normalized = text.replace(/,/g, "");
        } else if (/^\d+,\d+$/.test(text)) {
            normalized = text.replace(",", ".");
        }

        const price = Number(normalized);
        return Number.isFinite(price) && price > 0 ? price : null;
    }

    function formatAmount(value) {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) {
            return "A confirmar";
        }
        return Number(value).toLocaleString("pt-AO") + " Kz";
    }

    function absoluteUrl(value) {
        if (!value) return "";
        try {
            return new URL(value, window.location.href).href;
        } catch (error) {
            return String(value);
        }
    }

    function gerarNumeroPedido(date) {
        const unique = date.getTime().toString(36).toUpperCase() +
            Math.random().toString(36).slice(2, 6).toUpperCase();
        return (CONFIG.invoicePrefix || "FT") + "-" + date.getFullYear() + "-" + unique;
    }

    function calcularDesconto(quantidade) {
        if (quantidade >= 3) return 2000;
        if (quantidade === 2) return 1500;
        return 0;
    }

    function lerPerfilCliente() {
        let profile = {};
        try {
            profile = JSON.parse(localStorage.getItem("usuarioFRAN7") || "{}") || {};
        } catch (error) {
            console.warn("Não foi possível ler o perfil do cliente para a fatura.", error);
        }
        return {
            nome: String(profile.nome || localStorage.getItem("fran7_nome") || "").trim(),
            email: String(profile.email || localStorage.getItem("fran7_email") || "").trim(),
            telefone: String(profile.telefone || localStorage.getItem("fran7_telefone") || "").trim()
        };
    }

    function criarPedido(items, details) {
        const date = new Date();
        const customer = lerPerfilCliente();
        const products = items.map(function(item) {
            const unitPrice = parsePrice(item.preco);
            const quantity = Math.max(1, Math.floor(Number(item.quantidade) || 1));
            return {
                nome: String(item.nome || "Produto FRAN7").trim(),
                imagem: absoluteUrl(item.imagem),
                cor: String(item.cor || "").trim(),
                tamanho: String(item.tamanho || "").trim(),
                quantidade: quantity,
                preco_unitario: unitPrice,
                total_item: unitPrice === null ? null : unitPrice * quantity
            };
        });
        const totalPending = products.some(function(item) { return item.total_item === null; });
        const quantidadeTotal = products.reduce(function(sum, item) { return sum + item.quantidade; }, 0);
        const subtotal = products.reduce(function(sum, item) {
            return sum + (item.total_item || 0);
        }, 0);
        const discount = calcularDesconto(quantidadeTotal);
        const total = totalPending ? null : Math.max(0, subtotal - discount);
        const order = {
            id_pedido: gerarNumeroPedido(date),
            data_hora: date.toISOString(),
            moeda: "AOA",
            produtos: products,
            quantidade_total: quantidadeTotal,
            valor_subtotal: subtotal,
            desconto_quantidade: discount,
            frete_gratis: true,
            valor_total: total,
            total_pendente: totalPending,
            cidade: String(details.cidade || "").trim(),
            localizacao: String(details.localizacao || "").trim(),
            bairro_localizacao: String(details.localizacao || "").trim(),
            nome_cliente: customer.nome,
            email_cliente: customer.email,
            telefone_cliente: customer.telefone,
            comentario: String(details.comentario || "").trim(),
            estado: "aguardando_confirmacao"
        };
        order.dados_fatura = {
            numero: order.id_pedido,
            emissor: CONFIG.brandName || "FRAN7",
            slogan: CONFIG.slogan || "Grief & Glory",
            data_hora: order.data_hora,
            moeda: order.moeda,
            produtos: order.produtos,
            valor_subtotal: order.valor_subtotal,
            desconto_quantidade: order.desconto_quantidade,
            frete_gratis: order.frete_gratis,
            valor_total: order.valor_total,
            remetente: {
                nome: CONFIG.brandName || "FRAN7",
                email: CONFIG.supportEmail || "fran7officiall@gmail.com",
                telefone: CONFIG.whatsappNumber || "244973560521"
            },
            destinatario: {
                nome: order.nome_cliente,
                email: order.email_cliente,
                telefone: order.telefone_cliente,
                cidade: order.cidade,
                bairro_localizacao: order.bairro_localizacao,
                comentario: order.comentario
            },
            pagamento: {
                iban: CONFIG.iban || "A confirmar com a FRAN7",
                multicaixa_express: CONFIG.multicaixaExpress || "A confirmar com a FRAN7"
            },
            email_apoio: CONFIG.supportEmail || "fran7officiall@gmail.com",
            nota: "Documento Digital. Documento de pedido; não substitui fatura fiscal."
        };
        return order;
    }

    async function guardarNoPocketBase(order) {
        const baseUrl = String(CONFIG.pocketBaseUrl || "").replace(/\/+$/, "");
        const collection = encodeURIComponent(CONFIG.collectionName || "encomendas");
        if (!baseUrl) throw new Error("Configura FRAN7_CHECKOUT_CONFIG.pocketBaseUrl antes de aceitar encomendas.");

        const response = await fetch(baseUrl + "/api/collections/" + collection + "/records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order)
        });
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok) {
            throw new Error(result.message || "O PocketBase recusou o registo do pedido.");
        }
        return result;
    }

    function guardarPedidoLocal(order) {
        try {
            const saved = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
            const orders = Array.isArray(saved) ? saved : [];
            orders.push(order);
            localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        } catch (error) {
            console.warn("Não foi possível guardar uma cópia local do pedido.", error);
        }
    }

    function carregarJsPdf() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
        if (window.fran7JsPdfPromise) return window.fran7JsPdfPromise;

        window.fran7JsPdfPromise = new Promise(function(resolve, reject) {
            const script = document.createElement("script");
            script.src = PDF_LIBRARY_URL;
            script.async = true;
            script.onload = function() {
                if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
                else reject(new Error("A biblioteca jsPDF não ficou disponível."));
            };
            script.onerror = function() { reject(new Error("Não foi possível carregar jsPDF.")); };
            document.head.appendChild(script);
        });
        return window.fran7JsPdfPromise;
    }

    function carregarLogotipo() {
        return new Promise(function(resolve) {
            if (!CONFIG.logoUrl) return resolve("");
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = function() {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;
                    canvas.getContext("2d").drawImage(image, 0, 0);
                    resolve(canvas.toDataURL("image/png"));
                } catch (error) {
                    resolve("");
                }
            };
            image.onerror = function() { resolve(""); };
            image.src = CONFIG.logoUrl;
        });
    }

    async function gerarPdf(order) {
        const JsPDF = await carregarJsPdf();
        const logo = await carregarLogotipo();
        const doc = new JsPDF({ unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const left = 16;
        const right = pageWidth - 16;
        const contentWidth = right - left;
        const dateText = new Date(order.data_hora).toLocaleString("pt-AO");
        const formatPrice = function(price) { return price === null ? "A confirmar" : formatAmount(price); };

        function drawHeader() {
            if (logo) doc.addImage(logo, "PNG", left, 12, 23, 18);
            const titleX = logo ? left + 29 : left;
            doc.setTextColor(24, 24, 24);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(19);
            doc.text(CONFIG.brandName || "FRAN7", titleX, 20);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(CONFIG.slogan || "Grief & Glory", titleX, 26);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("FATURA / PEDIDO", right, 18, { align: "right" });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("N.º " + order.id_pedido, right, 24, { align: "right" });
            doc.text(dateText, right, 30, { align: "right" });
            doc.setDrawColor(215, 215, 215);
            doc.line(left, 37, right, 37);
        }

        function drawParty(heading, lines, x, width) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(35, 35, 35);
            doc.text(heading.toUpperCase(), x, 47);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            let lineY = 53;
            lines.forEach(function(line) {
                const wrapped = doc.splitTextToSize(line, width);
                doc.text(wrapped, x, lineY);
                lineY += wrapped.length * 4 + 1;
            });
            return lineY;
        }

        function drawTableHeader(y) {
            doc.setFillColor(30, 30, 30);
            doc.rect(left, y, contentWidth, 9, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);
            doc.text("PRODUTO", left + 3, y + 6);
            doc.text("TAMANHO", 78, y + 6, { align: "center" });
            doc.text("COR", 101, y + 6, { align: "center" });
            doc.text("QTD.", 123, y + 6, { align: "right" });
            doc.text("PREÇO UNITÁRIO", 158, y + 6, { align: "right" });
            doc.text("TOTAL (KZ)", right - 3, y + 6, { align: "right" });
            doc.setTextColor(35, 35, 35);
            doc.setFont("helvetica", "normal");
            return y + 9;
        }

        drawHeader();
        const senderY = drawParty("Remetente", [
            CONFIG.brandName || "FRAN7",
            CONFIG.supportEmail || "fran7officiall@gmail.com",
            "WhatsApp/Telefone: +" + (CONFIG.whatsappNumber || "+244973560521")
        ], left, 80);
        const recipientY = drawParty("Destinatário", [
            "De FRAN7 para " + (order.cidade || "cidade a confirmar"),
            "Nome/Conta: " + (order.nome_cliente || "Não indicado"),
            "Telefone: " + (order.telefone_cliente || "Não indicado"),
            "E-mail: " + (order.email_cliente || "Não indicado"),
            "Bairro/Localização: " + (order.bairro_localizacao || "Não indicado"),
            "Comentários: " + (order.comentario || "Sem comentários")
        ], 108, 82);

        let y = drawTableHeader(Math.max(senderY, recipientY) + 5);
        doc.setFontSize(7.8);
        order.produtos.forEach(function(item) {
            const product = doc.splitTextToSize(item.nome, 49);
            const size = doc.splitTextToSize(item.tamanho || "-", 19);
            const color = doc.splitTextToSize(item.cor || "-", 20);
            const rowHeight = Math.max(11, Math.max(product.length, size.length, color.length) * 4 + 4);
            if (y + rowHeight > pageHeight - 52) {
                doc.addPage();
                drawHeader();
                y = drawTableHeader(45);
            }
            doc.setDrawColor(225, 225, 225);
            doc.line(left, y + rowHeight, right, y + rowHeight);
            doc.text(product, left + 3, y + 6);
            doc.text(size, 78, y + 6, { align: "center" });
            doc.text(color, 101, y + 6, { align: "center" });
            doc.text(String(item.quantidade), 123, y + 6, { align: "right" });
            doc.text(formatPrice(item.preco_unitario), 158, y + 6, { align: "right" });
            doc.text(formatPrice(item.total_item), right - 3, y + 6, { align: "right" });
            y += rowHeight;
        });

        const totals = [
            [order.total_pendente ? "SUBTOTAL PARCIAL" : "SUBTOTAL", formatPrice(order.valor_subtotal)],
            ["ENVIO PARA ANGOLA", "GRÁTIS"]
        ];
        if (order.desconto_quantidade > 0) {
            totals.push(["DESCONTO DE QUANTIDADE", "- " + formatPrice(order.desconto_quantidade)]);
        }
        totals.push(["TOTAL FINAL", formatPrice(order.valor_total)]);

        if (y + totals.length * 7 + 37 > pageHeight - 20) {
            doc.addPage();
            drawHeader();
            y = 48;
        }
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        totals.forEach(function(row, index) {
            const isFinal = index === totals.length - 1;
            doc.setFont("helvetica", isFinal ? "bold" : "normal");
            doc.text(row[0], 155, y, { align: "right" });
            doc.text(row[1], right, y, { align: "right" });
            y += isFinal ? 9 : 6;
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        y += 3;
        doc.text("PAGAMENTO", left, y);
        doc.text("IBAN: " + (CONFIG.iban || "A confirmar com a FRAN7"), left, y + 6);
        doc.text("Multicaixa Express: " + (CONFIG.multicaixaExpress || "A confirmar com a FRAN7"), left, y + 12);
        doc.text("Apoio: " + (CONFIG.supportEmail || "fran7officiall@gmail.com"), left, y + 18);

        const note = "Em caso de dúvida, contacte o e-mail oficial FRAN7 ou o WhatsApp de apoio.";
        const footerY = pageHeight - 17;
        doc.setDrawColor(215, 215, 215);
        doc.line(left, footerY - 8, right, footerY - 8);
        doc.setTextColor(90, 90, 90);
        doc.setFontSize(7.5);
        doc.text(doc.splitTextToSize(note, contentWidth), left, footerY - 3);
        doc.setFont("helvetica", "bold");
        doc.text("Documento Digital", left, footerY + 4);
        doc.setFont("helvetica", "normal");
        doc.text("Documento de pedido; não substitui fatura fiscal.", right, footerY + 4, { align: "right" });
        doc.save(order.id_pedido + ".pdf");
    }

    function construirMensagem(order) {
        const lines = [
            "Olá! Quero finalizar este pedido.",
            "Número da fatura/pedido: " + order.id_pedido,
            "Data: " + new Date(order.data_hora).toLocaleString("pt-AO"),
            "Produtos:"
        ];
        order.produtos.forEach(function(item) {
            const variant = [item.cor && "cor " + item.cor, item.tamanho && "tamanho " + item.tamanho]
                .filter(Boolean).join(", ");
            lines.push("- " + item.nome + " x" + item.quantidade +
                (variant ? " (" + variant + ")" : "") +
                " | unitário: " + formatAmount(item.preco_unitario) +
                " | total: " + formatAmount(item.total_item));
        });
        lines.push("Subtotal: " + formatAmount(order.valor_subtotal));
        lines.push("Entrega: Grátis");
        lines.push("Total Final: " + formatAmount(order.valor_total));
        lines.push("Cidade: " + order.cidade);
        lines.push("Bairro/Localização: " + order.bairro_localizacao);
        if (order.telefone_cliente) lines.push("Telefone do cliente: " + order.telefone_cliente);
        lines.push("Solicito a emissão da fatura e os dados para pagamento via IBAN ou Multicaixa Express.");
        if (CONFIG.iban) lines.push("IBAN: " + CONFIG.iban);
        if (CONFIG.multicaixaExpress) lines.push("Multicaixa Express: " + CONFIG.multicaixaExpress);
        lines.push("Apoio: " + (CONFIG.supportEmail || "fran7officiall@gmail.com"));
        if (order.comentario) lines.push("Comentário: " + order.comentario);
        return lines.join("\n");
    }

    async function finalizar(items, details) {
        const whatsappWindow = window.open("about:blank", "_blank");
        const order = criarPedido(items, details || {});
        try {
            await guardarNoPocketBase(order);
            guardarPedidoLocal(order);
        } catch (error) {
            if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
            throw error;
        }

        let pdfGerado = false;
        try {
            await gerarPdf(order);
            pdfGerado = true;
        } catch (error) {
            console.error("Não foi possível gerar o PDF da fatura/pedido.", error);
            if (window.Fran7Notify) {
                await window.Fran7Notify.alert("O pedido foi guardado, mas o PDF não pôde ser gerado.", { title: "PDF indisponível" });
            }
        }

        const url = "https://wa.me/" + encodeURIComponent(CONFIG.whatsappNumber || "244973560521") +
            "?text=" + encodeURIComponent(construirMensagem(order));
        if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.href = url;
        else window.location.href = url;
        return { order: order, pdfGerado: pdfGerado };
    }

    function csvCell(value) {
        let text = value === null || value === undefined ? "" : String(value);
        if (/^[=+@\-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function exportOrders(format) {
        const saved = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
        if (!Array.isArray(saved) || !saved.length) {
            throw new Error("Não existem pedidos guardados neste navegador para exportar.");
        }
        const type = format === "json" ? "json" : "csv";
        let content;
        let mime;
        if (type === "json") {
            content = JSON.stringify(saved, null, 2);
            mime = "application/json;charset=utf-8";
        } else {
            const columns = [
                "id_pedido", "data_hora", "nome_cliente", "email_cliente", "telefone_cliente",
                "cidade", "bairro_localizacao", "comentario", "nome_produto", "imagem",
                "tamanho", "cor", "quantidade", "preco_unitario", "total_item",
                "valor_subtotal", "desconto_quantidade", "frete_gratis", "valor_total", "moeda", "estado"
            ];
            const rows = [columns.join(",")];
            saved.forEach(function(order) {
                order.produtos.forEach(function(item) {
                    rows.push([
                        order.id_pedido, order.data_hora, order.nome_cliente, order.email_cliente,
                        order.telefone_cliente, order.cidade, order.bairro_localizacao,
                        order.comentario, item.nome, item.imagem, item.tamanho, item.cor,
                        item.quantidade, item.preco_unitario, item.total_item,
                        order.valor_subtotal, order.desconto_quantidade, order.frete_gratis,
                        order.valor_total, order.moeda, order.estado
                    ].map(csvCell).join(","));
                });
            });
            content = "\uFEFF" + rows.join("\r\n");
            mime = "text/csv;charset=utf-8";
        }
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "fran7-encomendas." + type;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    window.Fran7Checkout = {
        parsePrice: parsePrice,
        formatAmount: formatAmount,
        createOrder: criarPedido,
        calculateDiscount: calcularDesconto,
        finalize: finalizar,
        exportOrders: exportOrders
    };
})();

(function() {
    "use strict";

    const CONFIG = window.FRAN7_CHECKOUT_CONFIG || {};
    const ORDERS_KEY = "fran7_orders_v1";
    const PDF_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

    function parsePrice(value) {
        if (typeof value === "number") {
            return Number.isFinite(value) && value > 0 ? value : null;
        }
        if (typeof value !== "string") {
            return null;
        }

        const text = value.trim().replace(/\s|Kz|AOA/gi, "");
        if (!text || !/^[\d.,]+$/.test(text)) {
            return null;
        }

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
        return Number(value).toLocaleString("pt-AO") + " AOA";
    }

    function absoluteUrl(value) {
        if (!value) {
            return "";
        }
        try {
            return new URL(value, window.location.href).href;
        } catch (error) {
            return String(value);
        }
    }

    function gerarNumeroPedido(date) {
        const year = date.getFullYear();
        const unique = date.getTime().toString(36).toUpperCase() +
            Math.random().toString(36).slice(2, 6).toUpperCase();
        return (CONFIG.invoicePrefix || "FT") + "-" + year + "-" + unique;
    }

    function criarPedido(items, details) {
        const date = new Date();
        const products = items.map(function(item) {
            const unitPrice = parsePrice(item.preco);
            return {
                nome: String(item.nome || "Produto FRAN7").trim(),
                imagem: absoluteUrl(item.imagem),
                cor: String(item.cor || "").trim(),
                tamanho: String(item.tamanho || "").trim(),
                quantidade: Math.max(1, Math.floor(Number(item.quantidade) || 1)),
                preco_unitario: unitPrice,
                total_item: unitPrice === null
                    ? null
                    : unitPrice * Math.max(1, Math.floor(Number(item.quantidade) || 1))
            };
        });
        const totalPending = products.some(function(item) {
            return item.total_item === null;
        });
        const total = totalPending
            ? null
            : products.reduce(function(sum, item) { return sum + item.total_item; }, 0);

        const order = {
            id_pedido: gerarNumeroPedido(date),
            data_hora: date.toISOString(),
            moeda: "AOA",
            produtos: products,
            valor_total: total,
            total_pendente: totalPending,
            cidade: String(details.cidade || "").trim(),
            localizacao: String(details.localizacao || "").trim(),
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
            valor_total: order.valor_total,
            pagamento: {
                iban: CONFIG.iban || "A confirmar com a FRAN7",
                multicaixa_express: CONFIG.multicaixaExpress || "A confirmar com a FRAN7"
            },
            email_apoio: CONFIG.supportEmail || "fran7officiall@gmail.com",
            nota: "Documento processado por computador. Documento de pedido; não substitui fatura fiscal."
        };
        return order;
    }

    async function guardarNoPocketBase(order) {
        const baseUrl = String(CONFIG.pocketBaseUrl || "").replace(/\/+$/, "");
        const collection = encodeURIComponent(CONFIG.collectionName || "encomendas");
        if (!baseUrl) {
            throw new Error("Configura FRAN7_CHECKOUT_CONFIG.pocketBaseUrl antes de aceitar encomendas.");
        }

        const response = await fetch(
            baseUrl + "/api/collections/" + collection + "/records",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order)
            }
        );
        const result = await response.json().catch(function() { return {}; });
        if (!response.ok) {
            const message = result.message || "O PocketBase recusou o registo do pedido.";
            throw new Error(message);
        }
        return result;
    }

    function guardarPedidoLocal(order) {
        try {
            const current = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
            const orders = Array.isArray(current) ? current : [];
            orders.push(order);
            localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        } catch (error) {
            console.warn("Não foi possível guardar uma cópia local do pedido.", error);
        }
    }

    function carregarJsPdf() {
        if (window.jspdf && window.jspdf.jsPDF) {
            return Promise.resolve(window.jspdf.jsPDF);
        }
        if (window.fran7JsPdfPromise) {
            return window.fran7JsPdfPromise;
        }

        window.fran7JsPdfPromise = new Promise(function(resolve, reject) {
            const script = document.createElement("script");
            script.src = PDF_LIBRARY_URL;
            script.async = true;
            script.onload = function() {
                if (window.jspdf && window.jspdf.jsPDF) {
                    resolve(window.jspdf.jsPDF);
                } else {
                    reject(new Error("A biblioteca jsPDF não ficou disponível."));
                }
            };
            script.onerror = function() {
                reject(new Error("Não foi possível carregar jsPDF."));
            };
            document.head.appendChild(script);
        });
        return window.fran7JsPdfPromise;
    }

    function carregarLogotipo() {
        return new Promise(function(resolve) {
            if (!CONFIG.logoUrl) {
                resolve("");
                return;
            }
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
        const usableWidth = right - left;
        const dateText = new Date(order.data_hora).toLocaleString("pt-AO");
        const formatPrice = function(price) {
            return price === null ? "A confirmar" : formatAmount(price);
        };

        function drawHeader() {
            if (logo) {
                doc.addImage(logo, "PNG", left, 13, 22, 18);
            }
            const titleX = logo ? left + 28 : left;
            doc.setTextColor(24, 24, 24);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.text(CONFIG.brandName || "FRAN7", titleX, 20);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(CONFIG.slogan || "Grief & Glory", titleX, 26);
            doc.setDrawColor(210, 210, 210);
            doc.line(left, 36, right, 36);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.text("FATURA / PEDIDO", left, 46);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("N.º " + order.id_pedido, right, 45, { align: "right" });
            doc.text("Data: " + dateText, right, 51, { align: "right" });
        }

        function drawTableHeader(y) {
            doc.setFillColor(30, 30, 30);
            doc.rect(left, y, usableWidth, 9, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text("PRODUTO", left + 3, y + 6);
            doc.text("QTD.", 116, y + 6, { align: "right" });
            doc.text("PREÇO UNITÁRIO", 153, y + 6, { align: "right" });
            doc.text("TOTAL (AOA)", right - 3, y + 6, { align: "right" });
            doc.setTextColor(35, 35, 35);
            doc.setFont("helvetica", "normal");
            return y + 9;
        }

        drawHeader();
        let y = drawTableHeader(62);
        doc.setFontSize(8.5);
        order.produtos.forEach(function(item) {
            const variant = [item.cor && "Cor: " + item.cor, item.tamanho && "Tamanho: " + item.tamanho]
                .filter(Boolean).join(" | ");
            const productText = item.nome + (variant ? " (" + variant + ")" : "");
            const lines = doc.splitTextToSize(productText, 74);
            const rowHeight = Math.max(12, lines.length * 4 + 5);
            if (y + rowHeight > pageHeight - 36) {
                doc.addPage();
                drawHeader();
                y = drawTableHeader(62);
            }
            doc.setDrawColor(225, 225, 225);
            doc.line(left, y + rowHeight, right, y + rowHeight);
            doc.text(lines, left + 3, y + 6);
            doc.text(String(item.quantidade), 116, y + 6, { align: "right" });
            doc.text(formatPrice(item.preco_unitario), 153, y + 6, { align: "right" });
            doc.text(formatPrice(item.total_item), right - 3, y + 6, { align: "right" });
            y += rowHeight;
        });

        y += 9;
        if (y > pageHeight - 72) {
            doc.addPage();
            drawHeader();
            y = 56;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("TOTAL", 128, y, { align: "right" });
        doc.text(formatPrice(order.valor_total), right, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        y += 12;
        doc.text("Pagamento", left, y);
        doc.setFontSize(8.5);
        doc.text("IBAN: " + (CONFIG.iban || "A confirmar com a FRAN7"), left, y + 6);
        doc.text("Multicaixa Express: " + (CONFIG.multicaixaExpress || "A confirmar com a FRAN7"), left, y + 12);
        doc.text("Apoio: " + (CONFIG.supportEmail || "fran7officiall@gmail.com"), left, y + 18);

        const noteY = Math.min(y + 31, pageHeight - 20);
        doc.setDrawColor(210, 210, 210);
        doc.line(left, noteY - 5, right, noteY - 5);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Documento processado por computador. Documento de pedido; não substitui fatura fiscal.", left, noteY);
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
                " | total: " + formatAmount(item.total_item) +
                (item.imagem ? " | imagem: " + item.imagem : ""));
        });
        lines.push("Total indicado: " + formatAmount(order.valor_total));
        lines.push("Cidade: " + order.cidade);
        lines.push("Localização: " + order.localizacao);
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
        }

        const url = "https://wa.me/" + encodeURIComponent(CONFIG.whatsappNumber || "244973560521") +
            "?text=" + encodeURIComponent(construirMensagem(order));
        if (whatsappWindow && !whatsappWindow.closed) {
            whatsappWindow.location.href = url;
        } else {
            window.location.href = url;
        }
        return { order: order, pdfGerado: pdfGerado };
    }

    function csvCell(value) {
        let text = value === null || value === undefined ? "" : String(value);
        if (/^[=+@\-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function exportOrders(format) {
        const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
        if (!Array.isArray(orders) || !orders.length) {
            throw new Error("Não existem pedidos guardados neste navegador para exportar.");
        }
        const type = format === "json" ? "json" : "csv";
        let content;
        let mime;
        if (type === "json") {
            content = JSON.stringify(orders, null, 2);
            mime = "application/json;charset=utf-8";
        } else {
            const columns = ["id_pedido", "data_hora", "nome", "imagem", "cor", "tamanho", "quantidade", "preco_unitario", "total_item", "valor_total", "moeda", "estado"];
            const rows = [columns.join(",")];
            orders.forEach(function(order) {
                order.produtos.forEach(function(item) {
                    rows.push([
                        order.id_pedido, order.data_hora, item.nome, item.imagem, item.cor,
                        item.tamanho, item.quantidade, item.preco_unitario, item.total_item,
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
        finalize: finalizar,
        exportOrders: exportOrders
    };
})();
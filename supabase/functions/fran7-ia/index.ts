const allowedOrigins = new Set([
    "https://fran7gg.github.io",
]);

function getCorsHeaders(request: Request) {
    const origin = request.headers.get("Origin") || "";
    const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const allowedOrigin = allowedOrigins.has(origin) || localOrigin ? origin : "";
    return {
        ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Expose-Headers": "Retry-After",
        "Vary": "Origin",
    };
}

function normalizarTexto(texto: string) {
    return texto
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function responderLocalmente(mensagem: string, history: Array<{ role: string; content: string }>) {
    const texto = normalizarTexto(mensagem);
    const contexto = history.map((item) => normalizarTexto(item.content)).join(" ") + " " + texto;

    if (/\b(oi|ola|bom dia|boa tarde|boa noite|hello|hey)\b/.test(texto)) {
        return "Olá! Sou a assistente da FRAN7. Posso ajudar a escolher um modelo, confirmar preços e orientar o pedido. O que procura hoje?";
    }
    if (/\b(contato|contacto|whatsapp|email|instagram|telefone|falar com)\b/.test(texto)) {
        return "Pode falar diretamente com a equipa pelo WhatsApp +244 973 560 521, pelo e-mail fran7officiall@gmail.com ou no Instagram @fran7.official.";
    }
    if (/\b(catalogo|catalogo completo|todos os produtos|todos produtos|quais produtos|que produtos|o que vende|o que tem)\b/.test(texto)) {
        return "Na FRAN7 encontra T-shirts, bonés, conjunto feminino, peças infantis e FRAN7 Performance. Os modelos confirmados são Modelo 01 a 11.000 Kz, Modelo 02 a 7.000 Kz, Modelo 03 a 7.000 Kz e Modelo 04 a 8.500 Kz. Outros modelos e meias estão disponíveis para consulta de preço.";
    }
    if (/\b(modelo|produto|roupa|camisola|t shirt|blusa|bone|chapeu|meias|conjunto|infantil|crianca)\b/.test(texto) &&
        /\b(recomenda|aconselha|escolhe|ideia|gostaria|procura|procuro|qual|melhor)\b/.test(texto)) {
        return "Posso ajudar pela ocasião e pelo estilo. Para um visual simples e versátil, o Modelo FRAN7 02 ou 03 são boas opções. Se preferir a peça mais premium do catálogo confirmado, o Modelo 01 está a 11.000 Kz. Quer algo casual, desportivo ou formal?";
    }
    const modelo = contexto.match(/\b(?:modelo\s*(?:fran7\s*)?|t shirt fran7)\s*(0?[1-9]|1[0-2])\b/);
    if (modelo) {
        const numero = String(Number(modelo[1]));
        const precoConfirmado: Record<string, string> = {
            "1": "11.000 Kz",
            "2": "7.000 Kz",
            "3": "7.000 Kz",
            "4": "8.500 Kz",
        };
        const preco = precoConfirmado[numero];
        if (preco) {
            return `O Modelo FRAN7 ${numero.padStart(2, "0")} custa ${preco}. Confirme a disponibilidade de cor e tamanho antes de finalizar, pois o stock pode variar.`;
        }
        return `O Modelo FRAN7 ${numero.padStart(2, "0")} está no catálogo, mas o preço não está confirmado aqui. Consulte a página do produto ou fale conosco para confirmar preço, tamanho e disponibilidade.`;
    }
    if (/\b(preco|quanto custa|valor|barato|caro|custam)\b/.test(texto)) {
        return "Os preços confirmados são: Modelo 01 — 11.000 Kz; Modelo 02 — 7.000 Kz; Modelo 03 — 7.000 Kz; Modelo 04 — 8.500 Kz. Para outros modelos, meias e peças infantis, o preço ou tamanho deve ser confirmado pela equipa.";
    }
    if (/\b(tamanho|size|medida|serve|vestir|xic|xl|meias|bone)\b/.test(texto)) {
        return "Use a tabela de tamanho da página do produto e confirme as medidas antes de adicionar à sacola. Meias e chapéus podem usar tamanho X no pedido. O stock real pode variar por cor e tamanho.";
    }
    if (/\b(cor|cores|preto|castanho|bege|cinza)\b/.test(texto)) {
        return "O Modelo 01 pode estar disponível nas cores preto, castanho, bege e cinza; o Boné Modelo 2 aparece em castanho e cinza. A cor e o stock final devem ser confirmados na variante escolhida.";
    }
    if (/\b(stock|disponivel|disponibilidade|tem em|existencias|esgotado)\b/.test(texto)) {
        return "A disponibilidade depende da cor e do tamanho. Escolha a variante no produto e confirme o indicador de stock antes de adicionar à sacola. Se não tiver certeza, a equipa pode confirmar pelo WhatsApp.";
    }
    if (/\b(sacola|carrinho|adicionar|adiciono|comprar|compra)\b/.test(texto)) {
        return "Abra o produto, escolha cor e tamanho e selecione “Adicionar à sacola”. Confirme a quantidade antes de continuar. Para concluir, a encomenda é enviada pela sacola ou pelo WhatsApp com cidade e localização.";
    }
    if (/\b(pedido|encomenda|finalizar|pagamento|pagar|envio|entrega|prazo|cidade|localizacao)\b/.test(texto)) {
        return "No pedido são solicitados produto, quantidade, cor, tamanho, cidade e localização. A encomenda é confirmada pelo WhatsApp. Como o prazo e a entrega dependem da localização e do método disponível, confirme esses detalhes com a equipa antes de pagar.";
    }
    if (/\b(negocio|empreendedor|venda|publicidade|marketing|cliente|atendimento|desconto|promocao)\b/.test(texto)) {
        return "Uma boa resposta de vendas deve ser clara, mostrar benefício e terminar com uma pergunta simples. Exemplo: destaque a qualidade da peça, confirme tamanho e cor, apresente o preço e pergunte: “Prefere receber via Instagram ou WhatsApp?”";
    }
    if (/\b(obrigado|obrigada|valeu|ajuda muito)\b/.test(texto)) {
        return "De nada! Posso continuar a ajudar com produtos, tamanhos, cores, sacola ou encomendas.";
    }

    return "Posso ajudar com o catálogo da FRAN7, modelos, preços, tamanhos, cores, sacola e encomendas. Diz-me o que procura e eu indico o próximo passo. Para entrega, pagamento ou disponibilidade especial, confirme esses detalhes com a equipa.";
}

function jsonResponse(
    request: Request,
    body: Record<string, unknown>,
    status = 200,
    extraHeaders: Record<string, string> = {},
) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...getCorsHeaders(request),
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...extraHeaders,
        },
    });
}

function getClientIp(request: Request) {
    const directIp = request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-real-ip");
    if (directIp?.trim()) {
        return directIp.trim();
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const forwardedIps = forwardedFor?.split(",").map((ip) => ip.trim()).filter(Boolean);
    return forwardedIps?.at(-1) || "";
}

async function hashClientIp(ip: string, secret: string) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const digest = new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip)),
    );
    return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verificarRateLimit(request: Request) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientIp = getClientIp(request);

    if (!supabaseUrl || !serviceRoleKey || !clientIp) {
        console.error("FRAN7 AI: não foi possível inicializar a proteção de rate limit.");
        return { allowed: false, unavailable: true, retryAfter: 0 };
    }

    try {
        const clientHash = await hashClientIp(clientIp, serviceRoleKey);
        const response = await fetch(
            supabaseUrl.replace(/\/+$/, "") + "/rest/v1/rpc/fran7_check_ai_rate_limit",
            {
                method: "POST",
                headers: {
                    "apikey": serviceRoleKey,
                    "Authorization": "Bearer " + serviceRoleKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ p_client_hash: clientHash }),
            },
        );

        if (!response.ok) {
            console.error("FRAN7 AI: a base de dados recusou a verificação de rate limit.", response.status);
            return { allowed: false, unavailable: true, retryAfter: 0 };
        }

        const result: unknown = await response.json();
        const decision = Array.isArray(result) ? result[0] : null;
        if (!decision || typeof decision.is_allowed !== "boolean") {
            console.error("FRAN7 AI: resposta inválida do serviço de rate limit.");
            return { allowed: false, unavailable: true, retryAfter: 0 };
        }

        return {
            allowed: decision.is_allowed,
            unavailable: false,
            retryAfter: Number.isInteger(decision.retry_after_seconds)
                ? Math.max(1, decision.retry_after_seconds)
                : 60,
        };
    } catch (error) {
        console.error("FRAN7 AI: falhou a verificação de rate limit.", error);
        return { allowed: false, unavailable: true, retryAfter: 0 };
    }
}

Deno.serve(async (request: Request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: getCorsHeaders(request) });
    }

    if (request.method !== "POST") {
        return jsonResponse(request, { error: "Método não permitido." }, 405);
    }

    const rateLimit = await verificarRateLimit(request);
    if (rateLimit.unavailable) {
        return jsonResponse(request, { error: "A proteção da IA está temporariamente indisponível. Tenta novamente mais tarde." }, 503);
    }
    if (!rateLimit.allowed) {
        return jsonResponse(request, {
            error: "Atingiste o limite temporário de pedidos à FRAN7 AI.",
            retryAfter: rateLimit.retryAfter,
        }, 429, { "Retry-After": String(rateLimit.retryAfter) });
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse(request, { error: "O pedido não contém JSON válido." }, 400);
    }

    if (!payload || typeof payload !== "object") {
        return jsonResponse(request, { error: "O formato do pedido é inválido." }, 400);
    }

    const body = payload as {
        mensagem?: unknown;
        historico?: unknown;
    };
    const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim() : "";

    if (!mensagem || mensagem.length > 2000) {
        return jsonResponse(request, { error: "Escreve uma mensagem com até 2000 caracteres." }, 400);
    }

    const rawHistory = Array.isArray(body.historico) ? body.historico : [];
    if (rawHistory.length > 6) {
        return jsonResponse(request, { error: "O histórico da conversa é demasiado longo." }, 400);
    }

    const history = [];
    for (const item of rawHistory) {
        if (!item || typeof item !== "object") {
            return jsonResponse(request, { error: "Uma mensagem do histórico é inválida." }, 400);
        }
        const entry = item as { role?: unknown; content?: unknown };
        if ((entry.role !== "user" && entry.role !== "assistant") ||
            typeof entry.content !== "string" ||
            !entry.content.trim() ||
            entry.content.length > 1200) {
            return jsonResponse(request, { error: "Uma mensagem do histórico é inválida." }, 400);
        }
        history.push({ role: entry.role, content: entry.content.trim() });
    }

    const reply = responderLocalmente(mensagem, history);
    return jsonResponse(request, {
        reply,
        modo: "local_gratuito",
    });
});

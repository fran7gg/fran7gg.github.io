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
    const ultimo = history.at(-1)?.content || "";
    const falouProduto = /\b(modelo|camisola|t shirt|roupa|bone|blusa|conjunto|meias)\b/.test(contexto);

    if (/^(oi|ola|ola tudo bem|hey|hello)[!?., ]*$/.test(texto)) {
        return /tudo bem/.test(texto)
            ? "Estou bem, obrigado! Posso ajudar a escolher uma peça, confirmar preços ou orientar o seu pedido. Como está a correr o seu dia?"
            : "Olá! É um prazer falar consigo. Posso ajudar a escolher um modelo, comparar peças, entender tamanhos ou concluir uma encomenda. Como posso ajudar?";
    }
    if (/\b(estou bem|tudo bem|bem tambem|como vais|como estas)\b/.test(texto)) {
        return "Fico feliz em saber! Se quiser, podemos usar este momento para escolher uma peça que combine com o seu estilo ou para resolver uma dúvida sobre o pedido.";
    }
    if (/\b(suporte|atendente|agente|ajuda humana|ajuda dos trabalhadores|trabalhador|trabalhadores|funcionario|funcionarios|contato|contacto|whatsapp|email|instagram|telefone|falar com)\b/.test(texto)) {
        return "Já consigo os seus dados e a mensagem. Vou chamar um agente humano da FRAN7 para acompanhar o seu pedido.\n\nPode ainda falar connosco por estes 5 meios:\n• Site: https://fran7gg.github.io\n• WhatsApp: https://wa.me/244973560521\n• Instagram: https://instagram.com/fran7.official\n• Email: fran7officiall@gmail.com\n• Telefone: +244 973 560 521";
    }
    if (/\b(catalogo|todos os produtos|todos produtos|quais produtos|que produtos|o que vende|o que tem)\b/.test(texto)) {
        return "Na FRAN7 encontra T-shirts, bonés, conjuntos femininos, peças infantis e FRAN7 Performance. Preços confirmados: Modelo 01 — 11.000 Kz; Modelo 02 — 7.000 Kz; Modelo 03 — 7.000 Kz; Modelo 04 — 8.500 Kz. Quer ver opções casuais, desportivas ou conhecer um modelo específico?";
    }
    if (/\b(recomend(?:a|arias|aria|ar|ado|ada|amos|am)?|aconselha|escolhe|ideia|presente|melhor|sugere|combin)\b/.test(texto) && falouProduto) {
        const ocasiao = /\b(desportivo|treino|ginastica|performance)\b/.test(texto) ? "Para treino ou uso desportivo" : /\b(formal|trabalho|evento)\b/.test(texto) ? "Para uma ocasião mais formal" : "Para uso diário";
        return `${ocasiao}, eu começaria pelo Modelo 02 ou 03, ambos a 7.000 Kz: são versáteis e fáceis de combinar. Se procura um destaque premium, o Modelo 01 custa 11.000 Kz. Prefere algo discreto ou chamativo?`;
    }
    const modelo = contexto.match(/\b(?:modelo\s*(?:fran7\s*)?|t shirt fran7)\s*(0?[1-9]|1[0-2])\b/);
    if (modelo) {
        const numero = String(Number(modelo[1]));
        const precoConfirmado: Record<string, string> = { "1": "11.000 Kz", "2": "7.000 Kz", "3": "7.000 Kz", "4": "8.500 Kz" };
        const preco = precoConfirmado[numero];
        return preco
            ? `O Modelo FRAN7 ${numero.padStart(2, "0")} custa ${preco}. Confirme cor e tamanho na página antes de adicionar à sacola, porque o stock pode variar. O que gostaria de saber: cores, tamanho ou como comprar?`
            : `O Modelo FRAN7 ${numero.padStart(2, "0")} aparece no catálogo, mas o preço não está confirmado aqui. Confirme comigo a página atual: prefere saber o preço, tamanhos ou disponibilidade desta peça?`;
    }
    if (/\b(preco|quanto custa|valor|barato|caro|custam|orcamento)\b/.test(texto)) {
        return /\b(outro|modelo|tudo|catalogo)\b/.test(texto)
            ? "Os preços confirmados são Modelo 01 — 11.000 Kz; Modelo 02 — 7.000 Kz; Modelo 03 — 7.000 Kz; Modelo 04 — 8.500 Kz. Para os outros modelos, meias e infantis, consulte o número da peça ou peça à equipa o preço atual."
            : "Qual modelo lhe interessa? Diga o número — por exemplo “Modelo 02” — e eu informo o preço confirmado e explico as próximas opções.";
    }
    if (/\b(tamanho|size|medida|serve|vestir|xic|xl|meias|bone)\b/.test(texto)) {
        return /\b(peq|p | pequeno|s )/.test(texto)
            ? "Para confirmar o tamanho pequeno, use a tabela da página e compare o peito e o comprimento em centímetros. Se indicar sexo, altura e peso aproximados, posso sugerir o tamanho habitual — sem substituir a tabela da peça."
            : "Use a tabela de tamanho da página e compare o peito e o comprimento em centímetros. Meias e chapéus podem usar tamanho X no pedido. Qual a sua altura e peso aproximados para eu dar uma sugestão inicial?";
    }
    if (/\b(cor|cores|preto|castanho|bege|cinza|azul|branco|verde)\b/.test(texto)) {
        const anterior = /modelo 0?1|modelo 01/.test(contexto);
        return anterior
            ? "No Modelo 01 são apresentados preto, castanho, bege e cinza. Escolha a variante e confirme o stock da cor pretendida. Prefere combinar com peças claras ou escuras?"
            : "Posso ajudar a combinar cores. A disponibilidade real depende da variante; escolha o modelo primeiro e eu indico as opções publicadas e formas de combinação. Qual modelo pretende?";
    }
    if (/\b(stock|disponivel|disponibilidade|tem em|existencias|esgotado)\b/.test(texto)) {
        return "A disponibilidade é confirmada pela cor e pelo tamanho na página do produto. Se o botão não permitir a quantidade desejada, a variante está limitada ou esgotada. Diga-me o modelo para indicar o que pode verificar antes de comprar.";
    }
    if (/\b(sacola|carrinho|adicionar|adiciono|comprar|como compro|checkout)\b/.test(texto)) {
        return "Para comprar: abra o produto, escolha cor e tamanho, confirme a quantidade e adicione à sacola. Depois, finalize com cidade e localização. A confirmação final e o pagamento devem ser confirmados pela equipa. Diga o modelo que pretende para acompanhar o processo.";
    }
    if (/\b(pedido|encomenda|finalizar|pagamento|pagar|envio|entrega|prazo|cidade|localizacao)\b/.test(texto)) {
        return "O pedido reúne produto, quantidade, cor, tamanho, cidade e localização; a confirmação é feita pelo WhatsApp. Prazos e formas de entrega variam com o destino, por isso não invento valores. Qual cidade pretende e em que modelo está interessado?";
    }
    if (/\b(negocio|empreendedor|venda|publicidade|marketing|cliente|atendimento|desconto|promocao)\b/.test(texto)) {
        const publico = /\b(nas redes|instagram|facebook|whatsapp|loja)\b/.test(texto);
        return publico
            ? "Comece por uma imagem clara, uma frase de benefício e uma chamada para ação. Exemplo: “Vista identidade. Novo Modelo FRAN7 02 por 7.000 Kz — escolha cor e tamanho e fale connosco.” Depois faça apenas uma pergunta, como “Prefere preto ou castanho?”."
            : "Uma boa conversa de vendas segue quatro passos: acolher, entender a necessidade, recomendar uma opção concreta e pedir a próxima ação. Como está a ser o atendimento agora: apresentação de produtos, objeções de preço ou acompanhamento depois da compra?";
    }
    if (/\b(calcula|calculo|soma|multiplica|percentagem|quanto faz|times|mais)\b/.test(texto)) {
        const expressao = texto.match(/(\d+(?:\.\d+)?)\s*[x*+]\s*(\d+(?:\.\d+)?)/);
        if (expressao) {
            const operador = expressao[0].includes("+") ? "+" : "×";
            const a = Number(expressao[1]);
            const b = Number(expressao[2]);
            return `O resultado é ${operador === "+" ? a + b : a * b}. Se usar valores da compra, quero confirmar apenas se é quantidade, preço ou desconto.`;
        }
    }
    if (/\b(como escrever|redige|escreve|texto|mensagem|resposta|traduz)\b/.test(texto)) {
        return "Envie-me a mensagem ou a situação em poucas frases e diga o tom pretendido — formal, breve, amigável ou persuasivo. Posso então criar uma versão pronta para enviar ao cliente.";
    }
    if (/\b(triste|deprimido|ansioso|problema|preciso de ajuda|ajuda me)\b/.test(texto)) {
        return "Sinto que isto é importante para si. Posso falar consigo com calma e ajudar a organizar o próximo passo, mas não substituo apoio profissional. Quer contar o que aconteceu ou prefere começar por uma solução pequena para hoje?";
    }
    if (/\b(obrigado|obrigada|valeu|ajuda muito)\b/.test(texto)) {
        return "De nada — foi um prazer ajudar. Posso continuar a conversar sobre produtos, vendas, compras ou outro assunto em que queira ajuda.";
    }
    if (/\b(nao percebi|explica melhor|exemplo|exemplos|como assim|o que quer dizer)\b/.test(texto) && ultimo) {
        return `Posso simplificar. Diga-me o ponto específico que ficou confuso e eu explico passo a passo com um exemplo curto. A ideia anterior era: ${ultimo.slice(0, 180)}.`;
    }
    if (/\b(tudo bem\?|como estas\?|como vai|como voce esta)\b/.test(texto)) {
        return "Estou pronto para ajudar! Preferia falar sobre moda, a sua encomenda ou ajudar em outro assunto?";
    }
    if (/\b(nome|quem e|o que e fran7|quem criou|inventou)\b/.test(texto)) {
        return "Sou a assistente de conversação da FRAN7. Ajudo a explicar o catálogo, escolher peças, acompanhar o pedido e conversar sobre vendas. A minha identidade e respostas são simples e gratuitas; não invento stock, prazos ou pagamentos que não estejam confirmados.";
    }

    const breve = texto.length < 18;
    if (breve && /\b(sim|claro|ok|perfeito|exato|certamente|pode ser)\b/.test(texto)) {
        return "Ótimo. Prefere continuar com modelo, cor, tamanho, preço ou entrega?";
    }

    return "Entendi o seu assunto. Para responder com precisão, diga-me em uma frase o objetivo e a escolha disponível: por exemplo, modelo e orçamento; tamanho e altura; ou o tipo de encomenda que pretende. Posso ajudar com catálogo, compras, vendas e dúvidas gerais.";
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

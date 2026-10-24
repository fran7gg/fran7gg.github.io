(function() {
    "use strict";

    const pages = {
        informacoes: {
            kicker: "Apoio ao cliente",
            title: "Entregas e trocas",
            content: `
                <p>As entregas são organizadas após a confirmação da disponibilidade dos artigos, do endereço e dos detalhes do pedido. O prazo e o custo são comunicados antes da confirmação final.</p>
                <h2>Entregas em Luanda</h2>
                <p>Em Luanda, a entrega pode ser combinada para o endereço indicado ou para um ponto de encontro acordado com a FRAN7. A data estimada, a modalidade disponível e o respetivo custo dependem da localização e serão confirmados antes do envio.</p>
                <h2>Entregas para as demais províncias</h2>
                <p>Para outras províncias de Angola, o envio é combinado através de um serviço de transporte interprovincial disponível. O prazo de trânsito, o local de levantamento ou entrega e os custos variam conforme o destino e são informados antes da confirmação do pedido. Após o envio, a previsão pode depender também do serviço de transporte.</p>
                <h2>Trocas e devoluções</h2>
                <p>Os pedidos de troca ou devolução devem ser comunicados dentro do prazo legal aplicável, contado a partir da receção do artigo. A análise é feita nos termos da legislação de defesa do consumidor aplicável em Angola.</p>
                <p>Para a avaliação, o artigo deve estar por lavar, sem sinais de uso e com as etiquetas originais intactas. Estas condições não limitam os direitos que a legislação aplicável reconhece ao consumidor.</p>
                <h2>Contacto</h2>
                <p>Para tratar de entregas, trocas ou devoluções, contacta exclusivamente o e-mail oficial <a href="mailto:fran7officiall@gmail.com">fran7officiall@gmail.com</a>. Inclui o número ou a referência do pedido e uma descrição do assunto.</p>`
        },
        termos: {
            kicker: "Informações FRAN7",
            title: "Termos e condições",
            content: `
                <p>Estes termos regulam a consulta e a realização de encomendas de produtos FRAN7 através deste website. Ao enviar uma encomenda, o cliente confirma que reviu os artigos, as opções selecionadas e os dados fornecidos.</p>
                <h2>Propriedade intelectual</h2>
                <p>As marcas, o lema “Grief &amp; Glory”, os textos, fotografias, imagens, elementos gráficos, desenhos e demais conteúdos apresentados no website pertencem à FRAN7 ou são utilizados com autorização. Não é permitida a sua cópia, reprodução, distribuição, adaptação ou utilização comercial sem autorização prévia por escrito da FRAN7, salvo nos casos permitidos por lei.</p>
                <h2>Encomendas e confirmação de stock</h2>
                <p>Os artigos apresentados no website constituem uma oferta sujeita a confirmação de disponibilidade, tamanho, cor e demais características. O envio da sacola abre uma mensagem de pedido e não confirma, por si só, a aceitação da encomenda. A FRAN7 confirma os detalhes e a disponibilidade antes de concluir a compra.</p>
                <h2>Preços e pagamentos</h2>
                <p>Os preços são apresentados em Kwanzas angolanos (Kz). Quando um artigo indicar “Consultar”, o respetivo preço deve ser confirmado antes da compra. O total da sacola é indicativo até serem confirmados o stock, o preço final, os custos de entrega e as condições de pagamento.</p>
                <p>Antes da conclusão da compra, a FRAN7 comunica o valor final e os meios de pagamento disponíveis para a encomenda. O cliente deve verificar esses dados e manifestar a sua concordância antes de efetuar o pagamento. Qualquer alteração relevante ao pedido depende de confirmação e da disponibilidade dos artigos.</p>
                <h2>Disponibilidade do website e responsabilidade</h2>
                <p>A FRAN7 procura manter o website disponível e atualizado, mas não garante funcionamento contínuo ou sem erros. Podem ocorrer interrupções temporárias por manutenção, falhas técnicas, conectividade ou fatores fora do controlo razoável da FRAN7. Na medida permitida pela lei, a FRAN7 não responde por prejuízos causados exclusivamente por essas indisponibilidades temporárias, sem limitar os direitos obrigatórios do consumidor nem as responsabilidades que não possam ser excluídas por lei.</p>
                <h2>Contacto</h2>
                <p>Para questões sobre estes termos ou uma encomenda, contacta a FRAN7 exclusivamente pelo e-mail oficial <a href="mailto:fran7officiall@gmail.com">fran7officiall@gmail.com</a>.</p>`
        },
        privacidade: {
            kicker: "Informações FRAN7",
            title: "Privacidade",
            content: `
                <p class="fran7-info-note">Versão provisória — sujeita a validação pela marca antes da publicação.</p>
                <p>A FRAN7 valoriza a privacidade dos seus clientes e visitantes. Esta política explica que dados podem ser recolhidos, como são utilizados e quais são os direitos dos utilizadores.</p>
                <h2>Dados que recolhemos</h2>
                <p>Podemos recolher e-mail, telefone, dia e mês de nascimento, informações fornecidas voluntariamente nos formulários e dados técnicos necessários ao funcionamento do website.</p>
                <h2>Utilização e partilha</h2>
                <p>Os dados podem ser utilizados para gerir o cadastro, responder a pedidos, comunicar novidades quando autorizado, melhorar o website e cumprir obrigações legais. A FRAN7 não vende dados pessoais; a partilha ocorre apenas quando necessária ao serviço ou exigida por lei.</p>
                <h2>Consentimento, segurança e conservação</h2>
                <p>Os dados são tratados para as finalidades indicadas no cadastro e conservados pelo período necessário. São adotadas medidas técnicas e organizativas adequadas à sua proteção.</p>
                <h2>Direitos do utilizador</h2>
                <p>Podes pedir acesso, correção, atualização ou eliminação dos teus dados, bem como exercer os restantes direitos previstos na legislação aplicável.</p>
                <h2>Armazenamento no navegador e serviços externos</h2>
                <p>A sacola e os favoritos ficam guardados neste navegador. Os comentários e o nome escolhido para publicar são guardados na base de dados e ficam visíveis na loja. O registo e a entrada podem usar e-mail e palavra-passe ou Google; a entrada Google usa autenticação Google. WhatsApp, Instagram e YouTube são serviços externos com políticas próprias.</p>
                <h2>Contacto</h2>
                <p>Para esclarecer o tratamento dos teus dados ou solicitar uma remoção, escreve para <a href="mailto:fran7officiall@gmail.com">fran7officiall@gmail.com</a>.</p>`
        },
        sobre: {
            kicker: "Grief & Glory",
            title: "GRIEF & GLORY: A Origem da FRAN7",
            content: `
                <p>A FRAN7 transforma memória em propósito e propósito em legado. Cada peça representa a força de continuar, honrar as origens e construir o próprio caminho.</p>
                <h2>A nossa identidade</h2>
                <p>Grief & Glory traduz a origem da FRAN7: a dor que nos move e a glória que construímos, juntos, dentro e fora do campo.</p>
                <h2>A nossa comunidade</h2>
                <p>A FRAN7 cresce com as pessoas que usam, acompanham e recomendam a marca. Procuramos ouvir o feedback dos clientes e continuar a apresentar modelos para diferentes estilos e idades.</p>
                <p><strong>FRAN7 — Grief & Glory. Fundada em 17.04.2026 em memória e honra ao legado.</strong></p>
                <div class="fran7-info-actions">
                    <a class="fran7-info-button" href="#" data-info-page="feedback">Enviar feedback</a>
                    <a class="fran7-info-button" href="#" data-info-page="parcerias">Conhecer parcerias</a>
                </div>`
        },
        parcerias: {
            kicker: "Juntos, damos mais voz às ideias",
            title: "Parcerias",
            content: `
                <p>A FRAN7 valoriza projetos que partilham energia, criatividade e vontade de inspirar.</p>
                <h2>Parceiro FRAN7 — Vozes Visionárias Podcast</h2>
                <p>Conhece o podcast e acompanha as conversas no canal oficial do YouTube.</p>
                <div class="fran7-info-actions">
                    <a class="fran7-info-button" href="https://youtube.com/@adelinosabino-ez5zp?si=zctakTPyO9j1VUCS" target="_blank" rel="noopener noreferrer">Ver no YouTube</a>
                </div>
                <h2>Queres propor uma parceria?</h2>
                <p>Envia a tua proposta à equipa FRAN7 para conversarmos sobre a ideia.</p>
                <a class="fran7-info-button" href="https://wa.me/244973560521?text=Ol%C3%A1%20FRAN7!%20Gostaria%20de%20apresentar%20uma%20proposta%20de%20parceria." target="_blank" rel="noopener noreferrer">Falar com a FRAN7</a>`
        },
        feedback: {
            kicker: "A tua opinião conta",
            title: "Feedback",
            content: `
                <p>Ajuda-nos a melhorar a FRAN7. Envia uma sugestão, partilha a tua experiência ou conta-nos o que gostarias de ver na loja.</p>
                <form class="fran7-info-form" id="fran7FeedbackForm">
                    <label>Nome (opcional)<input name="nome" type="text" autocomplete="name" placeholder="Como te chamas?"></label>
                    <label>A tua mensagem<textarea name="mensagem" required placeholder="Escreve aqui o teu feedback..."></textarea></label>
                    <p>Ao continuar, o WhatsApp abre com a mensagem pronta para reveres e enviares à FRAN7.</p>
                    <button type="submit">Enviar feedback</button>
                </form>`
        }
    };

    const overlay = document.createElement("div");
    overlay.className = "fran7-info-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="fran7-info-dialog" role="dialog" aria-modal="true" aria-labelledby="fran7InfoTitle">
            <button class="fran7-info-close" type="button" aria-label="Fechar informações">×</button>
            <p class="fran7-info-kicker"></p>
            <h2 class="fran7-info-title" id="fran7InfoTitle"></h2>
            <div class="fran7-info-content"></div>
        </section>`;
    document.body.appendChild(overlay);

    const dialog = overlay.querySelector(".fran7-info-dialog");
    const closeButton = overlay.querySelector(".fran7-info-close");
    const kicker = overlay.querySelector(".fran7-info-kicker");
    const title = overlay.querySelector(".fran7-info-title");
    const content = overlay.querySelector(".fran7-info-content");
    let previousFocus = null;

    function openPage(key, opener) {
        const page = pages[key];
        if (!page) {
            console.error("Não existe conteúdo para a informação FRAN7:", key);
            return;
        }

        if (overlay.hidden) {
            previousFocus = opener || document.activeElement;
        }
        kicker.textContent = page.kicker;
        title.textContent = page.title;
        content.innerHTML = page.content;
        overlay.hidden = false;
        document.body.style.overflow = "hidden";
        dialog.scrollTop = 0;
        closeButton.focus();
    }

    function closePage() {
        overlay.hidden = true;
        document.body.style.overflow = "";
        if (previousFocus && typeof previousFocus.focus === "function") {
            previousFocus.focus();
        }
    }

    document.addEventListener("click", function(event) {
        const link = event.target.closest("[data-info-page]");
        if (!link) return;

        const key = link.dataset.infoPage;
        if (!pages[key]) return;
        event.preventDefault();
        openPage(key, link);
    });

    content.addEventListener("submit", function(event) {
        const form = event.target.closest("#fran7FeedbackForm");
        if (!form) return;
        event.preventDefault();

        const nome = form.elements.nome.value.trim();
        const mensagem = form.elements.mensagem.value.trim();
        if (!mensagem) {
            form.elements.mensagem.focus();
            return;
        }

        const texto = [
            "Olá FRAN7! Quero deixar o meu feedback.",
            nome ? "- Nome: " + nome : "",
            "- Mensagem: " + mensagem
        ].filter(Boolean).join("\n");

        window.open(
            "https://wa.me/244973560521?text=" + encodeURIComponent(texto),
            "_blank",
            "noopener,noreferrer"
        );
    });

    closeButton.addEventListener("click", closePage);
    overlay.addEventListener("click", function(event) {
        if (event.target === overlay) closePage();
    });
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && !overlay.hidden) closePage();
    });
})();

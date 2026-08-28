/* =========================================================
   PAINEL DE MONITORAMENTO DE RÁDIO
   POSTOS GRACIOSA
   APP.JS
========================================================= */


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const CONFIG = {

    /* URL DO GOOGLE APPS SCRIPT
       COLOCAR A URL DA IMPLANTAÇÃO AQUI
    */

    API_URL:
        "",


    /* TEMPO ENTRE ATUALIZAÇÕES AUTOMÁTICAS */

    INTERVALO_ATUALIZACAO:
        60000,


    /* CHAVE UTILIZADA NO SISTEMA */

    CHAVE:
        "GRACIOSA_RADIO_2026",


    /* LIMITE DO HISTÓRICO EXIBIDO */

    LIMITE_HISTORICO:
        100,


    /* STORAGE LOCAL DO PAINEL */

    STORAGE:
        "painel_monitoramento_radio_v1"

};



/* =========================================================
   POSTOS
========================================================= */

const POSTOS = [

    {
        codigo:
            "graciosa",

        nome:
            "POSTO GRACIOSA",

        icone:
            "⛽"
    },


    {
        codigo:
            "fatima",

        nome:
            "POSTO FÁTIMA",

        icone:
            "⛽"
    },


    {
        codigo:
            "jariva",

        nome:
            "POSTO JARIVA",

        icone:
            "⛽"
    },


    {
        codigo:
            "bemer",

        nome:
            "POSTO BEMER",

        icone:
            "⛽"
    },


    {
        codigo:
            "graciosa-v",

        nome:
            "POSTO GRACIOSA V",

        icone:
            "⛽"
    },


    {
        codigo:
            "pirai",

        nome:
            "POSTO PIRAÍ",

        icone:
            "⛽"
    }

];



/* =========================================================
   ESTADO DO SISTEMA
========================================================= */

let dadosPostos = {};

let historicos = {};

let ultimaAtualizacao = null;

let atualizando = false;



/* =========================================================
   INICIALIZAR ESTADO
========================================================= */

function criarEstadoInicial() {

    POSTOS.forEach(

        posto => {

            if (
                !dadosPostos[
                    posto.codigo
                ]
            ) {

                dadosPostos[
                    posto.codigo
                ] = {

                    codigo:
                        posto.codigo,

                    nome:
                        posto.nome,

                    status:
                        "verificando",

                    evento:
                        "Aguardando atualização",

                    dataHora:
                        "--/--/---- às --:--:--",

                    timestamp:
                        0

                };

            }


            if (
                !historicos[
                    posto.codigo
                ]
            ) {

                historicos[
                    posto.codigo
                ] = [];

            }

        }

    );

}



/* =========================================================
   STORAGE
========================================================= */

function carregarStorage() {

    try {

        const dados =
            localStorage.getItem(
                CONFIG.STORAGE
            );


        if (
            !dados
        ) {

            criarEstadoInicial();

            return;

        }


        const armazenado =
            JSON.parse(
                dados
            );


        if (
            armazenado.postos
        ) {

            dadosPostos =
                armazenado.postos;

        }


        if (
            armazenado.historicos
        ) {

            historicos =
                armazenado.historicos;

        }

    }

    catch (
        erro
    ) {

        console.warn(
            "Não foi possível carregar o armazenamento local.",
            erro
        );


        criarEstadoInicial();

    }

}



/* =========================================================
   SALVAR STORAGE
========================================================= */

function salvarStorage() {

    try {

        localStorage.setItem(

            CONFIG.STORAGE,

            JSON.stringify({

                postos:
                    dadosPostos,

                historicos:
                    historicos,

                ultimaAtualizacao:
                    ultimaAtualizacao

            })

        );

    }

    catch (
        erro
    ) {

        console.warn(
            "Não foi possível salvar o armazenamento local.",
            erro
        );

    }

}



/* =========================================================
   ELEMENTOS
========================================================= */

function elemento(
    id
) {

    return document.getElementById(
        id
    );

}



/* =========================================================
   RELÓGIO
========================================================= */

function atualizarRelogio() {

    const agora =
        new Date();


    const clock =
        elemento(
            "clock"
        );


    const date =
        elemento(
            "date"
        );


    if (
        clock
    ) {

        clock.textContent =
            agora.toLocaleTimeString(
                "pt-BR"
            );

    }


    if (
        date
    ) {

        date.textContent =
            agora.toLocaleDateString(
                "pt-BR",
                {

                    weekday:
                        "long",

                    day:
                        "2-digit",

                    month:
                        "long",

                    year:
                        "numeric"

                }
            );

    }

}



/* =========================================================
   DATA/HORA
========================================================= */

function obterDataHora() {

    const agora =
        new Date();


    return (

        agora.toLocaleDateString(
            "pt-BR"
        )

        +

        " às "

        +

        agora.toLocaleTimeString(
            "pt-BR"
        )

    );

}



/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatarDataHora(
    timestamp
) {

    if (
        !timestamp
    ) {

        return "--/--/---- às --:--:--";

    }


    const data =
        new Date(
            Number(
                timestamp
            )
        );


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return "--/--/---- às --:--:--";

    }


    return (

        data.toLocaleDateString(
            "pt-BR"
        )

        +

        " às "

        +

        data.toLocaleTimeString(
            "pt-BR"
        )

    );

}



/* =========================================================
   NORMALIZAR STATUS
========================================================= */

function normalizarStatus(
    status
) {

    const valor =
        String(
            status || ""
        )
        .trim()
        .toLowerCase();


    if (
        valor ===
        "online"
    ) {

        return "online";

    }


    if (
        valor ===
        "ativo"
    ) {

        return "online";

    }


    if (
        valor ===
        "playing"
    ) {

        return "online";

    }


    if (
        valor ===
        "offline"
    ) {

        return "offline";

    }


    if (
        valor ===
        "pausado"
    ) {

        return "pausado";

    }


    if (
        valor ===
        "paused"
    ) {

        return "pausado";

    }


    if (
        valor ===
        "verificando"
    ) {

        return "verificando";

    }


    if (
        valor ===
        "waiting"
    ) {

        return "verificando";

    }


    return "verificando";

}



/* =========================================================
   TEXTO DO STATUS
========================================================= */

function textoStatus(
    status
) {

    switch (
        normalizarStatus(
            status
        )
    ) {

        case "online":

            return "ATIVO";


        case "pausado":

            return "PAUSADO";


        case "offline":

            return "OFFLINE";


        default:

            return "VERIFICANDO";

    }

}



/* =========================================================
   ÍCONE DO STATUS
========================================================= */

function iconeStatus(
    status
) {

    switch (
        normalizarStatus(
            status
        )
    ) {

        case "online":

            return "🟢";


        case "pausado":

            return "🟡";


        case "offline":

            return "🔴";


        default:

            return "🔵";

    }

}



/* =========================================================
   CLASSE DO STATUS
========================================================= */

function classeStatus(
    status
) {

    switch (
        normalizarStatus(
            status
        )
    ) {

        case "online":

            return "online";


        case "pausado":

            return "paused";


        case "offline":

            return "offline";


        default:

            return "checking";

    }

}



/* =========================================================
   RENDERIZAR POSTOS
========================================================= */

function renderizarPostos() {

    const container =
        elemento(
            "postosGrid"
        );


    if (
        !container
    ) {

        console.warn(
            "Elemento #postosGrid não encontrado."
        );

        return;

    }


    container.innerHTML =
        POSTOS
        .map(

            posto => {

                const dados =
                    dadosPostos[
                        posto.codigo
                    ];


                const status =
                    normalizarStatus(
                        dados.status
                    );


                const ultimoEvento =
                    dados.evento ||
                    "Nenhum evento registrado.";


                const dataHora =
                    dados.dataHora ||
                    "--/--/---- às --:--:--";


                return `

                    <article
                        class="station-card ${classeStatus(status)}"
                        data-posto="${posto.codigo}"
                    >


                        <div class="station-card-header">


                            <div class="station-title-area">


                                <div class="station-icon">
                                    ${posto.icone}
                                </div>


                                <div>

                                    <div class="station-name">
                                        ${posto.nome}
                                    </div>


                                    <div class="station-code">
                                        Código: ${posto.codigo}
                                    </div>

                                </div>


                            </div>


                            <div class="station-status ${classeStatus(status)}">

                                <span class="status-dot"></span>

                                ${textoStatus(status)}

                            </div>


                        </div>



                        <div class="station-content">


                            <div class="activity">


                                <div class="activity-label">
                                    ATIVIDADE ATUAL
                                </div>


                                <div class="activity-value">
                                    ${iconeStatus(status)}
                                    ${escapeHTML(ultimoEvento)}
                                </div>


                            </div>



                            <div class="last-update">


                                <div class="activity-label">
                                    ÚLTIMA ATUALIZAÇÃO
                                </div>


                                <div class="last-update-value">
                                    ${escapeHTML(dataHora)}
                                </div>


                            </div>


                        </div>



                        <div class="station-card-footer">


                            <button
                                type="button"
                                class="history-button"
                                data-action="history"
                                data-posto="${posto.codigo}"
                            >

                                📋

                                Histórico

                            </button>


                            <button
                                type="button"
                                class="refresh-station-button"
                                data-action="refresh"
                                data-posto="${posto.codigo}"
                            >

                                ↻

                                Atualizar

                            </button>


                        </div>


                    </article>

                `;

            }

        )
        .join("");


    configurarBotoesPostos();

}



/* =========================================================
   CONFIGURAR BOTÕES DOS POSTOS
========================================================= */

function configurarBotoesPostos() {

    const botoes =
        document.querySelectorAll(
            "[data-action]"
        );


    botoes.forEach(

        botao => {

            botao.addEventListener(

                "click",

                function () {

                    const acao =
                        this.dataset.action;


                    const codigo =
                        this.dataset.posto;


                    if (
                        acao ===
                        "history"
                    ) {

                        abrirHistorico(
                            codigo
                        );

                    }


                    if (
                        acao ===
                        "refresh"
                    ) {

                        atualizarPosto(
                            codigo
                        );

                    }

                }

            );

        }

    );

}



/* =========================================================
   ATUALIZAR UM POSTO
========================================================= */

async function atualizarPosto(
    codigo
) {

    const posto =
        POSTOS.find(
            item =>
                item.codigo ===
                codigo
        );


    if (
        !posto
    ) {

        return;

    }


    mostrarStatusMensagem(
        "Consultando " +
        posto.nome +
        "..."
    );


    const botao =
        document.querySelector(

            `[data-action="refresh"][data-posto="${codigo}"]`

        );


    if (
        botao
    ) {

        botao.disabled =
            true;

        botao.classList.add(
            "loading"
        );

    }


    try {

        const resultado =
            await consultarAPI(
                codigo
            );


        if (
            resultado
        ) {

            aplicarResultadoPosto(
                codigo,
                resultado,
                true
            );

        }

        else {

            mostrarStatusMensagem(
                "Não foi possível consultar o status atual."
            );

        }

    }

    catch (
        erro
    ) {

        console.error(
            erro
        );


        mostrarStatusMensagem(
            "Erro ao consultar o posto."
        );

    }


    finally {

        if (
            botao
        ) {

            botao.disabled =
                false;

            botao.classList.remove(
                "loading"
            );

        }

    }

}



/* =========================================================
   ATUALIZAR TODOS
========================================================= */

async function atualizarTodos() {

    if (
        atualizando
    ) {

        return;

    }


    atualizando =
        true;


    const botao =
        elemento(
            "btnAtualizar"
        );


    if (
        botao
    ) {

        botao.disabled =
            true;

        botao.classList.add(
            "loading"
        );

    }


    mostrarStatusMensagem(
        "Atualizando status dos 6 postos..."
    );


    try {

        const resultado =
            await consultarAPI();


        if (
            resultado &&
            Array.isArray(
                resultado.postos
            )
        ) {

            resultado.postos.forEach(

                dados => {

                    aplicarResultadoPosto(
                        dados.codigo,
                        dados,
                        true
                    );

                }

            );

        }

        else if (
            resultado
        ) {

            aplicarResultadoPosto(
                resultado.codigo,
                resultado,
                true
            );

        }


        ultimaAtualizacao =
            Date.now();


        salvarStorage();


        renderizarTudo();


        mostrarStatusMensagem(

            "Status atualizado em " +
            formatarDataHora(
                ultimaAtualizacao
            )

        );

    }

    catch (
        erro
    ) {

        console.error(
            "Erro na atualização:",
            erro
        );


        mostrarStatusMensagem(
            "Não foi possível consultar o servidor."
        );

    }


    finally {

        atualizando =
            false;


        if (
            botao
        ) {

            botao.disabled =
                false;

            botao.classList.remove(
                "loading"
            );

        }

    }

}



/* =========================================================
   CONSULTAR API
========================================================= */

async function consultarAPI(
    codigo = ""
) {

    if (
        !CONFIG.API_URL
    ) {

        console.warn(
            "API_URL ainda não configurada."
        );


        /*
           Enquanto a URL do Apps Script
           não estiver configurada,
           usamos os dados armazenados
           no navegador.
        */

        return {

            modo:
                "local",

            codigo:
                codigo

        };

    }


    let url =
        CONFIG.API_URL;


    const parametros =
        new URLSearchParams();


    parametros.set(
        "acao",
        "status"
    );


    parametros.set(
        "chave",
        CONFIG.CHAVE
    );


    if (
        codigo
    ) {

        parametros.set(
            "posto",
            codigo
        );

    }


    url +=
        "?" +
        parametros.toString();


    const resposta =
        await fetch(
            url,
            {

                method:
                    "GET",

                cache:
                    "no-store"

            }
        );


    if (
        !resposta.ok
    ) {

        throw new Error(
            "HTTP " +
            resposta.status
        );

    }


    const dados =
        await resposta.json();


    return dados;

}



/* =========================================================
   APLICAR RESULTADO
========================================================= */

function aplicarResultadoPosto(
    codigo,
    resultado,
    registrar
) {

    if (
        !codigo
    ) {

        return;

    }


    if (
        !dadosPostos[codigo]
    ) {

        const posto =
            POSTOS.find(
                item =>
                    item.codigo ===
                    codigo
            );


        if (
            !posto
        ) {

            return;

        }


        dadosPostos[codigo] = {

            codigo:
                codigo,

            nome:
                posto.nome,

            status:
                "verificando",

            evento:
                "",

            dataHora:
                "",

            timestamp:
                0

        };

    }


    const status =
        normalizarStatus(
            resultado.status
        );


    const evento =
        resultado.evento ||
        resultado.mensagem ||
        "Status atualizado";


    const timestamp =
        Number(
            resultado.timestamp
        ) ||
        Date.now();


    const dataHora =
        resultado.dataHora ||
        formatarDataHora(
            timestamp
        );


    const statusAnterior =
        normalizarStatus(
            dadosPostos[codigo].status
        );


    dadosPostos[codigo] = {

        ...dadosPostos[codigo],

        status:
            status,

        evento:
            evento,

        dataHora:
            dataHora,

        timestamp:
            timestamp

    };


    if (
        registrar &&
        statusAnterior !==
        status
    ) {

        registrarHistorico(

            codigo,

            evento,

            status,

            dataHora,

            timestamp

        );

    }


    salvarStorage();

}



/* =========================================================
   REGISTRAR HISTÓRICO
========================================================= */

function registrarHistorico(
    codigo,
    evento,
    status,
    dataHora,
    timestamp
) {

    if (
        !historicos[codigo]
    ) {

        historicos[codigo] =
            [];

    }


    const posto =
        POSTOS.find(
            item =>
                item.codigo ===
                codigo
        );


    const registro = {

        codigo:
            codigo,

        posto:
            posto
                ? posto.nome
                : codigo,

        evento:
            evento,

        status:
            status,

        dataHora:
            dataHora,

        timestamp:
            timestamp

    };


    historicos[codigo].unshift(
        registro
    );


    historicos[codigo] =
        historicos[codigo]
        .slice(
            0,
            CONFIG.LIMITE_HISTORICO
        );


    salvarStorage();

}



/* =========================================================
   RENDERIZAR TUDO
========================================================= */

function renderizarTudo() {

    renderizarPostos();

    atualizarResumo();

    atualizarIndicadorAtualizacao();

}



/* =========================================================
   RESUMO
========================================================= */

function atualizarResumo() {

    let online =
        0;

    let pausados =
        0;

    let offline =
        0;

    let verificando =
        0;


    POSTOS.forEach(

        posto => {

            const status =
                normalizarStatus(

                    dadosPostos[
                        posto.codigo
                    ].status

                );


            if (
                status ===
                "online"
            ) {

                online++;

            }

            else if (
                status ===
                "pausado"
            ) {

                pausados++;

            }

            else if (
                status ===
                "offline"
            ) {

                offline++;

            }

            else {

                verificando++;

            }

        }

    );


    atualizarElemento(
        "totalPostos",
        POSTOS.length
    );


    atualizarElemento(
        "totalOnline",
        online
    );


    atualizarElemento(
        "totalPausados",
        pausados
    );


    atualizarElemento(
        "totalOffline",
        offline
    );


    atualizarElemento(
        "totalVerificando",
        verificando
    );

}



/* =========================================================
   ATUALIZAR ELEMENTO
========================================================= */

function atualizarElemento(
    id,
    valor
) {

    const el =
        elemento(
            id
        );


    if (
        el
    ) {

        el.textContent =
            valor;

    }

}



/* =========================================================
   INDICADOR DE ATUALIZAÇÃO
========================================================= */

function atualizarIndicadorAtualizacao() {

    const el =
        elemento(
            "ultimaAtualizacao"
        );


    if (
        !el
    ) {

        return;

    }


    if (
        !ultimaAtualizacao
    ) {

        el.textContent =
            "Ainda não atualizado";

        return;

    }


    el.textContent =
        "Atualizado em " +
        formatarDataHora(
            ultimaAtualizacao
        );

}



/* =========================================================
   MENSAGEM DE STATUS
========================================================= */

function mostrarStatusMensagem(
    mensagem
) {

    const el =
        elemento(
            "statusMensagem"
        );


    if (
        !el
    ) {

        return;

    }


    el.textContent =
        mensagem;


    el.classList.add(
        "visible"
    );


    clearTimeout(
        mostrarStatusMensagem.timer
    );


    mostrarStatusMensagem.timer =
        setTimeout(

            function () {

                el.classList.remove(
                    "visible"
                );

            },

            5000

        );

}



/* =========================================================
   HISTÓRICO
========================================================= */

function abrirHistorico(
    codigo
) {

    const posto =
        POSTOS.find(
            item =>
                item.codigo ===
                codigo
        );


    if (
        !posto
    ) {

        return;

    }


    const lista =
        historicos[codigo] ||
        [];


    const modal =
        elemento(
            "historyModal"
        );


    const titulo =
        elemento(
            "historyModalTitle"
        );


    const conteudo =
        elemento(
            "historyModalContent"
        );


    if (
        !modal ||
        !conteudo
    ) {

        /*
           Caso o HTML ainda não tenha
           modal, abre uma versão simples
           utilizando alert.
        */

        abrirHistoricoSimples(
            posto,
            lista
        );

        return;

    }


    if (
        titulo
    ) {

        titulo.textContent =
            "Histórico — " +
            posto.nome;

    }


    if (
        !lista.length
    ) {

        conteudo.innerHTML = `

            <div class="history-empty">

                📋

                <strong>
                    Nenhum evento registrado.
                </strong>

                <span>
                    O histórico aparecerá aqui quando
                    houver alterações de status.
                </span>

            </div>

        `;

    }

    else {

        conteudo.innerHTML =

            lista
            .map(

                item => `

                    <div class="history-row">


                        <div class="history-status">

                            ${iconeStatus(
                                item.status
                            )}

                        </div>


                        <div class="history-info">


                            <div class="history-event">
                                ${escapeHTML(
                                    item.evento
                                )}
                            </div>


                            <div class="history-date">
                                ${escapeHTML(
                                    item.dataHora
                                )}
                            </div>


                        </div>


                        <div class="history-badge ${classeStatus(
                            item.status
                        )}">

                            ${textoStatus(
                                item.status
                            )}

                        </div>


                    </div>

                `

            )
            .join("");

    }


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}



/* =========================================================
   HISTÓRICO SIMPLES
========================================================= */

function abrirHistoricoSimples(
    posto,
    lista
) {

    if (
        !lista.length
    ) {

        alert(

            posto.nome +
            "\n\n" +
            "Nenhum evento registrado."

        );

        return;

    }


    const texto =
        lista
        .slice(
            0,
            20
        )
        .map(

            item =>

                iconeStatus(
                    item.status
                )

                +

                " " +

                textoStatus(
                    item.status
                )

                +

                " — " +

                item.evento

                +

                "\n" +

                item.dataHora

        )
        .join(
            "\n\n"
        );


    alert(

        "HISTÓRICO — " +
        posto.nome +

        "\n\n" +

        texto

    );

}



/* =========================================================
   FECHAR HISTÓRICO
========================================================= */

function fecharHistorico() {

    const modal =
        elemento(
            "historyModal"
        );


    if (
        !modal
    ) {

        return;

    }


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}



/* =========================================================
   CONFIGURAR MODAL
========================================================= */

function configurarModal() {

    const fechar =
        elemento(
            "closeHistoryModal"
        );


    if (
        fechar
    ) {

        fechar.addEventListener(
            "click",
            fecharHistorico
        );

    }


    const modal =
        elemento(
            "historyModal"
        );


    if (
        modal
    ) {

        modal.addEventListener(

            "click",

            function (
                evento
            ) {

                if (
                    evento.target ===
                    modal
                ) {

                    fecharHistorico();

                }

            }

        );

    }


    document.addEventListener(

        "keydown",

        function (
            evento
        ) {

            if (
                evento.key ===
                "Escape"
            ) {

                fecharHistorico();

            }

        }

    );

}



/* =========================================================
   BOTÃO ATUALIZAR
========================================================= */

function configurarBotaoAtualizar() {

    const botao =
        elemento(
            "btnAtualizar"
        );


    if (
        !botao
    ) {

        return;

    }


    botao.addEventListener(

        "click",

        function () {

            atualizarTodos();

        }

    );

}



/* =========================================================
   AUTO ATUALIZAÇÃO
========================================================= */

function iniciarAtualizacaoAutomatica() {

    setInterval(

        function () {

            atualizarTodos();

        },

        CONFIG.INTERVALO_ATUALIZACAO

    );

}



/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHTML(
    texto
) {

    return String(
        texto || ""
    )

    .replace(
        /&/g,
        "&amp;"
    )

    .replace(
        /</g,
        "&lt;"
    )

    .replace(
        />/g,
        "&gt;"
    )

    .replace(
        /"/g,
        "&quot;"
    )

    .replace(
        /'/g,
        "&#039;"
    );

}



/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarPainel() {

    console.log(
        "======================================"
    );

    console.log(
        "PAINEL DE MONITORAMENTO DE RÁDIO"
    );

    console.log(
        "Postos Graciosa"
    );

    console.log(
        "======================================"
    );


    criarEstadoInicial();


    carregarStorage();


    criarEstadoInicial();


    renderizarTudo();


    atualizarRelogio();


    setInterval(

        atualizarRelogio,

        1000

    );


    configurarBotaoAtualizar();


    configurarModal();


    iniciarAtualizacaoAutomatica();


    /*
       Primeira consulta.
    */

    setTimeout(

        function () {

            atualizarTodos();

        },

        500

    );

}



/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(

        "DOMContentLoaded",

        iniciarPainel

    );

}

else {

    iniciarPainel();

}



/* =========================================================
   LOG FINAL
========================================================= */

console.log(
    "App.js carregado."
);

/* =========================================================
MONITORAMENTO DE RÁDIO
POSTOS GRACIOSA
APP.JS - PAINEL CENTRAL
========================================================= */

/* =========================================================
CONFIGURAÇÃO
========================================================= */

const CONFIG = {


intervaloAtualizacao: 5000,

armazenamentoHistorico:
    "adm_monitoramento_radio_historico_v1",

maxHistorico: 100,

timeoutMonitor:
    8000


};

/* =========================================================
POSTOS
========================================================= */

const POSTOS = [


{
    id: "graciosa",
    nome: "Graciosa",
    url: "https://postosgraciosa.github.io/monitor-radio-graciosa/?posto=graciosa"
},

{
    id: "fatima",
    nome: "Fátima",
    url: "https://postosgraciosa.github.io/monitor-radio-graciosa/?posto=fatima"
},

{
    id: "jariva",
    nome: "Jariva",
    url: "https://postosgraciosa.github.io/monitor-radio-graciosa/?posto=jariva"
},

{
    id: "bemer",
    nome: "Bemer",
    url: "https://postosgraciosa.github.io/monitor-radio-graciosa/?posto=bemer"
},

{
    id: "graciosa-v",
    nome: "Graciosa V",
    url: "https://postosgraciosa.github.io/monitor-radio-graciosa/?posto=graciosa-v"
},

{
    id: "pirai",
    nome: "Piraí",
    url: "https://postosgraciosa.github.io/monitor-radio-graciosa/?posto=pirai"
}


];

/* =========================================================
ESTADO DOS POSTOS
========================================================= */

const estadoPostos = {};

POSTOS.forEach(posto => {


estadoPostos[posto.id] = {

    id: posto.id,

    nome: posto.nome,

    status: "checking",

    player: "Aguardando verificação",

    ultimaVerificacao: null,

    ultimoEvento: null,

    inicioOffline: null,

    tempoOffline: null,

    alterado: false

};


});

/* =========================================================
ELEMENTOS
========================================================= */

const elementos = {


totalOnline:
    document.getElementById("totalOnline"),

totalOffline:
    document.getElementById("totalOffline"),

totalChecking:
    document.getElementById("totalChecking"),

totalPostos:
    document.getElementById("totalPostos"),

lastUpdate:
    document.getElementById("lastUpdate"),

systemStatus:
    document.getElementById("systemStatus"),

systemStatusDot:
    document.getElementById("systemStatusDot"),

systemStatusText:
    document.getElementById("systemStatusText"),

postosGrid:
    document.getElementById("postosGrid"),

historyList:
    document.getElementById("historyList"),

btnRefresh:
    document.getElementById("btnRefresh"),

refreshIcon:
    document.getElementById("refreshIcon"),

btnClearHistory:
    document.getElementById("btnClearHistory")


};

/* =========================================================
INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


inicializar();


});

function inicializar() {


elementos.totalPostos.textContent =
    POSTOS.length;

carregarHistorico();

atualizarInterface();

configurarEventos();

atualizarStatusSistema(
    "checking",
    "Sistema iniciando..."
);

verificarPostos();


}

/* =========================================================
EVENTOS
========================================================= */

function configurarEventos() {


if (elementos.btnRefresh) {

    elementos.btnRefresh.addEventListener(
        "click",
        () => {

            verificarPostos(true);

        }
    );

}


if (elementos.btnClearHistory) {

    elementos.btnClearHistory.addEventListener(
        "click",
        limparHistorico
    );

}


}

/* =========================================================
VERIFICAÇÃO PRINCIPAL
========================================================= */

async function verificarPostos(manual = false) {


iniciarAnimacaoAtualizacao();

atualizarStatusSistema(
    "checking",
    "Verificando postos..."
);


/*
 * IMPORTANTE:
 *
 * Neste momento o painel não deve simplesmente
 * considerar a página do monitor como "PLAYER ONLINE".
 *
 * O monitor individual deverá futuramente enviar
 * seu estado real para este painel.
 *
 * Por enquanto fazemos uma verificação básica
 * da página de monitoramento.
 */

const resultados = await Promise.all(

    POSTOS.map(posto =>
        verificarPaginaMonitor(posto)
    )

);


resultados.forEach(resultado => {

    processarResultado(resultado);

});


finalizarAtualizacao();


}

/* =========================================================
VERIFICAR PÁGINA DO MONITOR
========================================================= */

async function verificarPaginaMonitor(posto) {


const inicio =
    performance.now();


const resultado = {

    id: posto.id,

    nome: posto.nome,

    url: posto.url,

    status: "checking",

    player: "Não identificado",

    latencia: null,

    erro: null,

    horario: new Date()

};


try {

    /*
     * fetch em GitHub Pages permite verificar
     * se a página responde.
     *
     * Isso NÃO significa que o player esteja tocando.
     */

    const controlador =
        new AbortController();


    const timeout =
        setTimeout(
            () => controlador.abort(),
            CONFIG.timeoutMonitor
        );


    const resposta =
        await fetch(
            posto.url + "&_monitor=" + Date.now(),
            {
                method: "GET",
                cache: "no-store",
                signal: controlador.signal
            }
        );


    clearTimeout(timeout);


    resultado.latencia =
        Math.round(
            performance.now() - inicio
        );


    if (resposta.ok) {

        resultado.status =
            "page-online";

        resultado.player =
            "Página do monitor online";

    } else {

        resultado.status =
            "offline";

        resultado.player =
            "Monitor indisponível";

        resultado.erro =
            "HTTP " + resposta.status;

    }


} catch (erro) {

    resultado.status =
        "offline";

    resultado.player =
        "Monitor indisponível";


    if (
        erro &&
        erro.name === "AbortError"
    ) {

        resultado.erro =
            "Tempo limite excedido";

    } else {

        resultado.erro =
            "Falha na conexão";

    }

}


return resultado;


}

/* =========================================================
PROCESSAR RESULTADO
========================================================= */

function processarResultado(resultado) {


const estado =
    estadoPostos[resultado.id];


if (!estado) {
    return;
}


const statusAnterior =
    estado.status;


/*
 * ATENÇÃO:
 *
 * "page-online" ainda não é considerado
 * PLAYER ONLINE.
 *
 * Para evitar falso positivo, mantemos
 * o posto como verificando até receber
 * o heartbeat real do monitor.
 */

let novoStatus =
    "checking";


if (resultado.status === "offline") {

    novoStatus =
        "offline";

}


if (
    resultado.status === "page-online"
) {

    novoStatus =
        "checking";

}


estado.status =
    novoStatus;


estado.player =
    resultado.player;


estado.ultimaVerificacao =
    resultado.horario;


estado.latencia =
    resultado.latencia;


estado.erro =
    resultado.erro || null;


/*
 * Detecta queda
 */

if (
    statusAnterior !== "offline" &&
    novoStatus === "offline"
) {

    estado.inicioOffline =
        resultado.horario;

    estado.ultimoEvento =
        "Monitor indisponível";

    registrarEvento({

        tipo: "offline",

        posto: resultado.nome,

        horario: resultado.horario,

        mensagem:
            resultado.erro ||
            "Monitor indisponível"

    });

}


/*
 * Detecta retorno
 */

if (
    statusAnterior === "offline" &&
    novoStatus !== "offline"
) {

    const inicio =
        estado.inicioOffline;


    estado.inicioOffline =
        null;


    estado.ultimoEvento =
        "Monitor restabelecido";


    registrarEvento({

        tipo: "online",

        posto: resultado.nome,

        horario: resultado.horario,

        mensagem:
            "Monitor restabelecido"

    });

}


atualizarCard(
    resultado.id
);


}

/* =========================================================
ATUALIZAR INTERFACE
========================================================= */

function atualizarInterface() {


let online = 0;

let offline = 0;

let checking = 0;


POSTOS.forEach(posto => {

    const estado =
        estadoPostos[posto.id];


    atualizarCard(
        posto.id
    );


    if (
        estado.status === "online"
    ) {

        online++;

    }

    else if (
        estado.status === "offline"
    ) {

        offline++;

    }

    else {

        checking++;

    }

});


elementos.totalOnline.textContent =
    online;


elementos.totalOffline.textContent =
    offline;


elementos.totalChecking.textContent =
    checking;


elementos.lastUpdate.textContent =
    "Última atualização: " +
    formatarDataHora(
        new Date()
    );


atualizarStatusGeral(
    online,
    offline,
    checking
);


}

/* =========================================================
ATUALIZAR CARD
========================================================= */

function atualizarCard(id) {


const estado =
    estadoPostos[id];


if (!estado) {
    return;
}


const card =
    document.getElementById(
        "posto-" + id
    );


const status =
    document.getElementById(
        "status-" + id
    );


const player =
    document.getElementById(
        "player-" + id
    );


const last =
    document.getElementById(
        "last-" + id
    );


const event =
    document.getElementById(
        "event-" + id
    );


const indicator =
    document.getElementById(
        "indicator-" + id
    );


if (!card) {
    return;
}


card.classList.remove(
    "online",
    "offline",
    "checking"
);


status.classList.remove(
    "online",
    "offline",
    "checking"
);


let textoStatus =
    "Verificando";


let textoIndicador =
    "Aguardando dados...";


if (
    estado.status === "online"
) {

    card.classList.add("online");

    status.classList.add("online");

    textoStatus =
        "Online";

    textoIndicador =
        "Player ativo";

}


else if (
    estado.status === "offline"
) {

    card.classList.add("offline");

    status.classList.add("offline");

    textoStatus =
        "Offline";

    textoIndicador =
        estado.erro ||
        "Player parado";

}


else {

    card.classList.add("checking");

    status.classList.add("checking");

    textoStatus =
        "Verificando";

    textoIndicador =
        "Aguardando confirmação do player";

}


const statusText =
    status.querySelector(
        ".status-text"
    );


if (statusText) {

    statusText.textContent =
        textoStatus;

}


if (player) {

    player.textContent =
        estado.player;

}


if (last) {

    last.textContent =
        estado.ultimaVerificacao
            ? formatarHora(
                estado.ultimaVerificacao
            )
            : "--";

}


if (event) {

    event.textContent =
        estado.ultimoEvento ||
        "--";

}


if (indicator) {

    indicator.textContent =
        textoIndicador;

}


atualizarInterfaceResumo();


}

/* =========================================================
RESUMO
========================================================= */

function atualizarInterfaceResumo() {


let online = 0;

let offline = 0;

let checking = 0;


POSTOS.forEach(posto => {

    const estado =
        estadoPostos[posto.id];


    if (
        estado.status === "online"
    ) {

        online++;

    }

    else if (
        estado.status === "offline"
    ) {

        offline++;

    }

    else {

        checking++;

    }

});


elementos.totalOnline.textContent =
    online;


elementos.totalOffline.textContent =
    offline;


elementos.totalChecking.textContent =
    checking;


}

/* =========================================================
STATUS GERAL
========================================================= */

function atualizarStatusGeral(
online,
offline,
checking
) {


if (
    offline > 0
) {

    atualizarStatusSistema(
        "offline",
        offline +
        " posto(s) com problema"
    );

    return;

}


if (
    checking > 0
) {

    atualizarStatusSistema(
        "checking",
        "Verificando players..."
    );

    return;

}


if (
    online === POSTOS.length
) {

    atualizarStatusSistema(
        "online",
        "Todos os postos ativos"
    );

    return;

}


atualizarStatusSistema(
    "checking",
    "Monitoramento ativo"
);


}

/* =========================================================
STATUS DO SISTEMA
========================================================= */

function atualizarStatusSistema(
tipo,
texto
) {


if (
    elementos.systemStatus
) {

    elementos.systemStatus.classList.remove(
        "online",
        "offline",
        "checking"
    );

    elementos.systemStatus.classList.add(
        tipo
    );

}


if (
    elementos.systemStatusDot
) {

    elementos.systemStatusDot.classList.remove(
        "online",
        "offline",
        "checking"
    );

    elementos.systemStatusDot.classList.add(
        tipo
    );

}


if (
    elementos.systemStatusText
) {

    elementos.systemStatusText.textContent =
        texto;

}


}

/* =========================================================
HISTÓRICO
========================================================= */

function carregarHistorico() {


let historico = [];


try {

    const salvo =
        localStorage.getItem(
            CONFIG.armazenamentoHistorico
        );


    if (salvo) {

        historico =
            JSON.parse(salvo);

    }

} catch (erro) {

    historico = [];

}


renderizarHistorico(
    historico
);


}

/* =========================================================
REGISTRAR EVENTO
========================================================= */

function registrarEvento(evento) {


let historico = [];


try {

    const salvo =
        localStorage.getItem(
            CONFIG.armazenamentoHistorico
        );


    if (salvo) {

        historico =
            JSON.parse(salvo);

    }

} catch (erro) {

    historico = [];

}


historico.unshift({

    id:
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 8),

    tipo:
        evento.tipo,

    posto:
        evento.posto,

    horario:
        new Date(
            evento.horario
        ).toISOString(),

    mensagem:
        evento.mensagem

});


if (
    historico.length >
    CONFIG.maxHistorico
) {

    historico =
        historico.slice(
            0,
            CONFIG.maxHistorico
        );

}


try {

    localStorage.setItem(
        CONFIG.armazenamentoHistorico,
        JSON.stringify(historico)
    );

} catch (erro) {

    console.warn(
        "Não foi possível salvar histórico.",
        erro
    );

}


renderizarHistorico(
    historico
);


}

/* =========================================================
RENDERIZAR HISTÓRICO
========================================================= */

function renderizarHistorico(
historico
) {


if (
    !elementos.historyList
) {

    return;

}


if (
    !historico ||
    historico.length === 0
) {

    elementos.historyList.innerHTML = `

        <div class="history-empty">

            <span>📋</span>

            <p>
                Nenhum evento registrado.
            </p>

        </div>

    `;

    return;

}


elementos.historyList.innerHTML =
    historico
        .slice(0, 30)
        .map(evento => {

            const tipo =
                evento.tipo === "online"
                    ? "online"
                    : "offline";


            const icone =
                tipo === "online"
                    ? "🟢"
                    : "🔴";


            const titulo =
                tipo === "online"
                    ? "Player restabelecido"
                    : "Player parado";


            return `

                <div
                    class="history-item ${tipo}"
                >

                    <div
                        class="history-icon"
                    >
                        ${icone}
                    </div>


                    <div
                        class="history-content"
                    >

                        <strong>
                            ${escaparHTML(
                                evento.posto
                            )}
                        </strong>

                        <span>
                            ${titulo}
                        </span>

                        <small>
                            ${escaparHTML(
                                evento.mensagem ||
                                ""
                            )}
                        </small>

                    </div>


                    <time>
                        ${formatarDataHora(
                            evento.horario
                        )}
                    </time>

                </div>

            `;

        })
        .join("");


}

/* =========================================================
LIMPAR HISTÓRICO
========================================================= */

function limparHistorico() {


const confirmar =
    window.confirm(
        "Deseja realmente limpar o histórico?"
    );


if (!confirmar) {
    return;
}


localStorage.removeItem(
    CONFIG.armazenamentoHistorico
);


renderizarHistorico(
    []
);


}

/* =========================================================
ATUALIZAÇÃO MANUAL
========================================================= */

function iniciarAnimacaoAtualizacao() {


if (
    elementos.refreshIcon
) {

    elementos.refreshIcon.classList.add(
        "rotating"
    );

}


}

function finalizarAtualizacao() {


if (
    elementos.refreshIcon
) {

    elementos.refreshIcon.classList.remove(
        "rotating"
    );

}


atualizarInterface();


}

/* =========================================================
FORMATAÇÃO DE DATA
========================================================= */

function formatarHora(data) {


const d =
    new Date(data);


if (
    Number.isNaN(
        d.getTime()
    )
) {

    return "--";

}


return d.toLocaleTimeString(
    "pt-BR",
    {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }
);


}

function formatarDataHora(data) {


const d =
    new Date(data);


if (
    Number.isNaN(
        d.getTime()
    )
) {

    return "--";

}


return d.toLocaleString(
    "pt-BR",
    {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }
);


}

/* =========================================================
ESCAPAR HTML
========================================================= */

function escaparHTML(valor) {


if (
    valor === null ||
    valor === undefined
) {

    return "";

}


return String(valor)
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
ATUALIZAÇÃO AUTOMÁTICA
========================================================= */

setInterval(
() => {


    verificarPostos();

},
CONFIG.intervaloAtualizacao


);

/* =========================================================
EXPOR ESTADO PARA DEBUG
========================================================= */

window.radioMonitoramento = {


postos:
    POSTOS,

estados:
    estadoPostos,

atualizar:
    verificarPostos


};

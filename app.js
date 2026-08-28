const CONFIG = {

```
API_URL:
    "",

INTERVALO_ATUALIZACAO:
    30000,

LIMITE_HISTORICO:
    100,

STORAGE_PREFIX:
    "adm_monitoramento_radio_painel_v1"
```

};

/* =========================================================
POSTOS
========================================================= */

const POSTOS = [

```
{
    codigo: "graciosa",
    nome: "POSTO GRACIOSA"
},

{
    codigo: "fatima",
    nome: "POSTO FÁTIMA"
},

{
    codigo: "jariva",
    nome: "POSTO JARIVA"
},

{
    codigo: "bemer",
    nome: "POSTO BEMER"
},

{
    codigo: "graciosa-v",
    nome: "POSTO GRACIOSA V"
},

{
    codigo: "pirai",
    nome: "POSTO PIRAÍ"
}
```

];

/* =========================================================
ESTADO
========================================================= */

let dadosPostos = {};

let atualizando = false;

let ultimoAtualizacao = null;

let temporizador = null;

/* =========================================================
INICIALIZAÇÃO
========================================================= */

document.addEventListener(
"DOMContentLoaded",
function () {

```
    inicializarPainel();

}
```

);

/* =========================================================
INICIALIZAR PAINEL
========================================================= */

function inicializarPainel() {

```
prepararEstadoInicial();

renderizarPainel();

configurarEventos();

atualizarRelogio();

setInterval(
    atualizarRelogio,
    1000
);

iniciarAtualizacaoAutomatica();

atualizarPainel();
```

}

/* =========================================================
PREPARAR ESTADO INICIAL
========================================================= */

function prepararEstadoInicial() {

```
POSTOS.forEach(
    function (posto) {

        dadosPostos[
            posto.codigo
        ] = {

            codigo:
                posto.codigo,

            nome:
                posto.nome,

            status:
                "aguardando",

            atividade:
                "Aguardando atualização",

            evento:
                "Nenhum evento recebido",

            dataHora:
                "--/--/---- às --:--:--",

            timestamp:
                0,

            historico:
                carregarHistorico(
                    posto.codigo
                )

        };

    }
);
```

}

/* =========================================================
EVENTOS
========================================================= */

function configurarEventos() {

```
const botaoAtualizar =
    document.getElementById(
        "btnAtualizar"
    );


if (
    botaoAtualizar
) {

    botaoAtualizar.addEventListener(
        "click",
        function () {

            atualizarPainel(
                true
            );

        }
    );

}


document.addEventListener(
    "click",
    function (evento) {

        const botao =
            evento.target.closest(
                "[data-atualizar]"
            );


        if (
            !botao
        ) {

            return;

        }


        const codigo =
            botao.getAttribute(
                "data-atualizar"
            );


        atualizarPosto(
            codigo
        );

    }
);
```

}

/* =========================================================
ATUALIZAÇÃO AUTOMÁTICA
========================================================= */

function iniciarAtualizacaoAutomatica() {

```
if (
    temporizador
) {

    clearInterval(
        temporizador
    );

}


temporizador =
    setInterval(
        function () {

            atualizarPainel();

        },
        CONFIG.INTERVALO_ATUALIZACAO
    );
```

}

/* =========================================================
ATUALIZAR PAINEL
========================================================= */

async function atualizarPainel() {

```
if (
    atualizando
) {

    return;

}


atualizando =
    true;


definirIndicadorAtualizacao(
    true
);


try {

    if (
        !CONFIG.API_URL
    ) {

        carregarDadosLocais();

        ultimoAtualizacao =
            new Date();

        renderizarPainel();

        atualizarConexao(
            "local"
        );

        return;

    }


    const resposta =
        await fetch(
            CONFIG.API_URL +
            "?acao=status&t=" +
            Date.now(),
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
            "Erro HTTP " +
            resposta.status
        );

    }


    const dados =
        await resposta.json();


    processarResposta(
        dados
    );


    ultimoAtualizacao =
        new Date();


    renderizarPainel();

    atualizarConexao(
        "online"
    );

}

catch (
    erro
) {

    console.error(
        "Erro ao atualizar painel:",
        erro
    );


    carregarDadosLocais();

    renderizarPainel();

    atualizarConexao(
        "erro"
    );

}

finally {

    atualizando =
        false;


    definirIndicadorAtualizacao(
        false
    );

}
```

}

/* =========================================================
ATUALIZAR POSTO INDIVIDUAL
========================================================= */

async function atualizarPosto(
codigo
) {

```
const posto =
    dadosPostos[
        codigo
    ];


if (
    !posto
) {

    return;

}


const botao =
    document.querySelector(
        "[data-atualizar=\"" +
        codigo +
        "\"]"
    );


if (
    botao
) {

    botao.disabled =
        true;

    botao.classList.add(
        "carregando"
    );

    botao.textContent =
        "ATUALIZANDO...";

}


try {

    if (
        !CONFIG.API_URL
    ) {

        await aguardar(
            400
        );


        posto.dataHora =
            agoraTexto();


        posto.atividade =
            gerarAtividade(
                posto.status
            );


        renderizarPainel();

        return;

    }


    const resposta =
        await fetch(
            CONFIG.API_URL +
            "?acao=posto&posto=" +
            encodeURIComponent(
                codigo
            ) +
            "&t=" +
            Date.now(),
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
            "Erro HTTP " +
            resposta.status
        );

    }


    const dados =
        await resposta.json();


    atualizarEstadoPosto(
        dados
    );


    salvarHistorico(
        codigo,
        dados
    );


    renderizarPainel();

    atualizarConexao(
        "online"
    );

}

catch (
    erro
) {

    console.error(
        "Erro ao atualizar posto:",
        erro
    );


    posto.atividade =
        "Não foi possível atualizar";


    posto.evento =
        "Erro de comunicação";


    posto.status =
        "erro";


    renderizarPainel();

    atualizarConexao(
        "erro"
    );

}

finally {

    if (
        botao
    ) {

        botao.disabled =
            false;

        botao.classList.remove(
            "carregando"
        );

        botao.textContent =
            "ATUALIZAR";

    }

}
```

}

/* =========================================================
PROCESSAR RESPOSTA
========================================================= */

function processarResposta(
dados
) {

```
let lista =
    [];


if (
    Array.isArray(
        dados
    )
) {

    lista =
        dados;

}

else if (
    dados &&
    Array.isArray(
        dados.postos
    )
) {

    lista =
        dados.postos;

}

else if (
    dados &&
    dados.dados &&
    Array.isArray(
        dados.dados
    )
) {

    lista =
        dados.dados;

}


lista.forEach(
    function (item) {

        atualizarEstadoPosto(
            item
        );


        const codigo =
            item.codigo ||
            identificarCodigo(
                item.posto ||
                item.nome
            );


        if (
            codigo
        ) {

            salvarHistorico(
                codigo,
                item
            );

        }

    }
);
```

}

/* =========================================================
ATUALIZAR ESTADO DO POSTO
========================================================= */

function atualizarEstadoPosto(
item
) {

```
if (
    !item
) {

    return;

}


const codigo =
    item.codigo ||
    identificarCodigo(
        item.posto ||
        item.nome
    );


if (
    !codigo ||
    !dadosPostos[codigo]
) {

    return;

}


const posto =
    dadosPostos[
        codigo
    ];


posto.status =
    normalizarStatus(
        item.status
    );


posto.atividade =
    item.atividade ||
    gerarAtividade(
        posto.status
    );


posto.evento =
    item.evento ||
    "Sem evento informado";


posto.dataHora =
    item.dataHora ||
    agoraTexto();


posto.timestamp =
    Number(
        item.timestamp ||
        Date.now()
    );


if (
    Array.isArray(
        item.historico
    )
) {

    posto.historico =
        item.historico.slice(
            0,
            CONFIG.LIMITE_HISTORICO
        );

    salvarHistoricoLista(
        codigo,
        posto.historico
    );

}
```

}

/* =========================================================
NORMALIZAR STATUS
========================================================= */

function normalizarStatus(
status
) {

```
const valor =
    String(
        status ||
        ""
    )
    .trim()
    .toLowerCase();


if (
    valor === "online" ||
    valor === "ativo" ||
    valor === "active"
) {

    return "online";

}


if (
    valor === "offline" ||
    valor === "pausado" ||
    valor === "paused" ||
    valor === "inativo"
) {

    return "offline";

}


if (
    valor === "verificando" ||
    valor === "checking"
) {

    return "verificando";

}


if (
    valor === "erro"
) {

    return "erro";

}


return "aguardando";
```

}

/* =========================================================
ATIVIDADE
========================================================= */

function gerarAtividade(
status
) {

```
switch (
    status
) {

    case "online":

        return "Rádio ativa e transmitindo";


    case "offline":

        return "Rádio pausada ou offline";


    case "verificando":

        return "Verificando transmissão";


    case "erro":

        return "Erro na comunicação";


    default:

        return "Aguardando atualização";

}
```

}

/* =========================================================
IDENTIFICAR CÓDIGO
========================================================= */

function identificarCodigo(
nome
) {

```
const texto =
    String(
        nome ||
        ""
    )
    .toLowerCase();


if (
    texto.indexOf(
        "graciosa v"
    ) !== -1
) {

    return "graciosa-v";

}


if (
    texto.indexOf(
        "fátima"
    ) !== -1 ||
    texto.indexOf(
        "fatima"
    ) !== -1
) {

    return "fatima";

}


if (
    texto.indexOf(
        "jariva"
    ) !== -1
) {

    return "jariva";

}


if (
    texto.indexOf(
        "bemer"
    ) !== -1
) {

    return "bemer";

}


if (
    texto.indexOf(
        "piraí"
    ) !== -1 ||
    texto.indexOf(
        "pirai"
    ) !== -1
) {

    return "pirai";

}


if (
    texto.indexOf(
        "graciosa"
    ) !== -1
) {

    return "graciosa";

}


return null;
```

}

/* =========================================================
RENDERIZAR PAINEL
========================================================= */

function renderizarPainel() {

```
const container =
    document.getElementById(
        "postosContainer"
    );


if (
    !container
) {

    return;

}


let html =
    "";


POSTOS.forEach(
    function (posto) {

        html +=
            criarCardPosto(
                dadosPostos[
                    posto.codigo
                ]
            );

    }
);


container.innerHTML =
    html;


atualizarResumo();
```

}

/* =========================================================
CRIAR CARD DO POSTO
========================================================= */

function criarCardPosto(
posto
) {

```
const status =
    obterTextoStatus(
        posto.status
    );


const classeStatus =
    obterClasseStatus(
        posto.status
    );


const iconeStatus =
    obterIconeStatus(
        posto.status
    );


const historico =
    Array.isArray(
        posto.historico
    )
        ? posto.historico
        : [];


let html =
    "";


html +=
    "<article class=\"posto-card " +
    classeStatus +
    "\" data-posto=\"" +
    escaparHTML(
        posto.codigo
    ) +
    "\">";


html +=
    "<div class=\"posto-card-header\">";


html +=
    "<div class=\"posto-identificacao\">";


html +=
    "<div class=\"posto-icone\">⛽</div>";


html +=
    "<div>";


html +=
    "<div class=\"posto-nome\">" +
    escaparHTML(
        posto.nome
    ) +
    "</div>";


html +=
    "<div class=\"posto-codigo\">" +
    escaparHTML(
        posto.codigo
    ) +
    "</div>";


html +=
    "</div>";


html +=
    "</div>";


html +=
    "<div class=\"posto-status " +
    classeStatus +
    "\">";


html +=
    "<span class=\"status-ponto\"></span>";


html +=
    iconeStatus +
    " " +
    status;


html +=
    "</div>";


html +=
    "</div>";


html +=
    "<div class=\"posto-atividade\">";


html +=
    "<div class=\"atividade-label\">" +
    "ATIVIDADE" +
    "</div>";


html +=
    "<div class=\"atividade-texto\">" +
    escaparHTML(
        posto.atividade
    ) +
    "</div>";


html +=
    "</div>";


html +=
    "<div class=\"posto-evento\">";


html +=
    "<div class=\"evento-label\">" +
    "ÚLTIMO EVENTO" +
    "</div>";


html +=
    "<div class=\"evento-texto\">" +
    escaparHTML(
        posto.evento
    ) +
    "</div>";


html +=
    "</div>";


html +=
    "<div class=\"posto-atualizacao\">";


html +=
    "<div>";


html +=
    "<div class=\"atualizacao-label\">" +
    "ÚLTIMA ATUALIZAÇÃO" +
    "</div>";


html +=
    "<div class=\"atualizacao-data\">" +
    escaparHTML(
        posto.dataHora
    ) +
    "</div>";


html +=
    "</div>";


html +=
    "<button " +
    "type=\"button\" " +
    "class=\"btn-atualizar-posto\" " +
    "data-atualizar=\"" +
    escaparHTML(
        posto.codigo
    ) +
    "\">" +
    "↻ ATUALIZAR" +
    "</button>";


html +=
    "</div>";


html +=
    "<div class=\"posto-historico\">";


html +=
    "<div class=\"historico-header\">";


html +=
    "<div>";


html +=
    "<div class=\"historico-titulo\">" +
    "HISTÓRICO" +
    "</div>";


html +=
    "<div class=\"historico-subtitulo\">" +
    historico.length +
    " evento(s) registrado(s)" +
    "</div>";


html +=
    "</div>";


html +=
    "</div>";


html +=
    "<div class=\"historico-lista\">";


html +=
    criarHistoricoHTML(
        historico
    );


html +=
    "</div>";


html +=
    "</div>";


html +=
    "</article>";


return html;
```

}

/* =========================================================
HISTÓRICO
========================================================= */

function criarHistoricoHTML(
historico
) {

```
if (
    !historico ||
    !historico.length
) {

    return (
        "<div class=\"historico-vazio\">" +
        "Nenhum evento registrado." +
        "</div>"
    );

}


let html =
    "";


historico
    .slice(
        0,
        CONFIG.LIMITE_HISTORICO
    )
    .forEach(
        function (item) {

            const status =
                normalizarStatus(
                    item.status
                );


            const icone =
                obterIconeStatus(
                    status
                );


            html +=
                "<div class=\"historico-item\">";


            html +=
                "<div class=\"historico-status\">" +
                icone +
                "</div>";


            html +=
                "<div class=\"historico-evento\">";


            html +=
                "<div class=\"historico-evento-nome\">" +
                escaparHTML(
                    item.evento ||
                    item.atividade ||
                    "Evento"
                ) +
                "</div>";


            html +=
                "<div class=\"historico-evento-status\">" +
                obterTextoStatus(
                    status
                ) +
                "</div>";


            html +=
                "</div>";


            html +=
                "<div class=\"historico-horario\">" +
                escaparHTML(
                    item.dataHora ||
                    "--/--/---- às --:--:--"
                ) +
                "</div>";


            html +=
                "</div>";

        }
    );


return html;
```

}

/* =========================================================
RESUMO
========================================================= */

function atualizarResumo() {

```
let online =
    0;

let offline =
    0;

let verificando =
    0;

let aguardando =
    0;


POSTOS.forEach(
    function (posto) {

        const status =
            dadosPostos[
                posto.codigo
            ].status;


        if (
            status ===
            "online"
        ) {

            online++;

        }

        else if (
            status ===
            "offline"
        ) {

            offline++;

        }

        else if (
            status ===
            "verificando"
        ) {

            verificando++;

        }

        else {

            aguardando++;

        }

    }
);


definirTexto(
    "totalPostos",
    POSTOS.length
);


definirTexto(
    "postosOnline",
    online
);


definirTexto(
    "postosOffline",
    offline
);


definirTexto(
    "postosVerificando",
    verificando
);


definirTexto(
    "postosAguardando",
    aguardando
);


definirTexto(
    "ultimaAtualizacao",
    ultimoAtualizacao
        ? formatarHora(
            ultimoAtualizacao
        )
        : "--:--:--"
);
```

}

/* =========================================================
TEXTO DO STATUS
========================================================= */

function obterTextoStatus(
status
) {

```
switch (
    status
) {

    case "online":

        return "ATIVO";


    case "offline":

        return "PAUSADO";


    case "verificando":

        return "VERIFICANDO";


    case "erro":

        return "ERRO";


    default:

        return "AGUARDANDO";

}
```

}

/* =========================================================
CLASSE DO STATUS
========================================================= */

function obterClasseStatus(
status
) {

```
switch (
    status
) {

    case "online":

        return "status-online";


    case "offline":

        return "status-offline";


    case "verificando":

        return "status-verificando";


    case "erro":

        return "status-erro";


    default:

        return "status-aguardando";

}
```

}

/* =========================================================
ÍCONE DO STATUS
========================================================= */

function obterIconeStatus(
status
) {

```
switch (
    status
) {

    case "online":

        return "🟢";


    case "offline":

        return "🔴";


    case "verificando":

        return "🟡";


    case "erro":

        return "⚠️";


    default:

        return "⚪";

}
```

}

/* =========================================================
INDICADOR DE ATUALIZAÇÃO
========================================================= */

function definirIndicadorAtualizacao(
ativo
) {

```
const botao =
    document.getElementById(
        "btnAtualizar"
    );


if (
    !botao
) {

    return;

}


if (
    ativo
) {

    botao.disabled =
        true;

    botao.classList.add(
        "atualizando"
    );

    botao.textContent =
        "↻ ATUALIZANDO...";

}

else {

    botao.disabled =
        false;

    botao.classList.remove(
        "atualizando"
    );

    botao.textContent =
        "↻ ATUALIZAR";

}
```

}

/* =========================================================
CONEXÃO
========================================================= */

function atualizarConexao(
estado
) {

```
const indicador =
    document.getElementById(
        "statusConexao"
    );


if (
    !indicador
) {

    return;

}


indicador.className =
    "conexao-indicador";


if (
    estado ===
    "online"
) {

    indicador.classList.add(
        "conexao-online"
    );

    indicador.textContent =
        "● SISTEMA CONECTADO";

    return;

}


if (
    estado ===
    "local"
) {

    indicador.classList.add(
        "conexao-local"
    );

    indicador.textContent =
        "● MODO LOCAL";

    return;

}


indicador.classList.add(
    "conexao-erro"
);

indicador.textContent =
    "● FALHA NA CONEXÃO";
```

}

/* =========================================================
RELÓGIO
========================================================= */

function atualizarRelogio() {

```
const agora =
    new Date();


definirTexto(
    "clock",
    agora.toLocaleTimeString(
        "pt-BR"
    )
);


definirTexto(
    "date",
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
    )
);
```

}

/* =========================================================
FORMATAR HORA
========================================================= */

function formatarHora(
data
) {

```
return new Date(
    data
).toLocaleTimeString(
    "pt-BR"
);
```

}

/* =========================================================
AGORA
========================================================= */

function agoraTexto() {

```
const agora =
    new Date();


return (
    agora.toLocaleDateString(
        "pt-BR"
    ) +
    " às " +
    agora.toLocaleTimeString(
        "pt-BR"
    )
);
```

}

/* =========================================================
STORAGE
========================================================= */

function obterChaveStorage(
codigo
) {

```
return (
    CONFIG.STORAGE_PREFIX +
    "_" +
    codigo
);
```

}

/* =========================================================
CARREGAR HISTÓRICO
========================================================= */

function carregarHistorico(
codigo
) {

```
try {

    const salvo =
        localStorage.getItem(
            obterChaveStorage(
                codigo
            )
        );


    if (
        !salvo
    ) {

        return [];

    }


    const lista =
        JSON.parse(
            salvo
        );


    if (
        !Array.isArray(
            lista
        )
    ) {

        return [];

    }


    return lista.slice(
        0,
        CONFIG.LIMITE_HISTORICO
    );

}

catch (
    erro
) {

    console.warn(
        "Erro ao carregar histórico:",
        erro
    );


    return [];

}
```

}

/* =========================================================
SALVAR HISTÓRICO
========================================================= */

function salvarHistorico(
codigo,
dados
) {

```
if (
    !codigo ||
    !dados ||
    !dadosPostos[codigo]
) {

    return;

}


const historico =
    dadosPostos[
        codigo
    ].historico || [];


const novoEvento = {

    evento:
        dados.evento ||
        dados.atividade ||
        "Atualização",

    status:
        dados.status ||
        "aguardando",

    dataHora:
        dados.dataHora ||
        agoraTexto(),

    timestamp:
        Number(
            dados.timestamp ||
            Date.now()
        )

};


if (
    historico.length
) {

    const ultimo =
        historico[0];


    if (
        ultimo.evento ===
        novoEvento.evento &&
        ultimo.status ===
        novoEvento.status
    ) {

        return;

    }

}


historico.unshift(
    novoEvento
);


dadosPostos[
    codigo
].historico =
    historico.slice(
        0,
        CONFIG.LIMITE_HISTORICO
    );


salvarHistoricoLista(
    codigo,
    dadosPostos[
        codigo
    ].historico
);
```

}

/* =========================================================
SALVAR LISTA
========================================================= */

function salvarHistoricoLista(
codigo,
lista
) {

```
try {

    localStorage.setItem(

        obterChaveStorage(
            codigo
        ),

        JSON.stringify(
            lista.slice(
                0,
                CONFIG.LIMITE_HISTORICO
            )
        )

    );

}

catch (
    erro
) {

    console.warn(
        "Erro ao salvar histórico:",
        erro
    );

}
```

}

/* =========================================================
CARREGAR DADOS LOCAIS
========================================================= */

function carregarDadosLocais() {

```
POSTOS.forEach(
    function (posto) {

        const historico =
            carregarHistorico(
                posto.codigo
            );


        dadosPostos[
            posto.codigo
        ].historico =
            historico;


        if (
            historico.length
        ) {

            const ultimo =
                historico[0];


            dadosPostos[
                posto.codigo
            ].status =
                normalizarStatus(
                    ultimo.status
                );


            dadosPostos[
                posto.codigo
            ].evento =
                ultimo.evento ||
                "Evento registrado";


            dadosPostos[
                posto.codigo
            ].dataHora =
                ultimo.dataHora ||
                "--/--/---- às --:--:--";


            dadosPostos[
                posto.codigo
            ].atividade =
                gerarAtividade(
                    dadosPostos[
                        posto.codigo
                    ].status
                );

        }

    }
);
```

}

/* =========================================================
DEFINIR TEXTO
========================================================= */

function definirTexto(
id,
texto
) {

```
const elemento =
    document.getElementById(
        id
    );


if (
    elemento
) {

    elemento.textContent =
        texto;

}
```

}

/* =========================================================
ESCAPAR HTML
========================================================= */

function escaparHTML(
texto
) {

```
return String(
    texto === null ||
    texto === undefined
        ? ""
        : texto
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
```

}

/* =========================================================
AGUARDAR
========================================================= */

function aguardar(
tempo
) {

```
return new Promise(
    function (resolve) {

        setTimeout(
            resolve,
            tempo
        );

    }
);
```

}

/* =========================================================
LOG
========================================================= */

console.log(
"======================================"
);

console.log(
"PAINEL DE MONITORAMENTO DE RÁDIO"
);

console.log(
"POSTOS GRACIOSA"
);

console.log(
"Quantidade de postos:",
POSTOS.length
);

console.log(
"Atualização automática:",
CONFIG.INTERVALO_ATUALIZACAO,
"ms"
);

console.log(
"======================================"
);

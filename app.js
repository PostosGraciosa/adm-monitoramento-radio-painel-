
/* =========================================================
   MONITORAMENTO DE RÁDIO | POSTOS GRACIOSA
   APP.JS COMPLETO

   VERSÃO CORRIGIDA

   FUNÇÕES:
   - Detecta o posto pela URL ?posto=
   - Monitora o player
   - Detecta PLAY / PAUSE / OFFLINE
   - Envia eventos para Google Apps Script
   - Envia alerta por GET através de Image()
   - Evita problemas de CORS
   - Funciona para os 6 postos
   - Mantém histórico local
   - Permite recuperação do rádio
   ========================================================= */


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbyTJwiUpuNO1a3-u5IGYL6V-sMPZweH4Ph-xT2KS8q9xt0nE0sCG4nnyH4ZrcdP9ZZK/exec";

const CHAVE =
  "GRACIOSA_RADIO_2026";

const INTERVALO_ATUALIZACAO =
  60000;

const STORAGE =
  "monitor_radio_graciosa_v2";


/* =========================================================
   POSTOS
   ========================================================= */

const TODOS_POSTOS = [

  {
    codigo: "graciosa",
    nome: "POSTO GRACIOSA",
    icone: "⛽"
  },

  {
    codigo: "fatima",
    nome: "POSTO FÁTIMA",
    icone: "⛽"
  },

  {
    codigo: "jariva",
    nome: "POSTO JARIVA",
    icone: "⛽"
  },

  {
    codigo: "bemer",
    nome: "POSTO BEMER",
    icone: "⛽"
  },

  {
    codigo: "graciosa-v",
    nome: "POSTO GRACIOSA V",
    icone: "⛽"
  },

  {
    codigo: "pirai",
    nome: "POSTO PIRAÍ",
    icone: "⛽"
  }

];


/* =========================================================
   POSTO DA URL
   ========================================================= */

function obterPostoDaUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const codigo =
    String(
      params.get("posto") || ""
    )
      .toLowerCase()
      .trim();

  if (!codigo) {
    return null;
  }

  return TODOS_POSTOS.find(
    function (posto) {

      return posto.codigo === codigo;

    }
  ) || null;

}


const POSTO_ATUAL =
  obterPostoDaUrl();


/*
 * Se tiver ?posto=, monitora somente aquele posto.
 *
 * Se não tiver, monitora todos.
 */
const POSTOS =
  POSTO_ATUAL
    ? [POSTO_ATUAL]
    : TODOS_POSTOS;


/* =========================================================
   ESTADO
   ========================================================= */

let estado = {};


/* =========================================================
   ELEMENTOS
   ========================================================= */

const ELEMENTO = {

  clock:
    document.getElementById("clock"),

  date:
    document.getElementById("date"),

  totalPostos:
    document.getElementById("totalPostos"),

  totalAtivos:
    document.getElementById("totalAtivos"),

  totalPausados:
    document.getElementById("totalPausados"),

  totalVerificando:
    document.getElementById("totalVerificando"),

  lastUpdate:
    document.getElementById("lastUpdate"),

  btnAtualizarTodos:
    document.getElementById(
      "btnAtualizarTodos"
    ),

  gridPostos:
    document.getElementById(
      "gridPostos"
    ),

  avisoPosto:
    document.getElementById(
      "avisoPosto"
    ),

  avisoTitulo:
    document.getElementById(
      "avisoTitulo"
    ),

  avisoTexto:
    document.getElementById(
      "avisoTexto"
    ),

  descricaoPagina:
    document.getElementById(
      "descricaoPagina"
    ),

  historyModal:
    document.getElementById(
      "historyModal"
    ),

  modalStationName:
    document.getElementById(
      "modalStationName"
    ),

  historyList:
    document.getElementById(
      "historyList"
    ),

  btnFecharHistorico:
    document.getElementById(
      "btnFecharHistorico"
    ),

  systemStatus:
    document.getElementById(
      "systemStatus"
    )

};


/* =========================================================
   ESTADO INICIAL
   ========================================================= */

function criarEstadoInicial() {

  POSTOS.forEach(
    function (posto) {

      estado[posto.codigo] = {

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
          0,

        idEvento:
          ""

      };

    }
  );

}


/* =========================================================
   STORAGE
   ========================================================= */

function carregarStorage() {

  try {

    const salvo =
      localStorage.getItem(
        STORAGE
      );

    if (!salvo) {
      return false;
    }

    const dados =
      JSON.parse(salvo);

    if (
      !dados ||
      typeof dados !== "object"
    ) {
      return false;
    }

    Object.keys(dados).forEach(
      function (codigo) {

        if (estado[codigo]) {

          estado[codigo] =
            Object.assign(
              {},
              estado[codigo],
              dados[codigo]
            );

        }

      }
    );

    return true;

  } catch (erro) {

    console.warn(
      "Erro ao carregar storage:",
      erro
    );

    return false;

  }

}


/* =========================================================
   SALVAR STORAGE
   ========================================================= */

function salvarStorage() {

  try {

    localStorage.setItem(
      STORAGE,
      JSON.stringify(estado)
    );

  } catch (erro) {

    console.warn(
      "Erro ao salvar storage:",
      erro
    );

  }

}


/* =========================================================
   RELÓGIO
   ========================================================= */

function atualizarRelogio() {

  if (
    !ELEMENTO.clock ||
    !ELEMENTO.date
  ) {
    return;
  }

  const agora =
    new Date();

  const hh =
    String(
      agora.getHours()
    ).padStart(2, "0");

  const mm =
    String(
      agora.getMinutes()
    ).padStart(2, "0");

  const ss =
    String(
      agora.getSeconds()
    ).padStart(2, "0");

  ELEMENTO.clock.textContent =
    hh + ":" + mm + ":" + ss;

  ELEMENTO.date.textContent =
    formatarDataHora(
      agora
    ).split(" às ")[0];

}


/* =========================================================
   DATA / HORA
   ========================================================= */

function formatarDataHora(data) {

  const d =
    data instanceof Date
      ? data
      : new Date(data);

  const dd =
    String(
      d.getDate()
    ).padStart(2, "0");

  const mm =
    String(
      d.getMonth() + 1
    ).padStart(2, "0");

  const aaaa =
    d.getFullYear();

  const hh =
    String(
      d.getHours()
    ).padStart(2, "0");

  const mi =
    String(
      d.getMinutes()
    ).padStart(2, "0");

  const ss =
    String(
      d.getSeconds()
    ).padStart(2, "0");

  return (
    dd +
    "/" +
    mm +
    "/" +
    aaaa +
    " às " +
    hh +
    ":" +
    mi +
    ":" +
    ss
  );

}


/* =========================================================
   NORMALIZAR STATUS
   ========================================================= */

function normalizarStatus(status) {

  const valor =
    String(
      status || ""
    )
      .toLowerCase()
      .trim();

  if (
    [
      "online",
      "ativo",
      "play",
      "playing",
      "1",
      "true"
    ].indexOf(valor) !== -1
  ) {

    return "online";

  }

  if (
    [
      "pausado",
      "paused",
      "pause",
      "2"
    ].indexOf(valor) !== -1
  ) {

    return "pausado";

  }

  if (
    [
      "offline",
      "off",
      "0",
      "false"
    ].indexOf(valor) !== -1
  ) {

    return "offline";

  }

  return "verificando";

}


/* =========================================================
   STATUS VISUAL
   ========================================================= */

function textoStatus(status) {

  const mapa = {

    online:
      "ATIVO",

    pausado:
      "PAUSADO",

    offline:
      "OFFLINE",

    verificando:
      "VERIFICANDO"

  };

  return (
    mapa[status] ||
    "VERIFICANDO"
  );

}


function classeStatus(status) {

  return (
    "status-" +
    (
      status ||
      "verificando"
    )
  );

}


function iconeStatus(status) {

  const mapa = {

    online:
      "🟢",

    pausado:
      "🟡",

    offline:
      "🔴",

    verificando:
      "🔵"

  };

  return (
    mapa[status] ||
    "🔵"
  );

}


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escaparHtml(texto) {

  return String(
    texto == null
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

}


/* =========================================================
   RENDERIZAR CARDS
   ========================================================= */

function renderizarCards() {

  if (
    !ELEMENTO.gridPostos
  ) {
    return;
  }

  ELEMENTO.gridPostos.innerHTML =
    POSTOS.map(
      function (posto) {

        return (

          '<div class="card">' +

            '<div class="card-header">' +

              '<span class="icone">' +
                posto.icone +
              '</span>' +

              '<div>' +

                '<div class="nome">' +
                  escaparHtml(
                    posto.nome
                  ) +
                '</div>' +

                '<div class="codigo">' +
                  escaparHtml(
                    posto.codigo
                  ) +
                '</div>' +

              '</div>' +

              '<span ' +
                'class="status-badge status-verificando" ' +
                'id="status-' +
                posto.codigo +
              '">' +

                '🔵 VERIFICANDO' +

              '</span>' +

            '</div>' +

            '<div class="card-body">' +

              '<div class="linha">' +

                '<strong>Atividade:</strong> ' +

                '<span id="atividade-' +
                  posto.codigo +
                '">' +

                  "—" +

                '</span>' +

              '</div>' +

              '<div class="linha">' +

                '<strong>Atualização:</strong> ' +

                '<span id="atualizacao-' +
                  posto.codigo +
                '">' +

                  "—" +

                '</span>' +

              '</div>' +

              '<div class="linha">' +

                '<strong>Último evento:</strong>' +

              '</div>' +

              '<div class="evento" id="evento-' +
                posto.codigo +
              '">' +

                "Aguardando atualização" +

              '</div>' +

            '</div>' +

            '<div class="card-footer">' +

              '<button ' +
                'class="btn btn-verde" ' +
                'id="btnAtualizar-' +
                posto.codigo +
              '">' +

                "Atualizar" +

              '</button>' +

              '<button ' +
                'class="btn btn-cinza" ' +
                'id="btnHistorico-' +
                posto.codigo +
              '">' +

                "Histórico" +

              '</button>' +

            '</div>' +

          '</div>'

        );

      }
    ).join("");

}


/* =========================================================
   ATUALIZAR CARD
   ========================================================= */

function atualizarCard(posto) {

  const s =
    estado[posto.codigo];

  if (!s) {
    return;
  }

  const elStatus =
    document.getElementById(
      "status-" +
      posto.codigo
    );

  const elAtividade =
    document.getElementById(
      "atividade-" +
      posto.codigo
    );

  const elAtualizacao =
    document.getElementById(
      "atualizacao-" +
      posto.codigo
    );

  const elEvento =
    document.getElementById(
      "evento-" +
      posto.codigo
    );

  if (elStatus) {

    elStatus.textContent =
      iconeStatus(
        s.status
      ) +
      " " +
      textoStatus(
        s.status
      );

    elStatus.className =
      "status-badge " +
      classeStatus(
        s.status
      );

  }

  if (elAtividade) {

    elAtividade.textContent =
      s.evento ||
      "—";

  }

  if (elAtualizacao) {

    elAtualizacao.textContent =
      s.dataHora ||
      "—";

  }

  if (elEvento) {

    elEvento.textContent =
      s.evento ||
      "—";

  }

}


/* =========================================================
   AVISO
   ========================================================= */

function fazerAviso(posto) {

  if (
    !ELEMENTO.avisoPosto
  ) {
    return;
  }

  const s =
    estado[posto.codigo];

  if (!s) {
    return;
  }

  if (
    s.status === "offline"
  ) {

    ELEMENTO.avisoTitulo.textContent =
      "🔴 ALERTA — " +
      posto.nome +
      " OFFLINE";

    ELEMENTO.avisoTexto.textContent =
      "O rádio deste posto está fora do ar. " +
      "Último evento: " +
      (
        s.evento ||
        "—"
      ) +
      ". Atualização: " +
      s.dataHora +
      ".";

    ELEMENTO.avisoPosto
      .classList
      .add("visivel");

    return;

  }

  if (
    s.status === "pausado"
  ) {

    ELEMENTO.avisoTitulo.textContent =
      "🟡 ATENÇÃO — " +
      posto.nome +
      " PAUSADO";

    ELEMENTO.avisoTexto.textContent =
      "O rádio deste posto está pausado. " +
      "Último evento: " +
      (
        s.evento ||
        "—"
      ) +
      ". Atualização: " +
      s.dataHora +
      ".";

    ELEMENTO.avisoPosto
      .classList
      .add("visivel");

    return;

  }

  if (
    s.status === "online"
  ) {

    ELEMENTO.avisoTitulo.textContent =
      "🟢 " +
      posto.nome +
      " ATIVO";

    ELEMENTO.avisoTexto.textContent =
      "O rádio deste posto está funcionando normalmente. " +
      "Último evento: " +
      (
        s.evento ||
        "—"
      ) +
      ".";

    ELEMENTO.avisoPosto
      .classList
      .add("visivel");

    return;

  }

  ELEMENTO.avisoTitulo.textContent =
    "🔵 " +
    posto.nome +
    " — VERIFICANDO";

  ELEMENTO.avisoTexto.textContent =
    "Aguardando a primeira atualização do rádio deste posto.";

  ELEMENTO.avisoPosto
    .classList
    .add("visivel");

}


/* =========================================================
   ATUALIZAR TODOS OS CARDS
   ========================================================= */

function atualizarTodosOsCards() {

  POSTOS.forEach(
    function (posto) {

      atualizarCard(
        posto
      );

    }
  );

  atualizarResumo();

  salvarStorage();

  if (
    POSTO_ATUAL
  ) {

    fazerAviso(
      POSTO_ATUAL
    );

  }

}


/* =========================================================
   RESUMO
   ========================================================= */

function atualizarResumo() {

  let ativos =
    0;

  let pausados =
    0;

  let verificando =
    0;

  POSTOS.forEach(
    function (posto) {

      const status =
        estado[
          posto.codigo
        ].status;

      if (
        status === "online"
      ) {

        ativos++;

      } else if (
        status === "pausado"
      ) {

        pausados++;

      } else {

        verificando++;

      }

    }
  );

  if (
    ELEMENTO.totalPostos
  ) {

    ELEMENTO.totalPostos.textContent =
      POSTOS.length;

  }

  if (
    ELEMENTO.totalAtivos
  ) {

    ELEMENTO.totalAtivos.textContent =
      ativos;

  }

  if (
    ELEMENTO.totalPausados
  ) {

    ELEMENTO.totalPausados.textContent =
      pausados;

  }

  if (
    ELEMENTO.totalVerificando
  ) {

    ELEMENTO.totalVerificando.textContent =
      verificando;

  }

}


/* =========================================================
   STATUS DO SISTEMA
   ========================================================= */

function statusDoSistema(texto) {

  if (
    ELEMENTO.systemStatus
  ) {

    ELEMENTO.systemStatus.textContent =
      texto;

  }

}


/* =========================================================
   ÚLTIMA ATUALIZAÇÃO
   ========================================================= */

function atualizarUltimaAtualizacao() {

  if (
    ELEMENTO.lastUpdate
  ) {

    ELEMENTO.lastUpdate.textContent =
      "Última atualização: " +
      formatarDataHora(
        new Date()
      );

  }

}


/* =========================================================
   CONSULTAR API
   ========================================================= */

function consultarApi() {

  statusDoSistema(
    "Consultando API..."
  );

  const url =
    API_URL +
    "?chave=" +
    encodeURIComponent(
      CHAVE
    );

  fetch(
    url,
    {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    }
  )

    .then(
      function (res) {

        if (!res.ok) {

          throw new Error(
            "HTTP " +
            res.status
          );

        }

        return res.json();

      }
    )

    .then(
      function (resposta) {

        if (
          !resposta ||
          resposta.ok === false
        ) {

          throw new Error(
            resposta &&
            resposta.mensagem
              ? resposta.mensagem
              : "Resposta inválida"
          );

        }

        aplicarResultado(
          resposta
        );

        statusDoSistema(
          "Sistema online"
        );

      }
    )

    .catch(
      function (erro) {

        console.error(
          "Erro ao consultar API:",
          erro
        );

        statusDoSistema(
          "Falha ao consultar API."
        );

      }
    );

}


/* =========================================================
   APLICAR RESULTADO
   ========================================================= */

function aplicarResultado(
  resposta
) {

  if (
    !resposta ||
    resposta.ok === false
  ) {
    return;
  }

  const dados =
    resposta.dados ||
    {};

  POSTOS.forEach(
    function (posto) {

      const item =
        dados[
          posto.codigo
        ];

      if (item) {

        interpretarRespostaDaApi(
          item
        );

      }

    }
  );

  atualizarTodosOsCards();

  atualizarUltimaAtualizacao();

}


/* =========================================================
   INTERPRETAR API
   ========================================================= */

function interpretarRespostaDaApi(
  item
) {

  if (!item) {
    return;
  }

  const codigo =
    String(
      item.codigo ||
      ""
    )
      .toLowerCase()
      .trim();

  if (!estado[codigo]) {
    return;
  }

  estado[codigo].status =
    normalizarStatus(
      item.status
    );

  estado[codigo].evento =
    item.evento ||
    estado[codigo].evento;

  estado[codigo].dataHora =
    item.dataHora ||
    estado[codigo].dataHora;

  if (
    item.timestamp
  ) {

    estado[codigo].timestamp =
      Number(
        item.timestamp
      );

  }

  if (
    item.idEvento
  ) {

    estado[codigo].idEvento =
      String(
        item.idEvento
      );

  }

}


/* =========================================================
   HISTÓRICO
   ========================================================= */

function registrarHistorico(
  codigo,
  item
) {

  const chave =
    "historico_" +
    codigo;

  let lista = [];

  try {

    lista =
      JSON.parse(
        localStorage.getItem(
          chave
        ) ||
        "[]"
      );

  } catch (erro) {

    lista = [];

  }

  const novoEvento = {

    codigo:
      codigo,

    posto:
      estado[codigo]
        ? estado[codigo].nome
        : codigo,

    evento:
      item.evento ||
      "",

    status:
      normalizarStatus(
        item.status
      ),

    dataHora:
      item.dataHora ||
      formatarDataHora(
        new Date()
      ),

    timestamp:
      item.timestamp
        ? Number(
            item.timestamp
          )
        : Date.now(),

    idEvento:
      item.idEvento ||
      ""

  };


  /*
   * Evita duplicar o mesmo ID.
   */
  if (
    novoEvento.idEvento &&
    lista.some(
      function (h) {

        return (
          String(h.idEvento) ===
          String(novoEvento.idEvento)
        );

      }
    )
  ) {

    return;

  }


  lista.unshift(
    novoEvento
  );


  if (
    lista.length > 100
  ) {

    lista =
      lista.slice(
        0,
        100
      );

  }


  try {

    localStorage.setItem(
      chave,
      JSON.stringify(
        lista
      )
    );

  } catch (erro) {

    console.warn(
      "Falha ao salvar histórico:",
      erro
    );

  }

}


/* =========================================================
   ATUALIZAR UM POSTO
   ========================================================= */

function atualizarUmPosto(
  codigo
) {

  const posto =
    POSTOS.find(
      function (p) {

        return p.codigo === codigo;

      }
    );

  if (!posto) {
    return;
  }

  statusDoSistema(
    "Consultando " +
    posto.nome +
    "..."
  );

  const url =
    API_URL +
    "?chave=" +
    encodeURIComponent(
      CHAVE
    ) +
    "&posto=" +
    encodeURIComponent(
      codigo
    );

  fetch(
    url,
    {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    }
  )

    .then(
      function (res) {

        if (!res.ok) {

          throw new Error(
            "HTTP " +
            res.status
          );

        }

        return res.json();

      }
    )

    .then(
      function (resposta) {

        if (
          !resposta ||
          resposta.ok === false
        ) {

          throw new Error(
            resposta &&
            resposta.mensagem
              ? resposta.mensagem
              : "Falha"
          );

        }

        const item =
          resposta.dados ||
          resposta;

        if (
          item &&
          item.codigo
        ) {

          interpretarRespostaDaApi(
            item
          );

          atualizarCard(
            posto
          );

          if (
            POSTO_ATUAL &&
            POSTO_ATUAL.codigo ===
              posto.codigo
          ) {

            fazerAviso(
              posto
            );

          }

          atualizarResumo();

          salvarStorage();

          atualizarUltimaAtualizacao();

          statusDoSistema(
            "Sistema online"
          );

        } else {

          statusDoSistema(
            "Nenhum dado recebido."
          );

        }

      }
    )

    .catch(
      function (erro) {

        console.error(
          "Erro ao consultar posto:",
          erro
        );

        statusDoSistema(
          "Falha ao consultar " +
          posto.nome +
          "."
        );

      }
    );

}


/* =========================================================
   GERAR ID DO EVENTO
   ========================================================= */

function gerarIdEvento(
  posto,
  evento
) {

  return (
    String(
      evento || "EVENTO"
    )
      .toUpperCase()
      .replace(
        /[^A-Z0-9À-Ú]+/gi,
        "_"
      ) +
    "_" +
    posto.codigo +
    "_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 11)
  );

}


/* =========================================================
   MONTAR URL DO ALERTA
   ========================================================= */

function montarUrlAlerta(
  posto,
  evento,
  status,
  idEvento
) {

  return (
    API_URL +

    "?chave=" +
    encodeURIComponent(
      CHAVE
    ) +

    "&codigo=" +
    encodeURIComponent(
      posto.codigo
    ) +

    "&posto=" +
    encodeURIComponent(
      posto.nome
    ) +

    "&evento=" +
    encodeURIComponent(
      evento
    ) +

    "&status=" +
    encodeURIComponent(
      status
    ) +

    "&idEvento=" +
    encodeURIComponent(
      idEvento
    )
  );

}


/* =========================================================
   ENVIAR ALERTA
   =========================================================
   
   IMPORTANTE:
   
   Não dependemos somente de fetch().
   
   O primeiro envio é feito através de Image().
   
   Isso permite que o navegador faça a requisição
   GET ao Google Apps Script sem depender de CORS
   para liberar a resposta para o JavaScript.
   ========================================================= */

function enviarAlerta(
  posto,
  evento,
  status
) {

  if (!posto) {

    console.error(
      "❌ Posto não informado."
    );

    return;

  }


  if (!evento) {

    console.error(
      "❌ Evento não informado."
    );

    return;

  }


  const idEvento =
    gerarIdEvento(
      posto,
      evento
    );


  const url =
    montarUrlAlerta(
      posto,
      evento,
      status,
      idEvento
    );


  console.log(
    "================================="
  );

  console.log(
    "ENVIANDO ALERTA POR E-MAIL"
  );

  console.log(
    "POSTO:",
    posto.nome
  );

  console.log(
    "CÓDIGO:",
    posto.codigo
  );

  console.log(
    "EVENTO:",
    evento
  );

  console.log(
    "STATUS:",
    status
  );

  console.log(
    "ID:",
    idEvento
  );

  console.log(
    "URL DO ALERTA PREPARADA."
  );

  console.log(
    "================================="
  );


  /*
   * =======================================================
   * MÉTODO PRINCIPAL
   * IMAGE BEACON
   * =======================================================
   */

  try {

    const beacon =
      new Image();

    beacon.onload =
      function () {

        console.log(
          "🟢 Google Apps Script recebeu a requisição."
        );

      };


    beacon.onerror =
      function () {

        console.warn(
          "⚠️ Image Beacon não retornou confirmação visual."
        );

      };


    /*
     * Cache-busting adicional.
     *
     * Garante que o navegador não reutilize
     * uma requisição anterior.
     */
    beacon.src =
      url +
      "&_cache=" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2);


    console.log(
      "🟢 Chamada do alerta realizada."
    );

  } catch (erro) {

    console.error(
      "❌ Erro no Image Beacon:",
      erro
    );

  }


  /*
   * =======================================================
   * CONFIRMAÇÃO SECUNDÁRIA
   * =======================================================
   *
   * Também fazemos fetch.
   *
   * Mesmo que o navegador bloqueie a leitura da resposta
   * por CORS, a requisição já terá sido disparada.
   */

  try {

    fetch(
      url +
      "&_fetch=" +
      Date.now(),
      {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        keepalive: true
      }
    )

      .then(
        function () {

          console.log(
            "🟢 Requisição secundária enviada ao Apps Script."
          );

        }
      )

      .catch(
        function (erro) {

          console.warn(
            "⚠️ A confirmação fetch não pôde ser lida:",
            erro
          );

        }
      );

  } catch (erro) {

    console.warn(
      "⚠️ Fetch secundário não realizado:",
      erro
    );

  }

}


/* =========================================================
   REGISTRAR EVENTO LOCAL
   ========================================================= */

function registrarEventoLocal(
  posto,
  evento,
  status,
  idEvento
) {

  if (!posto) {
    return;
  }

  const agora =
    new Date();

  const item = {

    codigo:
      posto.codigo,

    posto:
      posto.nome,

    evento:
      evento,

    status:
      status,

    dataHora:
      formatarDataHora(
        agora
      ),

    timestamp:
      agora.getTime(),

    idEvento:
      idEvento || ""

  };


  estado[posto.codigo].status =
    normalizarStatus(
      status
    );

  estado[posto.codigo].evento =
    evento;

  estado[posto.codigo].dataHora =
    item.dataHora;

  estado[posto.codigo].timestamp =
    item.timestamp;

  estado[posto.codigo].idEvento =
    item.idEvento;


  registrarHistorico(
    posto.codigo,
    item
  );


  atualizarCard(
    posto
  );

  fazerAviso(
    posto
  );

  atualizarResumo();

  salvarStorage();

}


/* =========================================================
   PLAYER INICIADO
   ========================================================= */

function registrarPlayerIniciado() {

  if (!POSTO_ATUAL) {

    console.warn(
      "Nenhum posto definido na URL."
    );

    return;

  }

  const posto =
    POSTO_ATUAL;

  const evento =
    "PLAYER INICIADO / RÁDIO RESTABELECIDA";

  const status =
    "online";

  const idEvento =
    gerarIdEvento(
      posto,
      evento
    );


  console.log(
    "================================="
  );

  console.log(
    "EVENTO REGISTRADO"
  );

  console.log(
    "POSTO:",
    posto.nome
  );

  console.log(
    "EVENTO:",
    evento
  );

  console.log(
    "STATUS:",
    status
  );

  console.log(
    "DATA/HORA:",
    formatarDataHora(
      new Date()
    )
  );

  console.log(
    "ID:",
    idEvento
  );

  console.log(
    "================================="
  );


  registrarEventoLocal(
    posto,
    evento,
    status,
    idEvento
  );


  enviarAlertaComId(
    posto,
    evento,
    status,
    idEvento
  );

}


/* =========================================================
   PLAYER PAUSADO
   ========================================================= */

function registrarPlayerPausado() {

  if (!POSTO_ATUAL) {

    console.warn(
      "Nenhum posto definido na URL."
    );

    return;

  }

  const posto =
    POSTO_ATUAL;

  const evento =
    "PLAYER PAUSADO";

  const status =
    "pausado";

  const idEvento =
    gerarIdEvento(
      posto,
      evento
    );


  console.log(
    "================================="
  );

  console.log(
    "EVENTO REGISTRADO"
  );

  console.log(
    "POSTO:",
    posto.nome
  );

  console.log(
    "EVENTO:",
    evento
  );

  console.log(
    "STATUS:",
    status
  );

  console.log(
    "DATA/HORA:",
    formatarDataHora(
      new Date()
    )
  );

  console.log(
    "ID:",
    idEvento
  );

  console.log(
    "================================="
  );


  registrarEventoLocal(
    posto,
    evento,
    status,
    idEvento
  );


  enviarAlertaComId(
    posto,
    evento,
    status,
    idEvento
  );

}


/* =========================================================
   PLAYER OFFLINE
   ========================================================= */

function registrarPlayerOffline() {

  if (!POSTO_ATUAL) {

    console.warn(
      "Nenhum posto definido na URL."
    );

    return;

  }

  const posto =
    POSTO_ATUAL;

  const evento =
    "RÁDIO OFFLINE";

  const status =
    "offline";

  const idEvento =
    gerarIdEvento(
      posto,
      evento
    );


  console.log(
    "================================="
  );

  console.log(
    "EVENTO REGISTRADO"
  );

  console.log(
    "POSTO:",
    posto.nome
  );

  console.log(
    "EVENTO:",
    evento
  );

  console.log(
    "STATUS:",
    status
  );

  console.log(
    "DATA/HORA:",
    formatarDataHora(
      new Date()
    )
  );

  console.log(
    "ID:",
    idEvento
  );

  console.log(
    "================================="
  );


  registrarEventoLocal(
    posto,
    evento,
    status,
    idEvento
  );


  enviarAlertaComId(
    posto,
    evento,
    status,
    idEvento
  );

}


/* =========================================================
   RÁDIO RESTABELECIDA
   ========================================================= */

function registrarRadioRestabelecida() {

  if (!POSTO_ATUAL) {
    return;
  }

  const posto =
    POSTO_ATUAL;

  const evento =
    "RÁDIO RESTABELECIDA";

  const status =
    "online";

  const idEvento =
    gerarIdEvento(
      posto,
      evento
    );


  console.log(
    "================================="
  );

  console.log(
    "EVENTO REGISTRADO"
  );

  console.log(
    "POSTO:",
    posto.nome
  );

  console.log(
    "EVENTO:",
    evento
  );

  console.log(
    "STATUS:",
    status
  );

  console.log(
    "DATA/HORA:",
    formatarDataHora(
      new Date()
    )
  );

  console.log(
    "ID:",
    idEvento
  );

  console.log(
    "================================="
  );


  registrarEventoLocal(
    posto,
    evento,
    status,
    idEvento
  );


  enviarAlertaComId(
    posto,
    evento,
    status,
    idEvento
  );

}


/* =========================================================
   ENVIAR ALERTA COM ID JÁ GERADO
   ========================================================= */

function enviarAlertaComId(
  posto,
  evento,
  status,
  idEvento
) {

  if (!posto) {
    return;
  }

  const url =
    montarUrlAlerta(
      posto,
      evento,
      status,
      idEvento
    );


  console.log(
    "================================="
  );

  console.log(
    "ENVIANDO ALERTA POR E-MAIL"
  );

  console.log(
    "POSTO:",
    posto.nome
  );

  console.log(
    "EVENTO:",
    evento
  );

  console.log(
    "STATUS:",
    status
  );

  console.log(
    "ID:",
    idEvento
  );

  console.log(
    "================================="
  );

  console.log(
    "URL DO ALERTA PREPARADA."
  );


  /*
   * IMAGE BEACON
   */

  try {

    const imagem =
      new Image();

    imagem.onload =
      function () {

        console.log(
          "🟢 Google Apps Script respondeu à chamada."
        );

      };

    imagem.onerror =
      function () {

        console.log(
          "🟡 Requisição enviada. O navegador não permite confirmar a resposta."
        );

      };


    imagem.src =
      url +
      "&_t=" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 10);


    console.log(
      "🟢 Chamada do alerta realizada."
    );

  } catch (erro) {

    console.error(
      "❌ Falha ao disparar alerta:",
      erro
    );

  }


  /*
   * FETCH SECUNDÁRIO
   */

  try {

    fetch(
      url +
      "&_confirmacao=" +
      Date.now(),
      {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        keepalive: true
      }
    )
      .then(
        function () {

          console.log(
            "🟢 Chamada secundária enviada."
          );

        }
      )
      .catch(
        function (erro) {

          console.warn(
            "⚠️ Não foi possível confirmar fetch:",
            erro
          );

        }
      );

  } catch (erro) {

    console.warn(
      "⚠️ Fetch secundário falhou:",
      erro
    );

  }

}


/* =========================================================
   HISTÓRICO — ABRIR
   ========================================================= */

function abrirHistorico(
  codigo
) {

  const posto =
    POSTOS.find(
      function (p) {

        return p.codigo === codigo;

      }
    );

  if (!posto) {
    return;
  }

  if (
    ELEMENTO.modalStationName
  ) {

    ELEMENTO.modalStationName.textContent =
      "Histórico — " +
      posto.nome;

  }

  const chave =
    "historico_" +
    codigo;

  let lista = [];

  try {

    lista =
      JSON.parse(
        localStorage.getItem(
          chave
        ) ||
        "[]"
      );

  } catch (erro) {

    lista = [];

  }


  if (
    !lista.length
  ) {

    if (
      ELEMENTO.historyList
    ) {

      ELEMENTO.historyList.innerHTML =
        "<li>Nenhum evento registrado.</li>";

    }

  } else {

    if (
      ELEMENTO.historyList
    ) {

      ELEMENTO.historyList.innerHTML =
        lista
          .map(
            function (h) {

              return (

                "<li>" +

                  '<span class="h-status">' +

                    iconeStatus(
                      h.status
                    ) +

                    " " +

                    textoStatus(
                      h.status
                    ) +

                  "</span>" +

                  " — " +

                  escaparHtml(
                    h.evento
                  ) +

                  " — " +

                  escaparHtml(
                    h.dataHora
                  ) +

                "</li>"

              );

            }
          )
          .join("");

    }

  }


  if (
    ELEMENTO.historyModal
  ) {

    ELEMENTO.historyModal.hidden =
      false;

  }

}


/* =========================================================
   FECHAR HISTÓRICO
   ========================================================= */

function fecharHistorico() {

  if (
    ELEMENTO.historyModal
  ) {

    ELEMENTO.historyModal.hidden =
      true;

  }

}


/* =========================================================
   CONFIGURAR MODAL
   ========================================================= */

function configurarModal() {

  if (
    ELEMENTO.btnFecharHistorico
  ) {

    ELEMENTO
      .btnFecharHistorico
      .addEventListener(
        "click",
        fecharHistorico
      );

  }


  if (
    ELEMENTO.historyModal
  ) {

    ELEMENTO
      .historyModal
      .addEventListener(
        "click",
        function (e) {

          if (
            e.target ===
            ELEMENTO.historyModal
          ) {

            fecharHistorico();

          }

        }
      );

  }


  document.addEventListener(
    "keydown",
    function (e) {

      if (
        e.key === "Escape"
      ) {

        fecharHistorico();

      }

    }
  );

}


/* =========================================================
   BOTÕES DOS POSTOS
   ========================================================= */

function configurarBotoesDosPostos() {

  POSTOS.forEach(
    function (posto) {

      const btnAtualizar =
        document.getElementById(
          "btnAtualizar-" +
          posto.codigo
        );

      const btnHistorico =
        document.getElementById(
          "btnHistorico-" +
          posto.codigo
        );


      if (
        btnAtualizar
      ) {

        btnAtualizar
          .addEventListener(
            "click",
            function () {

              atualizarUmPosto(
                posto.codigo
              );

            }
          );

      }


      if (
        btnHistorico
      ) {

        btnHistorico
          .addEventListener(
            "click",
            function () {

              abrirHistorico(
                posto.codigo
              );

            }
          );

      }

    }
  );

}


/* =========================================================
   BOTÃO ATUALIZAR TODOS
   ========================================================= */

function configurarBotaoAtualizarTodos() {

  if (
    !ELEMENTO.btnAtualizarTodos
  ) {
    return;
  }

  ELEMENTO
    .btnAtualizarTodos
    .addEventListener(
      "click",
      consultarApi
    );

}


/* =========================================================
   AUTO ATUALIZAÇÃO
   ========================================================= */

function configurarAutoAtualizacao() {

  setInterval(
    consultarApi,
    INTERVALO_ATUALIZACAO
  );

  atualizarRelogio();

  setInterval(
    atualizarRelogio,
    1000
  );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function inicializar() {

  console.log(
    "================================="
  );

  console.log(
    "MONITORAMENTO DE RÁDIO"
  );

  console.log(
    "POSTOS GRACIOSA"
  );

  console.log(
    "VERSÃO COM ENVIO DE ALERTA CORRIGIDO"
  );

  console.log(
    "================================="
  );


  console.log(
    "Posto atual:",
    POSTO_ATUAL
      ? POSTO_ATUAL.codigo
      : "TODOS"
  );


  if (
    POSTO_ATUAL &&
    ELEMENTO.descricaoPagina
  ) {

    ELEMENTO
      .descricaoPagina
      .textContent =
        "Acompanhe em tempo real o status do rádio de " +
        POSTO_ATUAL.nome +
        ".";


    document.title =
      "Monitoramento de Rádio | " +
      POSTO_ATUAL.nome;

  }


  criarEstadoInicial();

  carregarStorage();

  renderizarCards();

  atualizarTodosOsCards();

  configurarModal();

  configurarBotoesDosPostos();

  configurarBotaoAtualizarTodos();

  configurarAutoAtualizacao();


  /*
   * PRIMEIRA CONSULTA
   */

  consultarApi();


  console.log(
    "Monitoramento inicializado."
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
    inicializar
  );

} else {

  inicializar();

}


/* =========================================================
   FUNÇÕES GLOBAIS
   ========================================================= */

window.registrarPlayerIniciado =
  registrarPlayerIniciado;

window.registrarPlayerPausado =
  registrarPlayerPausado;

window.registrarPlayerOffline =
  registrarPlayerOffline;

window.registrarRadioRestabelecida =
  registrarRadioRestabelecida;

window.enviarAlerta =
  enviarAlerta;


/* =========================================================
   FIM DO APP.JS
   ========================================================= */

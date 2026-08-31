
/* =========================================================
   MONITORAMENTO DE RÁDIO | POSTOS GRACIOSA
   APP.JS COMPLETO

   FUNÇÕES:
   - Detecta o posto pela URL ?posto=
   - Monitora o player
   - Detecta PLAY / PAUSE / OFFLINE
   - Envia eventos para o Google Apps Script
   - Funciona para os 6 postos
   - Evita envio repetido
   - Permite recuperação do rádio
   - Recebe eventos via postMessage
   - Mantém histórico local
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
  "monitor_radio_graciosa_v3";

const STORAGE_ALERTAS =
  "monitor_radio_alertas_v3";

/*
 * Tempo mínimo para repetir exatamente
 * o mesmo evento do mesmo posto.
 *
 * Exemplo:
 * PAUSE + BEMER enviado agora.
 * Outro PAUSE + BEMER dentro de 2 minutos
 * não gera outro e-mail.
 */
const INTERVALO_ANTI_DUPLICACAO =
  2 * 60 * 1000;


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
 * Com ?posto=xxx:
 * monitora somente aquele posto.
 *
 * Sem ?posto=:
 * mostra todos.
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
   CONTROLE DE ALERTAS
   ========================================================= */

let controleAlertas = {};


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
   CARREGAR STORAGE
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
   CARREGAR CONTROLE DE ALERTAS
   ========================================================= */

function carregarControleAlertas() {

  try {

    const salvo =
      localStorage.getItem(
        STORAGE_ALERTAS
      );

    if (!salvo) {
      controleAlertas = {};
      return;
    }

    const dados =
      JSON.parse(salvo);

    if (
      dados &&
      typeof dados === "object"
    ) {

      controleAlertas =
        dados;

    }

  } catch (erro) {

    console.warn(
      "Erro ao carregar controle de alertas:",
      erro
    );

    controleAlertas = {};

  }

}


/* =========================================================
   SALVAR CONTROLE DE ALERTAS
   ========================================================= */

function salvarControleAlertas() {

  try {

    localStorage.setItem(
      STORAGE_ALERTAS,
      JSON.stringify(
        controleAlertas
      )
    );

  } catch (erro) {

    console.warn(
      "Erro ao salvar controle de alertas:",
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
   FORMATAR DATA / HORA
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
      "played",
      "start",
      "started",
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
      "error",
      "failed",
      "failure",
      "0",
      "false"
    ].indexOf(valor) !== -1
  ) {

    return "offline";

  }

  return "verificando";

}


/* =========================================================
   NORMALIZAR EVENTO
   ========================================================= */

function normalizarEvento(evento) {

  const valor =
    String(
      evento || ""
    )
      .toLowerCase()
      .trim();

  if (
    [
      "play",
      "playing",
      "start",
      "started",
      "player_started",
      "player iniciado",
      "player iniciado / rádio restabelecida"
    ].indexOf(valor) !== -1
  ) {

    return {
      evento: "PLAYER INICIADO",
      status: "online"
    };

  }

  if (
    [
      "pause",
      "paused",
      "player_paused",
      "player pausado"
    ].indexOf(valor) !== -1
  ) {

    return {
      evento: "PLAYER PAUSADO",
      status: "pausado"
    };

  }

  if (
    [
      "offline",
      "off",
      "radio_offline",
      "rádio offline",
      "radio offline"
    ].indexOf(valor) !== -1
  ) {

    return {
      evento: "RÁDIO OFFLINE",
      status: "offline"
    };

  }

  if (
    [
      "online",
      "restabelecida",
      "restabelecido",
      "radio_online",
      "rádio restabelecida",
      "radio restabelecida"
    ].indexOf(valor) !== -1
  ) {

    return {
      evento: "RÁDIO RESTABELECIDA",
      status: "online"
    };

  }

  return null;

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
   AVISO VISUAL
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
   VERIFICAR DUPLICIDADE
   ========================================================= */

function podeEnviarAlerta(
  posto,
  evento,
  status
) {

  const chave =
    posto.codigo +
    "|" +
    evento +
    "|" +
    status;

  const agora =
    Date.now();

  const ultimo =
    Number(
      controleAlertas[chave] ||
      0
    );

  if (
    ultimo > 0 &&
    agora - ultimo <
      INTERVALO_ANTI_DUPLICACAO
  ) {

    console.warn(
      "⚠️ ALERTA IGNORADO POR DUPLICIDADE:",
      chave
    );

    return false;

  }

  controleAlertas[chave] =
    agora;

  salvarControleAlertas();

  return true;

}


/* =========================================================
   ENVIAR ALERTA
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

    return false;

  }

  evento =
    String(
      evento || "EVENTO"
    ).trim();

  status =
    normalizarStatus(
      status
    );


  /*
   * Evita repetição.
   */
  if (
    !podeEnviarAlerta(
      posto,
      evento,
      status
    )
  ) {

    return false;

  }


  /*
   * ID ÚNICO.
   */
  const idEvento =
    evento
      .toUpperCase()
      .replace(
        /\s+/g,
        "_"
      ) +
    "_" +
    posto.codigo +
    "_" +
    Date.now();


  /*
   * URL FINAL.
   */
  const url =
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
    );


  console.log(
    "================================="
  );

  console.log(
    "🚨 ENVIANDO ALERTA"
  );

  console.log(
    "Posto:",
    posto.nome
  );

  console.log(
    "Código:",
    posto.codigo
  );

  console.log(
    "Evento:",
    evento
  );

  console.log(
    "Status:",
    status
  );

  console.log(
    "ID:",
    idEvento
  );

  console.log(
    "URL:",
    url
  );

  console.log(
    "================================="
  );


  /*
   * IMPORTANTE:
   *
   * Não usamos somente fetch().
   *
   * O Apps Script pode redirecionar a requisição
   * e o navegador pode bloquear a leitura da resposta
   * por CORS.
   *
   * Uma imagem faz um GET simples sem precisar
   * ler a resposta.
   *
   * O Code.gs recebe a requisição normalmente
   * e executa MailApp.sendEmail().
   */
  try {

    const img =
      new Image();

    img.onload =
      function () {

        console.log(
          "✅ Requisição de alerta concluída:",
          posto.nome
        );

      };

    img.onerror =
      function () {

        /*
         * Mesmo que o navegador informe erro
         * por causa do redirecionamento do Apps Script,
         * a requisição pode ter chegado ao servidor.
         */
        console.warn(
          "⚠️ Navegador informou erro após enviar alerta:",
          posto.nome
        );

      };

    img.src =
      url +
      "&_t=" +
      Date.now();

  } catch (erro) {

    console.error(
      "❌ ERRO AO ENVIAR ALERTA:",
      erro
    );

    return false;

  }


  console.log(
    "📨 ALERTA PREPARADO PARA:",
    posto.nome
  );

  return true;

}


/* =========================================================
   REGISTRAR EVENTO LOCAL
   ========================================================= */

function registrarEvento(
  posto,
  evento,
  status,
  enviarEmail
) {

  if (!posto) {
    return;
  }

  if (
    !estado[posto.codigo]
  ) {
    return;
  }


  const novoStatus =
    normalizarStatus(
      status
    );

  const agora =
    new Date();


  estado[posto.codigo].status =
    novoStatus;

  estado[posto.codigo].evento =
    evento;

  estado[posto.codigo].dataHora =
    formatarDataHora(
      agora
    );

  estado[posto.codigo].timestamp =
    agora.getTime();


  atualizarCard(
    posto
  );

  fazerAviso(
    posto
  );

  atualizarResumo();

  salvarStorage();


  /*
   * Registra histórico.
   */
  registrarHistorico(
    posto.codigo,
    {
      codigo:
        posto.codigo,

      evento:
        evento,

      status:
        novoStatus,

      dataHora:
        formatarDataHora(
          agora
        ),

      timestamp:
        agora.getTime()
    }
  );


  /*
   * Envia e-mail.
   */
  if (
    enviarEmail !== false
  ) {

    enviarAlerta(
      posto,
      evento,
      novoStatus
    );

  }

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

  registrarEvento(
    POSTO_ATUAL,
    "PLAYER INICIADO",
    "online",
    true
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

  registrarEvento(
    POSTO_ATUAL,
    "PLAYER PAUSADO",
    "pausado",
    true
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

  registrarEvento(
    POSTO_ATUAL,
    "RÁDIO OFFLINE",
    "offline",
    true
  );

}


/* =========================================================
   RÁDIO RESTABELECIDA
   ========================================================= */

function registrarRadioRestabelecida() {

  if (!POSTO_ATUAL) {

    console.warn(
      "Nenhum posto definido na URL."
    );

    return;

  }

  registrarEvento(
    POSTO_ATUAL,
    "RÁDIO RESTABELECIDA",
    "online",
    true
  );

}


/* =========================================================
   RECEBER EVENTOS DO PLAYER VIA postMessage
   =========================================================
   
   O player/iframe pode enviar:

   {
     evento: "pause"
   }

   ou:

   {
     status: "paused"
   }

   ou:

   {
     evento: "PLAYER PAUSADO"
   }

   Também aceita strings.
   ========================================================= */

function processarMensagemDoPlayer(
  eventoRecebido
) {

  if (!POSTO_ATUAL) {

    console.warn(
      "Mensagem recebida, mas nenhum posto foi definido."
    );

    return;

  }


  let dados =
    eventoRecebido;


  /*
   * Se vier como string JSON,
   * tenta converter.
   */
  if (
    typeof dados === "string"
  ) {

    try {

      dados =
        JSON.parse(
          dados
        );

    } catch (erro) {

      dados = {
        evento:
          dados
      };

    }

  }


  /*
   * Se vier dentro de data.
   */
  if (
    dados &&
    dados.data
  ) {

    if (
      typeof dados.data === "object"
    ) {

      dados =
        dados.data;

    } else {

      try {

        dados =
          JSON.parse(
            dados.data
          );

      } catch (erro) {

        dados = {
          evento:
            dados.data
        };

      }

    }

  }


  if (
    !dados
  ) {
    return;
  }


  const eventoOriginal =
    dados.evento ||
    dados.event ||
    dados.type ||
    dados.action ||
    dados.status ||
    "";


  const normalizado =
    normalizarEvento(
      eventoOriginal
    );


  /*
   * Caso não tenha reconhecido pelo evento,
   * tenta pelo status.
   */
  let resultado =
    normalizado;


  if (
    !resultado &&
    dados.status
  ) {

    resultado =
      normalizarEvento(
        dados.status
      );

  }


  if (!resultado) {

    console.log(
      "Mensagem do player não reconhecida:",
      dados
    );

    return;

  }


  console.log(
    "🎧 EVENTO RECEBIDO DO PLAYER:",
    resultado.evento,
    resultado.status,
    "POSTO:",
    POSTO_ATUAL.codigo
  );


  registrarEvento(
    POSTO_ATUAL,
    resultado.evento,
    resultado.status,
    true
  );

}


/* =========================================================
   ESCUTAR postMessage
   ========================================================= */

function configurarMonitoramentoDoPlayer() {

  window.addEventListener(
    "message",
    function (event) {

      /*
       * Não bloqueamos por origem aqui porque
       * o player pode utilizar domínio externo.
       *
       * O conteúdo recebido é tratado somente
       * como evento/status.
       */
      console.log(
        "📡 postMessage recebido:",
        event.data
      );


      processarMensagemDoPlayer(
        event.data
      );

    }
  );


  console.log(
    "✅ Monitoramento postMessage ativado."
  );

}


/* =========================================================
   TESTE MANUAL DO ALERTA
   ========================================================= */

function testarAlertaAtual() {

  if (!POSTO_ATUAL) {

    console.error(
      "Abra a página com ?posto=graciosa, ?posto=fatima, etc."
    );

    return;

  }

  const id =
    "TESTE_" +
    POSTO_ATUAL.codigo +
    "_" +
    Date.now();


  const evento =
    "TESTE DE ALERTA";


  const status =
    "offline";


  /*
   * Para teste manual,
   * remove o bloqueio de duplicidade.
   */
  const chave =
    POSTO_ATUAL.codigo +
    "|" +
    evento +
    "|" +
    status;


  delete controleAlertas[chave];

  salvarControleAlertas();


  enviarAlerta(
    POSTO_ATUAL,
    evento,
    status
  );


  console.log(
    "🧪 TESTE ENVIADO:",
    POSTO_ATUAL.nome,
    id
  );

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


  lista.unshift({

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
        : Date.now()

  });


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
   ABRIR HISTÓRICO
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

    ELEMENTO.historyList.innerHTML =
      "<li>Nenhum evento registrado.</li>";

  } else {

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
   MODAL
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


  /*
   * Consulta individual usando parametro
   * que o Code.gs já aceita na consulta.
   */
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
              : "Falha"
          );

        }


        const dados =
          resposta.dados ||
          {};


        const item =
          dados[
            posto.codigo
          ];


        if (
          item
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


  carregarControleAlertas();


  renderizarCards();


  atualizarTodosOsCards();


  configurarModal();


  configurarBotoesDosPostos();


  configurarBotaoAtualizarTodos();


  configurarAutoAtualizacao();


  configurarMonitoramentoDoPlayer();


  consultarApi();


  console.log(
    "✅ Monitoramento inicializado."
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

window.testarAlertaAtual =
  testarAlertaAtual;

window.processarMensagemDoPlayer =
  processarMensagemDoPlayer;


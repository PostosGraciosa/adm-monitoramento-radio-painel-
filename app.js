/* =========================================================
   MONITORAMENTO DE RÁDIO | POSTOS GRACIOSA
   Painel de monitoramento dos rádios dos postos.
   ========================================================= */

/* ========================================================= CONFIGURAÇÕES ========================================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyTJwiUpuNO1a3-u5IGYL6V-sMPZweH4Ph-xT2KS8q9xt0nE0sCG4nnyH4ZrcdP9ZZK/exec";
const INTERVALO_ATUALIZACAO = 60000; // 60 segundos
const CHAVE = "GRACIOSA_RADIO_2026";
const LIMITE_HISTORICO = 100;
const STORAGE = "painel_monitoramento_radio_v1";

/* ========================================================= POSTOS ========================================================= */
const POSTOS = [
  { codigo: "graciosa",   nome: "POSTO GRACIOSA",   icone: "⛽" },
  { codigo: "fatima",     nome: "POSTO FÁTIMA",     icone: "⛽" },
  { codigo: "jariva",     nome: "POSTO JARIVA",     icone: "⛽" },
  { codigo: "bemer",      nome: "POSTO BEMER",      icone: "⛽" },
  { codigo: "graciosa-v", nome: "POSTO GRACIOSA V", icone: "⛽" },
  { codigo: "pirai",      nome: "POSTO PIRAÍ",      icone: "⛽" }
];

/* ========================================================= ESTADO ========================================================= */
let estado = {};

/* ========================================================= ELEMENTO ========================================================= */
const ELEMENTO = {
  clock: document.getElementById("clock"),
  date: document.getElementById("date"),
  totalPostos: document.getElementById("totalPostos"),
  totalAtivos: document.getElementById("totalAtivos"),
  totalPausados: document.getElementById("totalPausados"),
  totalVerificando: document.getElementById("totalVerificando"),
  lastUpdate: document.getElementById("lastUpdate"),
  btnAtualizarTodos: document.getElementById("btnAtualizarTodos"),
  historyModal: document.getElementById("historyModal"),
  modalStationName: document.getElementById("modalStationName"),
  historyList: document.getElementById("historyList"),
  btnFecharHistorico: document.getElementById("btnFecharHistorico"),
  systemStatus: document.getElementById("systemStatus")
};

/* ========================================================= ESTADO INICIAL ========================================================= */
function estadoInicial() {
  POSTOS.forEach(function (posto) {
    estado[posto.codigo] = {
      codigo: posto.codigo,
      nome: posto.nome,
      status: "verificando",
      evento: "Aguardando atualização",
      dataHora: "--/--/---- às --:--:--",
      timestamp: 0
    };
  });
}

/* ========================================================= CARREGAR STORAGE ========================================================= */
function carregarStorage() {
  try {
    const salvo = localStorage.getItem(STORAGE);
    if (!salvo) return false;
    const dados = JSON.parse(salvo);
    if (!dados || typeof dados !== "object") return false;
    Object.keys(dados).forEach(function (codigo) {
      if (estado[codigo]) {
        estado[codigo] = Object.assign({}, estado[codigo], dados[codigo]);
      }
    });
    return true;
  } catch (e) {
    console.warn("Falha ao carregar storage:", e);
    return false;
  }
}

/* ========================================================= SALVAR STORAGE ========================================================= */
function salvarStorage() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(estado));
  } catch (e) {
    console.warn("Falha ao salvar storage:", e);
  }
}

/* ========================================================= RELÓGIO ========================================================= */
function atualizarRelogio() {
  const agora = new Date();
  const hh = String(agora.getHours()).padStart(2, "0");
  const mm = String(agora.getMinutes()).padStart(2, "0");
  const ss = String(agora.getSeconds()).padStart(2, "0");
  ELEMENTO.clock.textContent = hh + ":" + mm + ":" + ss;
  ELEMENTO.date.textContent = formatarDataHora(agora).split(" às ")[0];
}

/* ========================================================= FORMATAR DATA/HORA ========================================================= */
function formatarDataHora(data) {
  const d = data instanceof Date ? data : new Date(data);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aaaa = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return dd + "/" + mm + "/" + aaaa + " às " + hh + ":" + mi + ":" + ss;
}

/* ========================================================= NORMALIZAR STATUS ========================================================= */
function normalizarStatus(s) {
  const valor = String(s || "").toLowerCase().trim();
  if (["online", "ativo", "1", "true"].indexOf(valor) !== -1) return "online";
  if (["pausado", "paused", "pause", "2"].indexOf(valor) !== -1) return "pausado";
  if (["offline", "off", "0", "false"].indexOf(valor) !== -1) return "offline";
  return "verificando";
}

/* ========================================================= TEXTO STATUS ========================================================= */
function textoStatus(status) {
  return {
    online: "ATIVO",
    pausado: "PAUSADO",
    offline: "OFFLINE",
    verificando: "VERIFICANDO"
  }[status] || "VERIFICANDO";
}

/* ========================================================= CLASSE STATUS ========================================================= */
function classeStatus(status) {
  return "status-" + (status || "verificando");
}

/* ========================================================= ÍCONE STATUS ========================================================= */
function iconeStatus(status) {
  return {
    online: "🟢",
    pausado: "🟡",
    offline: "🔴",
    verificando: "🔵"
  }[status] || "🔵";
}

/* ========================================================= ESCAPAR HTML ========================================================= */
function escaparHtml(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ========================================================= ATUALIZAR CARD ========================================================= */
function atualizarCard(posto) {
  const s = estado[posto.codigo];
  const elStatus = document.getElementById("status-" + posto.codigo);
  const elAtividade = document.getElementById("atividade-" + posto.codigo);
  const elAtualizacao = document.getElementById("atualizacao-" + posto.codigo);
  const elEvento = document.getElementById("evento-" + posto.codigo);

  if (elStatus) {
    elStatus.textContent = iconeStatus(s.status) + " " + textoStatus(s.status);
    elStatus.className = "status-badge " + classeStatus(s.status);
  }
  if (elAtividade) elAtividade.textContent = s.evento || "—";
  if (elAtualizacao) elAtualizacao.textContent = s.dataHora || "—";
  if (elEvento) elEvento.textContent = s.evento || "—";
}

/* ========================================================= ATUALIZAR TODOS OS CARDS ========================================================= */
function atualizarTodosOsCards() {
  POSTOS.forEach(atualizarCard);
  atualizarResumo();
  salvarStorage();
}

/* ========================================================= RESUMO ========================================================= */
function atualizarResumo() {
  let ativos = 0, pausados = 0, offline = 0, verificando = 0;
  POSTOS.forEach(function (posto) {
    const st = estado[posto.codigo].status;
    if (st === "online") ativos++;
    else if (st === "pausado") pausados++;
    else if (st === "offline") offline++;
    else verificando++;
  });
  ELEMENTO.totalPostos.textContent = POSTOS.length;
  ELEMENTO.totalAtivos.textContent = ativos;
  ELEMENTO.totalPausados.textContent = pausados;
  ELEMENTO.totalVerificando.textContent = verificando;
}

/* ========================================================= ÚLTIMA ATUALIZAÇÃO ========================================================= */
function atualizarUltimaAtualizacao() {
  ELEMENTO.lastUpdate.textContent = "Última atualização: " + formatarDataHora(new Date());
}

/* ========================================================= STATUS DO SISTEMA ========================================================= */
function statusDoSistema(texto) {
  ELEMENTO.systemStatus.textContent = texto;
}

/* ========================================================= CONSULTAR API ========================================================= */
function consultarApi() {
  statusDoSistema("Consultando API...");
  fetch(API_URL + "?chave=" + encodeURIComponent(CHAVE), {
    method: "GET",
    redirect: "follow"
  })
    .then(function (res) { return res.json(); })
    .then(function (resposta) {
      aplicarResultado(resposta);
      statusDoSistema("Sistema online");
    })
    .catch(function (erro) {
      console.error("Erro ao consultar API:", erro);
      statusDoSistema("Falha ao consultar API. Verifique a conexão.");
    });
}

/* ========================================================= APLICAR RESULTADO ========================================================= */
function aplicarResultado(resposta) {
  if (!resposta || resposta.ok === false) {
    statusDoSistema("Resposta inválida da API.");
    return;
  }
  const dados = resposta.dados || resposta;
  POSTOS.forEach(function (posto) {
    const item = dados[posto.codigo];
    if (item) interpretarRespostaDaApi(item);
  });
  atualizarTodosOsCards();
  atualizarUltimaAtualizacao();
}

/* ========================================================= INTERPRETAR RESPOSTA DA API ========================================================= */
function interpretarRespostaDaApi(item) {
  const codigo = item.codigo;
  if (!estado[codigo]) return;
  const novoStatus = normalizarStatus(item.status);
  const anterior = estado[codigo].status;

  estado[codigo].status = novoStatus;
  estado[codigo].evento = item.evento || estado[codigo].evento;
  estado[codigo].dataHora = item.dataHora || estado[codigo].dataHora;
  if (item.timestamp) estado[codigo].timestamp = Number(item.timestamp);

  if (novoStatus !== anterior) {
    registrarHistorico(codigo, item);
  }
}

/* ========================================================= REGISTRAR HISTÓRICO ========================================================= */
function registrarHistorico(codigo, item) {
  const chave = "historico_" + codigo;
  let lista = [];
  try {
    lista = JSON.parse(localStorage.getItem(chave) || "[]");
  } catch (e) { lista = []; }

  lista.unshift({
    codigo: codigo,
    posto: estado[codigo].nome,
    evento: item.evento || "",
    status: normalizarStatus(item.status),
    dataHora: item.dataHora || formatarDataHora(new Date()),
    timestamp: item.timestamp ? Number(item.timestamp) : Date.now()
  });

  if (lista.length > LIMITE_HISTORICO) lista = lista.slice(0, LIMITE_HISTORICO);
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
  } catch (e) {
    console.warn("Falha ao salvar histórico:", e);
  }
}

/* ========================================================= ATUALIZAR UM POSTO ========================================================= */
function atualizarUmPosto(codigo) {
  const posto = POSTOS.find(function (p) { return p.codigo === codigo; });
  if (!posto) return;
  statusDoSistema("Consultando " + posto.nome + "...");

  fetch(API_URL + "?chave=" + encodeURIComponent(CHAVE) + "&posto=" + encodeURIComponent(codigo), {
    method: "GET",
    redirect: "follow"
  })
    .then(function (res) { return res.json(); })
    .then(function (resposta) {
      if (!resposta || resposta.ok === false) {
        statusDoSistema("Falha ao consultar " + posto.nome + ".");
        return;
      }
      const item = resposta.dados || resposta;
      if (item && item.codigo) {
        interpretarRespostaDaApi(item);
        atualizarCard(posto);
        atualizarResumo();
        salvarStorage();
        statusDoSistema("Sistema online");
      } else {
        statusDoSistema("Nenhum dado recebido para "

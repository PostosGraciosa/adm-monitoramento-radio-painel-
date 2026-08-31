/* =========================================================
   MONITORAMENTO DE RÁDIO | POSTOS GRACIOSA
   Painel que lê o parâmetro ?posto= da URL e faz o aviso
   do posto correspondente.
   ========================================================= */

/* ========================================================= CONFIGURAÇÕES ========================================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyTJwiUpuNO1a3-u5IGYL6V-sMPZweH4Ph-xT2KS8q9xt0nE0sCG4nnyH4ZrcdP9ZZK/exec";
const INTERVALO_ATUALIZACAO = 60000; // 60 segundos
const CHAVE = "GRACIOSA_RADIO_2026";
const LIMITE_HISTORICO = 100;
const STORAGE = "painel_monitoramento_radio_v1";

/* ========================================================= POSTOS ========================================================= */
const TODOS_POSTOS = [
  { codigo: "graciosa",   nome: "POSTO GRACIOSA",   icone: "⛽" },
  { codigo: "fatima",     nome: "POSTO FÁTIMA",     icone: "⛽" },
  { codigo: "jariva",     nome: "POSTO JARIVA",     icone: "⛽" },
  { codigo: "bemer",      nome: "POSTO BEMER",      icone: "⛽" },
  { codigo: "graciosa-v", nome: "POSTO GRACIOSA V", icone: "⛽" },
  { codigo: "pirai",      nome: "POSTO PIRAÍ",      icone: "⛽" }
];

/* ========================================================= LER POSTO DA URL ========================================================= */
function postoDaUrl() {
  const params = new URLSearchParams(window.location.search);
  const codigo = (params.get("posto") || "").toLowerCase().trim();
  if (!codigo) return null;
  return TODOS_POSTOS.find(function (p) { return p.codigo === codigo; }) || null;
}

// Lista de postos que aparecem no painel (só o da URL, se informado)
const POSTO_FILTRADO = postoDaUrl();
const POSTOS = POSTO_FILTRADO ? [POSTO_FILTRADO] : TODOS_POSTOS;

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
  gridPostos: document.getElementById("gridPostos"),
  avisoPosto: document.getElementById("avisoPosto"),
  avisoTitulo: document.getElementById("avisoTitulo"),
  avisoTexto: document.getElementById("avisoTexto"),
  descricaoPagina: document.getElementById("descricaoPagina"),
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

/* ========================================================= CARREGAR / SALVAR STORAGE ========================================================= */
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

/* ========================================================= TEXTO / CLASSE / ÍCONE STATUS ========================================================= */
function textoStatus(status) {
  return { online: "ATIVO", pausado: "PAUSADO", offline: "OFFLINE", verificando: "VERIFICANDO" }[status] || "VERIFICANDO";
}
function classeStatus(status) {
  return "status-" + (status || "verificando");
}
function iconeStatus(status) {
  return { online: "🟢", pausado: "🟡", offline: "🔴", verificando: "🔵" }[status] || "🔵";
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

/* ========================================================= RENDERIZAR CARDS ========================================================= */
function renderizarCards() {
  ELEMENTO.gridPostos.innerHTML = POSTOS.map(function (posto) {
    return (
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="icone">' + posto.icone + "</span>" +
          '<div><div class="nome">' + escaparHtml(posto.nome) + '</div><div class="codigo">' + escaparHtml(posto.codigo) + "</div></div>" +
          '<span class="status-badge status-verificando" id="status-' + posto.codigo + '">🔵 VERIFICANDO</span>' +
        "</div>" +
        '<div class="card-body">' +
          '<div class="linha"><strong>Atividade:</strong> <span id="atividade-' + posto.codigo + '">—</span></div>' +
          '<div class="linha"><strong>Atualização:</strong> <span id="atualizacao-' + posto.codigo + '">—</span></div>' +
          '<div class="linha"><strong>Último evento:</strong></div>' +
          '<div class="evento" id="evento-' + posto.codigo + '">Aguardando atualização</div>' +
        "</div>" +
        '<div class="card-footer">' +
          '<button class="btn btn-verde" id="btnAtualizar-' + posto.codigo + '">Atualizar</button>' +
          '<button class="btn btn-cinza" id="btnHistorico-' + posto.codigo + '">Histórico</button>' +
        "</div>" +
      "</div>"
    );
  }).join("");
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

/* ========================================================= AVISO DO POSTO ========================================================= */
function fazerAviso(posto) {
  const s = estado[posto.codigo];
  if (s.status === "offline") {
    ELEMENTO.avisoTitulo.textContent = "🔴 ALERTA — " + posto.nome + " OFFLINE";
    ELEMENTO.avisoTexto.textContent = "O rádio deste posto está fora do ar. Último evento: " + (s.evento || "—") + ". Atualização: " + s.dataHora + ".";
    ELEMENTO.avisoPosto.classList.add("visivel");
  } else if (s.status === "pausado") {
    ELEMENTO.avisoTitulo.textContent = "🟡 ATENÇÃO — " + posto.nome + " PAUSADO";
    ELEMENTO.avisoTexto.textContent = "O rádio deste posto está pausado. Último evento: " + (s.evento || "—") + ". Atualização: " + s.dataHora + ".";
    ELEMENTO.avisoPosto.classList.add("visivel");
  } else if (s.status === "online") {
    ELEMENTO.avisoTitulo.textContent = "🟢 " + posto.nome + " ATIVO";
    ELEMENTO.avisoTexto.textContent = "O rádio deste posto está funcionando normalmente. Último evento: " + (s.evento || "—") + ".";
    ELEMENTO.avisoPosto.classList.add("visivel");
  } else {
    ELEMENTO.avisoTitulo.textContent = "🔵 " + posto.nome + " — VERIFICANDO";
    ELEMENTO.avisoTexto.textContent = "Aguardando a primeira atualização do rádio deste posto.";
    ELEMENTO.avisoPosto.classList.add("visivel");
  }
}

/* ========================================================= ATUALIZAR TODOS OS CARDS ========================================================= */
function atualizarTodosOsCards() {
  POSTOS.forEach(function (posto) {
    atualizarCard(posto);
    fazerAviso(posto);
  });
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

/* ========================================================= ÚLTIMA ATUALIZAÇÃO / STATUS SISTEMA ========================================================= */
function atualizarUltimaAtualizacao() {
  ELEMENTO.lastUpdate.textContent = "Última atualização: " + formatarDataHora(new Date());
}
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
        fazerAviso(posto);
        atualizarResumo();
        salvarStorage();
        statusDoSistema("Sistema online");
      } else {
        statusDoSistema("Nenhum dado recebido para " + posto.nome + ".");
      }
    })
    .catch(function (erro) {
      console.error("Erro ao consultar posto:", erro);
      statusDoSistema("Falha ao consultar " + posto.nome + ".");
    });
}

/* ========================================================= HISTÓRICO ========================================================= */
function abrirHistorico(codigo) {
  const posto = POSTOS.find(function (p) { return p.codigo === codigo; });
  if (!posto) return;

  ELEMENTO.modalStationName.textContent = "Histórico — " + posto.nome;
  const chave = "historico_" + codigo;
  let lista = [];
  try {
    lista = JSON.parse(localStorage.getItem(chave) || "[]");
  } catch (e) { lista = []; }

  if (lista.length === 0) {
    ELEMENTO.historyList.innerHTML = "<li>Nenhum evento registrado.</li>";
  } else {
    ELEMENTO.historyList.innerHTML = lista.map(function (h) {
      return '<li><span class="h-status">' + iconeStatus(h.status) + " " + textoStatus(h.status) +
        "</span> — " + escaparHtml(h.evento) + " — " + escaparHtml(h.dataHora) + "</li>";
    }).join("");
  }
  ELEMENTO.historyModal.hidden = false;
}

function fecharHistorico() {
  ELEMENTO.historyModal.hidden = true;
}

/* ========================================================= CONFIGURAR MODAL ========================================================= */
function configurarModal() {
  ELEMENTO.btnFecharHistorico.addEventListener("click", fecharHistorico);
  ELEMENTO.historyModal.addEventListener("click", function (e) {
    if (e.target === ELEMENTO.historyModal) fecharHistorico();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharHistorico();
  });
}

/* ========================================================= CONFIGURAR BOTÕES ========================================================= */
function configurarBotoesDosPostos() {
  POSTOS.forEach(function (posto) {
    const btnAtualizar = document.getElementById("btnAtualizar-" + posto.codigo);
    const btnHistorico = document.getElementById("btnHistorico-" + posto.codigo);
    if (btnAtualizar) {
      btnAtualizar.addEventListener("click", function () {
        atualizarUmPosto(posto.codigo);
      });
    }
    if (btnHistorico) {
      btnHistorico.addEventListener("click", function () {
        abrirHistorico(posto.codigo);
      });
    }
  });
}

/* ========================================================= BOTÃO ATUALIZAR TODOS ========================================================= */
function configurarBotaoAtualizarTodos() {
  ELEMENTO.btnAtualizarTodos.addEventListener("click", consultarApi);
}

/* ========================================================= AUTO ATUALIZAÇÃO ========================================================= */
function configurarAutoAtualizacao() {
  setInterval(consultarApi, INTERVALO_ATUALIZACAO);
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);
}

/* ========================================================= INICIALIZAÇÃO ========================================================= */
function inicializar() {
  if (POSTO_FILTRADO) {
    ELEMENTO.descricaoPagina.textContent = "Acompanhe em tempo real o status do rádio de " + POSTO_FILTRADO.nome + ".";
    document.title = "Monitoramento de Rádio | " + POSTO_FILTRADO.nome;
  }
  estadoInicial();
  carregarStorage();
  renderizarCards();
  atualizarTodosOsCards();
  configurarModal();
  configurarBotoesDosPostos();
  configurarBotaoAtualizarTodos();
  configurarAutoAtualizacao();
  consultarApi();
  console.log("Monitoramento inicializado. Posto filtrado:", POSTO_FILTRADO ? POSTO_FILTRADO.codigo : "todos");
}

/* ========================================================= DOM READY ========================================================= */
document.addEventListener("DOMContentLoaded", inicializar);

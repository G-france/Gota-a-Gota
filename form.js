// ===== 1. VALORES FIXOS =====
// Economia estimada CADA VEZ que a pessoa registra uma ação.
// Para mudar um valor, é só alterar o número aqui.
const VALOR_POR_ACAO = {
  agua: 50,        // litros
  energia: 0.3,    // kWh
  alimentos: 0.3   // kg
};

const nomesTipo = { agua: "Água", energia: "Energia", alimentos: "Alimentos" };
const nomesLocal = { casa: "Casa", comunidade: "Comunidade", negocio: "Pequeno negócio" };
const unidades = { agua: "litros", energia: "kWh", alimentos: "kg" };

// ===== 2. DADOS E ELEMENTOS =====
let acoes = [];          // ações registradas
let log = [];            // histórico de atividades
let idEditando = null;   // id da ação em edição (null = modo "adicionar")

const form = document.getElementById("form-registro");
const campos = {
  tipo: document.getElementById("tipo"),
  local: document.getElementById("local"),
  descricao: document.getElementById("descricao"),
  vezes: document.getElementById("vezes"),
  data: document.getElementById("data")
};
const previa = document.getElementById("previa");
const tituloForm = document.getElementById("titulo-form");
const btnSalvar = document.getElementById("btn-salvar");
const btnCancelar = document.getElementById("btn-cancelar");
const listaAcoes = document.getElementById("lista-acoes");
const avisoAcoes = document.getElementById("aviso-acoes");
const listaLog = document.getElementById("lista-log");
const avisoLog = document.getElementById("aviso-log");

// ===== 3. FUNÇÕES AUXILIARES =====
function arredondar(numero) {
  return Math.round(numero * 100) / 100; // evita 0.30000000000000004
}

function formatarNumero(numero) {
  return numero.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatarData(dataISO) {
  // "2026-11-15" -> "15/11/2026"
  const partes = dataISO.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function dataDeHoje() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return hoje.getFullYear() + "-" + mes + "-" + dia;
}

function registrarLog(texto) {
  log.unshift({ texto: texto, momento: new Date().toLocaleString("pt-BR") });
  if (log.length > 30) log.pop(); // guarda só as 30 mais recentes
}

// ===== 4. PRÉVIA DA ECONOMIA (aparece enquanto a pessoa preenche) =====
function atualizarPrevia() {
  const tipo = campos.tipo.value;
  const vezes = Number(campos.vezes.value);

  if (tipo === "" || !(vezes > 0)) {
    previa.textContent = "";
    return;
  }
  const economia = arredondar(VALOR_POR_ACAO[tipo] * vezes);
  previa.textContent = "Economia estimada: " + formatarNumero(economia) + " " + unidades[tipo] + ".";
}

campos.tipo.addEventListener("change", atualizarPrevia);
campos.vezes.addEventListener("input", atualizarPrevia);

// ===== 5. VALIDAÇÃO =====
function mostrarErro(nomeCampo, mensagem) {
  document.getElementById("erro-" + nomeCampo).textContent = mensagem;
}

function limparErros() {
  Object.keys(campos).forEach(function (nome) {
    mostrarErro(nome, "");
  });
}

function validar() {
  let primeiroInvalido = null;

  function falhar(nomeCampo, mensagem) {
    mostrarErro(nomeCampo, mensagem);
    if (!primeiroInvalido) primeiroInvalido = campos[nomeCampo];
  }

  limparErros();

  if (campos.tipo.value === "") falhar("tipo", "Escolha o recurso.");
  if (campos.local.value === "") falhar("local", "Escolha onde aconteceu.");
  if (campos.descricao.value.trim().length < 3) {
    falhar("descricao", "Descreva a ação com pelo menos 3 letras.");
  }

  const vezes = Number(campos.vezes.value);
  if (campos.vezes.value === "" || !Number.isInteger(vezes) || vezes < 1) {
    falhar("vezes", "Informe quantas vezes, com um número inteiro a partir de 1.");
  }

  if (campos.data.value === "") {
    falhar("data", "Informe a data da ação.");
  } else if (campos.data.value > dataDeHoje()) {
    falhar("data", "A data não pode ser no futuro.");
  }

  if (primeiroInvalido) {
    primeiroInvalido.focus(); // leva o cursor ao primeiro campo com erro
    return false;
  }
  return true;
}

// ===== 6. LISTAR: redesenha tudo a partir dos arrays =====
function renderizarAcoes() {
  listaAcoes.innerHTML = "";

  acoes.forEach(function (acao) {
    const economia = arredondar(VALOR_POR_ACAO[acao.tipo] * acao.vezes);
    const textoVezes = acao.vezes === 1 ? "1 vez" : acao.vezes + " vezes";

    const li = document.createElement("li");
    li.className = "item-registro";

    const texto = document.createElement("div");
    const titulo = document.createElement("strong");
    titulo.textContent = acao.descricao;
    const detalhes = document.createElement("p");
    detalhes.textContent =
      nomesTipo[acao.tipo] + " · " + nomesLocal[acao.local] + " · " +
      textoVezes + " (" + formatarNumero(economia) + " " + unidades[acao.tipo] + ") · " +
      formatarData(acao.data);
    texto.appendChild(titulo);
    texto.appendChild(detalhes);

    const botoes = document.createElement("div");
    botoes.className = "botoes-item";

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "botao-editar";
    btnEditar.textContent = "Editar";
    btnEditar.setAttribute("aria-label", "Editar ação: " + acao.descricao);
    btnEditar.addEventListener("click", function () {
      iniciarEdicao(acao.id);
    });

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.className = "botao-remover";
    btnRemover.textContent = "Remover";
    btnRemover.setAttribute("aria-label", "Remover ação: " + acao.descricao);
    btnRemover.addEventListener("click", function () {
      remover(acao.id);
    });

    botoes.appendChild(btnEditar);
    botoes.appendChild(btnRemover);
    li.appendChild(texto);
    li.appendChild(botoes);
    listaAcoes.appendChild(li);
  });

  avisoAcoes.hidden = acoes.length > 0; // some o aviso "Nenhuma ação..." quando há itens
}

function renderizarLog() {
  listaLog.innerHTML = "";

  log.forEach(function (entrada) {
    const li = document.createElement("li");
    li.className = "item-registro";
    li.textContent = entrada.momento + " — " + entrada.texto;
    listaLog.appendChild(li);
  });

  avisoLog.hidden = log.length > 0;
}

function atualizarResumo() {
  const totais = { agua: 0, energia: 0, alimentos: 0 };

  acoes.forEach(function (acao) {
    totais[acao.tipo] += VALOR_POR_ACAO[acao.tipo] * acao.vezes;
  });

  document.getElementById("total-agua").textContent =
    formatarNumero(arredondar(totais.agua)) + " litros";
  document.getElementById("total-energia").textContent =
    formatarNumero(arredondar(totais.energia)) + " kWh";
  document.getElementById("total-alimentos").textContent =
    formatarNumero(arredondar(totais.alimentos)) + " kg";
}

function atualizarTela() {
  renderizarAcoes();
  renderizarLog();
  atualizarResumo();
}

// ===== 7. ADICIONAR e EDITAR (mesmo formulário) =====
form.addEventListener("submit", function (evento) {
  evento.preventDefault();
  if (!validar()) return;

  const dados = {
    tipo: campos.tipo.value,
    local: campos.local.value,
    descricao: campos.descricao.value.trim(),
    vezes: Number(campos.vezes.value),
    data: campos.data.value
  };

  if (idEditando === null) {
    // ADICIONAR
    dados.id = Date.now();
    acoes.unshift(dados); // unshift coloca a ação mais nova no topo
    registrarLog("Ação adicionada: " + dados.descricao + " (" + dados.vezes + "x)");
  } else {
    // EDITAR
    const acao = acoes.find(function (a) {
      return a.id === idEditando;
    });
    acao.tipo = dados.tipo;
    acao.local = dados.local;
    acao.descricao = dados.descricao;
    acao.vezes = dados.vezes;
    acao.data = dados.data;
    registrarLog("Ação editada: " + dados.descricao + " (" + dados.vezes + "x)");
  }

  salvar();
  cancelarEdicao();
  atualizarTela();
});

// ===== 8. EDITAR: devolve os dados da ação ao formulário =====
function iniciarEdicao(id) {
  const acao = acoes.find(function (a) {
    return a.id === id;
  });

  idEditando = id;
  campos.tipo.value = acao.tipo;
  campos.local.value = acao.local;
  campos.descricao.value = acao.descricao;
  campos.vezes.value = acao.vezes;
  campos.data.value = acao.data;
  atualizarPrevia();

  tituloForm.textContent = "Editar ação";
  btnSalvar.textContent = "Salvar alterações";
  btnCancelar.hidden = false;

  form.scrollIntoView({ behavior: "smooth" });
  campos.descricao.focus();
}

function cancelarEdicao() {
  idEditando = null;
  form.reset();
  atualizarPrevia();
  limparErros();
  tituloForm.textContent = "Nova ação";
  btnSalvar.textContent = "Adicionar ação";
  btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", cancelarEdicao);

// ===== 9. REMOVER =====
function remover(id) {
  const acao = acoes.find(function (a) {
    return a.id === id;
  });

  if (!confirm("Remover a ação \"" + acao.descricao + "\"?")) return;

  acoes = acoes.filter(function (a) {
    return a.id !== id;
  });
  registrarLog("Ação removida: " + acao.descricao);

  if (idEditando === id) cancelarEdicao();
  salvar();
  atualizarTela();
}

// ===== 10. PERSISTÊNCIA (opcional): mantém os dados ao recarregar =====
function salvar() {
  try {
    localStorage.setItem("gotaagota-acoes-v3", JSON.stringify(acoes));
    localStorage.setItem("gotaagota-log-v3", JSON.stringify(log));
  } catch (erro) {
    console.error("Não foi possível salvar:", erro);
  }
}

function carregar() {
  try {
    acoes = JSON.parse(localStorage.getItem("gotaagota-acoes-v3")) || [];
    log = JSON.parse(localStorage.getItem("gotaagota-log-v3")) || [];
  } catch (erro) {
    acoes = [];
    log = [];
  }
}

// ===== 11. INÍCIO =====
campos.data.max = dataDeHoje(); // impede escolher data futura no calendário
carregar();
atualizarTela();

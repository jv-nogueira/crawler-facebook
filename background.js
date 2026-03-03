let cancelado = false;
let linhasParaProcessar = [];

const PLANILHA =
'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6HwOYxhj1vURMMPwkM8VB55sQ2clYYuLuFeeFEBMWVoEgS5HleyYAAm_UM1hxKszt321P8X8mleC2/pub?gid=0&single=true&output=csv';

const MAX_POPUPS = 15;

let urls = [];
let indiceAtual = 0;

// IMPORTANTE -> mantém ordem da planilha
let idsColetados = [];

let processando = false;

let janelasAtivas = new Map(); // windowId -> indice perfil
let popupsAbertos = 0;

let posicoesTela = [];

console.log("Background iniciado");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    if (msg.acao === "status") {

        sendResponse({
            executando: processando
        });

        return true;
    }

    if (msg.acao === "abrirFacebook") {

        if (!processando) {

            processando = true;
            cancelado = false;

            iniciarProcessamento();

        }

        sendResponse({ status: "ok" });

    }

    if (msg.acao === "cancelar") {

        cancelado = true;

        for (const windowId of janelasAtivas.keys()) {

            chrome.windows.remove(windowId);

        }

        janelasAtivas.clear();

        popupsAbertos = 0;

        finalizarProcessamento();

        sendResponse({ status: "cancelado" });

    }

    // DOWNLOAD IMAGEM
    if (msg.acao === "baixarImagem") {

    const id =
        (msg.id && msg.id.trim())
            ? msg.id.trim()
            : "Não tem ID";

        const windowId = sender?.tab?.windowId;

        const indicePerfil =
            janelasAtivas.get(windowId);

        // GUARDA NA POSIÇÃO CERTA
        if (indicePerfil !== undefined) {

            idsColetados[indicePerfil] = id;

        }

        const nomeArquivo = id + ".png";

        chrome.downloads.download({

            url: msg.url,
            filename: nomeArquivo,
            saveAs: false

        }, () => {

            fecharEContinuar(windowId);

        });

    }

    return true;

});


// ======================
// POSIÇÕES DA TELA
// ======================

async function calcularPosicoesTela() {

    return new Promise((resolve)=>{

        chrome.system.display.getInfo((displays)=>{

            const d = displays.find(x=>x.isPrimary) || displays[0];

            const area = d.workArea;

            const COLUNAS = 5;
            const LINHAS = 3;

            const larguraPopup =
                Math.floor(area.width / COLUNAS);

            const alturaPopup =
                Math.floor(area.height / LINHAS);

            posicoesTela = [];

            for(let linha=0;linha<LINHAS;linha++){

                for(let coluna=0;coluna<COLUNAS;coluna++){

                    posicoesTela.push({

                        left:
                            area.left +
                            coluna * larguraPopup,

                        top:
                            area.top +
                            linha * alturaPopup,

                        width: larguraPopup,

                        height: alturaPopup

                    });

                }

            }

            resolve();

        });

    });

}


// ======================

async function iniciarProcessamento() {

    if (cancelado) return;

    try {

        await calcularPosicoesTela();

        const resposta = await fetch(PLANILHA);

        const texto = await resposta.text();

const linhas = texto.split('\n').filter(l => l.trim() !== "");

if (!linhas.length) {
    processando = false;
    return;
}

// Cabeçalho
const cabecalho = linhas[0].split(',');

const indiceURL = cabecalho.findIndex(
    col => col.trim() === "URL_Facebook"
);

const indiceID = cabecalho.findIndex(
    col => col.trim() === "ID_Facebook"
);

if (indiceURL === -1) {
    console.log("Coluna URL_Facebook não encontrada.");
    processando = false;
    return;
}

if (indiceID === -1) {
    console.log("Coluna ID_Facebook não encontrada.");
    processando = false;
    return;
}

// =====================
// DADOS (sem cabeçalho)
// =====================

const dados = linhas.slice(1);

// =====================
// ENCONTRA ÚLTIMO ID PREENCHIDO (de baixo para cima)
// =====================

let ultimoIndicePreenchido = -1;

for (let i = dados.length - 1; i >= 0; i--) {

    const colunas = dados[i].split(',');
    const idExistente = colunas[indiceID]?.trim();

    if (idExistente) {
        ultimoIndicePreenchido = i;
        break;
    }
}

// =====================
// PROCESSA SOMENTE AS LINHAS ABAIXO DELE
// =====================

urls = [];
linhasParaProcessar = [];

for (let i = ultimoIndicePreenchido + 1; i < dados.length; i++) {

    const colunas = dados[i].split(',');

    const url = colunas[indiceURL]?.trim();

    if (url && url.startsWith("http")) {

        urls.push(url);

        linhasParaProcessar.push(i);
    }
}

if (!urls.length) {
    console.log("Nenhuma linha com ID vazio encontrada.");
    processando = false;
    return;
}

indiceAtual = 0;

// Agora o tamanho é só das linhas vazias
idsColetados = new Array(urls.length);

        abrirLoteInicial();

    } catch (e) {

        console.log(e);

        processando = false;

    }

}


function abrirLoteInicial() {

    for (let i = 0; i < MAX_POPUPS; i++) {

        abrirProximoPerfil();

    }

}


function abrirProximoPerfil() {

    if (cancelado) return;

    if (indiceAtual >= urls.length) {

        if (popupsAbertos === 0) {

            finalizarProcessamento();

        }

        return;

    }

    const url = urls[indiceAtual];

    const indicePerfil = indiceAtual;

    const posicao =
        posicoesTela[
            indicePerfil % MAX_POPUPS
        ];

    indiceAtual++;

    popupsAbertos++;

    chrome.windows.create({

        url,

        type:"popup",

        left: posicao.left,
        top: posicao.top,

        width: posicao.width,
        height: posicao.height

    }, (win)=>{

        if (chrome.runtime.lastError){

            popupsAbertos--;

            abrirProximoPerfil();

            return;

        }

        const windowId = win.id;

        janelasAtivas
            .set(windowId, indicePerfil);

        const tabId =
            win.tabs[0].id;

        chrome.tabs.onUpdated
        .addListener(function listener
        (tabIdUpdated,info){

            if(

                tabIdUpdated===tabId &&
                info.status==="complete" &&
                processando &&
                !cancelado

            ){

                chrome.tabs
                .onUpdated
                .removeListener(listener);

                chrome.scripting
                .executeScript({

                    target:{tabId},

                    files:["content.js"]

                });

            }

        });

    });

}


function fecharEContinuar(windowId){

    if(cancelado)return;

    chrome.windows.remove(windowId,()=>{

        janelasAtivas.delete(windowId);

        popupsAbertos--;

        setTimeout(()=>{

            abrirProximoPerfil();

        },500);

    });

}


function finalizarProcessamento(){

    const conteudo =
        idsColetados
        .map(x => x ? x : "Não tem ID")
        .join("\n");

    const dataUrl=

        "data:text/plain;charset=utf-8,"+

        encodeURIComponent(conteudo);

    chrome.downloads.download({

        url:dataUrl,

        filename:"ids_coletados.txt",

        saveAs:false

    });

    processando=false;

    cancelado=false;

}
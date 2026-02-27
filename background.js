let cancelado = false;

const PLANILHA =
'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6HwOYxhj1vURMMPwkM8VB55sQ2clYYuLuFeeFEBMWVoEgS5HleyYAAm_UM1hxKszt321P8X8mleC2/pub?gid=0&single=true&output=csv';

let janelaAtual = null;
let urls = [];
let indiceAtual = 0;
let idsColetados = [];
let processando = false;

console.log("Background iniciado");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    console.log("Mensagem recebida:", msg);

    // STATUS DO PROCESSAMENTO (novo)
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

        console.log("Cancelamento solicitado");

        cancelado = true;

        if (janelaAtual !== null) {

            chrome.windows.remove(janelaAtual, () => {

                console.log("Popup fechado por cancelamento");

                janelaAtual = null;

                finalizarProcessamento();

            });

        } else {

            finalizarProcessamento();

        }

        sendResponse({ status: "cancelado" });

    }

    if (msg.acao === "baixarImagem") {

        const id = msg.id || "Não tem ID";

        idsColetados.push(id);

        console.log("IDs coletados:", idsColetados);

        const nomeArquivo = id + ".png";

        chrome.downloads.download({

            url: msg.url,
            filename: nomeArquivo,
            saveAs: false

        }, () => {

            if (chrome.runtime.lastError) {

                console.log("Erro download:", chrome.runtime.lastError);

            } else {

                console.log("Download iniciado:", nomeArquivo);

            }

            fecharEContinuar();

        });

    }

    return true;

});


async function iniciarProcessamento() {

    if (cancelado) return;

    try {

        console.log("Buscando planilha...");

        const resposta = await fetch(PLANILHA);

        if (!resposta.ok) {

            console.log("Erro ao buscar planilha");

            processando = false;

            return;

        }

        const texto = await resposta.text();

        const linhas = texto.split('\n').slice(1);

        urls = linhas
            .map(l => l.split(',')[0]?.trim())
            .filter(url => url && url.startsWith("http"));

        if (!urls.length) {

            console.log("Nenhuma URL válida");

            processando = false;

            return;

        }

        indiceAtual = 0;
        idsColetados = [];

        console.log("Total URLs:", urls.length);

        abrirProximoPerfil();

    } catch (e) {

        console.log("Erro geral:", e);

        processando = false;

    }

}


function abrirProximoPerfil() {

    if (cancelado) return;

    if (indiceAtual >= urls.length) {

        console.log("Processamento concluído");

        finalizarProcessamento();

        return;

    }

    const url = urls[indiceAtual];

    console.log("Abrindo índice", indiceAtual, url);

    chrome.windows.create({

        url,
        type: "popup",
        width: 500,
        height: 700

    }, (win) => {

        if (chrome.runtime.lastError) {

            console.log("Erro criar popup:", chrome.runtime.lastError);

            return;

        }

        janelaAtual = win.id;

        const tabId = win.tabs[0].id;

        chrome.tabs.onUpdated.addListener(function listener(tabIdUpdated, info) {

            if (

                tabIdUpdated === tabId &&
                info.status === "complete" &&
                processando &&
                !cancelado

            ) {

                chrome.tabs.onUpdated.removeListener(listener);

                console.log("Injetando content");

                chrome.scripting.executeScript({

                    target: { tabId },

                    files: ["content.js"]

                });

            }

        });

    });

}


function fecharEContinuar() {

    if (cancelado) return;

    if (janelaAtual === null) return;

    chrome.windows.remove(janelaAtual, () => {

        if (chrome.runtime.lastError) {

            console.log("Erro fechar:", chrome.runtime.lastError);

            return;

        }

        janelaAtual = null;

        indiceAtual++;

        setTimeout(abrirProximoPerfil, 1500);

    });

}


function finalizarProcessamento() {

    console.log("Finalizando");

    const conteudo = idsColetados.join("\n");

    const dataUrl =
        "data:text/plain;charset=utf-8," +
        encodeURIComponent(conteudo);

    chrome.downloads.download({

        url: dataUrl,
        filename: "ids_coletados.txt",
        saveAs: false

    });

    processando = false;
    cancelado = false;

}
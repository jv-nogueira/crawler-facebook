const botao = document.getElementById("executar");

let executando = false;


// pergunta ao background o estado
chrome.runtime.sendMessage(

    { acao: "status" },

    (res) => {

        executando = res?.executando || false;

        atualizarBotao();

    }

);


botao.addEventListener("click", () => {

    if (!executando) {

        chrome.runtime.sendMessage(

            { acao: "abrirFacebook" },

            () => {

                executando = true;

                atualizarBotao();

            }

        );

    } else {

        chrome.runtime.sendMessage(

            { acao: "cancelar" },

            () => {

                executando = false;

                atualizarBotao();

            }

        );

    }

});


function atualizarBotao() {

    botao.textContent =
        executando
            ? "Cancelar"
            : "Executar";

}

const selecionarPasta =
    document.getElementById("selecionarPasta");

const inputPasta =
    document.getElementById("inputPasta");


selecionarPasta.addEventListener("click", () => {

    inputPasta.click();

});


inputPasta.addEventListener("change", (e) => {

    const arquivos = e.target.files;

    const nomes = [];

    for (const file of arquivos) {

        nomes.push(file.name);

    }

    chrome.runtime.sendMessage({

        acao: "listarArquivos",
        arquivos: nomes

    });

});
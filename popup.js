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
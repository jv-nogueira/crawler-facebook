console.log("Content carregado");

setTimeout(() => {

    try {

        let id = obterIdPerfilPrincipal();

        if (!id) {

            id = obterUsernameDaUrl();

            console.log("Usando username:", id);

        }

        id = id || "Não tem ID";

        console.log("ID capturado:", id);

        const imagem = document.querySelectorAll("image")[1];

        if (!imagem) {

            chrome.runtime.sendMessage({

                acao: "baixarImagem",
                id,
                url: ""

            });

            return;

        }

        imagem.parentElement
            ?.parentElement
            ?.parentElement
            ?.parentElement
            ?.click();


        setTimeout(() => {

            const imgGrande =
                document.querySelector("[data-visualcompletion='media-vc-image']");

            const urlFallback =
                document.querySelectorAll("image")[1]?.href?.baseVal || "";

            const urlImagem = imgGrande
                ? imgGrande.src
                : urlFallback;

            chrome.runtime.sendMessage({

                acao: "baixarImagem",
                id,
                url: urlImagem

            });

        }, 5000);

    } catch (e) {

        console.log("Erro:", e);

        chrome.runtime.sendMessage({

            acao: "baixarImagem",
            id: "Não tem ID",
            url: ""

        });

    }

}, 5000);



function obterIdPerfilPrincipal() {

    const html = document.documentElement.innerHTML;

    const match =
        html.match(/"profile_owner":\{"id":"(\d+)"/);

    return match ? match[1] : null;

}



function obterUsernameDaUrl() {

    try {

        const url = window.location.href;

        const match =
            url.match(/facebook\.com\/([^\/\?\&]+)/i);

        if (!match) return null;

        let username = match[1];

        if (username === "profile.php") {

            const params =
                new URL(url).searchParams;

            return params.get("id");

        }

        return username.split("?")[0];

    } catch {

        return null;

    }

}
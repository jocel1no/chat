document.addEventListener("DOMContentLoaded", function () {
    const socket = io("https://chatgac.onrender.com");
    let usuarioNome = "";
    let predefinedTexts = {};
    let mensagensExibidas = [];  // Controle para não duplicar mensagens exibidas
    let isUserInteracting = false;  // Flag para saber se o usuário está interagindo

    // Recupera o nome do usuário do Chrome Storage
    chrome.storage.local.get("userName", function (data) {
        if (data.userName) {
            usuarioNome = data.userName;
            iniciarChat();
        }
    });

    // Recupera os pretextos do Chrome Storage
    chrome.storage.local.get("predefinedTexts", function (data) {
        predefinedTexts = data.predefinedTexts || {};
    });

    // Evento de definição do nome do usuário
    document.getElementById("definirNome").addEventListener("click", () => {
        const nomeInput = document.getElementById("nomeUsuario").value.trim();
        if (nomeInput) {
            usuarioNome = nomeInput;
            chrome.storage.local.set({ userName: usuarioNome });
            iniciarChat();
        }
    });

    // Evento de envio da mensagem
    document.getElementById("enviarBtn").addEventListener("click", enviarMensagem);

    // Função para iniciar o chat
    function iniciarChat() {
        document.getElementById("nomeContainer").style.display = "none";
        document.getElementById("chatContainer").style.display = "block";
        carregarMensagens();
    }

    // Função para carregar as mensagens do Chrome Storage
    function carregarMensagens() {
        chrome.storage.local.get("historicoChat", function (data) {
            const mensagens = data.historicoChat || [];
            mensagens.forEach(msg => {
                // Exibe todas as mensagens, mas só não exibe novamente a do usuário já exibida
                if (msg.usuario !== usuarioNome || !mensagensExibidas.includes(msg.texto)) {
                    exibirMensagem(msg.usuario, msg.texto, msg.usuario !== usuarioNome); // Exibe a mensagem
                    mensagensExibidas.push(msg.texto);  // Marca a mensagem como exibida
                }
            });
        });
    }

    // Função para exibir a mensagem no chat
    function exibirMensagem(usuario, texto, outroUsuario) {
        const chat = document.getElementById("chat");
        const div = document.createElement("div");
        div.innerHTML = `<strong>${usuario}:</strong> ${texto}`;
        div.classList.add("mensagem", outroUsuario ? "outro" : "eu");
        chat.appendChild(div);
        
        // Caso o usuário não esteja interagindo, mantém a posição de rolagem
        if (!isUserInteracting) {
            chat.scrollTop = chat.scrollHeight;
        }
    }

    // Função para salvar as mensagens no Chrome Storage
    function salvarMensagemNoStorage(usuario, texto) {
        chrome.storage.local.get("historicoChat", function (data) {
            const mensagens = data.historicoChat || [];
            mensagens.push({ usuario, texto });
            chrome.storage.local.set({ historicoChat: mensagens });
        });
    }

    // Função para enviar a mensagem
    function enviarMensagem() {
        const input = document.getElementById("mensagem");
        const texto = input.value.trim();
        if (texto) {
            const mensagem = { usuario: usuarioNome, texto };
            // Emite a mensagem para o servidor
            socket.emit("mensagem", mensagem);
            // Salva a mensagem no Chrome Storage
            salvarMensagemNoStorage(usuarioNome, texto);
            input.value = "";
            // Força o chat a rolar para a última mensagem
            isUserInteracting = true;
            document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
        }
    }

    // Função para exibir a caixa de pretextos ao clicar no botão @
    const arrobaBtn = document.getElementById("arrobaBtn");
    const arrobaBox = document.getElementById("arrobaBox");
    const listaArrobas = document.getElementById("listaArrobas");
    const mensagemInput = document.getElementById("mensagem");

    // Ao clicar no botão @, abre ou fecha a caixa com os pretextos
    arrobaBtn.addEventListener("click", () => {
        arrobaBox.classList.toggle("hidden");
        atualizarListaArrobas(""); // Atualiza a lista ao abrir
    });

    // Função para atualizar a lista de @ com todos os pretextos
    function atualizarListaArrobas(filtro) {
        listaArrobas.innerHTML = ""; // Limpa a lista antes de adicionar os itens
        for (const command in predefinedTexts) {
            if (command.startsWith('@') && command.toLowerCase().includes(filtro.toLowerCase())) {
                const li = document.createElement("li");
                li.textContent = `${command}: ${predefinedTexts[command]}`;
                li.addEventListener("click", () => inserirArroba(command, predefinedTexts[command]));
                listaArrobas.appendChild(li);
            }
        }
    }

    // Ao digitar na barra de pesquisa, filtra a lista de pretextos
    document.getElementById("pesquisarArroba").addEventListener("input", (e) => {
        atualizarListaArrobas(e.target.value);
    });

    // Função para inserir o @ e o pretexto no campo de mensagem
    function inserirArroba(command, pretexto) {
        mensagemInput.value += `${command}: ${pretexto} `;
        arrobaBox.classList.add("hidden"); // Fecha a caixa de pretextos após inserção
    }

    // Ouve as mensagens do servidor (enviadas por outros usuários)
    socket.on("mensagem", function (mensagem) {
        // Exibe a mensagem recebida
        exibirMensagem(mensagem.usuario, mensagem.texto, mensagem.usuario !== usuarioNome);
        // Salva a mensagem recebida no Chrome Storage
        salvarMensagemNoStorage(mensagem.usuario, mensagem.texto);
    });

    // Detecta se o usuário está rolando manualmente
    document.getElementById("chat").addEventListener("scroll", function() {
        const chat = document.getElementById("chat");
        const scrollHeight = chat.scrollHeight;
        const scrollTop = chat.scrollTop;
        const clientHeight = chat.clientHeight;

        if (scrollHeight - scrollTop === clientHeight) {
            // Se o usuário está na parte inferior, indica interação manual
            isUserInteracting = false;
        } else {
            // Se o usuário não está na parte inferior, significa que ele está lendo
            isUserInteracting = true;
        }
    });
});

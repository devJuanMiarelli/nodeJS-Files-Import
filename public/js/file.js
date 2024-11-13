// Função para buscar e exibir a resposta do Gemini diretamente
async function fetchGeminiResponse() {
    try {
        // Faz uma requisição para a rota /file, que retorna a resposta do Gemini
        const response = await fetch('/file');
        
        if (!response.ok) {
            throw new Error("Erro ao buscar resposta do Gemini.");
        }

        // Converte a resposta em texto
        const geminiResponse = await response.text();

        // Exibe a resposta diretamente na tela
        const responseContainer = document.getElementById("gemini-response");
        responseContainer.textContent = geminiResponse;

    } catch (error) {
        console.error("Erro:", error);
    }
}

// Chama a função fetchGeminiResponse assim que o DOM estiver carregado
document.addEventListener("DOMContentLoaded", fetchGeminiResponse);

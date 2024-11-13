document.getElementById("upload-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData();
    const fileInput = document.getElementById("file-upload");

    formData.append("file-upload", fileInput.files[0]);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            window.location.href = '/file.html'; // Redireciona para file.html
        } else {
            alert("Erro ao fazer upload do arquivo.");
        }
    } catch (error) {
        console.error("Erro:", error);
    }
});

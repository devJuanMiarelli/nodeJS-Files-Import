require('dotenv').config();
const express = require("express");
const path = require("path");
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const csvParser = require('csv-parser');  
const xlsx = require('xlsx');  
const axios = require('axios'); // Adiciona o Axios para fazer requisições HTTP

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_TOKEN);

// Função para extrair colunas de arquivos CSV e Excel
function extractColumns(filePath, mimeType) {
    return new Promise((resolve, reject) => {
        const columns = [];

        if (mimeType === 'text/csv') {
            // Processa CSV
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('headers', (headers) => {
                    headers.forEach((header) => {
                        columns.push({ name: header, type: 'String' });
                    });
                })
                .on('end', () => resolve(columns))
                .on('error', (err) => reject(err));
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {

            const fileData = fs.readFileSync(filePath); 
            const workbook = xlsx.read(fileData);
            const sheetNames = workbook.SheetNames;
            const sheet = workbook.Sheets[sheetNames[0]];

            const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 }); 
            if (sheetData.length > 0) {
                const headers = sheetData[0];
                headers.forEach((header) => {
                    columns.push({ name: header, type: 'String' });
                });
            }
            resolve(columns);
        } else {
            columns.push({ name: 'example_column', type: 'String' });
            resolve(columns);
        }
    });
}

app.post('/upload', upload.single('file-upload'), async (req, res) => {
    try {
        const file = req.file;
        const filePath = file.path;

        // Extrai as colunas do arquivo
        const fileColumns = await extractColumns(filePath, file.mimetype);

        // Monta o prompt para enviar para a API Gemini
        let prompt = `
I have received a file of type ${file.mimetype} with the name ${file.originalname}. 
Here are the columns in the file:\n`;

        fileColumns.forEach(column => {
            prompt += `- ${column.name} (type: ${column.type})\n`;
        });

        prompt += `
Please analyze the file content and return only the requested metadata (id(generate this), actual date, file name, file format, columns (name and data type)). Return in this format:
{
"id": "12345",
"date": "2024-11-12",
"file_name": "example.xlsx",
"file_format": "xlsx",
"columns": [
    { "name": "column1", "type": "String" },
    { "name": "column2", "type": "Number" }
]
}`;

        // Seleciona o modelo "gemini-1.5-flash"
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Gera conteúdo com o modelo usando o prompt
        const result = await model.generateContent(prompt);

        // A API pode retornar um conteúdo assíncrono, então chamamos o método text()
        const responseContent = await result.response.text();

        // Deleta o arquivo após o processamento
        fs.unlinkSync(filePath);

        // Envia a resposta para a API FastAPI
        const fastApiUrl = 'http://localhost:8000/items/'; // URL da sua API FastAPI

        const postResponse = await axios.post(fastApiUrl, {
            response: responseContent
        });

        console.log('Resposta enviada para a API FastAPI:', postResponse.data);

        // Armazena a resposta diretamente no contexto do aplicativo
        req.app.locals.geminiResponse = responseContent;

        // Redireciona para a página de resultados
        res.redirect('/file.html');
    } catch (error) {
        console.error("Erro ao enviar para o Google Gemini:", error);
        res.status(500).send("Erro ao processar o arquivo.");
    }
});

app.get('/file', (req, res) => {
    const geminiResponse = req.app.locals.geminiResponse;
    if (geminiResponse) {
        res.send(geminiResponse);
    } else {
        res.status(404).send('Resposta da Gemini não encontrada.');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/file', (req, res) => {
    res.json(req.app.locals.metadata);
});

app.listen(PORT, () => {
    console.log(`Server running at port: ${PORT}`);
});

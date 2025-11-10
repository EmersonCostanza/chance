// API Serverless para análise de entregas com Gemini AI
// Endpoint: /api/analisar
// Versão: 1.2

import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder ao OPTIONS (preflight do CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { dataDeBaixa, imagemBase64 } = req.body;

    if (!dataDeBaixa || !imagemBase64) {
      return res.status(400).json({
        error: 'Dados incompletos',
        resposta: 'ERRO_DADOS'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key não configurada' });
    }

    // Inicializar Gemini com visão
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1, // Baixa temperatura para respostas precisas
        maxOutputTokens: 50,
      }
    });

    // Preparar imagem para o Gemini
    const imagePart = {
      inlineData: {
        data: imagemBase64.split(',')[1], // Remove o prefixo data:image/...
        mimeType: 'image/jpeg'
      }
    };

    // Prompt para análise completa
    const prompt = `Você é um auditor de entregas. Analise a imagem do canhoto de entrega.

Data de Baixa informada no sistema: ${dataDeBaixa}

Tarefas:
1. Verifique se a imagem está legível e contém informações de entrega
2. Encontre a data de entrega escrita na imagem (pode estar em qualquer formato)
3. Compare a data da imagem com a Data de Baixa fornecida (${dataDeBaixa})

Responda APENAS com um destes códigos:
- "OK" - se a imagem está legível E as datas coincidem
- "ERRO_DADOS" - se a imagem está ilegível, em branco ou sem dados de entrega
- "ERRO_IMAGEM" - se há problema técnico na imagem (corrompida, não carregou, etc)
- "DATA_DIVERGENTE: DD/MM/AAAA" - se você encontrou uma data diferente (substitua DD/MM/AAAA pela data que você leu na imagem no formato brasileiro)

Responda apenas o código, nada mais.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const respostaIA = response.text().trim();

    return res.status(200).json({
      resposta: respostaIA,
      dataBaixa: dataDeBaixa,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na análise:', error);
    return res.status(500).json({
      error: error.message,
      resposta: 'ERRO_SISTEMA'
    });
  }
}

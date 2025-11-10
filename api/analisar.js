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
    const prompt = `Analise o canhoto de entrega na imagem.

IMPORTANTE: Responda EXATAMENTE com apenas UM dos códigos abaixo (SEM aspas, SEM explicações):

OK
ou
ERRO_DADOS
ou
ERRO_IMAGEM
ou
DATA_DIVERGENTE: DD/MM/AAAA

Regras:
1. Se a imagem mostra dados legíveis com assinatura e data visível = OK
2. Se falta informação ou está ilegível = ERRO_DADOS
3. Se a imagem não carregou ou está corrompida = ERRO_IMAGEM
4. Se a data na imagem (${dataDeBaixa}) está diferente = DATA_DIVERGENTE: (coloque a data que você viu)

Data do sistema: ${dataDeBaixa}

Responda APENAS o código.`;

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

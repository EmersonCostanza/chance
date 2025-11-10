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

    // Prompt para análise completa - ULTRA SIMPLIFICADO
    const prompt = `Olhe esta imagem de comprovante de entrega.

Data esperada: ${dataDeBaixa}

Encontre a data de entrega na imagem e responda APENAS:
- Se a data na imagem é ${dataDeBaixa}, responda: OK
- Se você não consegue ler nada na imagem, responda: ERRO_DADOS  
- Se a data na imagem é diferente de ${dataDeBaixa}, responda: DATA_DIVERGENTE: [coloque aqui a data que você viu no formato DD/MM/AAAA]

Responda SOMENTE o código. Uma palavra apenas (ou DATA_DIVERGENTE: seguido da data).`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const respostaIA = response.text().trim();
    
    // Log da resposta da IA
    console.log('=== RESPOSTA DA IA ===');
    console.log('Data esperada:', dataDeBaixa);
    console.log('Resposta bruta:', respostaIA);
    console.log('Tamanho:', respostaIA.length);
    console.log('=====================');

    return res.status(200).json({
      resposta: respostaIA,
      dataBaixa: dataDeBaixa,
      timestamp: new Date().toISOString(),
      debug: {
        respostaBruta: respostaIA,
        tamanho: respostaIA.length
      }
    });

  } catch (error) {
    console.error('Erro na análise:', error);
    return res.status(500).json({
      error: error.message,
      resposta: 'ERRO_SISTEMA'
    });
  }
}

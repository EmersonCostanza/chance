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
    const base64Data = imagemBase64.includes(',') ? imagemBase64.split(',')[1] : imagemBase64;
    
    console.log('=== DEBUG IMAGEM ===');
    console.log('Tamanho da string base64:', base64Data.length);
    console.log('Primeiros 50 caracteres:', base64Data.substring(0, 50));
    console.log('===================');
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };

    // Prompt para análise completa - VERSÃO MELHORADA
    const prompt = `Você está analisando um comprovante de entrega. VOCÊ DEVE RESPONDER, NÃO FIQUE EM SILÊNCIO.

INSTRUÇÕES:
1. Olhe a imagem do comprovante
2. Procure pela data de entrega escrita na imagem
3. A data esperada é: ${dataDeBaixa}

RESPONDA EXATAMENTE ASSIM (escolha UMA opção):
- Se a data na imagem for ${dataDeBaixa}: responda "OK"
- Se não conseguir ler a imagem ou não houver data visível: responda "ERRO_DADOS"
- Se a data na imagem for diferente de ${dataDeBaixa}: responda "DATA_DIVERGENTE: DD/MM/AAAA" (substitua DD/MM/AAAA pela data que você viu)

IMPORTANTE: VOCÊ DEVE RESPONDER UMA DAS OPÇÕES ACIMA. NÃO RETORNE VAZIO.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let respostaIA = response.text().trim();
    
    // GARANTIR QUE NÃO SEJA VAZIO
    if (!respostaIA || respostaIA.length === 0) {
      console.error('⚠️ IA retornou resposta vazia! Forçando ERRO_DADOS');
      respostaIA = 'ERRO_DADOS';
    }
    
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

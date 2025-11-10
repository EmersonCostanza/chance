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
    const prompt = `Você é um auditor de entregas. Analise esta imagem de canhoto/comprovante de entrega.

INSTRUÇÕES CRÍTICAS:
1. Olhe para a imagem e identifique se há uma DATA DE ENTREGA escrita (pode estar manuscrita ou impressa)
2. Compare essa data com a data do sistema: ${dataDeBaixa}
3. Responda SOMENTE com um dos códigos abaixo

CÓDIGOS VÁLIDOS (responda EXATAMENTE como está escrito):
- OK (se a imagem está legível, tem assinatura, e a data é ${dataDeBaixa})
- ERRO_DADOS (se a imagem está em branco, borrada ou sem dados legíveis)
- ERRO_IMAGEM (se a imagem está completamente ilegível ou não carregou)
- DATA_DIVERGENTE: DD/MM/AAAA (se você encontrou uma data DIFERENTE de ${dataDeBaixa} - substitua DD/MM/AAAA pela data que você viu)

ATENÇÃO: Responda APENAS um dos códigos acima. Nada mais.`;


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

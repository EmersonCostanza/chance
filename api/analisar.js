// API Serverless para análise de entregas com Gemini AI
// Endpoint: /api/analisar
// Versão: 2.0 - Refatorado seguindo padrão de hello.js

import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder OPTIONS para preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: 'error',
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    // 1. Validar dados de entrada
    const { dataDeBaixa, imagemBase64, prompt } = req.body;
    
    if (!dataDeBaixa || !imagemBase64) {
      return res.status(400).json({
        status: 'error',
        error: 'Dados incompletos: dataDeBaixa e imagemBase64 são obrigatórios'
      });
    }
    
    // 2. Verificar API Key
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        status: 'error',
        error: 'GEMINI_API_KEY não configurada no Vercel'
      });
    }
    
    // 3. Preparar imagem
    const base64Data = imagemBase64.includes(',') ? imagemBase64.split(',')[1] : imagemBase64;
    
    // Verificar tamanho máximo (10MB em base64 = ~7.5MB de imagem)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (base64Data.length > MAX_SIZE) {
      return res.status(400).json({
        status: 'error',
        error: `Imagem muito grande: ${(base64Data.length / 1024 / 1024).toFixed(2)}MB (máximo: 7.5MB)`
      });
    }
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };
    
    // 4. Preparar prompt
    const defaultPrompt = `Analise o recibo de entrega da encomenda e responda APENAS com um JSON válido (sem markdown, sem explicações).

PERGUNTAS:

1) É um canhoto de entrega? Se sim, está legível?
   Respostas possíveis: "Legivel" ou "Sem canhoto"

2) Existe uma assinatura na imagem? Se sim, qual o nome?
   Respostas possíveis: "nome da assinatura" ou "Ilegivel"

3) Qual é a data da entrega/recebimento (ou qualquer sinônimo de entrega)?
   Respostas possíveis: "DD/MM/AAAA" (data que está no canhoto)

4) Tem número do documento digitado ou escrito à mão?
   Respostas possíveis: "ok" ou "sem doc"

5) Qual o nome do recebedor (ou sinônimo de quem recebeu a encomenda)?
   Respostas possíveis: "Nome do recebedor" ou "Sem nome"

RESPONDA EXATAMENTE NESTE FORMATO JSON (sem \`\`\`json, apenas o JSON puro):
{
  "canhoto_status": "Legivel",
  "assinatura_nome": "nome ou Ilegivel",
  "data_entrega": "DD/MM/AAAA",
  "documento_status": "ok ou sem doc",
  "recebedor_nome": "nome ou Sem nome"
}`;

    const promptFinal = prompt || defaultPrompt;
    
    // 5. Inicializar Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      }
    });
    
    // 6. Chamar Gemini com retry
    let respostaIA = null;
    let ultimoErro = null;
    const MAX_RETRIES = 3;
    
    for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
      try {
        // Aguardar antes de retry (exceto primeira tentativa)
        if (tentativa > 1) {
          const delayMs = Math.pow(2, tentativa - 1) * 1000; // 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        const result = await model.generateContent([promptFinal, imagePart]);
        const response = await result.response;
        respostaIA = response.text().trim();
        
        break; // Sucesso, sair do loop
        
      } catch (error) {
        ultimoErro = error;
        
        // Verificar se é erro recuperável (503, 429)
        const isRetryable = error.message.includes('503') || 
                           error.message.includes('overloaded') ||
                           error.message.includes('429');
        
        if (!isRetryable || tentativa === MAX_RETRIES) {
          // Não é recuperável ou esgotou tentativas
          return res.status(503).json({
            status: 'error',
            error: error.message,
            resposta: 'ERRO_API_SOBRECARREGADA',
            tentativas: tentativa,
            canhoto_status: "Erro API",
            assinatura_nome: "Erro API",
            data_entrega: "Erro",
            documento_status: "Erro API",
            recebedor_nome: "Erro API"
          });
        }
      }
    }
    
    // 7. Processar resposta
    if (!respostaIA) {
      return res.status(503).json({
        status: 'error',
        error: 'Gemini não retornou resposta',
        tentativas: MAX_RETRIES
      });
    }
    
    // Remover marcadores de código
    respostaIA = respostaIA.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Garantir que não seja vazio
    if (!respostaIA || respostaIA.length === 0) {
      respostaIA = JSON.stringify({
        canhoto_status: "Sem canhoto",
        assinatura_nome: "Ilegivel",
        data_entrega: "Erro",
        documento_status: "sem doc",
        recebedor_nome: "Sem nome"
      });
    }
    
    // 8. Parsear JSON
    let dadosAnalisados;
    try {
      dadosAnalisados = JSON.parse(respostaIA);
    } catch (parseError) {
      dadosAnalisados = {
        canhoto_status: "Sem canhoto",
        assinatura_nome: "Ilegivel",
        data_entrega: "Erro",
        documento_status: "sem doc",
        recebedor_nome: "Sem nome",
        erro_parse: true,
        resposta_original: respostaIA
      };
    }
    
    // 9. Retornar sucesso
    return res.status(200).json({
      status: 'success',
      data: dadosAnalisados
    });
    
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message,
      tipo: error.constructor.name
    });
  }
}

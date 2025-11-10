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
        maxOutputTokens: 200, // Aumentado para suportar JSON completo
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

    // Prompt para análise completa do recibo de entrega
    const prompt = `Analise o recibo de entrega da encomenda e responda APENAS com um JSON válido (sem markdown, sem explicações).

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

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let respostaIA = response.text().trim();
    
    // Remover marcadores de código se a IA incluir
    respostaIA = respostaIA.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // GARANTIR QUE NÃO SEJA VAZIO
    if (!respostaIA || respostaIA.length === 0) {
      console.error('⚠️ IA retornou resposta vazia! Forçando JSON de erro');
      respostaIA = JSON.stringify({
        canhoto_status: "Sem canhoto",
        assinatura_nome: "Ilegivel",
        data_entrega: "Erro",
        documento_status: "sem doc",
        recebedor_nome: "Sem nome"
      });
    }
    
    // Tentar parsear o JSON para validar
    let dadosAnalisados;
    try {
      dadosAnalisados = JSON.parse(respostaIA);
    } catch (parseError) {
      console.error('⚠️ Erro ao parsear JSON da IA:', parseError);
      console.error('Resposta recebida:', respostaIA);
      dadosAnalisados = {
        canhoto_status: "Sem canhoto",
        assinatura_nome: "Ilegivel",
        data_entrega: "Erro",
        documento_status: "sem doc",
        recebedor_nome: "Sem nome",
        erro_parse: true
      };
    }
    
    // Log da resposta da IA
    console.log('=== RESPOSTA DA IA ===');
    console.log('Data esperada:', dataDeBaixa);
    console.log('Resposta JSON:', JSON.stringify(dadosAnalisados, null, 2));
    console.log('=====================');

    return res.status(200).json(dadosAnalisados);

  } catch (error) {
    console.error('Erro na análise:', error);
    return res.status(500).json({
      error: error.message,
      resposta: 'ERRO_SISTEMA'
    });
  }
}

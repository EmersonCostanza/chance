// API Serverless para análise de entregas com Gemini AI
// Endpoint: /api/analisar
// Versão: 1.3 - Logs detalhados + retry corrigido

import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // WRAPPER GLOBAL PARA CAPTURAR QUALQUER ERRO
  try {
    console.log('========================================');
    console.log('🚀 API INICIADA:', new Date().toISOString());
    console.log('========================================');
  
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder ao OPTIONS (preflight do CORS)
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - respondendo');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  console.log('📥 Método POST recebido');

  try {
    console.log('🔍 Etapa 1: Validando dados de entrada...');
    
    // Validar dados de entrada primeiro
    const { dataDeBaixa, imagemBase64 } = req.body;
    
    console.log('📊 Dados recebidos:');
    console.log('  - dataDeBaixa:', dataDeBaixa || 'AUSENTE');
    console.log('  - imagemBase64:', imagemBase64 ? `${imagemBase64.length} caracteres` : 'AUSENTE');

    if (!dataDeBaixa || !imagemBase64) {
      console.log('❌ ERRO: Dados incompletos!');
      return res.status(400).json({
        error: 'Dados incompletos',
        resposta: 'ERRO_DADOS',
        tentativas: 0,
        canhoto_status: "Erro",
        assinatura_nome: "Erro",
        data_entrega: "Erro",
        documento_status: "Erro",
        recebedor_nome: "Erro"
      });
    }
    
    console.log('✅ Dados de entrada validados');

    console.log('🔍 Etapa 2: Verificando API Key...');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.log('❌ ERRO CRÍTICO: API Key não configurada no ambiente!');
      console.log('🔧 Variáveis de ambiente disponíveis:', Object.keys(process.env).filter(k => !k.includes('SECRET')));
      return res.status(500).json({ 
        error: 'API Key não configurada no Vercel',
        resposta: 'ERRO_SISTEMA',
        tentativas: 0,
        canhoto_status: "Erro Sistema",
        assinatura_nome: "Erro Sistema",
        data_entrega: "Erro",
        documento_status: "Erro Sistema",
        recebedor_nome: "Erro Sistema"
      });
    }
    
    console.log('✅ API Key encontrada:', apiKey.substring(0, 10) + '...');

    console.log('🔍 Etapa 3: Preparando imagem...');
    // Preparar imagem para o Gemini
    const base64Data = imagemBase64.includes(',') ? imagemBase64.split(',')[1] : imagemBase64;
    
    console.log('📊 Informações da imagem:');
    console.log('  - Tamanho base64:', base64Data.length);
    console.log('  - Tamanho em MB:', (base64Data.length / 1024 / 1024).toFixed(2));
    console.log('  - Primeiros 50 chars:', base64Data.substring(0, 50));
    
    // Verificar tamanho máximo (10MB em base64 = ~7.5MB de imagem)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (base64Data.length > MAX_SIZE) {
      console.log('❌ ERRO: Imagem muito grande!', {
        tamanho: base64Data.length,
        maximo: MAX_SIZE,
        tamanho_mb: (base64Data.length / 1024 / 1024).toFixed(2)
      });
      return res.status(400).json({
        error: `Imagem muito grande: ${(base64Data.length / 1024 / 1024).toFixed(2)}MB (máximo: 7.5MB)`,
        resposta: 'ERRO_DADOS',
        tentativas: 0,
        canhoto_status: "Erro",
        assinatura_nome: "Erro",
        data_entrega: "Erro",
        documento_status: "Erro",
        recebedor_nome: "Erro"
      });
    }
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };
    
    console.log('✅ Imagem preparada');

    console.log('🔍 Etapa 4: Preparando prompt...');
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

    console.log('✅ Prompt preparado');

    console.log('🔍 Etapa 5: Inicializando Gemini AI...');
    
    // Inicializar Gemini com visão (FORA do loop, como era antes que funcionava)
    let genAI, model;
    try {
      console.log('🔧 Tentando inicializar GoogleGenerativeAI...');
      genAI = new GoogleGenerativeAI(apiKey);
      console.log('✅ GoogleGenerativeAI inicializado com sucesso');
      
      console.log('🔧 Tentando carregar modelo gemini-2.5-flash...');
      model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        }
      });
      console.log('✅ Modelo gemini-2.5-flash carregado com sucesso');
    } catch (initError) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌❌❌ ERRO NA INICIALIZAÇÃO DO GEMINI ❌❌❌');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📛 Tipo do erro:', initError.constructor.name);
      console.log('📛 Mensagem:', initError.message);
      console.log('📛 Stack:', initError.stack);
      console.log('🔑 API Key (primeiros 15 chars):', apiKey.substring(0, 15) + '...');
      console.log('📊 Tamanho da API Key:', apiKey.length);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return res.status(503).json({
        error: `Erro ao inicializar Gemini: ${initError.message}`,
        resposta: 'ERRO_API_SOBRECARREGADA',
        tentativas: 0,
        canhoto_status: "Erro API",
        assinatura_nome: "Erro API",
        data_entrega: "Erro",
        documento_status: "Erro API",
        recebedor_nome: "Erro API",
        debug_info: {
          error_type: initError.constructor.name,
          api_key_length: apiKey.length
        }
      });
    }

    // Sistema de retry com backoff exponencial
    const MAX_RETRIES = 3;
    let tentativa = 0;
    let respostaIA = null;
    let ultimoErro = null;
    
    console.log('🔍 Etapa 6: Iniciando loop de retry (max', MAX_RETRIES, 'tentativas)...');
    
    while (tentativa < MAX_RETRIES && !respostaIA) {
      tentativa++; // Incrementar ANTES do try para contar corretamente
      
      try {
        if (tentativa > 1) { // Mudado de tentativa > 0 para tentativa > 1
          // Backoff exponencial: 2s, 4s, 8s
          const delayMs = Math.pow(2, tentativa - 1) * 1000;
          console.log(`⏳ Aguardando ${delayMs}ms antes da tentativa ${tentativa}...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        console.log(`🚀 Tentativa ${tentativa}/${MAX_RETRIES}: Enviando requisição para Gemini API...`);
        console.log('📊 Parâmetros da requisição:');
        console.log('  - Prompt length:', prompt.length);
        console.log('  - Image data length:', imagePart.inlineData.data.length);
        console.log('  - MIME type:', imagePart.inlineData.mimeType);
        
        const result = await model.generateContent([prompt, imagePart]);
        console.log('✅ Resposta recebida do Gemini');
        
        const response = await result.response;
        respostaIA = response.text().trim();
        
        console.log('✅ Texto extraído da resposta:', respostaIA.substring(0, 100) + '...');
        console.log('✅ SUCESSO na tentativa', tentativa);
        break; // Sucesso, sair do loop
        
      } catch (apiError) {
        ultimoErro = apiError;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`❌ ERRO na tentativa ${tentativa}/${MAX_RETRIES}`);
        console.log('📛 Tipo do erro:', apiError.constructor.name);
        console.log('📛 Mensagem:', apiError.message);
        console.log('📛 Stack:', apiError.stack);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Se for erro 503 (overloaded) ou 429 (rate limit) e ainda há tentativas, continuar
        const isRetryableError = apiError.message.includes('503') || 
                                  apiError.message.includes('overloaded') ||
                                  apiError.message.includes('429') ||
                                  apiError.message.includes('rate limit');
        
        if (isRetryableError && tentativa < MAX_RETRIES) {
          console.log('🔄 Erro recuperável detectado, tentando novamente...');
          continue;
        } else if (!isRetryableError) {
          console.log('💥 Erro NÃO recuperável - abortando tentativas');
          break;
        }
      }
    }
    
    // Se todas as tentativas falharam, retornar erro estruturado
    if (!respostaIA) {
      console.log('⛔⛔⛔ TODAS AS TENTATIVAS FALHARAM ⛔⛔⛔');
      console.log('❌ Total de tentativas realizadas:', tentativa);
      console.log('❌ Último erro capturado:', ultimoErro ? ultimoErro.message : 'Nenhum');
      
      return res.status(503).json({
        error: ultimoErro ? ultimoErro.message : 'Serviço temporariamente indisponível',
        resposta: 'ERRO_API_SOBRECARREGADA',
        tentativas: tentativa,
        canhoto_status: "Erro API",
        assinatura_nome: "Erro API",
        data_entrega: "Erro",
        documento_status: "Erro API",
        recebedor_nome: "Erro API"
      });
    }
    
    console.log('🔍 Etapa 7: Processando resposta da IA...');
    
    // Remover marcadores de código se a IA incluir
    respostaIA = respostaIA.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log('✅ Marcadores removidos');
    
    // GARANTIR QUE NÃO SEJA VAZIO
    if (!respostaIA || respostaIA.length === 0) {
      console.log('⚠️ IA retornou resposta vazia! Usando JSON de fallback');
      respostaIA = JSON.stringify({
        canhoto_status: "Sem canhoto",
        assinatura_nome: "Ilegivel",
        data_entrega: "Erro",
        documento_status: "sem doc",
        recebedor_nome: "Sem nome"
      });
    }
    
    console.log('🔍 Etapa 8: Parseando JSON...');
    console.log('📄 JSON a ser parseado:', respostaIA);
    
    // Tentar parsear o JSON para validar
    let dadosAnalisados;
    try {
      dadosAnalisados = JSON.parse(respostaIA);
      console.log('✅ JSON parseado com sucesso:', dadosAnalisados);
    } catch (parseError) {
      console.log('❌ ERRO ao parsear JSON:', parseError.message);
      console.log('📄 String que falhou:', respostaIA);
      dadosAnalisados = {
        canhoto_status: "Sem canhoto",
        assinatura_nome: "Ilegivel",
        data_entrega: "Erro",
        documento_status: "sem doc",
        recebedor_nome: "Sem nome",
        erro_parse: true
      };
    }
    
    console.log('========================================');
    console.log('✅ PROCESSAMENTO CONCLUÍDO COM SUCESSO');
    console.log('📊 Resultado final:', JSON.stringify(dadosAnalisados, null, 2));
    console.log('========================================');

    return res.status(200).json(dadosAnalisados);
    
  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌❌❌ ERRO INESPERADO NO CATCH EXTERNO ❌❌❌');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📛 Tipo do erro:', error.constructor.name);
    console.log('📛 Mensagem:', error.message);
    console.log('📛 Stack completo:');
    console.log(error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(500).json({
      error: error.message || 'Erro inesperado no servidor',
      resposta: 'ERRO_SISTEMA',
      tentativas: 0,
      canhoto_status: "Erro Sistema",
      assinatura_nome: "Erro Sistema",
      data_entrega: "Erro",
      documento_status: "Erro Sistema",
      recebedor_nome: "Erro Sistema",
      error_type: error.constructor.name
    });
  }
  } catch (outerError) {
    // CATCH EXTERNO - QUALQUER ERRO NÃO CAPTURADO
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌❌❌ ERRO NO WRAPPER GLOBAL ❌❌❌');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📛 Tipo do erro:', outerError.constructor.name);
    console.log('📛 Mensagem:', outerError.message);
    console.log('📛 Stack completo:');
    console.log(outerError.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return res.status(500).json({
      error: `Erro crítico: ${outerError.message}`,
      resposta: 'ERRO_SISTEMA',
      tentativas: 0,
      canhoto_status: "Erro Sistema",
      assinatura_nome: "Erro Sistema",
      data_entrega: "Erro",
      documento_status: "Erro Sistema",
      recebedor_nome: "Erro Sistema",
      error_type: outerError.constructor.name,
      stack: outerError.stack
    });
  }
}

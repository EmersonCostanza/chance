// API Serverless para integração com Gemini AI
// Endpoint: /api/hello

import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Habilitar CORS para permitir requisições do frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder OPTIONS para preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verificar se a API Key está configurada
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'GEMINI_API_KEY não configurada no Vercel'
      });
    }

    // Inicializar o Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Gerar conteúdo de teste
    const prompt = 'Diga "Bom dia! A API do Gemini está funcionando perfeitamente na Vercel!" de forma criativa e alegre.';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      status: 'success',
      message: text,
      timestamp: new Date().toISOString(),
      model: 'gemini-pro',
      info: 'Integração com Gemini AI ativa!'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      info: 'Erro ao conectar com Gemini AI'
    });
  }
}

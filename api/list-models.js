// API para listar modelos disponíveis do Gemini
// Endpoint: /api/list-models

import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        status: 'error',
        message: 'GEMINI_API_KEY não configurada'
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Tentar listar modelos disponíveis
    const models = await genAI.listModels();
    
    return res.status(200).json({
      status: 'success',
      models: models.map(m => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description
      })),
      info: 'Modelos disponíveis na sua API Key'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}

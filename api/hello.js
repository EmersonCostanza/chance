// API Serverless para testar integração com Gemini AI
// Endpoint: /api/hello

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
    // Por enquanto, retorna uma resposta simples
    // Depois vamos integrar com o Gemini AI usando @google/generative-ai
    const response = {
      status: 'success',
      message: 'Bom dia! API Serverless funcionando na Vercel',
      timestamp: new Date().toISOString(),
      info: 'Pronto para integração com Gemini AI'
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}

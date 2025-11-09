// API para listar modelos disponíveis do Gemini
// Endpoint: /api/list-models

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

    // Chamar API REST do Google diretamente
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        message: 'Erro ao listar modelos',
        details: data
      });
    }
    
    return res.status(200).json({
      status: 'success',
      models: data.models?.map(m => ({
        name: m.name,
        displayName: m.displayName,
        supportedGenerationMethods: m.supportedGenerationMethods
      })) || [],
      info: 'Modelos disponíveis na API v1beta'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}

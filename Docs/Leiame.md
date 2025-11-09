Stack

Vamos usar uma stack "leve" e moderna, focada em Serverless e JavaScript.

Para informar ao VS Code e ao seu Copilot, esta é a stack principal:

🧠 Stack do Backend (O "Cérebro" na Vercel)
Linguagem: JavaScript (via Node.js)

Plataforma: Vercel (para Serverless Functions)

Pacote (Dependência): @google/generative-ai (o SDK oficial do Google para chamar o Gemini)

Você pode resumir isso como: "Uma API Serverless Node.js na Vercel."

🤖 Stack do Frontend (O "Agente" no Navegador)
Linguagem: JavaScript (com foco nas APIs do navegador, como DOM e Canvas)

Plataforma: Tampermonkey

API Específica: As funções GM_* do Tampermonkey (principalmente GM_xmlhttpRequest para a comunicação com a Vercel)

Você pode resumir isso como: "Um Userscript JavaScript para Tampermonkey."
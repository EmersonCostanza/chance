// ==UserScript==
// @name         Agente de Auditoria (Chance)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Assistente de auditoria para validação de entregas com IA
// @author       Emerson Costanza
// @match        https://chancce.moblink.com.br/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      chance-rho.vercel.app
// @connect      chancce.moblink.com.br
// ==/UserScript==

(function() {
    'use strict';

    // ========== CONFIGURAÇÃO ==========
    const API_URL = 'https://chance-rho.vercel.app/api/analisar';
    const API_HELLO_URL = 'https://chance-rho.vercel.app/api/hello';
    
    // Seletores CSS
    const SELETORES = {
        CONTAINER_ITEM: '.row.canhoto',
        DATA_BAIXA: 'span[id^="dataBaixa_"]',
        IMAGEM_CANHOTO: 'img[id^="img_"]',
        CHECKBOX_CAMPO_BRANCO: 'input[id^="idchecklist4_"]',
        CHECKBOX_DATA_DIVERGENTE: 'input[id^="idchecklist6_"]',
        SPAN_DIAS_DIVERGENCIA: 'span[id^="id_qtd_dias_divergencia_"]',
        CHECKBOX_PROBLEMA_IMAGEM: 'input[id^="idchecklist7_"]',
        BOTAO_GRAVAR_TODOS: 'button[onclick="GravarTudo()"]'
    };
    
    // Variáveis globais
    let itensProcessados = 0;
    let totalItens = 0;
    
    // ========== CSS ==========
    GM_addStyle(`
        #painel-agente {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 999999;
            min-width: 350px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        #painel-agente h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            text-align: center;
        }
        
        .status-box {
            background: rgba(255,255,255,0.15);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 15px;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .status-item:last-child {
            border-bottom: none;
        }
        
        .status-label {
            font-size: 13px;
            opacity: 0.9;
        }
        
        .status-value {
            font-weight: bold;
            font-size: 13px;
            padding: 4px 10px;
            border-radius: 5px;
            background: rgba(0,0,0,0.2);
        }
        
        .status-value.loading {
            background: #FFA500;
            color: #000;
        }
        
        .status-value.online {
            background: #00FF00;
            color: #000;
        }
        
        .status-value.offline {
            background: #FF0000;
            color: #fff;
        }
        
        .btn-agente {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .btn-agente:hover {
            transform: translateY(-2px);
        }
        
        .btn-agente:active {
            transform: translateY(0);
        }
        
        .btn-primary {
            background: #00FF00;
            color: #000;
        }
        
        .btn-secondary {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid white;
        }
        
        .btn-agente:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Feedback visual nos itens */
        .auditoria-processando {
            border: 3px solid #FFA500 !important;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .auditoria-ok {
            border: 3px solid #00FF00 !important;
            background: rgba(0, 255, 0, 0.05) !important;
        }
        
        .auditoria-erro {
            border: 3px solid #FF0000 !important;
            background: rgba(255, 0, 0, 0.05) !important;
        }
        
        #status-processamento {
            margin-top: 15px;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            font-size: 12px;
            text-align: center;
            display: none;
        }
        
        #status-processamento.ativo {
            display: block;
        }
        
        /* Necessário para posicionar o badge */
        .row.canhoto {
            position: relative !important;
        }
        
        /* Badge de status dentro do row */
        .badge-status-ia {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            min-width: 180px;
            width: 280px;
            max-width: 600px;
            resize: both;
            overflow: auto;
            transition: all 0.3s ease;
        }
        
        .badge-status-ia.minimizado {
            min-width: 150px;
            width: 150px;
        }
        
        .badge-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .badge-titulo {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
        }
        
        .badge-status-ia .icone {
            font-size: 14px;
        }
        
        .btn-minimizar {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        
        .btn-minimizar:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .badge-json {
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 5px;
            font-size: 10px;
            font-family: 'Consolas', 'Courier New', monospace;
            max-height: 200px;
            overflow-y: auto;
            margin-top: 8px;
            white-space: pre-wrap;
            word-break: break-all;
            display: none;
        }
        
        .badge-json.visivel {
            display: block;
        }
        
        .badge-status-ia.processando {
            background: linear-gradient(135deg, #FFA500, #FF8C00);
            animation: badgePulse 1.5s infinite;
        }
        
        .badge-status-ia.sucesso {
            background: linear-gradient(135deg, #00FF00, #00CC00);
            color: #000;
        }
        
        .badge-status-ia.sucesso .btn-minimizar {
            background: rgba(0,0,0,0.2);
            color: #000;
        }
        
        .badge-status-ia.sucesso .btn-minimizar:hover {
            background: rgba(0,0,0,0.3);
        }
        
        .badge-status-ia.erro {
            background: linear-gradient(135deg, #FF0000, #CC0000);
        }
        
        @keyframes badgePulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        /* Campo de prompt */
        .prompt-box {
            margin-top: 15px;
            background: rgba(255,255,255,0.15);
            padding: 15px;
            border-radius: 10px;
        }
        
        .prompt-label {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            display: block;
        }
        
        #prompt-gemini {
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-family: 'Consolas', 'Courier New', monospace;
            resize: vertical;
            background: rgba(255,255,255,0.95);
            color: #333;
        }
        
        #prompt-gemini:focus {
            outline: 2px solid #00FF00;
        }
        
        .prompt-info {
            font-size: 11px;
            opacity: 0.8;
            margin-top: 5px;
        }
    `);

    // ========== CRIAR INTERFACE ==========
    function criarInterface() {
        console.log('[Agente] Criando interface...');
        
        const painel = document.createElement('div');
        painel.id = 'painel-agente';
        painel.innerHTML = `
            <h3>🤖 Agente de Auditoria v2.0</h3>
            
            <div class="status-box">
                <div class="status-item">
                    <span class="status-label">📡 API Vercel</span>
                    <span class="status-value loading" id="status-api">Testando...</span>
                </div>
                <div class="status-item">
                    <span class="status-label">🧠 Google Gemini</span>
                    <span class="status-value loading" id="status-gemini">Testando...</span>
                </div>
                <div class="status-item">
                    <span class="status-label">🎯 Seletores CSS</span>
                    <span class="status-value loading" id="status-seletores">Verificando...</span>
                </div>
            </div>
            
            <div class="prompt-box">
                <label class="prompt-label">✏️ Prompt para o Gemini:</label>
                <textarea id="prompt-gemini" placeholder="Digite aqui o prompt personalizado para análise dos canhotos...">Analise esta imagem de canhoto de entrega e extraia as seguintes informações:
1. Data de entrega (formato DD/MM/AAAA)
2. Nome do recebedor
3. Assinatura (se legível ou ilegível)
4. Status do documento (OK ou com problemas)
5. Status do canhoto (legível ou ilegível)</textarea>
                <div class="prompt-info">💡 Este prompt será enviado ao Gemini junto com a imagem</div>
            </div>
            
            <div class="status-box">
                <div class="status-item">
                    <span class="status-label">🧪 Modo Teste</span>
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="chkModoTeste" style="width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-size: 11px;">Apenas 1 item</span>
                    </label>
                </div>
                <div class="status-item">
                    <span class="status-label">🔒 Bloquear Gravação</span>
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="chkBloquearGravacao" style="width: 18px; height: 18px; cursor: pointer;" checked>
                        <span style="font-size: 11px;" id="lblBloqueioStatus">Bloqueado</span>
                    </label>
                </div>
            </div>
            
            <button class="btn-agente btn-secondary" id="btnReconectar">
                🔄 Reconectar
            </button>
            
            <button class="btn-agente btn-primary" id="btnIniciar" disabled>
                ▶ Iniciar Auditoria
            </button>
        `;
        
        document.body.appendChild(painel);
        console.log('[Agente] Painel criado');
        
        // Event listeners
        document.getElementById('btnReconectar').addEventListener('click', testarConexoes);
        document.getElementById('btnIniciar').addEventListener('click', iniciarAuditoria);
        
        // Event listener para toggle de bloqueio de gravação
        document.getElementById('chkBloquearGravacao').addEventListener('change', function() {
            const lblStatus = document.getElementById('lblBloqueioStatus');
            lblStatus.textContent = this.checked ? 'Bloqueado' : 'Liberado';
            lblStatus.style.color = this.checked ? '#FF0000' : '#00FF00';
        });
        
        // Testar conexões automaticamente
        setTimeout(testarConexoes, 500);
    }

    // ========== TESTAR CONEXÕES ==========
    function testarConexoes() {
        console.log('[Agente] Testando conexões...');
        
        const statusApi = document.getElementById('status-api');
        const statusGemini = document.getElementById('status-gemini');
        const statusSeletores = document.getElementById('status-seletores');
        const btnIniciar = document.getElementById('btnIniciar');
        
        // Resetar status
        statusApi.className = 'status-value loading';
        statusApi.textContent = 'Testando...';
        statusGemini.className = 'status-value loading';
        statusGemini.textContent = 'Testando...';
        statusSeletores.className = 'status-value loading';
        statusSeletores.textContent = 'Verificando...';
        btnIniciar.disabled = true;
        
        // 1. Testar API usando GM_xmlhttpRequest
        GM_xmlhttpRequest({
            method: 'GET',
            url: API_HELLO_URL,
            onload: function(response) {
                console.log('[Agente] Resposta da API:', response);
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('[Agente] Dados da API:', data);
                    
                    if (response.status === 200 && data.status === 'success') {
                        statusApi.className = 'status-value online';
                        statusApi.textContent = '✓ Online';
                        console.log('[Agente] ✅ API Online');
                        
                        // 2. Verificar status do Gemini
                        // Se a API retornou sucesso, significa que o Gemini está funcionando
                        if (data.model) {
                            statusGemini.className = 'status-value online';
                            statusGemini.textContent = `✓ ${data.model}`;
                            console.log('[Agente] ✅ Gemini disponível:', data.model);
                        } else {
                            // Se chegou aqui com sucesso, Gemini está online mesmo sem campo model
                            statusGemini.className = 'status-value online';
                            statusGemini.textContent = '✓ Disponível';
                            console.log('[Agente] ✅ Gemini disponível');
                        }
                        
                        // Verificar seletores após sucesso da API
                        verificarSeletores();
                    } else {
                        throw new Error('API retornou status inesperado');
                    }
                } catch (error) {
                    console.error('[Agente] ❌ Erro ao processar resposta:', error);
                    statusApi.className = 'status-value offline';
                    statusApi.textContent = '✗ Offline';
                    statusGemini.className = 'status-value offline';
                    statusGemini.textContent = '✗ Offline';
                }
            },
            onerror: function(error) {
                console.error('[Agente] ❌ Erro na requisição:', error);
                statusApi.className = 'status-value offline';
                statusApi.textContent = '✗ Offline';
                statusGemini.className = 'status-value offline';
                statusGemini.textContent = '✗ Offline';
            }
        });
        
        // Função para verificar seletores
        function verificarSeletores() {
            setTimeout(() => {
                const containers = document.querySelectorAll(SELETORES.CONTAINER_ITEM);
                console.log('[Agente] Containers encontrados:', containers.length);
                
                if (containers.length > 0) {
                    statusSeletores.className = 'status-value online';
                    statusSeletores.textContent = `✓ ${containers.length} itens`;
                    console.log('[Agente] ✅ Seletores OK');
                    
                    // Habilitar botão se tudo estiver OK
                    if (statusApi.classList.contains('online') && 
                        statusGemini.classList.contains('online')) {
                        btnIniciar.disabled = false;
                        console.log('[Agente] ✅ Sistema pronto!');
                    }
                } else {
                    statusSeletores.className = 'status-value offline';
                    statusSeletores.textContent = '✗ Não encontrado';
                    console.log('[Agente] ❌ Seletores não encontrados');
                }
            }, 500);
        }
    }

    // ========== FUNÇÃO DE CONVERSÃO DE IMAGEM ==========
    function converterImagemParaBase64(url, callback) {
        console.log('[Agente] Convertendo imagem:', url);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            responseType: 'blob',
            headers: {
                'Accept': 'image/*'
            },
            // Importante: permite enviar cookies/credenciais da página
            anonymous: false,
            onload: function(response) {
                console.log('[Agente] Resposta recebida:', {
                    status: response.status,
                    contentType: response.responseHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1],
                    size: response.response?.size
                });
                
                if (response.status !== 200) {
                    console.error('[Agente] ❌ Status HTTP inválido:', response.status);
                    callback(null);
                    return;
                }
                
                if (!response.response || response.response.size === 0) {
                    console.error('[Agente] ❌ Resposta vazia ou inválida');
                    callback(null);
                    return;
                }
                
                const reader = new FileReader();
                reader.onloadend = function() {
                    const base64 = reader.result.split(',')[1]; // Remove "data:image/...;base64,"
                    console.log('[Agente] ✅ Imagem convertida (' + base64.length + ' chars)');
                    callback(base64);
                };
                reader.onerror = function(error) {
                    console.error('[Agente] ❌ Erro no FileReader:', error);
                    callback(null);
                };
                reader.readAsDataURL(response.response);
            },
            onerror: function(error) {
                console.error('[Agente] ❌ Erro ao carregar imagem:', error);
                callback(null);
            }
        });
    }

    // ========== FUNÇÃO REAL DE AUDITORIA ==========
    function iniciarAuditoria() {
        console.log('[Agente] 🚀 MODO PRODUÇÃO - Iniciando auditoria real!');
        
        const modoTeste = document.getElementById('chkModoTeste').checked;
        const bloquearGravacao = document.getElementById('chkBloquearGravacao').checked;
        const promptPersonalizado = document.getElementById('prompt-gemini').value;
        
        const todosContainers = document.querySelectorAll(SELETORES.CONTAINER_ITEM);
        const containers = modoTeste ? [todosContainers[0]] : Array.from(todosContainers);
        
        console.log(`[Agente] Modo teste: ${modoTeste ? 'SIM' : 'NÃO'}`);
        console.log(`[Agente] Bloqueio de gravação: ${bloquearGravacao ? 'ATIVO' : 'INATIVO'}`);
        console.log(`[Agente] Processando ${containers.length} item(ns)`);
        
        containers.forEach((container, index) => {
            // Extrair dados do container
            const elementoData = container.querySelector(SELETORES.DATA_BAIXA);
            const elementoImagem = container.querySelector(SELETORES.IMAGEM_CANHOTO);
            
            if (!elementoData || !elementoImagem) {
                console.warn(`[Agente] Item ${index + 1}: Elementos não encontrados`);
                return;
            }
            
            const dataDeBaixa = elementoData.innerText.trim();
            const urlImagem = elementoImagem.src;
            
            console.log(`[Agente] Item ${index + 1}: Data=${dataDeBaixa}, URL=${urlImagem}`);
            
            // Criar badge
            const badge = document.createElement('div');
            badge.className = 'badge-status-ia processando';
            badge.innerHTML = `
                <div class="badge-header">
                    <div class="badge-titulo">
                        <span class="icone">⏳</span>
                        <span class="texto">Processando...</span>
                    </div>
                    <button class="btn-minimizar">📋</button>
                </div>
                <div class="badge-json">Convertendo imagem...</div>
            `;
            
            container.appendChild(badge);
            
            // Event listener para minimizar
            badge.querySelector('.btn-minimizar').addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                badge.classList.toggle('minimizado');
                badge.querySelector('.badge-json').classList.toggle('visivel');
            });
            
            // Converter imagem e enviar para API
            converterImagemParaBase64(urlImagem, function(imagemBase64) {
                if (!imagemBase64) {
                    // Erro na conversão
                    badge.className = 'badge-status-ia erro';
                    badge.querySelector('.badge-header .texto').textContent = 'Erro na imagem';
                    badge.querySelector('.badge-json').textContent = JSON.stringify({
                        error: "Falha ao converter imagem",
                        url: urlImagem
                    }, null, 2);
                    return;
                }
                
                badge.querySelector('.badge-json').textContent = 'Enviando para Gemini...';
                
                // Chamar API de análise
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: API_URL,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        dataDeBaixa: dataDeBaixa,
                        imagemBase64: imagemBase64,
                        prompt: promptPersonalizado
                    }),
                    onload: function(response) {
                        console.log(`[Agente] Item ${index + 1}: Resposta recebida`, response.status);
                        
                        try {
                            const resultado = JSON.parse(response.responseText);
                            
                            if (response.status === 200 && resultado.status === 'success') {
                                // Sucesso
                                badge.className = 'badge-status-ia sucesso';
                                badge.querySelector('.badge-header').innerHTML = `
                                    <div class="badge-titulo">
                                        <span class="icone">✅</span>
                                        <span class="texto">Análise OK</span>
                                    </div>
                                    <button class="btn-minimizar">📋</button>
                                `;
                                
                                // Re-adicionar event listener
                                badge.querySelector('.btn-minimizar').addEventListener('click', function(event) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.stopImmediatePropagation();
                                    badge.classList.toggle('minimizado');
                                    badge.querySelector('.badge-json').classList.toggle('visivel');
                                });
                                
                                badge.querySelector('.badge-json').textContent = JSON.stringify(resultado.data, null, 2);
                                
                                // Marcar checkboxes SE não estiver bloqueado
                                if (!bloquearGravacao) {
                                    marcarCheckboxes(container, resultado.data, dataDeBaixa);
                                    console.log(`[Agente] Item ${index + 1}: Checkboxes marcados`);
                                } else {
                                    console.log(`[Agente] Item ${index + 1}: Gravação bloqueada - checkboxes NÃO marcados`);
                                }
                                
                            } else {
                                throw new Error(resultado.message || 'Erro desconhecido');
                            }
                            
                        } catch (error) {
                            // Erro no processamento
                            console.error(`[Agente] Item ${index + 1}: Erro`, error);
                            badge.className = 'badge-status-ia erro';
                            badge.querySelector('.badge-header').innerHTML = `
                                <div class="badge-titulo">
                                    <span class="icone">❌</span>
                                    <span class="texto">Erro</span>
                                </div>
                                <button class="btn-minimizar">📋</button>
                            `;
                            
                            badge.querySelector('.btn-minimizar').addEventListener('click', function(event) {
                                event.preventDefault();
                                event.stopPropagation();
                                event.stopImmediatePropagation();
                                badge.classList.toggle('minimizado');
                                badge.querySelector('.badge-json').classList.toggle('visivel');
                            });
                            
                            badge.querySelector('.badge-json').textContent = JSON.stringify({
                                error: error.message,
                                response: response.responseText
                            }, null, 2);
                        }
                    },
                    onerror: function(error) {
                        console.error(`[Agente] Item ${index + 1}: Erro na requisição`, error);
                        badge.className = 'badge-status-ia erro';
                        badge.querySelector('.badge-header .texto').textContent = 'Erro de rede';
                        badge.querySelector('.badge-json').textContent = JSON.stringify({
                            error: "Falha na conexão com API",
                            details: error
                        }, null, 2);
                    }
                });
            });
        });
    }
    
    // ========== FUNÇÃO PARA MARCAR CHECKBOXES ==========
    function marcarCheckboxes(container, dados, dataDeBaixa) {
        console.log('[Agente] Marcando checkboxes com base nos dados:', dados);
        
        // TODO: Implementar lógica de marcação baseada nos dados retornados
        // Exemplo:
        // if (dados.canhoto_status !== 'Legivel') {
        //     const checkbox = container.querySelector(SELETORES.CHECKBOX_PROBLEMA_IMAGEM);
        //     if (checkbox && !checkbox.checked) checkbox.click();
        // }
    }

    // ========== INICIALIZAÇÃO ==========
    console.log('[Agente] Script carregado!');
    
    window.addEventListener('load', () => {
        console.log('[Agente] Página carregada');
        console.log('[Agente] URL:', window.location.href);
        
        // Verificar se estamos na página correta (que contém os elementos de auditoria)
        setTimeout(() => {
            const containers = document.querySelectorAll(SELETORES.CONTAINER_ITEM);
            
            if (containers.length === 0) {
                console.log('[Agente] ⚠️ Página não contém elementos de auditoria - script não será ativado');
                return; // Não ativa o agente se não encontrar os containers
            }
            
            console.log(`[Agente] ✅ Encontrados ${containers.length} itens para auditoria - ativando agente`);
            criarInterface();
        }, 500); // Aguarda 500ms para garantir que o DOM está carregado
    });

})();

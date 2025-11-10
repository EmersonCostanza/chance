// ==UserScript==
// @name         Agente de Auditoria (Chance)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Assistente de auditoria para validação de entregas com IA
// @author       Emerson Costanza
// @match        https://chancce.moblink.com.br/chancce_painel/main/redirecionar/13*
// @match        https://chancce.moblink.com.br/painel/index.php/main/redirecionar/13/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      chance-rho.vercel.app
// ==/UserScript==

(function() {
    'use strict';

    // ========== CONFIGURAÇÃO ==========
    const API_URL = 'https://chance-rho.vercel.app/api/analisar';
    
    // IMPORTANTE: Ajuste estes seletores CSS inspecionando a página (F12)
    const SELETORES = {
        CONTAINER_ITEM: '.row.canhoto', // Container de cada item de entrega
        DATA_BAIXA: 'span[id^="dataBaixa_"]', // Elemento com a data de baixa (ID dinâmico: dataBaixa_0, dataBaixa_1, etc)
        IMAGEM_CANHOTO: 'img[id^="img_"]', // Tag <img> do canhoto (ID dinâmico: img_0, img_1, etc)
        CHECKBOX_OK: 'input[id^="idchecklist3_"]', // Checkbox "OK" (value="3")
        CHECKBOX_CAMPO_BRANCO: 'input[id^="idchecklist4_"]', // Campo em Branco (value="4")
        CHECKBOX_CAMPO_ILEGIVEL: 'input[id^="idchecklist5_"]', // Campo Ilegível (value="5")
        CHECKBOX_DATA_DIVERGENTE: 'input[id^="idchecklist6_"]', // Data Divergente
        SPAN_DIAS_DIVERGENCIA: 'span[id^="id_qtd_dias_divergencia_"]', // Span para inserir qtd de dias divergentes
        CHECKBOX_PROBLEMA_IMAGEM: 'input[id^="idchecklist7_"]', // Problema na imagem (value="7")
        BOTAO_GRAVAR_TODOS: 'button[onclick="GravarTudo()"]', // Botão "Gravar Todos"
        BOTAO_LISTAR_NOVAMENTE: 'button[onclick="Recarregar()"]' // Botão "Listar Novamente"
    };

    // ========== CSS (Feedback Visual) ==========
    GM_addStyle(`
        /* Painel do Agente */
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
            min-width: 320px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        #painel-agente h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        
        .toggle-container {
            background: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .toggle-container label {
            display: flex;
            align-items: center;
            cursor: pointer;
            gap: 10px;
        }
        
        .toggle-container input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .toggle-container input[type="number"] {
            width: 60px;
            padding: 5px;
            border: none;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
        }
        
        .flex-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        #status-agente {
            margin-top: 15px;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 5px;
            font-size: 12px;
            min-height: 40px;
        }
        
        /* Painel de Logs JSON */
        #painel-logs {
            position: fixed;
            top: 20px;
            left: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            z-index: 1000000;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            display: none;
        }
        
        #painel-logs.visivel {
            display: block;
        }
        
        #painel-logs h4 {
            margin: 0 0 10px 0;
            color: #4ec9b0;
            font-size: 16px;
            font-weight: bold;
            border-bottom: 2px solid #4ec9b0;
            padding-bottom: 8px;
        }
        
        #painel-logs pre {
            background: #252526;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 5px 0;
            border-left: 3px solid #4ec9b0;
            color: #ce9178;
            line-height: 1.4;
        }
        
        #painel-logs .log-item {
            margin-bottom: 15px;
            padding: 12px;
            background: #2d2d30;
            border-radius: 8px;
            border-left: 4px solid #569cd6;
        }
        
        #painel-logs .log-timestamp {
            color: #dcdcaa;
            font-size: 11px;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        #painel-logs::-webkit-scrollbar {
            width: 10px;
        }
        
        #painel-logs::-webkit-scrollbar-track {
            background: #1e1e1e;
            border-radius: 5px;
        }
        
        #painel-logs::-webkit-scrollbar-thumb {
            background: #4ec9b0;
            border-radius: 5px;
        }
        
        #painel-logs::-webkit-scrollbar-thumb:hover {
            background: #569cd6;
        }
        
        /* Feedback nos itens */
        .auditoria-processando {
            border: 3px solid #FFA500 !important;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .auditoria-item-ok {
            border: 3px solid #00FF00 !important;
            background: rgba(0, 255, 0, 0.05) !important;
        }
        
        .auditoria-item-erro {
            border: 3px solid #FF0000 !important;
            background: rgba(255, 0, 0, 0.05) !important;
        }
        
        .feedback-ok-checklist {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #00FF00;
            color: #000;
            padding: 8px 12px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,255,0,0.5);
        }
        
        .feedback-ok-checklist::before {
            content: '✓ ';
            font-size: 18px;
        }
        
        /* Badge de diagnóstico da IA - CHECKLIST INDIVIDUAL */
        .diagnostico-ia {
            position: fixed !important;
            top: 50% !important;
            left: 0 !important;
            transform: translateY(-50%) !important;
            background: white !important;
            color: #333 !important;
            padding: 15px !important;
            border-radius: 0 10px 10px 0 !important;
            font-weight: normal !important;
            font-size: 13px !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
            border: 3px solid !important;
            border-left: none !important;
            z-index: 1000001 !important;
            min-width: 300px !important;
            max-width: 350px !important;
            line-height: 1.5 !important;
            display: block !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            pointer-events: none !important;
        }
        
        .diagnostico-ia.ok {
            border-color: #00cc00 !important;
            background: linear-gradient(135deg, #e8ffe8, #f0fff0) !important;
        }
        
        .diagnostico-ia.erro {
            border-color: #ff0000 !important;
            background: linear-gradient(135deg, #ffe8e8, #fff0f0) !important;
        }
        
        .diagnostico-ia.alerta {
            border-color: #ff9900 !important;
            background: linear-gradient(135deg, #fff4e8, #fffaf0) !important;
        }
        
        .diagnostico-ia .titulo-badge {
            font-size: 15px !important;
            font-weight: bold !important;
            margin-bottom: 12px !important;
            padding-bottom: 8px !important;
            border-bottom: 2px solid rgba(0,0,0,0.1) !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        
        .diagnostico-ia .checklist {
            margin: 10px 0 !important;
        }
        
        .diagnostico-ia .checklist-item {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 5px 0 !important;
            font-size: 13px !important;
        }
        
        .diagnostico-ia .checklist-item .icon {
            font-size: 16px !important;
            min-width: 20px !important;
        }
        
        .diagnostico-ia .resultado {
            margin-top: 12px !important;
            padding-top: 12px !important;
            border-top: 2px solid rgba(0,0,0,0.1) !important;
            font-weight: bold !important;
            font-size: 14px !important;
            text-align: center !important;
        }
        
        .diagnostico-ia .checkbox-info {
            margin-top: 8px !important;
            padding: 8px !important;
            background: rgba(0,0,0,0.05) !important;
            border-radius: 5px !important;
            font-size: 12px !important;
            text-align: center !important;
        }
        
        /* Badge de Resumo da Auditoria */
        #resumo-auditoria {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 999998;
            max-width: 350px;
            border-left: 5px solid #667eea;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        #resumo-auditoria h4 {
            margin: 0 0 15px 0;
            color: #667eea;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        #resumo-auditoria .checklist-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        
        #resumo-auditoria .checklist-item:last-child {
            border-bottom: none;
        }
        
        #resumo-auditoria .check-icon {
            font-size: 18px;
            min-width: 24px;
        }
        
        #resumo-auditoria .resultado-final {
            margin-top: 15px;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
        }
        
        #resumo-auditoria .resultado-final.sucesso {
            background: linear-gradient(to right, #e8ffe8, #d4ffd4);
            color: #006600;
            border: 2px solid #00cc00;
        }
        
        #resumo-auditoria .resultado-final.erro {
            background: linear-gradient(to right, #ffe8e8, #ffd4d4);
            color: #cc0000;
            border: 2px solid #ff0000;
        }
        
    `);

    // ========== VARIÁVEIS GLOBAIS ==========
    let itensProcessados = 0;
    let totalItens = 0;
    let resultadosAuditoria = []; // Array para armazenar resultados individuais
    let logsJson = []; // Array para armazenar logs da API
    let processamentoPausado = false; // Flag de pausa

    // ========== CRIAR INTERFACE ==========
    function criarInterface() {
        console.log('[Chance Agente] Criando interface...');
        
        const painel = document.createElement('div');
        painel.id = 'painel-agente';
        painel.innerHTML = `
            <h3>🤖 Agente de Auditoria</h3>
            
            <div class="toggle-container">
                <label>
                    <input type="checkbox" id="chkAnalisarTudo">
                    <span>Analisar Tudo ao Carregar</span>
                </label>
            </div>
            
            <div class="toggle-container">
                <label>
                    <input type="checkbox" id="chkModoTeste">
                    <span>🧪 Modo Teste (1 item apenas)</span>
                </label>
            </div>
            
            <div class="toggle-container">
                <div class="flex-row">
                    <label style="flex: 1;">
                        <input type="checkbox" id="chkAnalisarGravarAuto">
                        <span>Gravar Automaticamente</span>
                    </label>
                </div>
                <div class="flex-row" style="margin-top: 8px;">
                    <label style="font-size: 12px;">Páginas:</label>
                    <input type="number" id="numPaginas" min="1" value="1" style="width: 50px;">
                </div>
            </div>
            
            <button id="btnIniciarManual" style="width: 100%; padding: 10px; margin-top: 10px; background: #00FF00; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                ▶ Iniciar Análise
            </button>
            
            <button id="btnPausar" style="width: 100%; padding: 10px; margin-top: 5px; background: #FF9900; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; display: none;">
                ⏸ Pausar
            </button>
            
            <button id="btnVerLogs" style="width: 100%; padding: 10px; margin-top: 5px; background: #333; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                📋 Ver Logs JSON
            </button>
            
            <div id="status-agente">Aguardando...</div>
        `;
        
        document.body.appendChild(painel);
        console.log('[Chance Agente] Painel adicionado ao body');
        
        // Criar painel de logs
        const painelLogs = document.createElement('div');
        painelLogs.id = 'painel-logs';
        painelLogs.innerHTML = `
            <h4>📋 Logs da API (JSON)</h4>
            <div id="conteudo-logs">Nenhum log ainda...</div>
        `;
        document.body.appendChild(painelLogs);
        
        // Restaurar estado dos toggles
        document.getElementById('chkAnalisarTudo').checked = GM_getValue('analisarTudo', false);
        document.getElementById('chkAnalisarGravarAuto').checked = GM_getValue('gravarAuto', false);
        document.getElementById('chkModoTeste').checked = GM_getValue('modoTeste', false);
        document.getElementById('numPaginas').value = GM_getValue('numPaginas', 1);
        
        // Eventos dos toggles
        document.getElementById('chkAnalisarTudo').addEventListener('change', (e) => {
            GM_setValue('analisarTudo', e.target.checked);
            atualizarStatus('✓ Configuração salva');
        });
        
        document.getElementById('chkAnalisarGravarAuto').addEventListener('change', (e) => {
            GM_setValue('gravarAuto', e.target.checked);
            atualizarStatus('✓ Configuração salva');
        });
        
        document.getElementById('chkModoTeste').addEventListener('change', (e) => {
            GM_setValue('modoTeste', e.target.checked);
            atualizarStatus(e.target.checked ? '🧪 Modo teste ativado' : '✓ Modo normal ativado');
        });
        
        document.getElementById('numPaginas').addEventListener('change', (e) => {
            GM_setValue('numPaginas', parseInt(e.target.value) || 1);
            atualizarStatus('✓ Número de páginas salvo');
        });
        
        // Botão manual
        document.getElementById('btnIniciarManual').addEventListener('click', () => {
            console.log('[Chance Agente] Botão manual clicado');
            iniciarAuditoria();
        });
        
        // Botão pausar
        document.getElementById('btnPausar').addEventListener('click', () => {
            processamentoPausado = !processamentoPausado;
            const btn = document.getElementById('btnPausar');
            if (processamentoPausado) {
                btn.textContent = '▶ Retomar';
                btn.style.background = '#00FF00';
                atualizarStatus('⏸ Processamento pausado');
            } else {
                btn.textContent = '⏸ Pausar';
                btn.style.background = '#FF9900';
                atualizarStatus('▶ Processamento retomado');
            }
        });
        
        // Botão ver logs
        document.getElementById('btnVerLogs').addEventListener('click', () => {
            const painelLogs = document.getElementById('painel-logs');
            painelLogs.classList.toggle('visivel');
            const btn = document.getElementById('btnVerLogs');
            btn.textContent = painelLogs.classList.contains('visivel') ? '❌ Fechar Logs' : '📋 Ver Logs JSON';
        });
    }

    // ========== FUNÇÕES AUXILIARES ==========
    function atualizarStatus(mensagem) {
        const status = document.getElementById('status-agente');
        if (status) {
            status.textContent = mensagem;
        }
    }
    
    function adicionarLogVisual(resultado) {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        const logItem = {
            timestamp: timestamp,
            data: resultado
        };
        
        logsJson.unshift(logItem); // Adiciona no início do array
        
        // Limitar a 20 logs
        if (logsJson.length > 20) {
            logsJson.pop();
        }
        
        // Atualizar painel de logs
        const conteudoLogs = document.getElementById('conteudo-logs');
        if (conteudoLogs) {
            conteudoLogs.innerHTML = logsJson.map(log => `
                <div class="log-item">
                    <div class="log-timestamp">⏰ ${log.timestamp}</div>
                    <pre>${JSON.stringify(log.data, null, 2)}</pre>
                </div>
            `).join('');
        }
    }

    function converterImagemParaBase64(url, callback) {
        console.log('[Chance Agente] 🖼️ Tentando carregar imagem:', url);
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            console.log('[Chance Agente] ✅ Imagem carregada com sucesso:', {
                width: img.width,
                height: img.height
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            console.log('[Chance Agente] ✅ Imagem convertida para Base64. Tamanho:', dataURL.length);
            callback(dataURL);
        };
        
        img.onerror = function(error) {
            console.error('[Chance Agente] ❌ Erro ao carregar imagem:', url);
            console.error('[Chance Agente] ❌ Detalhes do erro:', error);
            callback(null);
        };
        
        img.src = url;
    }

    function waitForElement(selector, callback, maxTentativas = 20) {
        let tentativas = 0;
        const intervalo = setInterval(() => {
            const elemento = document.querySelector(selector);
            if (elemento) {
                clearInterval(intervalo);
                callback(elemento);
            } else if (++tentativas >= maxTentativas) {
                clearInterval(intervalo);
                console.warn('Elemento não encontrado:', selector);
            }
        }, 500);
    }

    // ========== LÓGICA PRINCIPAL ==========
    function iniciarAuditoria() {
        console.log('[Chance Agente] 🔍 Procurando seletor:', SELETORES.CONTAINER_ITEM);
        
        // Limpar resultados anteriores
        resultadosAuditoria = [];
        processamentoPausado = false;
        
        // Mostrar botão pausar
        document.getElementById('btnPausar').style.display = 'block';
        document.getElementById('btnPausar').textContent = '⏸ Pausar';
        document.getElementById('btnPausar').style.background = '#FF9900';
        
        const itens = document.querySelectorAll(SELETORES.CONTAINER_ITEM);
        
        console.log('[Chance Agente] 📊 Itens encontrados:', itens.length);
        
        if (itens.length === 0) {
            // Tentar seletores alternativos
            console.log('[Chance Agente] ⚠️ Nenhum item com .row.canhoto encontrado. Tentando alternativas...');
            
            const alternativas = [
                '.canhoto',
                '[class*="canhoto"]',
                '.row',
                'div.row'
            ];
            
            for (const sel of alternativas) {
                const teste = document.querySelectorAll(sel);
                console.log(`[Chance Agente] Testando "${sel}": ${teste.length} encontrados`);
            }
            
            atualizarStatus('❌ Nenhum item encontrado. Verifique os seletores CSS!');
            document.getElementById('btnPausar').style.display = 'none';
            return;
        }
        
        // Verificar modo teste
        const modoTeste = GM_getValue('modoTeste', false);
        const itensParaProcessar = modoTeste ? [itens[0]] : Array.from(itens);
        
        totalItens = itensParaProcessar.length;
        itensProcessados = 0;
        
        atualizarStatus(`📊 Analisando ${totalItens} ${modoTeste ? 'item (MODO TESTE)' : 'itens'}...`);
        
        itensParaProcessar.forEach((item, index) => {
            console.log('[Chance Agente] 🎯 Item', index, ':', item);
            setTimeout(() => {
                if (!processamentoPausado) {
                    processarItem(item, index + 1);
                }
            }, index * 1000); // 1s entre cada item
        });
    }

    function processarItem(item, numero) {
        atualizarStatus(`🔍 Analisando item ${numero}/${totalItens}...`);
        item.classList.add('auditoria-processando');
        
        // Extrair dados
        const elementoData = item.querySelector(SELETORES.DATA_BAIXA);
        const elementoImagem = item.querySelector(SELETORES.IMAGEM_CANHOTO);
        
        if (!elementoData || !elementoImagem) {
            console.error('Elementos não encontrados no item:', item);
            item.classList.remove('auditoria-processando');
            item.classList.add('auditoria-item-erro');
            finalizarItem();
            return;
        }
        
        const dataDeBaixa = elementoData.innerText.trim();
        const urlImagem = elementoImagem.src;
        
        // Converter imagem
        converterImagemParaBase64(urlImagem, (imagemBase64) => {
            if (!imagemBase64) {
                item.classList.remove('auditoria-processando');
                item.classList.add('auditoria-item-erro');
                finalizarItem();
                return;
            }
            
            // Chamar API
            chamarApiVercel(item, dataDeBaixa, imagemBase64);
        });
    }

    function chamarApiVercel(item, dataDeBaixa, imagemBase64) {
        console.log('[Chance Agente] 📤 Enviando para API:', {
            dataDeBaixa: dataDeBaixa,
            tamanhoImagem: imagemBase64.length
        });
        
        GM_xmlhttpRequest({
            method: 'POST',
            url: API_URL,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                dataDeBaixa: dataDeBaixa,
                imagemBase64: imagemBase64
            }),
            onload: function(response) {
                console.log('[Chance Agente] 📨 Status da resposta:', response.status);
                console.log('[Chance Agente] 📨 Response completo:', response);
                console.log('[Chance Agente] 📄 Response text:', response.responseText);
                console.log('[Chance Agente] 📄 Response text length:', response.responseText.length);
                
                try {
                    if (!response.responseText || response.responseText.trim() === '') {
                        throw new Error('Resposta vazia da API');
                    }
                    
                    const resultado = JSON.parse(response.responseText);
                    
                    // ============ LOGS DETALHADOS DA RESPOSTA DA IA ============
                    console.log('╔═══════════════════════════════════════════════════════╗');
                    console.log('║         RESPOSTA COMPLETA DA API/IA                   ║');
                    console.log('╚═══════════════════════════════════════════════════════╝');
                    console.log('📦 Objeto completo:', resultado);
                    console.log('� resultado.resposta:', resultado.resposta);
                    console.log('📏 Tipo:', typeof resultado.resposta);
                    console.log('📏 Tamanho:', resultado.resposta?.length);
                    console.log('🔤 Caracteres (array):', resultado.resposta ? Array.from(resultado.resposta) : 'N/A');
                    console.log('🔢 Char codes:', resultado.resposta ? resultado.resposta.split('').map(c => c.charCodeAt(0)) : 'N/A');
                    if (resultado.debug) {
                        console.log('🐛 Debug info:', resultado.debug);
                    }
                    console.log('═══════════════════════════════════════════════════════');
                    
                    // Adicionar ao painel de logs visual
                    adicionarLogVisual(resultado);
                    
                    executarAcao(item, dataDeBaixa, resultado);
                } catch (error) {
                    console.error('[Chance Agente] ❌ Erro ao processar resposta:', error);
                    console.error('[Chance Agente] 📄 Conteúdo da resposta que falhou:', response.responseText);
                    item.classList.remove('auditoria-processando');
                    item.classList.add('auditoria-item-erro');
                    
                    // Criar badge de erro de API
                    const diagnostico = document.createElement('div');
                    diagnostico.className = 'diagnostico-ia erro';
                    diagnostico.innerHTML = `
                        <div class="titulo">❌ Erro na API</div>
                        <div class="detalhes">Falha ao comunicar com servidor: ${error.message}</div>
                    `;
                    item.appendChild(diagnostico);
                }
                finalizarItem();
            },
            onerror: function(error) {
                console.error('[Chance Agente] ❌ Erro na requisição:', error);
                item.classList.remove('auditoria-processando');
                item.classList.add('auditoria-item-erro');
                finalizarItem();
            }
        });
    }

    function executarAcao(item, dataDeBaixa, analiseIA) {
        item.classList.remove('auditoria-processando');
        
        // ============ LOGS DETALHADOS DO PROCESSAMENTO ============
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║         PROCESSANDO ANÁLISE DA IA                     ║');
        console.log('╚═══════════════════════════════════════════════════════╝');
        console.log('� Data do Sistema:', dataDeBaixa);
        console.log('� Análise:', analiseIA);
        
        const modoAutomatico = GM_getValue('gravarAuto', false);
        
        // Verificar cada campo da análise
        const canhotoslegivel = analiseIA.canhoto_status && analiseIA.canhoto_status.toLowerCase() === 'legivel';
        const temAssinatura = analiseIA.assinatura_nome && analiseIA.assinatura_nome.toLowerCase() !== 'ilegivel';
        const temDocumento = analiseIA.documento_status && analiseIA.documento_status.toLowerCase() === 'ok';
        const temRecebedor = analiseIA.recebedor_nome && analiseIA.recebedor_nome.toLowerCase() !== 'sem nome';
        const dataEntrega = analiseIA.data_entrega || '';
        
        console.log('[Chance Agente] 🔍 Validações:');
        console.log('  - Canhoto legível:', canhotoslegivel);
        console.log('  - Tem assinatura:', temAssinatura);
        console.log('  - Tem documento:', temDocumento);
        console.log('  - Tem recebedor:', temRecebedor);
        console.log('  - Data entrega:', dataEntrega);
        
        // Comparar data do sistema com data de entrega
        let datasIguais = false;
        let diasDiferenca = 0;
        
        if (dataEntrega && dataEntrega !== 'Erro') {
            const dataSistema = parseDataBrasileira(dataDeBaixa);
            const dataImagem = parseDataBrasileira(dataEntrega);
            
            if (dataSistema && dataImagem) {
                const diffTime = Math.abs(dataImagem - dataSistema);
                diasDiferenca = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                datasIguais = (diasDiferenca === 0);
                
                console.log('[Chance Agente] 📅 Comparação de datas:', {
                    dataSistema: dataDeBaixa,
                    dataImagem: dataEntrega,
                    diasDiferenca: diasDiferenca,
                    datasIguais: datasIguais
                });
            }
        }
        
        // Determinar o código de status baseado na análise
        let codigo = '';
        
        if (analiseIA.resposta === 'ERRO_API_SOBRECARREGADA' || analiseIA.resposta === 'ERRO_SISTEMA') {
            codigo = 'ERRO_API';
        } else if (!canhotoslegivel) {
            codigo = 'SEM_CANHOTO';
        } else if (!datasIguais && dataEntrega !== 'Erro') {
            codigo = 'DATA_DIVERGENTE';
        } else if (!temAssinatura || !temRecebedor) {
            codigo = 'ERRO_DADOS';
        } else if (canhotoslegivel && datasIguais && temAssinatura && temRecebedor) {
            codigo = 'OK';
        } else {
            codigo = 'ERRO_DADOS';
        }
        
        console.log('[Chance Agente] 🎯 Código final identificado:', codigo);
        console.log('[Chance Agente] 🎯 Modo automático:', modoAutomatico);
        console.log('═══════════════════════════════════════════════════════');
        
        // Armazenar resultado da auditoria
        const resultado = {
            dataBaixa: dataDeBaixa,
            codigo: codigo,
            analise: analiseIA,
            datasIguais: datasIguais,
            diasDiferenca: diasDiferenca,
            checkboxMarcado: null
        };
        
        // Garantir que o item tenha position relative
        if (window.getComputedStyle(item).position === 'static') {
            item.style.position = 'relative';
        }
        
        switch(codigo) {
            case 'OK': {
                // Tudo certo - NÃO marca nada, apenas feedback visual
                console.log('[Chance Agente] ✅ Status: OK - Nenhum erro detectado');
                item.classList.add('auditoria-item-ok');
                
                // Criar badge de diagnóstico com checklist
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia ok';
                diagnostico.innerHTML = `
                    <div class="titulo-badge">🤖 Auditoria da IA</div>
                    <div class="checklist">
                        <div class="checklist-item">
                            <span class="icon">✅</span>
                            <span>Data: ${analiseIA.data_entrega} (OK)</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">✅</span>
                            <span>Assinatura: ${analiseIA.assinatura_nome}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">✅</span>
                            <span>Recebedor: ${analiseIA.recebedor_nome}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">✅</span>
                            <span>Canhoto: ${analiseIA.canhoto_status}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">✅</span>
                            <span>Documento: ${analiseIA.documento_status}</span>
                        </div>
                    </div>
                    <div class="resultado" style="color: #006600;">
                        ✅ Resultado: OK, pode gravar
                    </div>
                `;
                item.appendChild(diagnostico);
                
                console.log('[Chance Agente] ✅ Badge OK adicionado:', diagnostico);
                console.log('[Chance Agente] 📍 Badge está visível?', diagnostico.offsetParent !== null);
                
                resultado.checkboxMarcado = 'Nenhum (aprovado)';
                
                // Não marca nenhum checkbox quando está OK
                break;
            }
                
            case 'ERRO_DADOS': {
                // Marcar checkbox de campo em branco OU ilegível
                console.log('[Chance Agente] ⚠️ Erro detectado: Dados ausentes ou ilegíveis na imagem');
                item.classList.add('auditoria-item-erro');
                
                // Criar badge de diagnóstico com checklist
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia erro';
                diagnostico.innerHTML = `
                    <div class="titulo-badge">🤖 Auditoria da IA</div>
                    <div class="checklist">
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.data_entrega !== 'Erro' ? '✅' : '❌'}</span>
                            <span>Data: ${analiseIA.data_entrega}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.assinatura_nome !== 'Ilegivel' ? '✅' : '❌'}</span>
                            <span>Assinatura: ${analiseIA.assinatura_nome}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.recebedor_nome !== 'Sem nome' ? '✅' : '❌'}</span>
                            <span>Recebedor: ${analiseIA.recebedor_nome}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.canhoto_status === 'Legivel' ? '✅' : '❌'}</span>
                            <span>Canhoto: ${analiseIA.canhoto_status}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.documento_status === 'ok' ? '✅' : '❌'}</span>
                            <span>Documento: ${analiseIA.documento_status}</span>
                        </div>
                    </div>
                    <div class="resultado" style="color: #cc0000;">
                        ❌ Resultado: Dados ilegíveis ou ausentes
                    </div>
                    <div class="checkbox-info">
                        ${modoAutomatico ? '✓ Campo em Branco selecionado' : 'Campo em Branco (não marcado)'}
                    </div>
                `;
                item.appendChild(diagnostico);
                
                console.log('[Chance Agente] ❌ Badge ERRO adicionado:', diagnostico);
                
                if (modoAutomatico) {
                    console.log('[Chance Agente] 📝 Marcando checkbox: Campo em Branco');
                    // Marca campo em branco por padrão
                    const checkboxCampoBranco = item.querySelector(SELETORES.CHECKBOX_CAMPO_BRANCO);
                    if (checkboxCampoBranco) {
                        checkboxCampoBranco.click();
                        resultado.checkboxMarcado = 'Campo em Branco';
                    }
                } else {
                    console.log('[Chance Agente] ℹ️ Modo automático desativado - checkbox não será marcado');
                    resultado.checkboxMarcado = 'Campo em Branco (não marcado - modo manual)';
                }
                break;
            }
                
            case 'DATA_DIVERGENTE': {
                // Marcar data divergente
                console.log('[Chance Agente] ⚠️ Erro detectado: Data divergente encontrada');
                item.classList.add('auditoria-item-erro');
                
                if (modoAutomatico) {
                    const checkboxData = item.querySelector(SELETORES.CHECKBOX_DATA_DIVERGENTE);
                    if (checkboxData) {
                        checkboxData.click();
                        
                        // Inserir quantidade de dias no span
                        const spanDiasDivergencia = item.querySelector(SELETORES.SPAN_DIAS_DIVERGENCIA);
                        if (spanDiasDivergencia) {
                            spanDiasDivergencia.textContent = diasDiferenca;
                            spanDiasDivergencia.style.display = '';
                        }
                        
                        checkboxData.value = diasDiferenca;
                        
                        console.log('[Chance Agente] 📝 Marcando checkbox: Data Divergente (' + diasDiferenca + ' dias)');
                        resultado.checkboxMarcado = `Data Divergente (${diasDiferenca} dias)`;
                    }
                } else {
                    console.log('[Chance Agente] ℹ️ Modo automático desativado - checkbox não será marcado');
                    resultado.checkboxMarcado = 'Data Divergente (não marcado - modo manual)';
                }
                
                // Criar badge de diagnóstico
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia alerta';
                diagnostico.innerHTML = `
                    <div class="titulo-badge">🤖 Auditoria da IA</div>
                    <div class="checklist">
                        <div class="checklist-item">
                            <span class="icon">⚠️</span>
                            <span>Data de Baixa: Divergente</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.assinatura_nome !== 'Ilegivel' ? '✅' : '❌'}</span>
                            <span>Assinatura: ${analiseIA.assinatura_nome}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.canhoto_status === 'Legivel' ? '✅' : '❌'}</span>
                            <span>Canhoto: ${analiseIA.canhoto_status}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">${analiseIA.recebedor_nome !== 'Sem nome' ? '✅' : '❌'}</span>
                            <span>Recebedor: ${analiseIA.recebedor_nome}</span>
                        </div>
                    </div>
                    <div class="resultado" style="color: #996600;">
                        ⚠️ Resultado: Data divergente
                    </div>
                    <div class="checkbox-info">
                        Sistema: ${dataDeBaixa}<br>
                        Imagem: ${analiseIA.data_entrega}<br>
                        Diferença: ${diasDiferenca} ${diasDiferenca === 1 ? 'dia' : 'dias'}<br>
                        ${modoAutomatico ? '✓ Data Divergente selecionado' : 'Data Divergente (não marcado)'}
                    </div>
                `;
                item.appendChild(diagnostico);
                
                console.log('[Chance Agente] ⚠️ Badge DATA_DIVERGENTE adicionado');
                
                break;
            }
            
            case 'SEM_CANHOTO': {
                // Problema na imagem do canhoto
                console.log('[Chance Agente] ❌ Erro: Canhoto ilegível ou sem canhoto');
                item.classList.add('auditoria-item-erro');
                
                // Criar badge de diagnóstico
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia erro';
                diagnostico.innerHTML = `
                    <div class="titulo-badge">🤖 Auditoria da IA</div>
                    <div class="checklist">
                        <div class="checklist-item">
                            <span class="icon">❌</span>
                            <span>Canhoto: ${analiseIA.canhoto_status}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">⚠️</span>
                            <span>Análise comprometida</span>
                        </div>
                    </div>
                    <div class="resultado" style="color: #cc0000;">
                        ❌ Resultado: Problema na imagem do canhoto
                    </div>
                    <div class="checkbox-info">
                        ${modoAutomatico ? '✓ Problema na imagem selecionado' : 'Problema na imagem (não marcado)'}
                    </div>
                `;
                item.appendChild(diagnostico);
                
                if (modoAutomatico) {
                    console.log('[Chance Agente] 📝 Marcando checkbox: Problema na Imagem');
                    const checkboxImagem = item.querySelector(SELETORES.CHECKBOX_PROBLEMA_IMAGEM);
                    if (checkboxImagem) {
                        checkboxImagem.click();
                        resultado.checkboxMarcado = 'Problema na Imagem';
                    }
                } else {
                    resultado.checkboxMarcado = 'Problema na Imagem (não marcado - modo manual)';
                }
                break;
            }
            
            case 'ERRO_API': {
                // Erro na comunicação com a API (503, timeout, etc)
                console.log('[Chance Agente] ⚠️ Erro: API sobrecarregada ou indisponível');
                item.classList.add('auditoria-item-erro');
                
                // Criar badge de diagnóstico
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia alerta';
                diagnostico.innerHTML = `
                    <div class="titulo-badge">⚠️ Erro na API</div>
                    <div class="checklist">
                        <div class="checklist-item">
                            <span class="icon">⏳</span>
                            <span>Serviço temporariamente sobrecarregado</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">🔄</span>
                            <span>Tentativas realizadas: ${analiseIA.tentativas || 'N/A'}</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">💡</span>
                            <span>Tente novamente em alguns minutos</span>
                        </div>
                    </div>
                    <div class="resultado" style="color: #996600;">
                        ⚠️ API Google Gemini indisponível
                    </div>
                    <div class="checkbox-info">
                        ${analiseIA.error || 'Serviço sobrecarregado'}<br>
                        ${modoAutomatico ? '✓ Problema na imagem selecionado (temporário)' : 'Problema na imagem (não marcado)'}
                    </div>
                `;
                item.appendChild(diagnostico);
                
                if (modoAutomatico) {
                    console.log('[Chance Agente] 📝 Marcando checkbox: Problema na Imagem (erro temporário)');
                    const checkboxImagem = item.querySelector(SELETORES.CHECKBOX_PROBLEMA_IMAGEM);
                    if (checkboxImagem) {
                        checkboxImagem.click();
                        resultado.checkboxMarcado = 'Problema na Imagem (erro API)';
                    }
                } else {
                    resultado.checkboxMarcado = 'Problema na Imagem (não marcado - erro API)';
                }
                break;
            }
            
            default: {
                console.log('[Chance Agente] ❓ Código desconhecido recebido:', codigo);
                
                resultado.checkboxMarcado = `Resposta inesperada: ${codigo}`;
                
                // Criar badge de diagnóstico para erro desconhecido
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia erro';
                diagnostico.innerHTML = `
                    <div class="titulo-badge">🤖 Auditoria da IA</div>
                    <div class="checklist">
                        <div class="checklist-item">
                            <span class="icon">❓</span>
                            <span>Data de Baixa: Não analisado</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">❓</span>
                            <span>Assinatura: Não analisado</span>
                        </div>
                        <div class="checklist-item">
                            <span class="icon">❓</span>
                            <span>Imagem do Canhoto: Não analisado</span>
                        </div>
                    </div>
                    <div class="resultado" style="color: #cc0000;">
                        ❌ Resultado: Resposta inesperada
                    </div>
                    <div class="checkbox-info">
                        Código recebido: ${codigo}
                    </div>
                `;
                item.appendChild(diagnostico);
                
                break;
            }
        }
        
        // Adicionar resultado ao array
        resultadosAuditoria.push(resultado);
        
        // Verificar se o badge foi realmente adicionado
        const badgeAdicionado = item.querySelector('.diagnostico-ia');
        console.log('[Chance Agente] 🔍 Badge encontrado após adicionar:', badgeAdicionado);
        if (badgeAdicionado) {
            console.log('[Chance Agente] 📏 Dimensões do badge:', {
                width: badgeAdicionado.offsetWidth,
                height: badgeAdicionado.offsetHeight,
                top: badgeAdicionado.offsetTop,
                left: badgeAdicionado.offsetLeft
            });
        }
    }
    
    // Função auxiliar para converter data brasileira (DD/MM/AAAA) em objeto Date
    function parseDataBrasileira(dataStr) {
        const partes = dataStr.split('/');
        if (partes.length === 3) {
            const dia = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10) - 1; // Mês em JS é 0-11
            const ano = parseInt(partes[2], 10);
            return new Date(ano, mes, dia);
        }
        return null;
    }

    function finalizarItem() {
        itensProcessados++;
        atualizarStatus(`✓ Processados: ${itensProcessados}/${totalItens}`);
        
        if (itensProcessados === totalItens) {
            atualizarStatus(`✅ Auditoria concluída! ${totalItens} itens analisados.`);
            
            if (GM_getValue('gravarAuto', false)) {
                setTimeout(() => clicarGravarTodos(), 2000);
            }
        }
    }

    function clicarGravarTodos() {
        const botaoGravar = document.querySelector(SELETORES.BOTAO_GRAVAR_TODOS);
        if (botaoGravar) {
            atualizarStatus('💾 Gravando todos...');
            botaoGravar.click();
        }
    }

    // ========== INICIALIZAÇÃO ==========
    console.log('[Chance Agente] Script carregado!');
    
    window.addEventListener('load', () => {
        console.log('[Chance Agente] Página carregada, criando interface...');
        criarInterface();
        
        // Se modo automático estiver ativado, iniciar auditoria
        if (GM_getValue('analisarTudo', false)) {
            console.log('[Chance Agente] Modo automático ativo, iniciando análise...');
            setTimeout(() => iniciarAuditoria(), 2000);
        }
    });

})();

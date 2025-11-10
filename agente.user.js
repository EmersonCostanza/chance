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
            min-width: 280px;
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
        
        #status-agente {
            margin-top: 15px;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 5px;
            font-size: 12px;
            min-height: 40px;
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
        
        /* Badge de diagnóstico da IA */
        .diagnostico-ia {
            position: absolute !important;
            top: 10px !important;
            left: 10px !important;
            background: white !important;
            color: #333 !important;
            padding: 12px 16px !important;
            border-radius: 8px !important;
            font-weight: bold !important;
            font-size: 13px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            border-left: 4px solid !important;
            z-index: 99999 !important;
            max-width: 300px !important;
            line-height: 1.4 !important;
            display: block !important;
        }
        
        .diagnostico-ia.ok {
            border-left-color: #00FF00;
            background: linear-gradient(to right, #e8ffe8, white);
        }
        
        .diagnostico-ia.erro {
            border-left-color: #FF0000;
            background: linear-gradient(to right, #ffe8e8, white);
        }
        
        .diagnostico-ia.alerta {
            border-left-color: #FFA500;
            background: linear-gradient(to right, #fff4e8, white);
        }
        
        .diagnostico-ia .titulo {
            font-size: 14px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .diagnostico-ia .detalhes {
            font-size: 12px;
            font-weight: normal;
            color: #666;
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
        
        #resumo-auditoria .stats {
            margin-top: 10px;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    `);

    // ========== VARIÁVEIS GLOBAIS ==========
    let itensProcessados = 0;
    let totalItens = 0;
    let resultadosAuditoria = []; // Array para armazenar resultados individuais

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
                    <input type="checkbox" id="chkAnalisarGravarAuto">
                    <span>Analisar e Gravar Automaticamente</span>
                </label>
            </div>
            
            <button id="btnIniciarManual" style="width: 100%; padding: 10px; margin-top: 10px; background: #00FF00; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                ▶ Iniciar Análise
            </button>
            
            <div id="status-agente">Aguardando...</div>
        `;
        
        document.body.appendChild(painel);
        console.log('[Chance Agente] Painel adicionado ao body');
        
        // Restaurar estado dos toggles
        document.getElementById('chkAnalisarTudo').checked = GM_getValue('analisarTudo', false);
        document.getElementById('chkAnalisarGravarAuto').checked = GM_getValue('gravarAuto', false);
        
        // Eventos dos toggles
        document.getElementById('chkAnalisarTudo').addEventListener('change', (e) => {
            GM_setValue('analisarTudo', e.target.checked);
            atualizarStatus('✓ Configuração salva');
        });
        
        document.getElementById('chkAnalisarGravarAuto').addEventListener('change', (e) => {
            GM_setValue('gravarAuto', e.target.checked);
            atualizarStatus('✓ Configuração salva');
        });
        
        // Botão manual
        document.getElementById('btnIniciarManual').addEventListener('click', () => {
            console.log('[Chance Agente] Botão manual clicado');
            iniciarAuditoria();
        });
    }

    // ========== FUNÇÕES AUXILIARES ==========
    function atualizarStatus(mensagem) {
        const status = document.getElementById('status-agente');
        if (status) {
            status.textContent = mensagem;
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
        
        // Remover resumo anterior se existir
        const resumoAntigo = document.getElementById('resumo-auditoria');
        if (resumoAntigo) {
            resumoAntigo.remove();
        }
        
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
            return;
        }
        
        totalItens = itens.length;
        itensProcessados = 0;
        
        atualizarStatus(`📊 Analisando ${totalItens} itens...`);
        
        itens.forEach((item, index) => {
            console.log('[Chance Agente] 🎯 Item', index, ':', item);
            setTimeout(() => processarItem(item, index + 1), index * 1000); // 1s entre cada item
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
                    console.log('[Chance Agente] 📥 Resposta da IA:', resultado.resposta);
                    console.log('[Chance Agente] 🔍 Análise completa:', resultado);
                    executarAcao(item, resultado.resposta);
                } catch (error) {
                    console.error('[Chance Agente] ❌ Erro ao processar resposta:', error);
                    console.error('[Chance Agente] 📄 Conteúdo da resposta que falhou:', response.responseText);
                    item.classList.remove('auditoria-processando');
                    item.classList.add('auditoria-item-erro');
                    
                    // Criar badge de erro de API
                    const diagnostico = document.createElement('div');
                    diagnostico.className = 'diagnostico-ia erro';
                    diagnostico.style.cssText = 'position: absolute !important; top: 10px !important; left: 10px !important; z-index: 99999 !important; display: block !important;';
                    diagnostico.innerHTML = `
                        <div class="titulo">❌ Erro na API</div>
                        <div class="detalhes">Falha ao comunicar com servidor: ${error.message}</div>
                    `;
                    if (window.getComputedStyle(item).position === 'static') {
                        item.style.position = 'relative';
                    }
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

    function executarAcao(item, respostaIA) {
        item.classList.remove('auditoria-processando');
        
        const modoAutomatico = GM_getValue('gravarAuto', false);
        const partes = respostaIA.split(':');
        const codigo = partes[0].trim();
        const valor = partes[1] ? partes[1].trim() : '';
        
        console.log('[Chance Agente] 🎯 Executando ação:', {
            codigo: codigo,
            valor: valor,
            modoAutomatico: modoAutomatico
        });
        
        // Armazenar resultado da auditoria
        const resultado = {
            dataBaixa: item.querySelector(SELETORES.DATA_BAIXA)?.innerText || 'N/A',
            codigo: codigo,
            valor: valor,
            checkboxMarcado: null
        };
        
        // Garantir que o item tenha position relative
        if (window.getComputedStyle(item).position === 'static') {
            item.style.position = 'relative';
        }
        
        console.log('[Chance Agente] 📦 Elemento item:', item);
        console.log('[Chance Agente] 🎨 Position atual:', window.getComputedStyle(item).position);
        
        switch(codigo) {
            case 'OK': {
                // Tudo certo - NÃO marca nada, apenas feedback visual
                console.log('[Chance Agente] ✅ Status: OK - Nenhum erro detectado');
                item.classList.add('auditoria-item-ok');
                
                // Criar badge de diagnóstico
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia ok';
                diagnostico.style.cssText = 'position: absolute !important; top: 10px !important; left: 10px !important; z-index: 99999 !important; display: block !important;';
                diagnostico.innerHTML = `
                    <div class="titulo">✅ Verificado pela IA</div>
                    <div class="detalhes">Data correta e legível</div>
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
                
                // Criar badge de diagnóstico
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia erro';
                diagnostico.style.cssText = 'position: absolute !important; top: 10px !important; left: 10px !important; z-index: 99999 !important; display: block !important;';
                diagnostico.innerHTML = `
                    <div class="titulo">❌ Problema Detectado</div>
                    <div class="detalhes">Data não encontrada ou ilegível na imagem</div>
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
            
            case 'ERRO_IMAGEM': {
                // Marcar checkbox de problema na imagem
                console.log('[Chance Agente] ⚠️ Erro detectado: Problema na qualidade/visualização da imagem');
                item.classList.add('auditoria-item-erro');
                
                // Criar badge de diagnóstico
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia erro';
                diagnostico.style.cssText = 'position: absolute !important; top: 10px !important; left: 10px !important; z-index: 99999 !important; display: block !important;';
                diagnostico.innerHTML = `
                    <div class="titulo">❌ Problema na Imagem</div>
                    <div class="detalhes">Imagem com qualidade ruim ou não carregou</div>
                `;
                item.appendChild(diagnostico);
                
                console.log('[Chance Agente] ❌ Badge ERRO_IMAGEM adicionado');
                
                if (modoAutomatico) {
                    console.log('[Chance Agente] 📝 Marcando checkbox: Problema na Imagem');
                    const checkboxImagem = item.querySelector(SELETORES.CHECKBOX_PROBLEMA_IMAGEM);
                    if (checkboxImagem) {
                        checkboxImagem.click();
                        resultado.checkboxMarcado = 'Problema na Imagem';
                    }
                } else {
                    console.log('[Chance Agente] ℹ️ Modo automático desativado - checkbox não será marcado');
                    resultado.checkboxMarcado = 'Problema na Imagem (não marcado - modo manual)';
                }
                break;
            }
                
            case 'DATA_DIVERGENTE': {
                // Marcar data divergente e calcular dias
                console.log('[Chance Agente] ⚠️ Erro detectado: Data divergente encontrada:', valor);
                item.classList.add('auditoria-item-erro');
                
                let diasTexto = '';
                let diasDiferenca = 0;
                
                if (modoAutomatico && valor) {
                    const checkboxData = item.querySelector(SELETORES.CHECKBOX_DATA_DIVERGENTE);
                    if (checkboxData) {
                        checkboxData.click();
                        
                        // Calcular dias de divergência
                        const spanDataBaixa = item.querySelector(SELETORES.DATA_BAIXA);
                        const spanDiasDivergencia = item.querySelector(SELETORES.SPAN_DIAS_DIVERGENCIA);
                        
                        if (spanDataBaixa && spanDiasDivergencia) {
                            const dataBaixa = parseDataBrasileira(spanDataBaixa.innerText.trim());
                            const dataLida = parseDataBrasileira(valor);
                            
                            if (dataBaixa && dataLida) {
                                const diffTime = Math.abs(dataLida - dataBaixa);
                                diasDiferenca = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                console.log('[Chance Agente] 📅 Cálculo de divergência:', {
                                    dataSistema: spanDataBaixa.innerText.trim(),
                                    dataImagem: valor,
                                    diasDiferenca: diasDiferenca
                                });
                                
                                // Inserir quantidade de dias no span
                                spanDiasDivergencia.textContent = diasDiferenca;
                                spanDiasDivergencia.style.display = '';
                                
                                // Também atualizar o value do checkbox se necessário
                                checkboxData.value = diasDiferenca;
                                
                                diasTexto = ` (${diasDiferenca} ${diasDiferenca === 1 ? 'dia' : 'dias'} de diferença)`;
                                
                                console.log('[Chance Agente] 📝 Marcando checkbox: Data Divergente (' + diasDiferenca + ' dias)');
                                resultado.checkboxMarcado = `Data Divergente (${diasDiferenca} dias)`;
                            }
                        }
                    }
                } else if (!modoAutomatico) {
                    console.log('[Chance Agente] ℹ️ Modo automático desativado - checkbox não será marcado');
                    resultado.checkboxMarcado = 'Data Divergente (não marcado - modo manual)';
                } else {
                    console.log('[Chance Agente] ⚠️ Valor da data não encontrado na resposta');
                    resultado.checkboxMarcado = 'Data Divergente (erro ao calcular)';
                }
                
                // Criar badge de diagnóstico
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia alerta';
                diagnostico.style.cssText = 'position: absolute !important; top: 10px !important; left: 10px !important; z-index: 99999 !important; display: block !important;';
                diagnostico.innerHTML = `
                    <div class="titulo">⚠️ Data Divergente</div>
                    <div class="detalhes">Sistema: ${item.querySelector(SELETORES.DATA_BAIXA)?.innerText || 'N/A'}<br>
                    Imagem: ${valor}${diasTexto}</div>
                `;
                item.appendChild(diagnostico);
                
                console.log('[Chance Agente] ⚠️ Badge DATA_DIVERGENTE adicionado');
                
                break;
            }
            
            default: {
                console.log('[Chance Agente] ❓ Código desconhecido recebido:', codigo);
                
                resultado.checkboxMarcado = `Resposta inesperada: ${codigo}`;
                
                // Criar badge de diagnóstico para erro desconhecido
                const diagnostico = document.createElement('div');
                diagnostico.className = 'diagnostico-ia erro';
                diagnostico.style.cssText = 'position: absolute !important; top: 10px !important; left: 10px !important; z-index: 99999 !important; display: block !important;';
                diagnostico.innerHTML = `
                    <div class="titulo">❓ Resposta Inesperada</div>
                    <div class="detalhes">Código: ${codigo}</div>
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
            
            // Criar resumo da auditoria
            criarResumoAuditoria();
            
            if (GM_getValue('gravarAuto', false)) {
                setTimeout(() => clicarGravarTodos(), 2000);
            }
        }
    }
    
    function criarResumoAuditoria() {
        console.log('[Chance Agente] 📊 Criando resumo da auditoria...');
        
        // Contar resultados
        const totalOK = resultadosAuditoria.filter(r => r.codigo === 'OK').length;
        const totalErros = resultadosAuditoria.filter(r => r.codigo !== 'OK').length;
        
        // Contar por tipo
        const contadores = {
            dataBaixaOk: 0,
            assinaturaOk: 0,
            imagemOk: 0,
            erros: []
        };
        
        resultadosAuditoria.forEach(r => {
            if (r.codigo === 'OK') {
                contadores.dataBaixaOk++;
                contadores.assinaturaOk++;
                contadores.imagemOk++;
            } else {
                if (r.codigo === 'ERRO_DADOS') {
                    contadores.erros.push('Campos em branco ou ilegíveis detectados');
                } else if (r.codigo === 'ERRO_IMAGEM') {
                    contadores.imagemOk = Math.max(0, contadores.imagemOk - 1);
                    contadores.erros.push('Problemas nas imagens detectados');
                } else if (r.codigo === 'DATA_DIVERGENTE') {
                    contadores.dataBaixaOk = Math.max(0, contadores.dataBaixaOk - 1);
                    contadores.erros.push(`Data divergente: ${r.valor}`);
                }
            }
        });
        
        // Criar elemento do resumo
        const resumo = document.createElement('div');
        resumo.id = 'resumo-auditoria';
        
        let checklistHTML = `
            <div class="checklist-item">
                <span class="check-icon">${contadores.dataBaixaOk === totalItens ? '✅' : '⚠️'}</span>
                <span>Data de Baixa: ${contadores.dataBaixaOk}/${totalItens} OK</span>
            </div>
            <div class="checklist-item">
                <span class="check-icon">${contadores.assinaturaOk === totalItens ? '✅' : '⚠️'}</span>
                <span>Assinatura: ${contadores.assinaturaOk}/${totalItens} OK</span>
            </div>
            <div class="checklist-item">
                <span class="check-icon">${contadores.imagemOk === totalItens ? '✅' : '⚠️'}</span>
                <span>Imagem do Canhoto: ${contadores.imagemOk}/${totalItens} OK</span>
            </div>
        `;
        
        let resultadoFinal = '';
        if (totalErros === 0) {
            resultadoFinal = `
                <div class="resultado-final sucesso">
                    ✅ Resultado: OK, pode gravar!
                </div>
            `;
        } else {
            const checkboxesMarcados = resultadosAuditoria
                .filter(r => r.checkboxMarcado && r.checkboxMarcado !== 'Nenhum (aprovado)')
                .map(r => r.checkboxMarcado)
                .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicados
            
            resultadoFinal = `
                <div class="resultado-final erro">
                    ❌ Resultado: ${totalErros} ${totalErros === 1 ? 'erro detectado' : 'erros detectados'}<br>
                    <small style="font-size: 11px; font-weight: normal; margin-top: 5px; display: block;">
                        ${checkboxesMarcados.join(', ')}
                    </small>
                </div>
            `;
        }
        
        resumo.innerHTML = `
            <h4>📋 Resumo da Auditoria</h4>
            ${checklistHTML}
            ${resultadoFinal}
            <div class="stats">
                Analisados: ${totalItens} itens | Sucesso: ${totalOK} | Erros: ${totalErros}
            </div>
        `;
        
        document.body.appendChild(resumo);
        console.log('[Chance Agente] ✅ Resumo criado com sucesso');
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

// ==UserScript==
// @name         Agente de Auditoria (Chance)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Assistente de auditoria para validação de entregas com IA
// @author       Emerson Costanza
// @match        https://chancce.moblink.com.br/painel/index.php/main/redirecionar/13/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      chance.vercel.app
// ==/UserScript==

(function() {
    'use strict';

    // ========== CONFIGURAÇÃO ==========
    const API_URL = 'https://chance.vercel.app/api/analisar';
    
    // IMPORTANTE: Ajuste estes seletores CSS inspecionando a página (F12)
    const SELETORES = {
        CONTAINER_ITEM: '.item-auditoria', // Container de cada item de entrega
        DATA_BAIXA: '.data-baixa-texto', // Elemento com a data de baixa
        IMAGEM_CANHOTO: 'img.canhoto', // Tag <img> do canhoto
        CHECKBOX_CAMPO_BRANCO: 'input[name="campo_branco"]',
        CHECKBOX_PROBLEMA_IMAGEM: 'input[name="problema_imagem"]',
        CHECKBOX_DATA_DIVERGENTE: 'input[name="data_divergente"]',
        INPUT_CALENDARIO: 'input.calendario-data',
        BOTAO_GRAVAR_TODOS: 'button.gravar-todos',
        BOTAO_PROXIMA_PAGINA: 'a.proxima-pagina'
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
    `);

    // ========== VARIÁVEIS GLOBAIS ==========
    let itensProcessados = 0;
    let totalItens = 0;

    // ========== CRIAR INTERFACE ==========
    function criarInterface() {
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
            
            <div id="status-agente">Aguardando...</div>
        `;
        
        document.body.appendChild(painel);
        
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
    }

    // ========== FUNÇÕES AUXILIARES ==========
    function atualizarStatus(mensagem) {
        const status = document.getElementById('status-agente');
        if (status) {
            status.textContent = mensagem;
        }
    }

    function converterImagemParaBase64(url, callback) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            callback(dataURL);
        };
        
        img.onerror = function() {
            console.error('Erro ao carregar imagem:', url);
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
        const itens = document.querySelectorAll(SELETORES.CONTAINER_ITEM);
        
        if (itens.length === 0) {
            atualizarStatus('❌ Nenhum item encontrado. Verifique os seletores CSS!');
            return;
        }
        
        totalItens = itens.length;
        itensProcessados = 0;
        
        atualizarStatus(`📊 Analisando ${totalItens} itens...`);
        
        itens.forEach((item, index) => {
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
                try {
                    const resultado = JSON.parse(response.responseText);
                    executarAcao(item, resultado.resposta);
                } catch (error) {
                    console.error('Erro ao processar resposta:', error);
                    item.classList.remove('auditoria-processando');
                    item.classList.add('auditoria-item-erro');
                }
                finalizarItem();
            },
            onerror: function(error) {
                console.error('Erro na requisição:', error);
                item.classList.remove('auditoria-processando');
                item.classList.add('auditoria-item-erro');
                finalizarItem();
            }
        });
    }

    function executarAcao(item, respostaIA) {
        item.classList.remove('auditoria-processando');
        
        const modoAutomatico = GM_getValue('gravarAuto', false);
        const [codigo, valor] = respostaIA.split(':').map(s => s.trim());
        
        switch(codigo) {
            case 'OK':
                // Tudo certo - adiciona feedback visual
                item.classList.add('auditoria-item-ok');
                const feedback = document.createElement('div');
                feedback.className = 'feedback-ok-checklist';
                feedback.textContent = 'Verificado';
                item.style.position = 'relative';
                item.appendChild(feedback);
                break;
                
            case 'ERRO_DADOS':
            case 'ERRO_IMAGEM':
                // Marcar checkbox de campo em branco/ilegível
                item.classList.add('auditoria-item-erro');
                const checkboxErro = item.querySelector(
                    codigo === 'ERRO_DADOS' ? SELETORES.CHECKBOX_CAMPO_BRANCO : SELETORES.CHECKBOX_PROBLEMA_IMAGEM
                );
                if (checkboxErro && modoAutomatico) {
                    checkboxErro.click();
                }
                break;
                
            case 'DATA_DIVERGENTE':
                // Marcar data divergente e preencher calendário
                item.classList.add('auditoria-item-erro');
                const checkboxData = item.querySelector(SELETORES.CHECKBOX_DATA_DIVERGENTE);
                
                if (checkboxData) {
                    if (modoAutomatico) {
                        checkboxData.click();
                        
                        // Aguardar calendário aparecer
                        waitForElement(SELETORES.INPUT_CALENDARIO, (inputCalendario) => {
                            if (valor) {
                                inputCalendario.value = valor;
                                inputCalendario.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    }
                }
                break;
        }
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
    window.addEventListener('load', () => {
        criarInterface();
        
        // Se modo automático estiver ativado, iniciar auditoria
        if (GM_getValue('analisarTudo', false)) {
            setTimeout(() => iniciarAuditoria(), 2000);
        }
    });

})();

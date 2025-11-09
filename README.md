# 🤖 Agente de Auditoria - Chance

Sistema de auditoria automatizada com IA para validação de entregas.

## 📋 Arquitetura

**Agente (Tampermonkey)** → **Cérebro (Vercel + Gemini AI)** → **Agente (Ação)**

### Componentes

1. **API Serverless** (`/api/analisar.js`)
   - Recebe data de baixa + imagem (Base64)
   - Analisa com Gemini 2.5 Flash
   - Retorna código: `OK`, `ERRO_DADOS`, `ERRO_IMAGEM`, `DATA_DIVERGENTE: DD/MM/AAAA`

2. **Userscript Tampermonkey** (`agente.user.js`)
   - Interface com toggles
   - Scraping de dados da página
   - Conversão de imagem para Base64
   - Comunicação com API
   - Lógica de ações (checkboxes, calendário, feedback visual)

## 🚀 Instalação

### 1. Deploy da API na Vercel

```bash
git add .
git commit -m "Adiciona API de análise e script Tampermonkey"
git push
```

A Vercel fará o deploy automaticamente.

### 2. Instalar o Userscript

1. Instale o Tampermonkey no seu navegador
2. Abra o arquivo `agente.user.js`
3. Copie todo o conteúdo
4. No Tampermonkey, clique em "Create a new script"
5. Cole o código e salve

### 3. Ajustar Seletores CSS

**IMPORTANTE**: Você precisa inspecionar a página do Chancce (F12) e ajustar os seletores na linha 18-28 do `agente.user.js`:

```javascript
const SELETORES = {
    CONTAINER_ITEM: '.item-auditoria',     // Container de cada item
    DATA_BAIXA: '.data-baixa-texto',       // Texto da data de baixa
    IMAGEM_CANHOTO: 'img.canhoto',         // Imagem do canhoto
    CHECKBOX_CAMPO_BRANCO: 'input[name="campo_branco"]',
    CHECKBOX_PROBLEMA_IMAGEM: 'input[name="problema_imagem"]',
    CHECKBOX_DATA_DIVERGENTE: 'input[name="data_divergente"]',
    INPUT_CALENDARIO: 'input.calendario-data',
    BOTAO_GRAVAR_TODOS: 'button.gravar-todos',
    BOTAO_PROXIMA_PAGINA: 'a.proxima-pagina'
};
```

## 💡 Como Usar

1. Acesse a página de auditoria do Chancce
2. O painel do agente aparecerá no canto superior direito
3. Configure os toggles:
   - **Analisar Tudo ao Carregar**: Inicia análise automaticamente
   - **Analisar e Gravar Automaticamente**: Marca checkboxes e grava

### Modos de Operação

#### Modo Auditoria (Manual)
- Apenas marque "Analisar Tudo ao Carregar"
- O agente analisa e mostra feedback visual
- Você revisa e clica em "Gravar" manualmente

#### Modo Automático
- Marque ambos os toggles
- O agente analisa, marca checkboxes e grava automaticamente
- Use com cuidado!

## 🎨 Feedback Visual

- **Borda Laranja Piscante**: Item sendo processado
- **Borda Verde + ✓**: Item OK (dados conferem)
- **Borda Vermelha**: Item com erro detectado

## 🔧 Respostas da IA

| Código | Ação do Agente |
|--------|----------------|
| `OK` | Adiciona feedback verde, não marca nada |
| `ERRO_DADOS` | Marca checkbox "Campo em Branco/Ilegível" |
| `ERRO_IMAGEM` | Marca checkbox "Problema na Imagem" |
| `DATA_DIVERGENTE: 25/10/2025` | Marca checkbox "Data Divergente" + preenche calendário |

## 📝 Próximos Passos

1. Testar na página real do Chancce
2. Ajustar seletores CSS conforme necessário
3. Testar modo auditoria primeiro
4. Depois ativar modo automático

## ⚠️ Importante

- Sempre teste em modo auditoria primeiro
- Verifique se os seletores CSS estão corretos
- O agente processa 1 item por segundo para evitar sobrecarga
- Mantenha a GEMINI_API_KEY segura no Vercel

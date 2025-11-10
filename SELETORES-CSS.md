# 📋 Seletores CSS - Sistema Chancce

## 🎯 Objetivo
Documentar todos os seletores CSS necessários para o Agente de Auditoria funcionar corretamente no sistema Chancce.

---

## 🔍 Elementos a Capturar

### 1. **Container do Item de Entrega**
- **Descrição**: Div principal que contém cada canhoto/entrega
- **Seletor Atual**: `.row.canhoto`
- **O que verificar**:
  - [ ] A classe está correta?
  - [ ] Existe um ID único por item?
  - [ ] Quantos itens são encontrados na página?

**Como testar no Console**:
```javascript
document.querySelectorAll('.row.canhoto').length
```

---

### 2. **Data de Baixa**
- **Descrição**: Elemento que contém a data de baixa do sistema (ex: 30/10/2025)
- **Seletor Atual**: `span[id^="dataBaixa_"]`
- **Formato esperado**: `DD/MM/AAAA`
- **O que verificar**:
  - [ ] O ID começa com "dataBaixa_"?
  - [ ] O texto está acessível via `.innerText` ou `.textContent`?

**Como testar no Console**:
```javascript
// Verificar se existe
document.querySelector('span[id^="dataBaixa_"]')

// Pegar o texto
document.querySelector('span[id^="dataBaixa_"]')?.innerText
```

---

### 3. **Imagem do Canhoto**
- **Descrição**: Tag `<img>` que contém a imagem do canhoto digitalizado
- **Seletor Atual**: `img[id^="img_"]`
- **O que verificar**:
  - [ ] O ID começa com "img_"?
  - [ ] O atributo `src` contém a URL da imagem?
  - [ ] A imagem é acessível (não bloqueada por CORS)?

**Como testar no Console**:
```javascript
// Verificar se existe
document.querySelector('img[id^="img_"]')

// Pegar a URL
document.querySelector('img[id^="img_"]')?.src
```

---

### 4. **Checkboxes de Auditoria**

#### 4.1. Checkbox "OK" (Tudo certo)
- **Seletor**: `input[id^="idchecklist3_"]`
- **Value esperado**: `3`

#### 4.2. Checkbox "Campo em Branco"
- **Seletor**: `input[id^="idchecklist4_"]`
- **Value esperado**: `4`

#### 4.3. Checkbox "Campo Ilegível"
- **Seletor**: `input[id^="idchecklist5_"]`
- **Value esperado**: `5`

#### 4.4. Checkbox "Data Divergente"
- **Seletor**: `input[id^="idchecklist6_"]`
- **Value esperado**: `6`

#### 4.5. Checkbox "Problema na Imagem"
- **Seletor**: `input[id^="idchecklist7_"]`
- **Value esperado**: `7`

**Como testar no Console**:
```javascript
// Verificar todos os checkboxes
const checkboxes = {
    ok: document.querySelector('input[id^="idchecklist3_"]'),
    branco: document.querySelector('input[id^="idchecklist4_"]'),
    ilegivel: document.querySelector('input[id^="idchecklist5_"]'),
    data: document.querySelector('input[id^="idchecklist6_"]'),
    imagem: document.querySelector('input[id^="idchecklist7_"]')
};
console.table(checkboxes);
```

---

### 5. **Span para Dias de Divergência**
- **Descrição**: Campo onde é inserido o número de dias de divergência (quando data é diferente)
- **Seletor**: `span[id^="id_qtd_dias_divergencia_"]`
- **O que verificar**:
  - [ ] O span existe?
  - [ ] É possível alterar o `.textContent`?

**Como testar no Console**:
```javascript
const span = document.querySelector('span[id^="id_qtd_dias_divergencia_"]');
console.log('Span encontrado:', span);
span.textContent = '5'; // Teste de escrita
```

---

### 6. **Botões de Ação**

#### 6.1. Botão "Gravar Todos"
- **Seletor**: `button[onclick="GravarTudo()"]`
- **Ação**: Grava todos os itens auditados

#### 6.2. Botão "Listar Novamente"
- **Seletor**: `button[onclick="Recarregar()"]`
- **Ação**: Recarrega a lista de canhotos

**Como testar no Console**:
```javascript
const botoes = {
    gravar: document.querySelector('button[onclick="GravarTudo()"]'),
    listar: document.querySelector('button[onclick="Recarregar()"]')
};
console.table(botoes);
```

---

## 🧪 Script de Teste Completo

Copie e cole este script no Console do navegador (F12) para testar TODOS os seletores de uma vez:

```javascript
console.log('🔍 TESTE DE SELETORES - Agente de Auditoria\n\n');

// 1. Containers
const containers = document.querySelectorAll('.row.canhoto');
console.log(`✅ Containers encontrados: ${containers.length}`);

if (containers.length > 0) {
    const primeiroItem = containers[0];
    console.log('\n📦 Testando primeiro item:\n');
    
    // 2. Data de Baixa
    const data = primeiroItem.querySelector('span[id^="dataBaixa_"]');
    console.log(`📅 Data de Baixa: ${data ? data.innerText : '❌ NÃO ENCONTRADO'}`);
    
    // 3. Imagem
    const imagem = primeiroItem.querySelector('img[id^="img_"]');
    console.log(`🖼️ Imagem: ${imagem ? imagem.src.substring(0, 50) + '...' : '❌ NÃO ENCONTRADO'}`);
    
    // 4. Checkboxes
    console.log('\n☑️ Checkboxes:');
    const checkboxes = {
        'OK': primeiroItem.querySelector('input[id^="idchecklist3_"]'),
        'Campo Branco': primeiroItem.querySelector('input[id^="idchecklist4_"]'),
        'Campo Ilegível': primeiroItem.querySelector('input[id^="idchecklist5_"]'),
        'Data Divergente': primeiroItem.querySelector('input[id^="idchecklist6_"]'),
        'Problema Imagem': primeiroItem.querySelector('input[id^="idchecklist7_"]')
    };
    
    for (const [nome, elemento] of Object.entries(checkboxes)) {
        console.log(`  ${elemento ? '✅' : '❌'} ${nome}`);
    }
    
    // 5. Span dias divergência
    const spanDias = primeiroItem.querySelector('span[id^="id_qtd_dias_divergencia_"]');
    console.log(`\n📊 Span Dias Divergência: ${spanDias ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}`);
    
} else {
    console.error('❌ NENHUM CONTAINER ENCONTRADO! Verifique o seletor .row.canhoto');
}

// 6. Botões
console.log('\n🔘 Botões:');
const botaoGravar = document.querySelector('button[onclick="GravarTudo()"]');
const botaoListar = document.querySelector('button[onclick="Recarregar()"]');
console.log(`  ${botaoGravar ? '✅' : '❌'} Gravar Todos`);
console.log(`  ${botaoListar ? '✅' : '❌'} Listar Novamente`);

console.log('\n✅ Teste concluído!');
```

---

## 📝 Checklist de Validação

Após executar o script de teste, preencha:

- [ ] ✅ Containers encontrados (quantidade > 0)
- [ ] ✅ Data de Baixa capturada corretamente
- [ ] ✅ Imagem do canhoto encontrada
- [ ] ✅ Checkbox "OK" existe
- [ ] ✅ Checkbox "Campo em Branco" existe
- [ ] ✅ Checkbox "Campo Ilegível" existe
- [ ] ✅ Checkbox "Data Divergente" existe
- [ ] ✅ Checkbox "Problema na Imagem" existe
- [ ] ✅ Span de dias de divergência existe
- [ ] ✅ Botão "Gravar Todos" existe
- [ ] ✅ Botão "Listar Novamente" existe

---

## 🔄 Próximos Passos

1. **Execute o script de teste** no console (F12)
2. **Anote os resultados** aqui neste documento
3. **Corrija os seletores** que não funcionaram
4. **Refatore o agente** com os seletores corretos

---

## 📸 Screenshots dos Resultados

(Adicione aqui os prints do console após executar o teste)

---

**Data de criação**: 10/11/2025  
**Versão do sistema**: Chancce v1.x  
**Navegador testado**: Chrome/Edge

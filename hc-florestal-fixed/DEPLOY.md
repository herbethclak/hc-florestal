# 🚀 Guia de Deploy — HC Gestão Florestal

## Pré-requisitos
- Conta no [Vercel](https://vercel.com) (gratuita)
- Conta no [GitHub](https://github.com) (gratuita)
- Git instalado no seu computador

---

## Passo 1 — Subir o código no GitHub

```bash
# Na pasta do projeto descompactado:
git init
git add .
git commit -m "feat: correções e melhorias v2.6"

# Crie um repositório no GitHub (github.com/new) e siga as instruções
# Depois rode:
git remote add origin https://github.com/SEU_USUARIO/hc-gestao-florestal.git
git branch -M main
git push -u origin main
```

---

## Passo 2 — Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"New Project"**
3. Importe o repositório `hc-gestao-florestal` do GitHub
4. Mantenha as configurações padrão (Vercel detecta Vite automaticamente)
5. Clique em **"Deploy"**

⚠️ O deploy leva cerca de 1-2 minutos.

---

## Passo 3 — Atualizar regras do Firestore

1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto `gestaoflorestal-41b65`
3. Vá em **Firestore Database → Rules**
4. Cole o conteúdo do arquivo `firestore.rules` deste pacote
5. Clique em **"Publish"**

---

## Passo 4 — Compartilhar o link

Após o deploy, o Vercel gera um link como:
```
https://hc-gestao-florestal.vercel.app
```

Este link pode ser compartilhado com até 10 (ou mais) usuários simultaneamente.
O acesso simultâneo é gerenciado pelo Firebase — não há limite de sessões no plano gratuito.

---

## Atualizações futuras

Para subir uma nova versão:
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push
```
O Vercel faz o re-deploy automaticamente.

---

## Resumo das correções desta versão (v2.6)

- ✅ API de clima corrigida para Vercel serverless (HTTPS)
- ✅ Bug de estorno de estoque ao excluir OS corrigido
- ✅ Rascunho de OS do Planejamento agora limpa corretamente
- ✅ Regras do Firestore corrigidas (operadores podem atualizar horímetro e estoque)
- ✅ Normalização de osId/os_id em logs legados
- ✅ Removidos: supabase.ts e dependências desnecessárias (~200KB a menos no bundle)

# 🆘 Script de Emergência - Destravar Interface

Se a interface ficar travada após fechar um diálogo, cole este código no console do navegador (F12):

```javascript
// Remove todos os overlays e bloqueios
document.body.style.pointerEvents = "";
document.body.style.overflow = "";
document.body.removeAttribute('data-scroll-locked');

// Remove todos os elementos de overlay do Radix UI
document.querySelectorAll('[data-radix-portal]').forEach(el => {
  el.remove();
});

// Remove atributos inert que podem bloquear interações
document.querySelectorAll('[inert]').forEach(el => {
  el.removeAttribute('inert');
});

// Força a remoção de todos os dialogs abertos
document.querySelectorAll('[role="dialog"]').forEach(el => {
  el.remove();
});

console.log("✅ Interface destravada!");
```

## Como usar:

1. Pressione **F12** para abrir o DevTools
2. Vá para a aba **Console**
3. Cole o código acima
4. Pressione **Enter**
5. A interface deve voltar ao normal

## Depois de usar:

- Recarregue a página para garantir que está tudo limpo
- Reporte o bug para que possamos corrigir definitivamente

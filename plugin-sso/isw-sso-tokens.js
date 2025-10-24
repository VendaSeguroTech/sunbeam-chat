/**
 * ISW SSO Token Injection System - Otimizado
 * Injeta tokens em links com isw_action_link de forma robusta e performática
 */
(function() {
    'use strict';
    
    // Configuração
    const CONFIG = {
        SELECTORS: [
            'melhor_produto',
            'pontos',
            'experta',
            'portal_de_conteudo',
            'dossie',
            'instaquevende',
            'marco'
        ],
        DEBOUNCE_DELAY: 100,
        ATTRIBUTE_NAME: 'isw_action_link'
    };
    
    // Estado global
    let hydrated = false;
    let tokens = window.ISW_TOKENS || {};
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    /**
     * Debounce function para otimizar chamadas repetidas
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }
    
    /**
     * Obtém timestamp atual em segundos
     */
    function nowTs() {
        return Math.floor(Date.now() / 1000);
    }
    
    /**
     * Verifica se elemento é ou contém links ISW
     */
    function hasIswLinks(node) {
        if (!node || node.nodeType !== 1) return false;
        
        if (node.matches && node.matches('a[' + CONFIG.ATTRIBUTE_NAME + ']')) {
            return true;
        }
        
        if (node.querySelectorAll) {
            return node.querySelectorAll('a[' + CONFIG.ATTRIBUTE_NAME + ']').length > 0;
        }
        
        return false;
    }
    
    // =============================================================================
    // CORE LINK REWRITING
    // =============================================================================
    
    /**
     * Reescreve um link individual com token e timestamp
     * @returns {boolean} True se houve alteração
     */
    function rewriteLink(anchor, token) {
        if (!anchor || !token) return false;
        
        try {
            const href = anchor.getAttribute('href');
            if (!href) return false;
            
            // Evita reescrever se já está correto (idempotência)
            if (anchor.dataset.iswToken === token) {
                // Apenas atualiza timestamp se token é o mesmo
                const url = new URL(href, location.origin);
                const currentTs = url.searchParams.get('ts');
                const newTs = String(nowTs());
                
                if (currentTs === newTs) {
                    return false; // Já está atualizado
                }
                
                url.searchParams.set('ts', newTs);
                anchor.setAttribute('href', url.toString());
                return true;
            }
            
            // Reescreve completamente
            const url = new URL(href, location.origin);
            url.searchParams.set('token', token);
            url.searchParams.set('ts', String(nowTs()));
            
            const newHref = url.toString();
            if (newHref !== href) {
                anchor.setAttribute('href', newHref);
                anchor.dataset.iswToken = token;
                anchor.dataset.iswApplied = '1';
                return true;
            }
        } catch (e) {
            // Ignora URLs inválidas silenciosamente
            return false;
        }
        
        return false;
    }
    
    /**
     * Hidrata todos os links de uma vez
     */
    function hydrateAll() {
        let updated = 0;
        
        for (let i = 0; i < CONFIG.SELECTORS.length; i++) {
            const key = CONFIG.SELECTORS[i];
            const token = tokens[key];
            
            if (!token) continue;
            
            const links = document.querySelectorAll('a[' + CONFIG.ATTRIBUTE_NAME + '="' + key + '"]');
            
            for (let j = 0; j < links.length; j++) {
                if (rewriteLink(links[j], token)) {
                    updated++;
                }
            }
        }
        
        return updated;
    }
    
    /**
     * Hidrata um único elemento (link ou container)
     */
    function hydrateElement(element) {
        if (!element) return 0;
        
        let updated = 0;
        
        // Se o elemento é um link
        if (element.matches && element.matches('a[' + CONFIG.ATTRIBUTE_NAME + ']')) {
            const key = element.getAttribute(CONFIG.ATTRIBUTE_NAME);
            const token = tokens[key];
            if (token && rewriteLink(element, token)) {
                updated++;
            }
        }
        
        // Se contém links
        if (element.querySelectorAll) {
            const links = element.querySelectorAll('a[' + CONFIG.ATTRIBUTE_NAME + ']');
            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                const key = link.getAttribute(CONFIG.ATTRIBUTE_NAME);
                const token = tokens[key];
                if (token && rewriteLink(link, token)) {
                    updated++;
                }
            }
        }
        
        return updated;
    }
    
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================
    
    /**
     * Bloqueia cliques até primeira hidratação
     */
    function clickBlocker(e) {
        if (!hydrated) {
            const anchor = e.target.closest ? e.target.closest('a[' + CONFIG.ATTRIBUTE_NAME + ']') : null;
            if (anchor) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
    
    /**
     * Revalida token em mouseover (segurança extra)
     */
    function handleMouseOver(e) {
        const anchor = e.target.closest ? e.target.closest('a[' + CONFIG.ATTRIBUTE_NAME + ']') : null;
        if (!anchor) return;
        
        const key = anchor.getAttribute(CONFIG.ATTRIBUTE_NAME);
        const token = tokens[key];
        if (token) {
            rewriteLink(anchor, token);
        }
    }
    
    /**
     * Revalida token em focus (acessibilidade)
     */
    function handleFocus(e) {
        const anchor = e.target.closest ? e.target.closest('a[' + CONFIG.ATTRIBUTE_NAME + ']') : null;
        if (!anchor) return;
        
        const key = anchor.getAttribute(CONFIG.ATTRIBUTE_NAME);
        const token = tokens[key];
        if (token) {
            rewriteLink(anchor, token);
        }
    }
    
    /**
     * Handler de clique final com validação just-in-time
     */
    function handleClick(e) {
        const anchor = e.target.closest ? e.target.closest('a[' + CONFIG.ATTRIBUTE_NAME + ']') : null;
        if (!anchor) return;
        
        const key = anchor.getAttribute(CONFIG.ATTRIBUTE_NAME);
        const token = tokens[key];
        if (!token) return;
        
        // Previne navegação e revalida
        e.preventDefault();
        e.stopPropagation();
        
        // Revalida token e navega após 1ms
        setTimeout(function() {
            rewriteLink(anchor, token);
            
            const target = anchor.getAttribute('target');
            const href = anchor.getAttribute('href');
            
            if (e.metaKey || e.ctrlKey || target === '_blank') {
                window.open(href, '_blank');
            } else {
                location.href = href;
            }
        }, 1);
    }
    
    // =============================================================================
    // DOM OBSERVATION
    // =============================================================================
    
    /**
     * Processa mutações do DOM com filtro inteligente
     */
    function processMutations(mutations) {
        let needsUpdate = false;
        
        for (let i = 0; i < mutations.length; i++) {
            const addedNodes = mutations[i].addedNodes || [];
            
            for (let j = 0; j < addedNodes.length; j++) {
                if (hasIswLinks(addedNodes[j])) {
                    needsUpdate = true;
                    hydrateElement(addedNodes[j]);
                }
            }
        }
        
        return needsUpdate;
    }
    
    // Versão debounced do processador de mutações
    const debouncedProcessMutations = debounce(processMutations, CONFIG.DEBOUNCE_DELAY);
    
    /**
     * Inicializa MutationObserver otimizado
     */
    function initObserver() {
        const observer = new MutationObserver(debouncedProcessMutations);
        
        observer.observe(document.documentElement, {
            subtree: true,
            childList: true
        });
        
        return observer;
    }
    
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    /**
     * Primeira hidratação e setup de listeners
     */
    function initialize() {
        // Bloqueia cliques prematuros
        document.addEventListener('click', clickBlocker, true);
        
        // Primeira hidratação
        const updated = hydrateAll();
        hydrated = true;
        
        // Remove bloqueador
        document.removeEventListener('click', clickBlocker, true);
        
        // Event listeners para revalidação
        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('focusin', handleFocus, true);
        document.addEventListener('click', handleClick, true);
        
        // Observa mudanças no DOM
        initObserver();
        
        // Reidrata ao voltar para foreground
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                hydrateAll();
            }
        });
        
        // Debug log
        if (window.console && console.log) {
            console.log('[ISW SSO] Initialized - ' + updated + ' links hydrated');
        }
    }
    
    // Executa quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Expõe API pública para debug/testes
    window.ISW_SSO = {
        rehydrate: hydrateAll,
        tokens: tokens,
        version: '2.0'
    };
    
})();
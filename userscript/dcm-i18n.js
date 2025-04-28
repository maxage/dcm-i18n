// ==UserScript==
// @name         DCM 中文翻译插件
// @namespace    https://github.com/maxage/dcm-i18n
// @version      1.0.0
// @description  Docker Compose Maker 中文翻译
// @author       maxage
// @match        https://compose.ajnart.dev/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/maxage/dcm-i18n/main/userscript/dcm-i18n.js
// @downloadURL  https://raw.githubusercontent.com/maxage/dcm-i18n/main/userscript/dcm-i18n.js
// ==/UserScript==

(function() {
    'use strict';

    const DICT_URL = 'https://raw.githubusercontent.com/maxage/dcm-i18n/main/dictionary/zh-CN.json';
    
    // 获取翻译字典
    async function getDictionary() {
        try {
            // 先检查缓存
            const cached = GM_getValue('dictionary');
            const lastUpdate = GM_getValue('lastUpdate');
            
            // 如果缓存不存在或已过期（24小时）
            if (!cached || !lastUpdate || Date.now() - lastUpdate > 24 * 60 * 60 * 1000) {
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: DICT_URL,
                        onload: resolve,
                        onerror: reject
                    });
                });

                const dictionary = JSON.parse(response.responseText);
                
                // 更新缓存
                GM_setValue('dictionary', dictionary);
                GM_setValue('lastUpdate', Date.now());
                
                return dictionary;
            }
            
            return cached;
        } catch (error) {
            console.error('获取翻译字典失败:', error);
            return GM_getValue('dictionary', {});
        }
    }

    // 应用翻译
    function applyTranslation(dictionary) {
        const translations = dictionary.translations;
        
        // 遍历并翻译文本节点
        function translateNode(node) {
            if (node.nodeType === 3) { // 文本节点
                const text = node.nodeValue.trim();
                for (const category in translations) {
                    if (translations[category][text]) {
                        node.nodeValue = node.nodeValue.replace(text, translations[category][text]);
                    }
                }
            }
        }

        // 遍历所有节点
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            translateNode(node);
        }

        // 翻译属性（如 placeholder, title 等）
        document.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
            const attrs = ['placeholder', 'title', 'aria-label'];
            attrs.forEach(attr => {
                if (element.hasAttribute(attr)) {
                    const text = element.getAttribute(attr);
                    for (const category in translations) {
                        if (translations[category][text]) {
                            element.setAttribute(attr, translations[category][text]);
                        }
                    }
                }
            });
        });
    }

    // 添加语言切换按钮
    function addLanguageButton() {
        const button = document.createElement('button');
        button.textContent = '中文';
        button.style.cssText = 'margin-right: 10px; padding: 5px 10px; border-radius: 5px; background: transparent; border: 1px solid currentColor;';
        
        // 插入到 GitHub 按钮旁边
        const githubButton = document.querySelector('a[href*="github"]');
        if (githubButton?.parentNode) {
            githubButton.parentNode.insertBefore(button, githubButton);
        }

        // 切换翻译状态
        button.onclick = async () => {
            const isEnabled = GM_getValue('translationEnabled', false);
            if (!isEnabled) {
                const dictionary = await getDictionary();
                applyTranslation(dictionary);
                button.textContent = '英文';
            } else {
                location.reload(); // 重新加载页面恢复英文
                button.textContent = '中文';
            }
            GM_setValue('translationEnabled', !isEnabled);
        };
    }

    // 监听动态内容
    function observeDOM() {
        const observer = new MutationObserver(async (mutations) => {
            if (GM_getValue('translationEnabled', false)) {
                const dictionary = await getDictionary();
                applyTranslation(dictionary);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化
    async function init() {
        addLanguageButton();
        observeDOM();
        
        // 如果之前启用了翻译，自动应用
        if (GM_getValue('translationEnabled', false)) {
            const dictionary = await getDictionary();
            applyTranslation(dictionary);
        }
    }

    // 启动翻译
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 

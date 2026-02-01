// translator.js - 主入口文件（模块化版本）

// 添加加载遮罩
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'translator-loading-overlay';
loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
`;
loadingOverlay.innerHTML = `
    <div class="loading-spinner" style="
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    "></div>
    <div class="loading-text" style="margin-top: 20px; color: white; font-size: 16px; font-weight: 500;">正在加载...</div>
`;
document.body.appendChild(loadingOverlay);

// 添加旋转动画
if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        @keyframes syncSpin {
            to { transform: rotate(360deg); }
        }
        .sync-spinner {
            animation: syncSpin 1s linear infinite;
        }
        .sync-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 12px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 8px;
        }
        .sync-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .sync-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .sync-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .sync-status {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f7fafc;
            border-radius: 6px;
            font-size: 13px;
        }
        .sync-label {
            color: #4a5568;
            font-weight: 500;
        }
        .sync-count {
            color: #667eea;
            font-weight: 600;
        }
        .setting-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 20px 0;
        }
    `;
    document.head.appendChild(style);
}

// 声明全局变量
let currentUser = null;

// DOM元素
const sourceText = document.getElementById('sourceText');
const charCount = document.getElementById('charCount');
const translateBtn = document.getElementById('translateBtn');
const resultPanel = document.getElementById('resultPanel');
const translationResult = document.getElementById('translationResult');
const sourceLanguage = document.getElementById('sourceLanguage');
const targetLanguage = document.getElementById('targetLanguage');

// 主初始化函数
async function initTranslator() {
    console.log('=== 初始化翻译器 ===');
    const startTime = Date.now();

    try {
        // 初始化导航（同步操作，立即执行）
        window.initNavigation();
        window.initSettingsNavigation();

        // 尽早移除加载遮罩，让用户看到界面
        removeLoadingOverlay();

        // 初始化UI状态
        translateBtn.disabled = true;
        TranslatorUtils.updatePlaceholder(sourceLanguage, sourceText);

        // 绑定翻译功能
        bindTranslationEvents();

        // 绑定事件监听器
        window.addEventListener('loadHistory', () => {
            window.TranslatorHistory.loadHistoryFromDatabase();
        });

        window.addEventListener('settingsDetailOpened', (e) => {
            if (e.detail.targetId === 'memorySettings') {
                window.TranslatorSettings.loadMemoryStats();
            }
        });

        // 绑定退出登录
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function() {
                if (confirm('确定要退出登录吗？')) {
                    const result = await AuthService.signOut();
                    if (result.success) {
                        alert('已退出登录');
                        window.location.href = 'index.html';
                    }
                }
            });
        }

        // 在后台异步执行其余初始化，不阻塞界面显示
        setTimeout(async () => {
            try {
                console.log('[后台初始化] 开始后台初始化...');

                // 检查Supabase配置
                const hasSupabase = await window.SupabaseConfigManager.hasConfig();
                console.log('[后台初始化] Has Supabase config:', hasSupabase);

                if (!hasSupabase) {
                    showSupabaseConfigPrompt();
                    return;
                }

                // 检查登录状态
                const sessionResult = await AuthService.getSession();

                if (!sessionResult.success || !sessionResult.session) {
                    alert('请先登录');
                    window.location.href = 'index.html';
                    return;
                }

                // 获取当前用户
                const userResult = await AuthService.getCurrentUser();
                if (userResult.success && userResult.user) {
                    currentUser = userResult.user;
                    console.log('[后台初始化] 当前登录用户:', currentUser.email || currentUser.phone);

                    const currentUserElement = document.getElementById('currentUser');
                    if (currentUserElement) {
                        currentUserElement.textContent = currentUser.email || currentUser.phone || '匿名用户';
                    }
                }

                // 同步 session 到 chrome.storage
                if (sessionResult.session && typeof chrome !== 'undefined' && chrome.storage) {
                    const projectId = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.projectId : 'hpowmoxpanobgutruvij';
                    const storageKey = `sb-${projectId}-auth-token`;
                    const sessionData = JSON.stringify(sessionResult.session);
                    chrome.storage.local.set({ [storageKey]: sessionData }, () => {
                        console.log('[后台初始化] Session 已同步到 chrome.storage');
                    });
                }

                // 初始化各个模块
                window.TranslatorSettings.bindEvents();
                window.TranslatorSettings.bindSupabaseConfigEvents();

                // 使用 Promise.all 并行初始化渠道和加载设置
                await Promise.all([
                    window.TranslatorChannels.init(),
                    window.TranslatorSettings.loadSettings(),
                    window.TranslatorSettings.loadApiSettings().catch(() => {}) // API设置加载失败不影响主流程
                ]);

                const elapsed = Date.now() - startTime;
                console.log(`[后台初始化] ✓ 翻译器初始化完成 (耗时 ${elapsed}ms)`);
            } catch (error) {
                console.error('[后台初始化] 失败:', error);
                // 后台初始化失败不影响界面显示，只记录错误
            }
        }, 50); // 延迟50ms，确保界面先渲染

    } catch (error) {
        console.error('初始化失败:', error);
        showErrorAndReload(error.message);
    }
}

// 显示Supabase配置提示
function showSupabaseConfigPrompt() {
    loadingOverlay.innerHTML = `
        <div style="text-align: center; color: white; padding: 20px; max-width: 400px;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 20px;">
                <path d="M5 12.555a1.001 1.001 0 0 1 0-1.11l5-7.5a1.001 1.001 0 0 1 1.666 0l5 7.5a1.001 1.001 0 0 1 0 1.11l-5 7.5a1.001 1.001 0 0 1-1.666 0l-5-7.5z"/>
            </svg>
            <h2 style="font-size: 24px; margin-bottom: 10px;">欢迎使用拾念</h2>
            <p style="font-size: 16px; margin-bottom: 20px; opacity: 0.9;">首次使用需要配置云端同步服务</p>
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 20px; text-align: left; background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px;">
                <p style="margin: 0 0 12px 0;"><strong>配置 Supabase 可以：</strong></p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 6px;">在多设备间同步翻译历史</li>
                    <li style="margin-bottom: 6px;">云端备份学习记录</li>
                    <li style="margin-bottom: 6px;">支持账号登录和数据持久化</li>
                </ul>
            </div>
            <button id="skipSupabaseConfig" class="config-button" data-style="transparent">
                稍后配置
            </button>
            <button id="gotoSupabaseConfig" class="config-button" data-style="filled">
                立即配置
            </button>
        </div>
    `;

    // 添加按钮样式
    const style = document.createElement('style');
    style.textContent = `
        .config-button {
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .config-button[data-style="transparent"] {
            background: transparent;
            color: white;
            border: 2px solid white;
            margin-right: 10px;
        }
        .config-button[data-style="filled"] {
            background: white;
            color: #667eea;
            border: none;
        }
        .config-button:hover {
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(style);

    // 绑定按钮事件
    document.getElementById('skipSupabaseConfig').addEventListener('click', () => {
        removeLoadingOverlay();
        currentUser = null;
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'none';
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) currentUserElement.textContent = '未登录';
        setTimeout(() => {
            window.TranslatorSettings.loadSettings();
            window.TranslatorSettings.loadApiSettings();
        }, 100);
    });

    document.getElementById('gotoSupabaseConfig').addEventListener('click', () => {
        removeLoadingOverlay();
        currentUser = null;
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'none';
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) currentUserElement.textContent = '未登录';

        setTimeout(() => {
            if (typeof window.openSupabaseSettings === 'function') {
                window.openSupabaseSettings();
            }
        }, 800);

        setTimeout(() => {
            window.TranslatorSettings.loadSettings();
            window.TranslatorSettings.loadApiSettings();
        }, 100);
    });
}

// 绑定翻译相关事件
function bindTranslationEvents() {
    // 字符计数
    sourceText.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        translateBtn.disabled = count === 0;
    });

    // 翻译按钮
    translateBtn.addEventListener('click', handleTranslation);

    // 语言切换
    sourceLanguage.addEventListener('change', function() {
        TranslatorUtils.updatePlaceholder(sourceLanguage, sourceText);
    });

    // 复制按钮
    const copyBtn = document.querySelector('.action-btn[title="复制"]');
    if (copyBtn) {
        copyBtn.addEventListener('click', handleCopy);
    }

    // 朗读按钮
    const speakBtn = document.querySelector('.action-btn[title="朗读"]');
    if (speakBtn) {
        speakBtn.addEventListener('click', handleSpeak);
    }

    // 开始背诵按钮
    const startMemoryBtn = document.getElementById('startMemoryBtn');
    if (startMemoryBtn) {
        startMemoryBtn.addEventListener('click', async function() {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                await chrome.tabs.create({ url: chrome.runtime.getURL('memory.html') });
            } else {
                window.location.href = 'memory.html';
            }
        });
    }

    // 测试按钮
    const testButton = document.querySelector('.test-button');
    if (testButton) {
        testButton.addEventListener('click', function() {
            sourceText.value = 'Hello, this is a test translation.';
            charCount.textContent = sourceText.value.length;
            translateBtn.disabled = false;
            setTimeout(() => translateBtn.click(), 300);
        });
    }

    // 键盘快捷键
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (sourceText.value.trim() && !translateBtn.disabled) {
                translateBtn.click();
            }
        }
    });
}

// 处理翻译
async function handleTranslation() {
    const text = sourceText.value.trim();

    if (!text) {
        alert('请输入要翻译的文本');
        return;
    }

    translateBtn.disabled = true;
    translateBtn.innerHTML = '<span>翻译中...</span>';

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'translate',
            text: text
        });

        if (response.success) {
            window.TranslatorDisplay.displayTranslationResult(response.data);
            resultPanel.style.display = 'block';

            const translatedText = response.data.translation;

            if (TranslatorUtils.shouldSaveTranslationRecord(
                text,
                translatedText,
                response.data.detectedLanguage || sourceLanguage.value
            )) {
                await saveTranslation(text, translatedText, response.data);
            }
        } else {
            translationResult.textContent = '翻译失败: ' + response.error;
            resultPanel.style.display = 'block';
        }
    } catch (error) {
        console.error('翻译错误:', error);
        translationResult.textContent = '翻译出错: ' + error.message;
        resultPanel.style.display = 'block';
    } finally {
        translateBtn.disabled = false;
        translateBtn.innerHTML = `
            <span>翻译</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4l6 6-6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
}

// 保存翻译
async function saveTranslation(originalText, translatedText, data) {
    try {
        const saveResult = await DatabaseService.saveTranslation(
            originalText,
            translatedText,
            sourceLanguage.options[sourceLanguage.selectedIndex].text,
            targetLanguage.options[targetLanguage.selectedIndex].text
        );

        const history = await chrome.storage.local.get('translationHistory');
        const historyList = history.translationHistory || [];

        const newRecord = {
            original: originalText,
            text: originalText,
            translation: translatedText,
            translated_text: translatedText,
            from: sourceLanguage.options[sourceLanguage.selectedIndex].text,
            to: targetLanguage.options[targetLanguage.selectedIndex].text,
            source_language: sourceLanguage.options[sourceLanguage.selectedIndex].text,
            target_language: targetLanguage.options[targetLanguage.selectedIndex].text,
            detectedLanguage: data.detectedLanguage || sourceLanguage.value,
            dictionaryData: data.dictionaryData || null,
            translations: data.translations || [],
            timestamp: Date.now(),
            synced: saveResult.success,
            syncStatus: saveResult.success ? 'synced' : 'local_only',
            count: 1
        };

        const existingIndex = historyList.findIndex(item => item.original === originalText);
        if (existingIndex !== -1) {
            const existing = historyList[existingIndex];
            newRecord.count = (existing.count || 1) + 1;
            historyList[existingIndex] = newRecord;
        } else {
            historyList.unshift(newRecord);
        }

        const maxHistory = 1000;
        const trimmedList = historyList.slice(0, maxHistory);

        await chrome.storage.local.set({ translationHistory: trimmedList });
        console.log('翻译历史已保存');
    } catch (error) {
        console.warn('保存翻译失败:', error);
    }
}

// 处理复制
function handleCopy() {
    let textToCopy = '';
    const sourceElements = translationResult.querySelectorAll('span.translation-text');
    if (sourceElements.length > 0) {
        textToCopy = Array.from(sourceElements).map(el => el.textContent).join('；');
    } else {
        textToCopy = translationResult.textContent
            .replace(/\[.*?\]/g, '')
            .replace(/US|UK/g, '')
            .replace(/检测语言:.*/g, '')
            .replace(/标准释义|翻译/g, '')
            .replace(/[""]/g, '')
            .trim();
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.querySelector('.action-btn[title="复制"]');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✓';
        btn.style.color = '#22c55e';

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = '';
        }, 1500);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}

// 处理朗读
function handleSpeak() {
    let textToSpeak = '';
    const sourceElements = translationResult.querySelectorAll('span.translation-text');
    if (sourceElements.length > 0) {
        textToSpeak = sourceElements[0].textContent;
    } else {
        textToSpeak = translationResult.textContent
            .replace(/\[.*?\]/g, '')
            .replace(/US|UK/g, '')
            .replace(/检测语言:.*/g, '')
            .replace(/标准释义|翻译/g, '')
            .replace(/[""]/g, '')
            .replace(/\/.*?\//g, '')
            .trim();
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = targetLanguage.value === 'zh' ? 'zh-CN' : 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    } else {
        alert('您的浏览器不支持语音朗读功能');
    }
}

// 移除加载遮罩
function removeLoadingOverlay() {
    const overlay = document.getElementById('translator-loading-overlay');
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
}

// 显示错误并重新加载
function showErrorAndReload(message) {
    loadingOverlay.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    loadingOverlay.innerHTML = `
        <div style="text-align: center; color: white; padding: 20px;">
            <h2 style="font-size: 24px; margin-bottom: 10px;">初始化失败</h2>
            <p style="font-size: 16px; margin-bottom: 20px; opacity: 0.9;">${message}</p>
            <button id="reloadPageBtn" class="error-action-btn">
                重新加载
            </button>
        </div>
    `;

    const errorStyle = document.createElement('style');
    errorStyle.textContent = `
        .error-action-btn {
            background: white;
            color: #f5576c;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .error-action-btn:hover {
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(errorStyle);

    document.getElementById('reloadPageBtn').addEventListener('click', () => location.reload());
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initTranslator);

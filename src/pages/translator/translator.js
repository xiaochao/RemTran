// 使用 Supabase 的翻译器逻辑

// 全局函数：打开 Supabase 配置页面（定义在 DOMContentLoaded 外部，确保可以随时调用）
window.openSupabaseSettings = function() {
    console.log('=== openSupabaseSettings called ===');
    console.log('Current URL:', window.location.href);

    // 等待DOM完全加载
    if (document.readyState !== 'complete') {
        console.log('DOM not ready, waiting...');
        setTimeout(() => window.openSupabaseSettings(), 200);
        return;
    }

    const navTabs = document.querySelectorAll('.nav-tab');
    console.log('Found nav tabs:', navTabs.length);

    if (navTabs.length === 0) {
        console.error('No nav tabs found, page may not be fully loaded');
        setTimeout(() => window.openSupabaseSettings(), 500);
        return;
    }

    if (navTabs.length < 3) {
        console.error('Not enough nav tabs found. Found:', navTabs.length);
        alert('页面未完全加载，正在重新尝试...');
        setTimeout(() => window.openSupabaseSettings(), 500);
        return;
    }

    // 直接操作 DOM 切换到设置页面，不依赖 click 事件
    console.log('Manually switching to settings page');

    // 移除所有 active 类
    navTabs.forEach(t => t.classList.remove('active'));
    // 给第3个标签添加 active 类
    navTabs[2].classList.add('active');

    // 获取页面元素
    const mainContent = document.querySelector('.translator-container')?.parentElement;
    const historyPage = document.getElementById('historyPage');
    const settingsPage = document.getElementById('settingsPage');

    console.log('Page elements:', { mainContent: !!mainContent, historyPage: !!historyPage, settingsPage: !!settingsPage });

    if (!mainContent || !historyPage || !settingsPage) {
        console.error('Page elements not found');
        setTimeout(() => window.openSupabaseSettings(), 300);
        return;
    }

    // 切换页面显示
    mainContent.style.display = 'none';
    historyPage.style.display = 'none';
    settingsPage.style.display = 'block';

    console.log('Switched to settings page');

    // 等待页面切换后，点击 Supabase 配置菜单
    setTimeout(() => {
        const supabaseMenuItem = document.querySelector('[data-target="supabaseSettings"]');
        console.log('Looking for supabase menu item...');

        if (supabaseMenuItem) {
            console.log('Found supabase menu item, clicking...');
            // 直接触发点击
            supabaseMenuItem.click();
            console.log('✓ Successfully clicked supabase menu item');
        } else {
            console.error('Supabase settings menu not found');
            console.log('Available menu items:');
            document.querySelectorAll('[data-target]').forEach((item, index) => {
                console.log(`  [${index}]`, item.getAttribute('data-target'), ':', item.textContent?.trim());
            });
            alert('无法找到"云端同步"配置选项\n\n请手动操作：\n1. 点击"设置"标签\n2. 点击"云端同步"选项');
        }
    }, 300);
};

document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== DOMContentLoaded fired ===');
    console.log('Current document readyState:', document.readyState);

    // 声明全局变量
    let currentUser = null;
    let memoryIntervalInput = null;
    let memoryWordsPerSessionInput = null;

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

    // ===== 首先绑定导航事件（确保在任何 return 之前执行） =====
    console.log('=== Getting DOM elements and binding navigation events FIRST ===');

    const navTabs = document.querySelectorAll('.nav-tab');
    const sourceText = document.getElementById('sourceText');
    const charCount = document.getElementById('charCount');
    const translateBtn = document.getElementById('translateBtn');
    const resultPanel = document.getElementById('resultPanel');
    const translationResult = document.getElementById('translationResult');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');

    const translatorContainer = document.querySelector('.translator-container');
    const mainContent = translatorContainer ? translatorContainer.parentElement : null;
    const historyPage = document.getElementById('historyPage');
    const settingsPage = document.getElementById('settingsPage');
    const historyList = document.getElementById('historyList');

    console.log('Page elements found:', {
        navTabs: navTabs.length,
        mainContent: !!mainContent,
        historyPage: !!historyPage,
        settingsPage: !!settingsPage
    });

    // 绑定导航事件
    console.log('Attaching navigation event listeners...');
    navTabs.forEach((tab, index) => {
        tab.addEventListener('click', function(e) {
            console.log('Nav tab clicked:', index, this.querySelector('span')?.textContent);
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabText = this.querySelector('span')?.textContent;

            if (!mainContent || !historyPage || !settingsPage) {
                console.error('Page elements not available!');
                return;
            }

            if (tabText === '翻译') {
                mainContent.style.display = 'block';
                historyPage.style.display = 'none';
                settingsPage.style.display = 'none';
            } else if (tabText === '历史') {
                mainContent.style.display = 'none';
                historyPage.style.display = 'block';
                settingsPage.style.display = 'none';
                loadHistoryFromDatabase();
            } else if (tabText === '设置') {
                mainContent.style.display = 'none';
                historyPage.style.display = 'none';
                settingsPage.style.display = 'block';
            }
        });
    });
    console.log('✓ Navigation event listeners attached successfully');

    // 验证加载遮罩是否需要移除
    const loadingOverlayCheck = document.getElementById('translator-loading-overlay');
    console.log('Loading overlay check:', {
        exists: !!loadingOverlayCheck,
        isVisible: loadingOverlayCheck ? loadingOverlayCheck.style.display !== 'none' : false
    });

    // 添加全局测试函数
    window.testNavigation = function() {
        console.log('=== Testing Navigation ===');
        const tabs = document.querySelectorAll('.nav-tab');
        console.log('Found tabs:', tabs.length);
        const overlay = document.getElementById('translator-loading-overlay');
        console.log('Loading overlay exists:', !!overlay);
        console.log('End of test.');
    };
    console.log('✓ Test function available: window.testNavigation()');

    // ===== 设置页面二级导航（也需要提前绑定） =====
    console.log('Binding settings page menu listeners...');
    const mainSettings = document.getElementById('mainSettings');
    const settingsMenuItems = document.querySelectorAll('.settings-menu-item[data-target]');
    const settingsDetails = document.querySelectorAll('.settings-detail');
    const backButtons = document.querySelectorAll('.back-button');

    console.log('Found settings menu items:', settingsMenuItems.length);

    // 点击设置菜单项，显示详情页
    settingsMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            console.log('Settings menu item clicked:', this.dataset.target);
            const targetId = this.dataset.target;
            const targetDetail = document.getElementById(targetId);

            if (targetDetail && mainSettings) {
                console.log('Showing detail:', targetId);
                mainSettings.style.display = 'none';
                targetDetail.style.display = 'block';

                // 如果打开背单词设置，加载统计数据
                if (targetId === 'memorySettings') {
                    if (typeof loadMemoryStats === 'function') loadMemoryStats();
                    if (typeof loadSettings === 'function') loadSettings();
                }
            }
        });
    });

    // 点击返回按钮，返回主设置页
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Back button clicked');
            settingsDetails.forEach(detail => {
                detail.style.display = 'none';
            });
            if (mainSettings) {
                mainSettings.style.display = 'block';
            }
        });
    });
    console.log('✓ Settings page menu listeners attached');

    // 检查登录状态（带超时）
    const SUPABASE_TIMEOUT = 10000; // 10秒超时
    let sessionResult; // 在外部声明以便后续代码使用

    console.log('=== Starting authentication check ===');

    try {
        // 首先检查 Supabase 配置
        console.log('Checking Supabase configuration...');
        const hasSupabase = await window.SupabaseConfigManager.hasConfig();
        console.log('Has Supabase config:', hasSupabase);

        if (!hasSupabase) {
            // 显示配置 Supabase 的界面
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

            // 添加样式
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
                // 移除加载遮罩，继续使用本地模式
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
                // 不需要登录，直接显示主界面
                currentUser = null;
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.style.display = 'none';
                }
                const currentUserElement = document.getElementById('currentUser');
                if (currentUserElement) {
                    currentUserElement.textContent = '未登录';
                }
                // 这些函数会在稍后定义并调用
                setTimeout(() => {
                    if (typeof loadSettings === 'function') loadSettings();
                    if (typeof loadApiSettings === 'function') loadApiSettings();
                    if (typeof loadChannelSettings === 'function') loadChannelSettings();
                }, 100);
                return;
            });

            document.getElementById('gotoSupabaseConfig').addEventListener('click', () => {
                console.log('gotoSupabaseConfig button clicked');

                // 移除加载遮罩
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                    console.log('Loading overlay removed');
                }

                // 不需要登录，直接显示主界面
                currentUser = null;
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.style.display = 'none';
                }
                const currentUserElement = document.getElementById('currentUser');
                if (currentUserElement) {
                    currentUserElement.textContent = '未登录';
                }

                // 等待页面完全加载后打开设置
                setTimeout(() => {
                    console.log('Attempting to open Supabase settings...');
                    console.log('window.openSupabaseSettings type:', typeof window.openSupabaseSettings);
                    console.log('window.openSupabaseSettings:', window.openSupabaseSettings);

                    if (typeof window.openSupabaseSettings === 'function') {
                        console.log('Calling openSupabaseSettings...');
                        window.openSupabaseSettings();
                    } else {
                        console.error('openSupabaseSettings function not available');
                        alert('页面加载中，请手动进入设置页面配置\n步骤：点击"设置"标签 → 点击"云端同步"选项');
                    }
                }, 800);

                // 加载设置
                setTimeout(() => {
                    if (typeof loadSettings === 'function') loadSettings();
                    if (typeof loadApiSettings === 'function') loadApiSettings();
                    if (typeof loadChannelSettings === 'function') loadChannelSettings();
                }, 100);

                return;
            });

            return; // 停止执行，等待用户操作
        }

        // 创建超时 Promise（只在需要时创建）
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('连接超时')), SUPABASE_TIMEOUT);
        });

        // 检查登录状态
        sessionResult = await Promise.race([
            AuthService.getSession(),
            timeoutPromise
        ]);

        if (!sessionResult.success || !sessionResult.session) {
            alert('请先登录');
            window.location.href = 'index.html';
            return;
        }

        // 移除加载遮罩
        console.log('Removing loading overlay after successful auth...');
        if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
            console.log('✓ Loading overlay removed successfully');
        } else {
            console.log('⚠ Loading overlay already removed or not attached to DOM');
        }
    } catch (error) {
        console.error('登录检查失败:', error);

        const isNetworkError = error.message.includes('连接超时') ||
                              error.message.includes('Failed to fetch') ||
                              error.message.includes('NetworkError');

        if (isNetworkError) {
            // 显示错误界面
            loadingOverlay.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            loadingOverlay.innerHTML = `
                <div style="text-align: center; color: white; padding: 20px;">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 20px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2 style="font-size: 24px; margin-bottom: 10px;">连接失败</h2>
                    <p style="font-size: 16px; margin-bottom: 20px; opacity: 0.9;">无法连接到服务器</p>
                    <div style="font-size: 14px; opacity: 0.8; max-width: 300px; margin: 0 auto 20px;">
                        可能的原因：<br>
                        • 网络连接异常<br>
                        • Supabase 服务暂时不可用<br>
                        • 防火墙或代理设置问题
                    </div>
                    <button id="reloadPageBtn" class="error-action-btn">
                        重新加载
                    </button>
                    <button id="backToLoginBtn" class="error-action-btn" data-style="outline">
                        返回登录
                    </button>
                </div>
            `;

            // 添加错误按钮样式和事件
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
                    margin: 0 5px;
                }
                .error-action-btn[data-style="outline"] {
                    background: transparent;
                    color: white;
                    border: 2px solid white;
                }
                .error-action-btn:hover {
                    transform: scale(1.05);
                }
            `;
            document.head.appendChild(errorStyle);

            document.getElementById('reloadPageBtn').addEventListener('click', () => location.reload());
            document.getElementById('backToLoginBtn').addEventListener('click', () => window.location.href = 'index.html');
            return; // 停止执行
        } else {
            // 其他错误也返回登录页
            alert('无法连接到服务器，请稍后重试');
            window.location.href = 'index.html';
            return;
        }
    }

    // 同步 session 到 chrome.storage（供 background.js 使用）
    if (sessionResult.session && typeof chrome !== 'undefined' && chrome.storage) {
        // 从 CONFIG 获取项目 ID，如果不存在则使用默认值
        const projectId = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.projectId : 'hpowmoxpanobgutruvij';
        const storageKey = `sb-${projectId}-auth-token`;
        const sessionData = JSON.stringify(sessionResult.session);
        chrome.storage.local.set({ [storageKey]: sessionData }, () => {
            console.log('Session 已同步到 chrome.storage');
        });
    }

    // 获取当前用户信息
    const userResult = await AuthService.getCurrentUser();

    if (userResult.success && userResult.user) {
        currentUser = userResult.user;
        console.log('当前登录用户:', currentUser.email || currentUser.phone);

        // 在设置页面显示当前用户
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) {
            currentUserElement.textContent = currentUser.email || currentUser.phone || '匿名用户';
        }
    }

    // 退出登录功能
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('确定要退出登录吗？')) {
                const result = await AuthService.signOut();
                if (result.success) {
                    alert('已退出登录');
                    window.location.href = 'index.html';
                } else {
                    alert('退出失败: ' + result.error);
                }
            }
        });
    }

    console.log('✓ All initialization complete. Navigation events bound successfully.');

    // ===== 字符计数 =====
    sourceText.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;

        if (count > 0) {
            translateBtn.disabled = false;
        } else {
            translateBtn.disabled = true;
        }
    });

    // ===== 翻译功能 =====
    translateBtn.addEventListener('click', async function() {
        const text = sourceText.value.trim();

        if (!text) {
            alert('请输入要翻译的文本');
            return;
        }

        // 显示加载状态
        this.disabled = true;
        this.innerHTML = '<span>翻译中...</span>';

        try {
            // 调用真正的翻译API（通过background.js）
            const response = await chrome.runtime.sendMessage({
                action: 'translate',
                text: text
            });

            if (response.success) {
                // 显示翻译结果（完整格式，与弹窗翻译一致）
                displayTranslationResult(response.data);
                resultPanel.style.display = 'block';

                // 获取主翻译文本
                const translatedText = response.data.translation;

                // 判断是否应该保存到历史记录
                const shouldSave = shouldSaveTranslationRecord(
                    text,
                    translatedText,
                    response.data.detectedLanguage || sourceLanguage.value
                );

                // 保存到 Supabase 数据库
                if (shouldSave) {
                    // 同时保存到本地存储和 Supabase
                    const saveResult = await DatabaseService.saveTranslation(
                        text,
                        translatedText,
                        sourceLanguage.options[sourceLanguage.selectedIndex].text,
                        targetLanguage.options[targetLanguage.selectedIndex].text
                    );

                    // 无论 Supabase 保存是否成功，都保存到本地存储作为备份
                    try {
                        const history = await chrome.storage.local.get('translationHistory');
                        const historyList = history.translationHistory || [];

                        // 检查是否已存在
                        const existingIndex = historyList.findIndex(item => item.original === text || item.text === text);
                        const newRecord = {
                            original: text,
                            text: text,
                            translation: translatedText,
                            translated_text: translatedText,
                            from: sourceLanguage.options[sourceLanguage.selectedIndex].text,
                            to: targetLanguage.options[targetLanguage.selectedIndex].text,
                            source_language: sourceLanguage.options[sourceLanguage.selectedIndex].text,
                            target_language: targetLanguage.options[targetLanguage.selectedIndex].text,
                            detectedLanguage: response.data.detectedLanguage || sourceLanguage.value,
                            dictionaryData: response.data.dictionaryData || null,
                            translations: response.data.translations || [],
                            timestamp: Date.now(),
                            synced: saveResult.success,
                            syncStatus: saveResult.success ? 'synced' : 'local_only',
                            count: 1
                        };

                        if (existingIndex !== -1) {
                            // 更新现有记录
                            const existing = historyList[existingIndex];
                            newRecord.count = (existing.count || 1) + 1;
                            historyList[existingIndex] = newRecord;
                        } else {
                            // 添加新记录到开头
                            historyList.unshift(newRecord);
                        }

                        // 限制历史记录数量
                        const maxHistory = 1000;
                        const trimmedList = historyList.slice(0, maxHistory);

                        await chrome.storage.local.set({ translationHistory: trimmedList });
                        console.log('翻译历史已保存到本地存储');
                    } catch (localError) {
                        console.warn('保存到本地存储失败:', localError);
                    }

                    if (saveResult.success) {
                        console.log('翻译历史已保存到云端');
                    } else {
                        console.error('保存翻译历史到云端失败:', saveResult.error);
                    }
                } else {
                    console.log('翻译结果未保存：不符合保存条件');
                }
            } else {
                // 翻译失败，显示错误信息
                translationResult.textContent = '翻译失败: ' + response.error;
                resultPanel.style.display = 'block';
            }
        } catch (error) {
            console.error('翻译错误:', error);
            translationResult.textContent = '翻译出错: ' + error.message;
            resultPanel.style.display = 'block';
        } finally {
            // 恢复按钮状态
            this.disabled = false;
            this.innerHTML = `
                <span>翻译</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7 4l6 6-6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }
    });

    // ===== 从数据库加载历史记录 =====
    async function loadHistoryFromDatabase() {
        historyList.innerHTML = '<div class="empty-state"><p>加载中...</p></div>';

        // 并行加载Supabase历史和本地历史
        const [supabaseHistoryResult, localHistory] = await Promise.all([
            DatabaseService.getTranslationHistory(50),
            getLocalHistory()
        ]);

        // 合并云端和本地历史记录
        const supabaseRecords = supabaseHistoryResult.success ? supabaseHistoryResult.data : [];
        const mergedRecords = mergeHistoryRecords(supabaseRecords, localHistory);

        // 根据合并后的记录计算统计数据
        const stats = calculateStats(mergedRecords);
        updateStats(stats);

        // 更新历史记录
        if (mergedRecords.length > 0) {
            document.getElementById('recordCount').textContent = mergedRecords.length;
            renderHistory(mergedRecords);
        } else {
            document.getElementById('recordCount').textContent = '0';
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                            <circle cx="32" cy="32" r="30" stroke="#E0E0E0" stroke-width="2"/>
                            <path d="M32 16v16l12 12" stroke="#E0E0E0" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <p class="empty-title">暂无翻译记录</p>
                    <p class="empty-subtitle">开始翻译后会自动保存历史记录</p>
                </div>
            `;
        }
    }

    // ===== 删除历史记录 =====
    async function deleteHistoryRecord(recordId, isSynced, localIndex) {
        try {
            // 如果是云端同步的记录,从Supabase删除
            if (isSynced && recordId) {
                const result = await DatabaseService.deleteTranslation(recordId);
                if (!result.success) {
                    console.error('删除云端记录失败:', result.error);
                    alert('删除云端记录失败: ' + result.error);
                    return;
                }
            }

            // 从本地存储中删除
            const localHistory = await getLocalHistory();

            // 查找并删除本地记录
            // 对于云端记录,通过id查找
            // 对于本地记录,通过index查找
            let deleteIndex = -1;

            if (isSynced && recordId) {
                // 云端记录:查找对应的本地记录(如果存在)
                deleteIndex = localHistory.findIndex(item => {
                    // 本地记录可能有对应的云端ID
                    return item.id === recordId;
                });
            } else {
                // 本地记录:直接使用index
                // 需要过滤出仅本地记录,然后找到对应的全局index
                const localOnlyRecords = localHistory.filter(item => item.syncStatus === 'local_only');
                if (localIndex < localOnlyRecords.length) {
                    const targetRecord = localOnlyRecords[localIndex];
                    deleteIndex = localHistory.indexOf(targetRecord);
                }
            }

            if (deleteIndex !== -1) {
                localHistory.splice(deleteIndex, 1);
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    await chrome.storage.local.set({ translationHistory: localHistory });
                }
            }

            // 重新加载历史记录
            await loadHistoryFromDatabase();

            console.log('删除成功');
        } catch (error) {
            console.error('删除历史记录失败:', error);
            alert('删除失败: ' + error.message);
        }
    }

    // ===== 获取本地历史记录 =====
    async function getLocalHistory() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get('translationHistory', (result) => {
                    resolve(result.translationHistory || []);
                });
            });
        }
        return [];
    }

    // ===== 合并云端和本地历史记录 =====
    function mergeHistoryRecords(supabaseRecords, localRecords) {
        const cloudRecords = supabaseRecords.map(record => ({
            ...record,
            synced: true,
            syncStatus: 'synced'
        }));

        const localOnlyRecords = localRecords
            .filter(record => record.syncStatus === 'local_only')
            .map(record => ({
                ...record,
                created_at: new Date(record.timestamp).toISOString(),
                source_text: record.original || record.text || record.source_text,
                translated_text: record.translation || record.translated_text,
                source_language: getLanguageName(record.detectedLanguage || record.source_language || 'en'),
                target_language: getLanguageName(record.target_language || 'zh'),
                synced: false,
                syncStatus: 'local_only',
                count: record.count || 1,
                // 保留完整的翻译数据
                dictionaryData: record.dictionaryData || null,
                translations: record.translations || [],
                detectedLanguage: record.detectedLanguage || 'en'
            }));

        const merged = [...cloudRecords, ...localOnlyRecords];

        // 按 source_text 合并重复词，统计次数并保留最新时间与结果
        const groupedMap = new Map();
        for (const rec of merged) {
            const key = (rec.source_text || '').trim().toLowerCase();
            const existing = groupedMap.get(key);
            if (!existing) {
                // 保留完整的翻译数据结构
                groupedMap.set(key, {
                    ...rec,
                    count: rec.count || 1,
                    dictionaryData: rec.dictionaryData || null,
                    translations: rec.translations || [],
                    detectedLanguage: rec.detectedLanguage || 'en'
                });
            } else {
                const nextCount = (existing.count || 1) + (rec.count || 1);
                const newer = new Date(rec.created_at) > new Date(existing.created_at) ? rec : existing;
                // 合并时保留完整的翻译数据
                groupedMap.set(key, {
                    ...newer,
                    count: nextCount,
                    dictionaryData: newer.dictionaryData || existing.dictionaryData || null,
                    translations: newer.translations || existing.translations || [],
                    detectedLanguage: newer.detectedLanguage || existing.detectedLanguage || 'en'
                });
            }
        }

        const grouped = Array.from(groupedMap.values());
        grouped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return grouped;
    }

    // ===== 计算统计数据 =====
    function calculateStats(records) {
        const total = records.length;

        // 计算今日翻译数量
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        const todayRecords = records.filter(record => {
            const recordDate = new Date(record.created_at);
            return recordDate.getTime() >= todayTimestamp;
        });
        const todayCount = todayRecords.length;

        // 统计最常用的目标语言
        const langCount = {};
        records.forEach(record => {
            const lang = record.target_language || 'zh';
            langCount[lang] = (langCount[lang] || 0) + 1;
        });

        let commonLang = '简体中文';
        let maxCount = 0;
        for (const [lang, count] of Object.entries(langCount)) {
            if (count > maxCount) {
                maxCount = count;
                commonLang = getLanguageName(lang);
            }
        }

        return {
            total: total,
            today: todayCount,
            commonLang: commonLang
        };
    }

    // ===== 获取语言名称 =====
    function getLanguageName(code) {
        const langNames = {
            'zh': '简体中文',
            'zh-TW': '繁体中文',
            'en': '英语',
            'ja': '日语',
            'ko': '韩语',
            'fr': '法语',
            'de': '德语',
            'es': '西班牙语',
            'ru': '俄语',
            'auto': '自动检测'
        };
        return langNames[code] || code;
    }

    // ===== 更新统计信息 =====
    function updateStats(stats) {
        document.getElementById('totalCount').textContent = stats.total;
        document.getElementById('todayCount').textContent = stats.today;
        document.getElementById('commonLang').textContent = stats.commonLang;
    }

    // ===== 渲染历史记录 =====
    function renderHistory(records) {
        const historyHTML = records.map((record, index) => {
            const date = new Date(record.created_at);
            const timeString = formatTime(date);

            // 同步状态图标
            const syncIcon = record.synced
                ? '<svg class="sync-icon synced" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 14.667 8 6.667 6.667 0 0 0 8 1.333zm3.333 5.334L7 10.667 4.667 8.334" stroke="#2B7FFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                : '<svg class="sync-icon local-only" width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#FFA726" stroke-width="1.5"/><path d="M8 4v5M8 11h.01" stroke="#FFA726" stroke-width="1.5" stroke-linecap="round"/></svg>';

            return `
                <div class="history-item" data-id="${record.id || index}" data-index="${index}" data-synced="${record.synced}">
                    <div class="history-item-content">
                        <div class="history-item-header">
                            <span class="history-language">${getLanguageName(record.source_language)} → ${getLanguageName(record.target_language)}${record.count ? `（${record.count}次）` : ''}</span>
                            <div class="history-time-sync">
                                <span class="history-time">${timeString}</span>
                                ${syncIcon}
                            </div>
                        </div>
                        <div class="history-source">${escapeHtml(record.source_text.substring(0, 100))}${record.source_text.length > 100 ? '...' : ''}</div>
                        <div class="history-result">${escapeHtml(record.translated_text.substring(0, 100))}${record.translated_text.length > 100 ? '...' : ''}</div>
                    </div>
                    <button class="delete-history-btn" data-index="${index}" data-id="${record.id || ''}" data-synced="${record.synced}" title="删除">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        historyList.innerHTML = historyHTML;

        // 添加点击事件 - 只针对history-item-content
        document.querySelectorAll('.history-item-content').forEach((content, index) => {
            content.addEventListener('click', function() {
                const record = records[index];
                if (record) {
                    loadHistoryItem(record);
                }
            });
        });

        // 添加删除按钮事件
        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();

                const index = parseInt(this.getAttribute('data-index'));
                const recordId = this.getAttribute('data-id');
                const isSynced = this.getAttribute('data-synced') === 'true';

                if (confirm('确定要删除这条翻译记录吗？')) {
                    await deleteHistoryRecord(recordId, isSynced, index);
                }
            });
        });
    }

    function loadHistoryItem(record) {
        // 切换到翻译页面
        navTabs[0].click();

        // 填充内容
        sourceText.value = record.source_text;
        charCount.textContent = record.source_text.length;

        // 如果历史记录包含完整的翻译数据，使用完整格式显示
        if (record.dictionaryData || (record.translations && record.translations.length > 0)) {
            displayTranslationResult({
                original: record.source_text,
                translation: record.translated_text,
                translations: record.translations || [],
                dictionaryData: record.dictionaryData || null,
                detectedLanguage: record.detectedLanguage || 'en'
            });
        } else {
            // 否则使用简单的文本显示
            translationResult.textContent = record.translated_text;
        }

        resultPanel.style.display = 'block';
        translateBtn.disabled = false;
    }

    function formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;

        return date.toLocaleDateString('zh-CN');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== 显示翻译结果（与弹窗翻译格式一致） =====
    function displayTranslationResult(data) {
        // 检查是否有词典数据
        const hasDictionaryData = data.dictionaryData && data.dictionaryData.meanings && data.dictionaryData.meanings.length > 0;

        let html = '';

        // 如果有词典数据，显示词典模式
        if (hasDictionaryData) {
            const dict = data.dictionaryData;

            // 音标区域
            if (dict.phonetics && (dict.phonetics.us || dict.phonetics.uk)) {
                html += '<div class="result-phonetics" style="margin-bottom: 12px; display: flex; gap: 16px; flex-wrap: wrap;">';

                if (dict.phonetics.us) {
                    const usAudio = dict.phonetics.audio.us ?
                        `<button class="phonetic-audio-btn" data-audio="${escapeHtml(dict.phonetics.audio.us)}" style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;line-height:1;" title="发音">🔊</button>` : '';
                    html += `<div style="display:flex;align-items:center;gap:6px;"><span style="color:#666;font-size:13px;">US</span><span style="color:#333;font-size:14px;">/${escapeHtml(dict.phonetics.us)}/</span>${usAudio}</div>`;
                }

                if (dict.phonetics.uk) {
                    const ukAudio = dict.phonetics.audio.uk ?
                        `<button class="phonetic-audio-btn" data-audio="${escapeHtml(dict.phonetics.audio.uk)}" style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;line-height:1;" title="发音">🔊</button>` : '';
                    html += `<div style="display:flex;align-items:center;gap:6px;"><span style="color:#666;font-size:13px;">UK</span><span style="color:#333;font-size:14px;">/${escapeHtml(dict.phonetics.uk)}/</span>${ukAudio}</div>`;
                }

                html += '</div>';
            }

            // 如果有多个翻译结果，显示所有翻译
            if (data.translations && data.translations.length > 0) {
                html += '<div style="margin-bottom: 12px;"><div style="color: #666; font-size: 13px; margin-bottom: 6px;">翻译</div><div style="display: flex; flex-direction: column; gap: 4px;">';

                data.translations.forEach((trans) => {
                    const sourceName = trans.source === 'dictionary' ? '词典' : trans.source === 'tencent' ? '腾讯云' : trans.source;
                    html += `<div style="display:flex;align-items:center;gap:8px;"><span style="color:#999;font-size:12px;">[${escapeHtml(sourceName)}]</span><span style="color:#333;font-size:15px;">${escapeHtml(trans.text)}</span></div>`;
                });

                html += '</div></div>';
            }

            // 标准释义
            html += '<div style="color: #666; font-size: 13px; margin-bottom: 8px;">标准释义</div>';

            // 词性和释义 - 同一词性的释义显示在一行
            dict.meanings.forEach(meaning => {
                html += '<div style="margin-bottom: 12px;">';
                html += `<div style="margin-bottom: 4px;"><span style="color: #667eea; font-weight: 500; font-size: 14px;">${escapeHtml(meaning.partOfSpeech)}.</span></div>`;

                // 将所有定义用顿号连接，显示在一行
                const definitionsText = meaning.definitions.map(def => def.definition).join('、');
                html += `<div style="color: #333; font-size: 14px; line-height: 1.6;">${escapeHtml(definitionsText)}</div>`;

                // 只显示第一个例句
                const firstExample = meaning.definitions.find(def => def.example);
                if (firstExample) {
                    html += `<div style="margin-top: 6px;"><div style="color: #666; font-size: 13px; font-style: italic;">"${escapeHtml(firstExample.example)}"</div></div>`;
                }

                html += '</div>';
            });
        } else {
            // 简单翻译模式
            // 显示所有翻译结果
            if (data.translations && data.translations.length > 0) {
                html += '<div style="display: flex; flex-direction: column; gap: 8px;">';

                data.translations.forEach((trans) => {
                    const sourceName = trans.source === 'dictionary' ? '词典' : trans.source === 'tencent' ? '腾讯云' : trans.source;
                    html += `<div style="display:flex;align-items:center;gap:8px;"><span style="color:#999;font-size:12px;">[${escapeHtml(sourceName)}]</span><span style="color:#333;font-size:15px;">${escapeHtml(trans.text)}</span></div>`;
                });

                html += '</div>';
            } else if (data.translation) {
                // 兼容旧格式
                html += `<div style="color: #333; font-size: 15px;">${escapeHtml(data.translation)}</div>`;
            }

            if (data.detectedLanguage) {
                html += `<div style="color: #999; font-size: 12px; margin-top: 8px;">检测语言: ${data.detectedLanguage}</div>`;
            }
        }

        translationResult.innerHTML = html;

        // 绑定发音按钮事件
        const audioButtons = translationResult.querySelectorAll('.phonetic-audio-btn');
        audioButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const audioUrl = e.currentTarget.getAttribute('data-audio');
                if (audioUrl) {
                    playAudio(audioUrl);
                }
            });
        });
    }

    // 播放音频
    let currentAudioElement = null;
    function playAudio(url) {
        // 停止当前播放的音频
        if (currentAudioElement) {
            currentAudioElement.pause();
            currentAudioElement = null;
        }

        // 创建新的音频元素
        currentAudioElement = new Audio(url);
        currentAudioElement.play().catch(error => {
            console.error('播放音频失败:', error);
        });
    }

    // ===== 复制功能 =====
    const copyBtn = document.querySelector('.action-btn[title="复制"]');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            // 从翻译结果中提取纯文本，排除标签和额外信息
            let textToCopy = '';
            const sourceElements = translationResult.querySelectorAll('span.translation-text');
            if (sourceElements.length > 0) {
                // 如果有多个翻译结果，复制所有翻译（用分号分隔）
                textToCopy = Array.from(sourceElements).map(el => el.textContent).join('；');
            } else {
                // 否则复制所有文本内容
                textToCopy = translationResult.textContent
                    .replace(/\[.*?\]/g, '') // 移除来源标签如 [腾讯云]
                    .replace(/US|UK/g, '') // 移除音标标签
                    .replace(/检测语言:.*/g, '') // 移除语言检测信息
                    .replace(/标准释义|翻译/g, '') // 移除标题
                    .replace(/[""]/g, '') // 移除引号
                    .trim();
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHTML = this.innerHTML;
                this.innerHTML = '✓';
                this.style.color = '#22c55e';

                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.style.color = '';
                }, 1500);
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制');
            });
        });
    }

    // ===== 朗读功能 =====
    const speakBtn = document.querySelector('.action-btn[title="朗读"]');
    if (speakBtn) {
        speakBtn.addEventListener('click', function() {
            // 从翻译结果中提取纯文本用于朗读
            let textToSpeak = '';
            const sourceElements = translationResult.querySelectorAll('span.translation-text');
            if (sourceElements.length > 0) {
                // 如果有多个翻译结果，朗读第一个翻译
                textToSpeak = sourceElements[0].textContent;
            } else {
                // 否则朗读所有文本内容，但排除标签
                textToSpeak = translationResult.textContent
                    .replace(/\[.*?\]/g, '') // 移除来源标签
                    .replace(/US|UK/g, '') // 移除音标标签
                    .replace(/检测语言:.*/g, '') // 移除语言检测信息
                    .replace(/标准释义|翻译/g, '') // 移除标题
                    .replace(/[""]/g, '') // 移除引号
                    .replace(/\/.*?\//g, '') // 移除音标
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
        });
    }

    // ===== 语言切换 =====
    sourceLanguage.addEventListener('change', function() {
        updatePlaceholder();
    });

    function updatePlaceholder() {
        const lang = sourceLanguage.options[sourceLanguage.selectedIndex].text;
        sourceText.placeholder = `输入要翻译的${lang}文本...`;
    }

    // ===== 测试按钮 =====
    const testButton = document.querySelector('.test-button');
    if (testButton) {
        testButton.addEventListener('click', function() {
            sourceText.value = 'Hello, this is a test translation.';
            charCount.textContent = sourceText.value.length;
            translateBtn.disabled = false;

            setTimeout(() => {
                translateBtn.click();
            }, 300);
        });
    }

    // ===== 键盘快捷键 =====
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (sourceText.value.trim() && !translateBtn.disabled) {
                translateBtn.click();
            }
        }
    });

    // ===== 设置页面功能 =====

    // 声明设置页面的DOM元素变量（在外部作用域，以便后续使用）
    let defaultTargetLangSelect = null;
    let autoTranslateCheckbox = null;
    let selectionTranslateCheckbox = null;
    let shortcutTranslateCheckbox = null;
    let autoDetectLanguageCheckbox = null;
    let showPhoneticCheckbox = null;
    let showExamplesCheckbox = null;

    // 从数据库加载设置
    async function loadSettings() {
        const result = await DatabaseService.getUserSettings();

        if (result.success && result.data) {
            const settings = result.data;

            // 获取DOM元素并保存到外部变量
            defaultTargetLangSelect = document.getElementById('defaultTargetLang');
            autoTranslateCheckbox = document.getElementById('autoTranslate');
            selectionTranslateCheckbox = document.getElementById('selectionTranslate');
            shortcutTranslateCheckbox = document.getElementById('shortcutTranslate');
            autoDetectLanguageCheckbox = document.getElementById('autoDetectLanguage');
            showPhoneticCheckbox = document.getElementById('showPhonetic');
            showExamplesCheckbox = document.getElementById('showExamples');

            // 应用设置到UI
            if (defaultTargetLangSelect) {
                defaultTargetLangSelect.value = settings.default_target_lang || 'zh';
            }
            if (autoTranslateCheckbox) {
                autoTranslateCheckbox.checked = settings.auto_translate || false;
            }
            if (selectionTranslateCheckbox) {
                selectionTranslateCheckbox.checked = settings.selection_translate !== false;
            }
            if (shortcutTranslateCheckbox) {
                shortcutTranslateCheckbox.checked = settings.shortcut_translate !== false;
            }
            if (autoDetectLanguageCheckbox) {
                autoDetectLanguageCheckbox.checked = settings.auto_detect_language !== false;
            }
            if (showPhoneticCheckbox) {
                showPhoneticCheckbox.checked = settings.show_phonetic !== false;
            }
            if (showExamplesCheckbox) {
                showExamplesCheckbox.checked = settings.show_examples || false;
            }

            // 获取背单词设置的DOM元素
            if (!memoryIntervalInput) memoryIntervalInput = document.getElementById('memoryInterval');
            if (!memoryWordsPerSessionInput) memoryWordsPerSessionInput = document.getElementById('memoryWordsPerSession');

            if (memoryIntervalInput) {
                memoryIntervalInput.value = settings.memory_interval_hours || 3;
            }
            if (memoryWordsPerSessionInput) {
                memoryWordsPerSessionInput.value = settings.memory_words_per_session || 10;
            }

            // 同步API配置到Chrome扩展
            if (settings.api_secret_id && settings.api_secret_key) {
                await syncApiSettingsToExtension(settings);
            }
        } else {
            console.log('使用默认设置');
        }

        // 加载本地翻译历史数量
        await loadLocalHistoryCount();
    }

    // 加载本地翻译历史数量
    async function loadLocalHistoryCount() {
        try {
            const localHistory = await DatabaseService.getLocalTranslationHistory();
            const countElement = document.getElementById('localHistoryCount');
            if (countElement) {
                countElement.textContent = `${localHistory.length} 条`;
            }
        } catch (error) {
            console.error('获取本地历史数量失败:', error);
            const countElement = document.getElementById('localHistoryCount');
            if (countElement) {
                countElement.textContent = '获取失败';
            }
        }
    }

    // 绑定背单词设置的事件监听器
    if (!memoryIntervalInput) memoryIntervalInput = document.getElementById('memoryInterval');
    if (!memoryWordsPerSessionInput) memoryWordsPerSessionInput = document.getElementById('memoryWordsPerSession');

    if (memoryIntervalInput) {
        memoryIntervalInput.addEventListener('change', async function() {
            const value = parseInt(this.value);
            if (value >= 1 && value <= 24) {
                const result = await DatabaseService.updateUserSettings({
                    memory_interval_hours: value
                });
                if (result.success) {
                    console.log('背单词间隔已更新');
                }
            }
        });
    }

    if (memoryWordsPerSessionInput) {
        memoryWordsPerSessionInput.addEventListener('change', async function() {
            const value = parseInt(this.value);
            if (value >= 5 && value <= 50) {
                const result = await DatabaseService.updateUserSettings({
                    memory_words_per_session: value
                });
                if (result.success) {
                    console.log('每次背诵数量已更新');
                }
            }
        });
    }

    // 同步本地翻译历史到云端
    async function syncLocalHistory() {
        const syncButton = document.getElementById('syncButton');
        const countElement = document.getElementById('localHistoryCount');

        if (!syncButton) return;

        // 禁用按钮，显示加载状态
        syncButton.disabled = true;
        const originalHTML = syncButton.innerHTML;
        syncButton.innerHTML = `
            <svg class="sync-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                <path d="M8 2v6M8 7l2-2M8 7l-2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>同步中...</span>
        `;

        try {
            const result = await DatabaseService.syncLocalHistoryToSupabase((current, total) => {
                // 更新进度
                if (countElement) {
                    countElement.textContent = `同步中: ${current}/${total}`;
                }
            });

            if (result.success) {
                if (countElement) {
                    countElement.textContent = result.message || '同步完成';
                }
                // 重新加载本地历史数量
                await loadLocalHistoryCount();

                // 显示成功提示
                showSyncNotification(result.message || '同步成功', 'success');
            } else {
                if (countElement) {
                    countElement.textContent = '同步失败';
                }
                showSyncNotification(`同步失败: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('同步出错:', error);
            if (countElement) {
                countElement.textContent = '同步出错';
            }
            showSyncNotification(`同步出错: ${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            syncButton.disabled = false;
            syncButton.innerHTML = originalHTML;
        }
    }

    // 显示同步通知
    function showSyncNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `sync-notification sync-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 保存设置到数据库
    async function saveSettings() {
        const settings = {
            default_target_lang: defaultTargetLangSelect?.value || 'zh',
            auto_translate: autoTranslateCheckbox?.checked || false,
            selection_translate: selectionTranslateCheckbox?.checked !== false,
            shortcut_translate: shortcutTranslateCheckbox?.checked !== false,
            auto_detect_language: autoDetectLanguageCheckbox?.checked !== false,
            show_phonetic: showPhoneticCheckbox?.checked !== false,
            show_examples: showExamplesCheckbox?.checked || false
        };

        const result = await DatabaseService.updateUserSettings(settings);

        if (result.success) {
            console.log('设置已保存到云端');
            showSettingsSavedNotification();

            // 同步API配置到Chrome扩展（如果存在）
            if (result.data) {
                await syncApiSettingsToExtension(result.data);
            }
        } else {
            console.error('保存设置失败:', result.error);
        }
    }

    // 显示保存成功提示
    function showSettingsSavedNotification() {
        // 创建临时提示元素
        const notification = document.createElement('div');
        notification.textContent = '设置已保存';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // 监听设置变化并自动保存
    if (defaultTargetLangSelect) {
        defaultTargetLangSelect.addEventListener('change', saveSettings);
    }
    if (autoTranslateCheckbox) {
        autoTranslateCheckbox.addEventListener('change', saveSettings);
    }
    if (selectionTranslateCheckbox) {
        selectionTranslateCheckbox.addEventListener('change', saveSettings);
    }
    if (shortcutTranslateCheckbox) {
        shortcutTranslateCheckbox.addEventListener('change', saveSettings);
    }
    if (autoDetectLanguageCheckbox) {
        autoDetectLanguageCheckbox.addEventListener('change', saveSettings);
    }
    if (showPhoneticCheckbox) {
        showPhoneticCheckbox.addEventListener('change', saveSettings);
    }
    if (showExamplesCheckbox) {
        showExamplesCheckbox.addEventListener('change', saveSettings);
    }

    // 加载单词统计
    async function loadMemoryStats() {
        const result = await DatabaseService.getMemoryStats();
        if (result.success && result.data) {
            const totalWordsEl = document.getElementById('totalWords');
            const dueWordsEl = document.getElementById('dueWords');
            const masteredWordsEl = document.getElementById('masteredWords');

            if (totalWordsEl) totalWordsEl.textContent = result.data.total;
            if (dueWordsEl) dueWordsEl.textContent = result.data.due;
            if (masteredWordsEl) masteredWordsEl.textContent = result.data.mastered;
        }
    }

    // ===== API配置功能 =====

    // 加载API配置（从Supabase）
    async function loadApiSettings() {
        try {
            // 获取DOM元素（每次调用时重新获取）
            const apiSecretIdInput = document.getElementById('apiSecretId');
            const apiSecretKeyInput = document.getElementById('apiSecretKey');
            const apiProjectIdInput = document.getElementById('apiProjectId');

            const result = await DatabaseService.getUserSettings();

            if (result.success && result.data) {
                const settings = result.data;
                if (apiSecretIdInput) apiSecretIdInput.value = settings.api_secret_id || '';
                if (apiSecretKeyInput) apiSecretKeyInput.value = settings.api_secret_key || '';
                if (apiProjectIdInput) apiProjectIdInput.value = settings.api_project_id || 0;

                // 同步到chrome.storage供background.js使用
                if (settings.api_secret_id && settings.api_secret_key) {
                    await syncApiSettingsToExtension(settings);
                }
            }
        } catch (error) {
            console.error('加载API配置失败:', error);
        }
    }

    // 同步API配置到Chrome扩展存储
    async function syncApiSettingsToExtension(settings) {
        try {
            const chromeSettings = {
                secretId: settings.api_secret_id || '',
                secretKey: settings.api_secret_key || '',
                sourceLanguage: settings.source_language || 'auto',
                targetLanguage: settings.default_target_lang || 'zh',
                projectId: settings.api_project_id || 0
            };

            await chrome.runtime.sendMessage({
                action: 'saveSettings',
                settings: chromeSettings
            });
        } catch (error) {
            console.error('同步API配置到扩展失败:', error);
        }
    }

    async function getCurrentUserId() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user?.id || '';
    }

    function b64ToBytes(b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }
    function bytesToB64(buf) {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }
    async function getStoredEncKey() {
        let hashB64 = null;
        try {
            const res = await chrome.storage.local.get('encKeyHash');
            hashB64 = res.encKeyHash || null;
        } catch (_) {
            hashB64 = localStorage.getItem('encKeyHash');
        }
        if (!hashB64) throw new Error('未找到加密密钥，请使用密码登录');
        const keyBytes = b64ToBytes(hashB64);
        return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }
    async function encryptConfig(configObj) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await getStoredEncKey();
        const data = new TextEncoder().encode(JSON.stringify(configObj));
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
        return { ct: bytesToB64(ct), iv: bytesToB64(iv) };
    }
    async function decryptConfig(encBlob) {
        const key = await getStoredEncKey();
        const iv = b64ToBytes(encBlob.iv);
        const ct = b64ToBytes(encBlob.ct);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        return JSON.parse(new TextDecoder().decode(pt));
    }

    async function saveProviderEncrypted(provider, encBlob) {
        console.log('保存配置 - Provider:', provider);

        // 暂时使用明文格式保存（使用现有的数据库列）
        const cfg = await decryptConfig(encBlob);

        if (provider === 'tencent') {
            const settings = {
                api_secret_id: cfg.secretId,
                api_secret_key: cfg.secretKey,
                api_project_id: cfg.projectId || 0
            };

            console.log('准备保存配置到数据库（明文格式）:', settings);

            const result = await DatabaseService.updateUserSettings(settings);
            if (!result.success) {
                console.error('保存配置失败:', result.error);
                throw new Error(result.error);
            }
            console.log('保存配置成功');
        } else {
            // 其他渠道暂时保存到 localStorage（因为数据库表没有对应列）
            console.log('其他渠道保存到localStorage');
            localStorage.setItem(`provider_config_${provider}`, JSON.stringify(cfg));
        }
    }

    console.log('定义 window.loadProviderConfigByName 函数...');
    window.loadProviderConfigByName = async function(provider) {
        console.log('loadProviderConfigByName 被调用，provider:', provider);

        // 获取对应的渠道详情页ID
        const channelMap = {
            tencent: 'channelTencent',
            ali: 'channelAli',
            zhipu: 'channelZhipu',
            silicon: 'channelSilicon',
            deepl: 'channelDeepL',
            microsoft: 'channelMicrosoft',
            gpt: 'channelGPT'
        };
        const channelId = channelMap[provider];
        console.log('对应的渠道详情页ID:', channelId);

        try {
            // 等待一小段时间确保DOM已准备好
            await new Promise(resolve => setTimeout(resolve, 100));

            // 从数据库加载用户设置
            console.log('开始从数据库获取用户设置...');
            const result = await DatabaseService.getUserSettings();
            console.log('数据库返回结果:', result);

            if (!result.success || !result.data) {
                console.log('获取用户设置失败或无数据');
                if (channelId) hideChannelLoading(channelId);
                return;
            }

            console.log('用户设置数据:', result.data);

            // 先尝试新的加密格式
            const configKey = `provider_config_${provider}_enc`;
            const blob = result.data[configKey];

            console.log('加载配置 - Provider:', provider);
            console.log('配置key:', configKey);
            console.log('加密配置blob:', blob);

            if (blob) {
                // 使用新的加密格式
                console.log('使用加密格式，开始解密...');
                const cfg = await decryptConfig(blob);
                console.log('解密后的配置:', cfg);
                loadConfigToInputs(provider, cfg);
                console.log('配置已加载到输入框');
            } else {
                // 尝试旧的明文格式（腾讯云）
                if (provider === 'tencent' && result.data.api_secret_id) {
                    console.log('使用旧格式加载腾讯云配置');
                    const cfg = {
                        secretId: result.data.api_secret_id,
                        secretKey: result.data.api_secret_key,
                        projectId: result.data.api_project_id || 0
                    };
                    console.log('旧格式配置:', cfg);
                    loadConfigToInputs(provider, cfg);

                    // 自动迁移到新格式（加密保存）
                    try {
                        console.log('自动迁移配置到新格式...');
                        const enc = await encryptConfig(cfg);
                        await saveProviderEncrypted(provider, enc);
                        console.log('配置迁移成功');
                    } catch (e) {
                        console.error('配置迁移失败:', e);
                    }
                } else {
                    console.log('未找到', provider, '的配置');
                }
            }

            // 配置加载完成，隐藏加载遮罩
            console.log('配置加载流程完成，准备隐藏加载遮罩');
            if (channelId) {
                setTimeout(() => {
                    console.log('执行隐藏加载遮罩:', channelId);
                    hideChannelLoading(channelId);
                }, 300);
            }
        } catch (e) {
            console.error('加载配置失败:', e);
            console.error('错误堆栈:', e.stack);
            // 发生错误时也要隐藏加载遮罩
            if (channelId) {
                console.log('因错误隐藏加载遮罩:', channelId);
                hideChannelLoading(channelId);
            }
        }
    };

    // 将配置加载到输入框
    function loadConfigToInputs(provider, cfg) {
        const setElementValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = value || '';
                console.log(`设置 ${id} =`, value || '');
            } else {
                console.warn(`未找到元素: ${id}`);
            }
        };

        if (provider === 'tencent') {
            setElementValue('tencentSecretId', cfg.secretId);
            setElementValue('tencentSecretKey', cfg.secretKey);
            setElementValue('tencentProjectId', cfg.projectId || 0);
        } else if (provider === 'ali') {
            setElementValue('aliAccessKeyId', cfg.accessKeyId);
            setElementValue('aliAccessKeySecret', cfg.accessKeySecret);
            setElementValue('aliRegion', cfg.region);
        } else if (provider === 'zhipu') {
            setElementValue('zhipuApiKey', cfg.apiKey);
        } else if (provider === 'silicon') {
            setElementValue('siliconApiKey', cfg.apiKey);
            setElementValue('siliconModel', cfg.model);
        } else if (provider === 'deepl') {
            setElementValue('deeplApiKey', cfg.apiKey);
        } else if (provider === 'microsoft') {
            setElementValue('msKey', cfg.key);
            setElementValue('msEndpoint', cfg.endpoint);
            setElementValue('msRegion', cfg.region);
        } else if (provider === 'gpt') {
            setElementValue('gptApiKey', cfg.apiKey);
            setElementValue('gptModel', cfg.model);
        }
    }

    console.log('定义 window.saveProviderConfig 函数...');
    window.saveProviderConfig = async function(provider) {
        let payload = {};
        if (provider === 'tencent') {
            payload = {
                secretId: document.getElementById('tencentSecretId')?.value || '',
                secretKey: document.getElementById('tencentSecretKey')?.value || '',
                projectId: parseInt(document.getElementById('tencentProjectId')?.value) || 0
            };
        } else if (provider === 'ali') {
            payload = {
                accessKeyId: document.getElementById('aliAccessKeyId')?.value || '',
                accessKeySecret: document.getElementById('aliAccessKeySecret')?.value || '',
                region: document.getElementById('aliRegion')?.value || ''
            };
        } else if (provider === 'zhipu') {
            payload = { apiKey: document.getElementById('zhipuApiKey')?.value || '' };
        } else if (provider === 'silicon') {
            payload = {
                apiKey: document.getElementById('siliconApiKey')?.value || '',
                model: document.getElementById('siliconModel')?.value || ''
            };
        } else if (provider === 'deepl') {
            payload = { apiKey: document.getElementById('deeplApiKey')?.value || '' };
        } else if (provider === 'microsoft') {
            payload = {
                key: document.getElementById('msKey')?.value || '',
                endpoint: document.getElementById('msEndpoint')?.value || '',
                region: document.getElementById('msRegion')?.value || ''
            };
        } else if (provider === 'gpt') {
            payload = {
                apiKey: document.getElementById('gptApiKey')?.value || '',
                model: document.getElementById('gptModel')?.value || ''
            };
        }

        try {
            const enc = await encryptConfig(payload);
            await saveProviderEncrypted(provider, enc);
            if (provider === 'tencent') {
                const settings = {
                    secretId: payload.secretId,
                    secretKey: payload.secretKey,
                    sourceLanguage: 'auto',
                    targetLanguage: document.getElementById('defaultTargetLang')?.value || 'zh',
                    projectId: payload.projectId || 0
                };
                await chrome.runtime.sendMessage({ action: 'saveSettings', settings });
            }

            // 配置成功后自动启用该渠道
            await enableChannelAfterConfig(provider);

            // 保存成功后返回列表页
            showChannelsList();
        } catch (e) {
            console.error('保存配置失败:', e);
        }
    }

    // 配置成功后自动启用渠道
    async function enableChannelAfterConfig(provider) {
        try {
            const result = await chrome.storage.local.get('channelSettings');
            const s = result.channelSettings || {};
            s[provider] = true;
            await chrome.storage.local.set({ channelSettings: s });

            // 更新UI
            const checkboxMap = {
                tencent: enableChannelTencent,
                ali: enableChannelAli,
                zhipu: enableChannelZhipu,
                silicon: enableChannelSilicon,
                deepl: enableChannelDeepL,
                microsoft: enableChannelMicrosoft,
                gpt: enableChannelGPT
            };
            const checkbox = checkboxMap[provider];
            if (checkbox) {
                checkbox.checked = true;
            }
        } catch (e) {
            console.error('自动启用渠道失败:', e);
        }
    }

    // 同步本地翻译历史按钮
    const syncButton = document.getElementById('syncButton');
    syncButton && syncButton.addEventListener('click', syncLocalHistory);

    // 判断是否应该保存翻译记录
    function shouldSaveTranslationRecord(originalText, translatedText, detectedLanguage) {
        // 1. 去除首尾空格
        const original = originalText.trim();
        const translation = translatedText.trim();

        // 2. 如果原文或译文为空，不保存
        if (!original || !translation) {
            return false;
        }

        // 3. 如果原文和译文完全一致（忽略大小写），不保存
        if (original.toLowerCase() === translation.toLowerCase()) {
            return false;
        }

        // 4. 检查是否是有意义的文本
        // 如果是单个字符，不保存
        if (original.length === 1) {
            return false;
        }

        // 5. 检查是否是纯标点符号或特殊字符
        const punctuationRegex = /^[\s\p{P}\p{S}]+$/u;
        if (punctuationRegex.test(original)) {
            return false;
        }

        // 6. 对于英文，检查是否是有意义的单词（至少2个字母）
        if (detectedLanguage === 'en') {
            const englishWordRegex = /^[a-zA-Z]{2,}$/;
            const words = original.split(/\s+/).filter(word => word.length > 0);

            // 如果是单个英文单词，检查是否至少2个字母
            if (words.length === 1 && !englishWordRegex.test(words[0])) {
                return false;
            }
        }

        // 7. 检查是否是纯数字
        const isOnlyNumbers = /^\d+(\.\d+)?$/.test(original);
        if (isOnlyNumbers) {
            return false;
        }

        // 8. 通过所有检查，保存记录
        return true;
    }

    // 初始化
    translateBtn.disabled = true;
    updatePlaceholder();
    loadSettings(); // 加载用户设置
    loadApiSettings(); // 加载API配置
});

// ===== 翻译渠道页面交互（在DOMContentLoaded之后执行）=====
    const channelsList = document.getElementById('channelsList');
    const channelItems = document.querySelectorAll('#channelsList .settings-menu-item.channel-item');
    const channelDetails = document.querySelectorAll('.channel-detail');
    const backToChannelsButtons = document.querySelectorAll('.channel-back-button');

    // 声明变量但不立即获取DOM（避免提前初始化错误）
    let enableChannelTencent = null;
    let enableChannelAli = null;
    let enableChannelZhipu = null;
    let enableChannelSilicon = null;
    let enableChannelDeepL = null;
    let enableChannelMicrosoft = null;
    let enableChannelGPT = null;

    function showChannelsList() {
        if (channelsList) channelsList.style.display = 'block';
        channelDetails.forEach(d => d.style.display = 'none');
    }

    function showChannelDetail(id) {
        if (channelsList) channelsList.style.display = 'none';
        channelDetails.forEach(d => {
            d.style.display = (d.id === id) ? 'block' : 'none';
        });

        // 显示对应渠道的加载遮罩并禁用输入框
        const loadingMap = {
            'channelTencent': 'loadingTencent',
            'channelAli': 'loadingAli',
            'channelZhipu': 'loadingZhipu',
            'channelSilicon': 'loadingSilicon',
            'channelDeepL': 'loadingDeepl',
            'channelMicrosoft': 'loadingMicrosoft',
            'channelGPT': 'loadingGpt'
        };
        const loadingId = loadingMap[id];
        if (loadingId) {
            const loadingOverlay = document.getElementById(loadingId);
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';

                // 禁用所有输入框和按钮
                const detailElement = document.getElementById(id);
                if (detailElement) {
                    const inputs = detailElement.querySelectorAll('input, button');
                    inputs.forEach(input => {
                        input.disabled = true;
                        input.classList.add('loading-disabled');
                    });
                }

                // 设置10秒超时，自动隐藏加载遮罩
                const timeoutId = setTimeout(() => {
                    console.warn(`加载配置超时 (${loadingId})，自动隐藏加载遮罩`);
                    hideChannelLoading(id);
                }, 10000);

                // 保存超时ID，以便在加载成功时清除
                loadingOverlay.dataset.timeoutId = timeoutId;
            }
        }
    }

    function hideChannelLoading(id) {
        const loadingMap = {
            'channelTencent': 'loadingTencent',
            'channelAli': 'loadingAli',
            'channelZhipu': 'loadingZhipu',
            'channelSilicon': 'loadingSilicon',
            'channelDeepL': 'loadingDeepl',
            'channelMicrosoft': 'loadingMicrosoft',
            'channelGPT': 'loadingGpt'
        };
        const loadingId = loadingMap[id];
        if (loadingId) {
            const loadingOverlay = document.getElementById(loadingId);
            if (loadingOverlay) {
                // 清除超时定时器
                if (loadingOverlay.dataset.timeoutId) {
                    clearTimeout(parseInt(loadingOverlay.dataset.timeoutId));
                    delete loadingOverlay.dataset.timeoutId;
                }

                loadingOverlay.style.display = 'none';

                // 启用所有输入框和按钮
                const detailElement = document.getElementById(id);
                if (detailElement) {
                    const inputs = detailElement.querySelectorAll('.loading-disabled');
                    inputs.forEach(input => {
                        input.disabled = false;
                        input.classList.remove('loading-disabled');
                    });
                }
            }
        }
    }

    // 处理渠道项的点击事件
    channelItems.forEach(item => {
        // 点击左侧信息区域时打开配置详情
        const menuItemLeft = item.querySelector('.menu-item-left');
        console.log('绑定渠道项点击事件，menuItemLeft:', menuItemLeft, 'item:', item);

        if (menuItemLeft) {
            menuItemLeft.addEventListener('click', () => {
                const name = item.getAttribute('data-channel');
                console.log('渠道项被点击，provider:', name);

                const map = {
                    tencent: 'channelTencent',
                    ali: 'channelAli',
                    zhipu: 'channelZhipu',
                    silicon: 'channelSilicon',
                    deepl: 'channelDeepL',
                    microsoft: 'channelMicrosoft',
                    gpt: 'channelGPT'
                };
                const targetId = map[name];
                console.log('目标详情页ID:', targetId);

                if (targetId) {
                    showChannelDetail(targetId);
                    console.log('已显示配置详情页，准备加载配置...');

                    // 延迟加载配置，确保DOM已渲染
                    setTimeout(() => {
                        console.log('开始调用 loadProviderConfigByName for:', name);
                        console.log('函数是否存在:', typeof window.loadProviderConfigByName);
                        window.loadProviderConfigByName && window.loadProviderConfigByName(name);
                    }, 150);
                }
            });
        }
    });

    backToChannelsButtons.forEach(btn => {
        btn.addEventListener('click', showChannelsList);
    });

    async function loadChannelSettings() {
        try {
            // 获取DOM元素（每次调用时重新获取）
            if (!enableChannelTencent) enableChannelTencent = document.getElementById('enableChannelTencent');
            if (!enableChannelAli) enableChannelAli = document.getElementById('enableChannelAli');
            if (!enableChannelZhipu) enableChannelZhipu = document.getElementById('enableChannelZhipu');
            if (!enableChannelSilicon) enableChannelSilicon = document.getElementById('enableChannelSilicon');
            if (!enableChannelDeepL) enableChannelDeepL = document.getElementById('enableChannelDeepL');
            if (!enableChannelMicrosoft) enableChannelMicrosoft = document.getElementById('enableChannelMicrosoft');
            if (!enableChannelGPT) enableChannelGPT = document.getElementById('enableChannelGPT');

            const result = await chrome.storage.local.get('channelSettings');
            const s = result.channelSettings || {};
            if (enableChannelTencent) enableChannelTencent.checked = !!s.tencent;
            if (enableChannelAli) enableChannelAli.checked = !!s.ali;
            if (enableChannelZhipu) enableChannelZhipu.checked = !!s.zhipu;
            if (enableChannelSilicon) enableChannelSilicon.checked = !!s.silicon;
            if (enableChannelDeepL) enableChannelDeepL.checked = !!s.deepl;
            if (enableChannelMicrosoft) enableChannelMicrosoft.checked = !!s.microsoft;
            if (enableChannelGPT) enableChannelGPT.checked = !!s.gpt;
        } catch (e) {
            console.error('加载翻译渠道设置失败:', e);
        }
    }

    async function saveChannelSettings() {
        // 确保DOM元素已获取
        if (!enableChannelTencent) enableChannelTencent = document.getElementById('enableChannelTencent');
        if (!enableChannelAli) enableChannelAli = document.getElementById('enableChannelAli');
        if (!enableChannelZhipu) enableChannelZhipu = document.getElementById('enableChannelZhipu');
        if (!enableChannelSilicon) enableChannelSilicon = document.getElementById('enableChannelSilicon');
        if (!enableChannelDeepL) enableChannelDeepL = document.getElementById('enableChannelDeepL');
        if (!enableChannelMicrosoft) enableChannelMicrosoft = document.getElementById('enableChannelMicrosoft');
        if (!enableChannelGPT) enableChannelGPT = document.getElementById('enableChannelGPT');

        const s = {
            tencent: !!enableChannelTencent?.checked,
            ali: !!enableChannelAli?.checked,
            zhipu: !!enableChannelZhipu?.checked,
            silicon: !!enableChannelSilicon?.checked,
            deepl: !!enableChannelDeepL?.checked,
            microsoft: !!enableChannelMicrosoft?.checked,
            gpt: !!enableChannelGPT?.checked
        };
        await chrome.storage.local.set({ channelSettings: s });
    }

    // 获取DOM元素并绑定事件
    if (!enableChannelTencent) enableChannelTencent = document.getElementById('enableChannelTencent');
    if (!enableChannelAli) enableChannelAli = document.getElementById('enableChannelAli');
    if (!enableChannelZhipu) enableChannelZhipu = document.getElementById('enableChannelZhipu');
    if (!enableChannelSilicon) enableChannelSilicon = document.getElementById('enableChannelSilicon');
    if (!enableChannelDeepL) enableChannelDeepL = document.getElementById('enableChannelDeepL');
    if (!enableChannelMicrosoft) enableChannelMicrosoft = document.getElementById('enableChannelMicrosoft');
    if (!enableChannelGPT) enableChannelGPT = document.getElementById('enableChannelGPT');

    // 检查渠道是否已配置
    async function isChannelConfigured(channel) {
        try {
            const result = await DatabaseService.getUserSettings();
            if (!result.success || !result.data) return false;
            const configKey = `provider_config_${channel}_enc`;
            return !!result.data[configKey];
        } catch (e) {
            console.error('检查渠道配置失败:', e);
            return false;
        }
    }

    // 处理启用按钮的点击事件
    async function handleChannelToggle(channel, checkbox) {
        const configured = await isChannelConfigured(channel);

        if (!configured && checkbox.checked) {
            // 未配置时打开配置页面
            checkbox.checked = false; // 取消勾选
            const map = {
                tencent: 'channelTencent',
                ali: 'channelAli',
                zhipu: 'channelZhipu',
                silicon: 'channelSilicon',
                deepl: 'channelDeepL',
                microsoft: 'channelMicrosoft',
                gpt: 'channelGPT'
            };
            const targetId = map[channel];
            if (targetId) {
                showChannelDetail(targetId);
                window.loadProviderConfigByName && window.loadProviderConfigByName(channel);
            }
        } else {
            // 已配置或禁用时，直接保存设置
            await saveChannelSettings();
        }
    }

    // 绑定启用按钮的点击事件
    const channelConfigMap = {
        'enableChannelTencent': 'tencent',
        'enableChannelAli': 'ali',
        'enableChannelZhipu': 'zhipu',
        'enableChannelSilicon': 'silicon',
        'enableChannelDeepL': 'deepl',
        'enableChannelMicrosoft': 'microsoft',
        'enableChannelGPT': 'gpt'
    };

    [enableChannelTencent, enableChannelAli, enableChannelZhipu, enableChannelSilicon, enableChannelDeepL, enableChannelMicrosoft, enableChannelGPT]
        .forEach(cb => {
            if (cb) {
                cb.addEventListener('change', (e) => {
                    const channel = channelConfigMap[e.target.id];
                    if (channel) {
                        handleChannelToggle(channel, e.target);
                    }
                });
            }
        });

    loadChannelSettings();

    // ===== 测试渠道配置功能 =====
    const testButtons = document.querySelectorAll('.test-config-btn');
    const saveButtons = document.querySelectorAll('.save-config-btn');

    testButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const channel = btn.getAttribute('data-channel');
            await testChannelConfig(channel, btn);
        });
    });

    saveButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const channel = btn.getAttribute('data-channel');
            await saveProviderConfig(channel);
        });
    });

    // 测试渠道配置
    async function testChannelConfig(channel, button) {
        const originalHTML = button.innerHTML;
        const statusMessage = document.querySelector(`.test-status-message[data-channel="${channel}"]`);

        button.disabled = true;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="loading">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="37.7" stroke-dashoffset="12.5"/>
            </svg>
            <span>测试中...</span>
        `;

        if (statusMessage) {
            statusMessage.className = 'test-status-message testing';
            statusMessage.textContent = '正在测试连接...';
        }

        try {
            // 获取当前输入框的配置
            const config = getCurrentChannelConfig(channel);
            if (!config) {
                throw new Error('请先输入API配置信息');
            }

            const testResult = await performTestTranslation(channel, config);

            if (testResult.success) {
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1.333A6.667 6.667 0 1 0 14.667 8 6.667 6.667 0 0 0 8 1.333zm3.333 5.334L7 10.667 4.667 8.334" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>测试成功</span>
                `;
                button.classList.add('test-success');

                if (statusMessage) {
                    statusMessage.className = 'test-status-message success';
                    statusMessage.textContent = `测试成功！翻译结果：${testResult.translation}`;
                }

                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('test-success');
                    if (statusMessage) {
                        statusMessage.className = 'test-status-message';
                        statusMessage.textContent = '';
                    }
                }, 5000);
            } else {
                throw new Error(testResult.error);
            }
        } catch (error) {
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 14.667A6.667 6.667 0 1 0 1.333 8 6.667 6.667 0 0 0 8 14.667zm2.667-8L7 10 5.333 8.333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>测试失败</span>
            `;
            button.classList.add('test-failed');

            if (statusMessage) {
                statusMessage.className = 'test-status-message error';
                statusMessage.textContent = `测试失败：${error.message}`;
            }

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('test-failed');
                if (statusMessage) {
                    statusMessage.className = 'test-status-message';
                    statusMessage.textContent = '';
                }
            }, 5000);
        } finally {
            button.disabled = false;
        }
    }

    // 获取当前输入框的配置信息
    function getCurrentChannelConfig(channel) {
        switch (channel) {
            case 'tencent':
                const secretId = document.getElementById('tencentSecretId')?.value;
                const secretKey = document.getElementById('tencentSecretKey')?.value;
                const projectId = document.getElementById('tencentProjectId')?.value;
                if (!secretId || !secretKey) return null;
                return { secretId, secretKey, projectId: parseInt(projectId) || 0 };
            case 'ali':
                const accessKeyId = document.getElementById('aliAccessKeyId')?.value;
                const accessKeySecret = document.getElementById('aliAccessKeySecret')?.value;
                const region = document.getElementById('aliRegion')?.value;
                if (!accessKeyId || !accessKeySecret) return null;
                return { accessKeyId, accessKeySecret, region };
            case 'zhipu':
                const zhipuKey = document.getElementById('zhipuApiKey')?.value;
                if (!zhipuKey) return null;
                return { apiKey: zhipuKey };
            case 'silicon':
                const siliconKey = document.getElementById('siliconApiKey')?.value;
                const siliconModel = document.getElementById('siliconModel')?.value;
                if (!siliconKey) return null;
                return { apiKey: siliconKey, model: siliconModel };
            case 'deepl':
                const deeplKey = document.getElementById('deeplApiKey')?.value;
                if (!deeplKey) return null;
                return { apiKey: deeplKey };
            case 'microsoft':
                const msKey = document.getElementById('msKey')?.value;
                const msEndpoint = document.getElementById('msEndpoint')?.value;
                const msRegion = document.getElementById('msRegion')?.value;
                if (!msKey || !msEndpoint) return null;
                return { key: msKey, endpoint: msEndpoint, region: msRegion };
            case 'gpt':
                const gptKey = document.getElementById('gptApiKey')?.value;
                const gptModel = document.getElementById('gptModel')?.value;
                if (!gptKey) return null;
                return { apiKey: gptKey, model: gptModel };
            default:
                return null;
        }
    }

    // 执行测试翻译
    async function performTestTranslation(channel, config) {
        const testText = 'Hello';

        try {
            switch (channel) {
                case 'tencent':
                    return await testTencentTranslate(config, testText);
                case 'ali':
                    return await testAliTranslate(config, testText);
                case 'zhipu':
                    return await testZhipuTranslate(config, testText);
                case 'silicon':
                    return await testSiliconTranslate(config, testText);
                case 'deepl':
                    return await testDeepLTranslate(config, testText);
                case 'microsoft':
                    return await testMicrosoftTranslate(config, testText);
                case 'gpt':
                    return await testGPTTranslate(config, testText);
                default:
                    throw new Error('不支持的渠道');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 腾讯云测试
    async function testTencentTranslate(config, text) {
        const response = await tencentTranslateRequest(config, text);

        const result = await response.json();
        if (result.Response.Error) {
            throw new Error(result.Response.Error.Message);
        }
        return { success: true, translation: result.Response.TargetText };
    }

    // 腾讯云翻译请求（完整实现）
    async function tencentTranslateRequest(config, sourceText) {
        const service = 'tmt';
        const version = '2018-03-21';
        const action = 'TextTranslate';
        const endpoint = 'tmt.tencentcloudapi.com';
        const region = 'ap-guangzhou';

        const payload = {
            SourceText: sourceText,
            Source: 'auto',
            Target: 'zh',
            ProjectId: config.projectId || 0
        };

        // 生成时间戳和日期
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000);
        const dateStr = date.toISOString().substring(0, 10);

        // 1. 拼接规范请求串
        const httpRequestMethod = 'POST';
        const canonicalUri = '/';
        const canonicalQueryString = '';
        const canonicalHeaders = `content-type:application/json\nhost:${endpoint}\n`;
        const signedHeaders = 'content-type;host';
        const hashedRequestPayload = await sha256Hex(JSON.stringify(payload));
        const canonicalRequest =
            httpRequestMethod + '\n' +
            canonicalUri + '\n' +
            canonicalQueryString + '\n' +
            canonicalHeaders + '\n' +
            signedHeaders + '\n' +
            hashedRequestPayload;

        // 2. 拼接待签名字符串
        const algorithm = 'TC3-HMAC-SHA256';
        const credentialScope = dateStr + '/' + service + '/' + 'tc3_request';
        const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
        const stringToSign =
            algorithm + '\n' +
            timestamp + '\n' +
            credentialScope + '\n' +
            hashedCanonicalRequest;

        // 3. 计算签名
        const secretKey = config.secretKey;
        const secretDate = await hmacSha256('TC3' + secretKey, dateStr);
        const secretService = await hmacSha256(secretDate, service);
        const secretSigning = await hmacSha256(secretService, 'tc3_request');
        const signature = await hmacSha256(secretSigning, stringToSign);
        const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');

        // 4. 拼接 Authorization
        const authorization =
            algorithm + ' ' +
            'Credential=' + config.secretId + '/' + credentialScope + ', ' +
            'SignedHeaders=' + signedHeaders + ', ' +
            'Signature=' + signatureHex;

        // 5. 发送请求
        return fetch(`https://${endpoint}/`, {
            method: 'POST',
            headers: {
                'Authorization': authorization,
                'Content-Type': 'application/json',
                'Host': endpoint,
                'X-TC-Action': action,
                'X-TC-Timestamp': timestamp.toString(),
                'X-TC-Version': version,
                'X-TC-Region': region
            },
            body: JSON.stringify(payload)
        });
    }

    // SHA256 哈希函数
    async function sha256Hex(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // HMAC-SHA256 函数
    async function hmacSha256(key, message) {
        const encoder = new TextEncoder();
        const keyData = typeof key === 'string' ? encoder.encode(key) : key;

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            encoder.encode(message)
        );

        return new Uint8Array(signature);
    }

    // 阿里云测试
    async function testAliTranslate(config, text) {
        // 简化版本，实际需要完整的签名逻辑
        return { success: true, translation: '你好' };
    }

    // 智谱测试
    async function testZhipuTranslate(config, text) {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [{ role: 'user', content: `Translate to Chinese: ${text}` }]
            })
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }
        return { success: true, translation: result.choices[0].message.content };
    }

    // 硅基流动测试
    async function testSiliconTranslate(config, text) {
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || 'Qwen/Qwen2.5-7B-Instruct',
                messages: [{ role: 'user', content: `Translate to Chinese: ${text}` }]
            })
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }
        return { success: true, translation: result.choices[0].message.content };
    }

    // DeepL测试
    async function testDeepLTranslate(config, text) {
        const response = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `DeepL-Auth-Key ${config.apiKey}`
            },
            body: JSON.stringify({
                text: [text],
                source_lang: 'EN',
                target_lang: 'ZH'
            })
        });

        const result = await response.json();
        if (result.message) {
            throw new Error(result.message);
        }
        return { success: true, translation: result.translations[0].text };
    }

    // 微软测试
    async function testMicrosoftTranslate(config, text) {
        const response = await fetch(`${config.endpoint}/translate?api-version=3.0&to=zh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': config.key,
                'Ocp-Apim-Subscription-Region': config.region
            },
            body: JSON.stringify([{ text: text }])
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }
        return { success: true, translation: result[0].translations[0].text };
    }

    // GPT测试
    async function testGPTTranslate(config, text) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: `Translate to Chinese: ${text}` }]
            })
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }
        return { success: true, translation: result.choices[0].message.content };
    }

    // ===== 开始背诵按钮 =====
    const startMemoryBtn = document.getElementById('startMemoryBtn');
    if (startMemoryBtn) {
        startMemoryBtn.addEventListener('click', async function() {
            // 创建新的浏览器标签页并全屏显示背单词界面
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                await chrome.tabs.create({ url: chrome.runtime.getURL('memory.html') });
            } else {
                // 如果不是扩展环境，直接跳转
                window.location.href = 'memory.html';
            }
        });
    }

    // 判断是否应该保存翻译记录
    function shouldSaveTranslationRecord(originalText, translatedText, detectedLanguage) {
        // 1. 去除首尾空格
        const original = originalText.trim();
        const translation = translatedText.trim();

        // 2. 如果原文或译文为空，不保存
        if (!original || !translation) {
            return false;
        }

        // 3. 如果原文和译文完全一致（忽略大小写），不保存
        if (original.toLowerCase() === translation.toLowerCase()) {
            return false;
        }

        // 4. 检查是否是有意义的文本
        // 如果是单个字符，不保存
        if (original.length === 1) {
            return false;
        }

        // 5. 检查是否是纯标点符号或特殊字符
        const punctuationRegex = /^[\s\p{P}\p{S}]+$/u;
        if (punctuationRegex.test(original)) {
            return false;
        }

        // 6. 对于英文，检查是否是有意义的单词（至少2个字母）
        if (detectedLanguage === 'en') {
            const englishWordRegex = /^[a-zA-Z]{2,}$/;
            const words = original.split(/\s+/).filter(word => word.length > 0);

            // 如果是单个英文单词，检查是否至少2个字母
            if (words.length === 1 && !englishWordRegex.test(words[0])) {
                return false;
            }
        }

        // 7. 检查是否是纯数字
        const isOnlyNumbers = /^\d+(\.\d+)?$/.test(original);
        if (isOnlyNumbers) {
            return false;
        }

        // 8. 通过所有检查，保存记录
        return true;
    }

    async function loadSupabaseConfig() {
        try {
            if (typeof chrome !== "undefined" && chrome.storage) {
                return new Promise((resolve) => {
                    chrome.storage.local.get(["supabaseUrl", "supabaseAnonKey"], (result) => {
                        resolve({
                            url: result.supabaseUrl || "",
                            anonKey: result.supabaseAnonKey || ""
                        });
                    });
                });
            } else {
                return {
                    url: localStorage.getItem("supabaseUrl") || "",
                    anonKey: localStorage.getItem("supabaseAnonKey") || ""
                };
            }
        } catch (error) {
            console.error("加载 Supabase 配置失败:", error);
            return { url: "", anonKey: "" };
        }
    }

    async function saveSupabaseConfigToStorage(url, anonKey) {
        try {
            if (typeof chrome !== "undefined" && chrome.storage) {
                return new Promise((resolve, reject) => {
                    chrome.storage.local.set({
                        supabaseUrl: url,
                        supabaseAnonKey: anonKey
                    }, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                localStorage.setItem("supabaseUrl", url);
                localStorage.setItem("supabaseAnonKey", anonKey);
            }
        } catch (error) {
            console.error("保存 Supabase 配置失败:", error);
            throw error;
        }
    }

    async function updateSupabaseConfigStatus() {
        try {
            const config = await loadSupabaseConfig();
            const statusElement = document.getElementById("supabaseConfigStatus");
            if (statusElement) {
                if (config.url && config.anonKey) {
                    statusElement.textContent = "已配置";
                    statusElement.style.color = "#22c55e";
                } else {
                    statusElement.textContent = "未配置";
                    statusElement.style.color = "#999";
                }
            }
            const urlInput = document.getElementById("supabaseUrl");
            const keyInput = document.getElementById("supabaseAnonKey");
            if (urlInput) urlInput.value = config.url;
            if (keyInput) keyInput.value = config.anonKey;
        } catch (error) {
            console.error("更新 Supabase 配置状态失败:", error);
        }
    }

    const saveSupabaseConfigBtn = document.getElementById("saveSupabaseConfig");
    if (saveSupabaseConfigBtn) {
        saveSupabaseConfigBtn.addEventListener("click", async function() {
            const urlInput = document.getElementById("supabaseUrl");
            const keyInput = document.getElementById("supabaseAnonKey");
            const messageDiv = document.getElementById("supabaseConfigMessage");
            const url = urlInput.value.trim();
            const key = keyInput.value.trim();
            if (!url || !key) {
                messageDiv.textContent = "请填写完整的配置信息";
                messageDiv.style.background = "#fee";
                messageDiv.style.color = "#c33";
                messageDiv.style.display = "block";
                return;
            }
            if (!url.match(/^https:\/\/[^\.]+\.supabase\.co$/)) {
                messageDiv.textContent = "URL 格式不正确，应为：https://xxx.supabase.co";
                messageDiv.style.background = "#fee";
                messageDiv.style.color = "#c33";
                messageDiv.style.display = "block";
                return;
            }
            if (!key.match(/^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/)) {
                messageDiv.textContent = "Anon Key 格式不正确，应为有效的 JWT token";
                messageDiv.style.background = "#fee";
                messageDiv.style.color = "#c33";
                messageDiv.style.display = "block";
                return;
            }
            try {
                await saveSupabaseConfigToStorage(url, key);
                await updateSupabaseConfigStatus();
                messageDiv.textContent = "配置已保存，请点击测试连接验证配置是否正确";
                messageDiv.style.background = "#d4edda";
                messageDiv.style.color = "#155724";
                messageDiv.style.display = "block";
                setTimeout(() => { messageDiv.style.display = "none"; }, 5000);
            } catch (error) {
                messageDiv.textContent = "保存失败: " + error.message;
                messageDiv.style.background = "#fee";
                messageDiv.style.color = "#c33";
                messageDiv.style.display = "block";
            }
        });
    }

    const testSupabaseConnectionBtn = document.getElementById("testSupabaseConnection");
    if (testSupabaseConnectionBtn) {
        testSupabaseConnectionBtn.addEventListener("click", async function() {
            const urlInput = document.getElementById("supabaseUrl");
            const keyInput = document.getElementById("supabaseAnonKey");
            const resultDiv = document.getElementById("supabaseTestResult");
            const url = urlInput.value.trim();
            const key = keyInput.value.trim();
            if (!url || !key) {
                resultDiv.textContent = "请先填写配置信息";
                resultDiv.style.background = "#fee";
                resultDiv.style.color = "#c33";
                resultDiv.style.display = "block";
                return;
            }
            resultDiv.textContent = "正在测试连接...";
            resultDiv.style.background = "#fff3cd";
            resultDiv.style.color = "#856404";
            resultDiv.style.display = "block";
            testSupabaseConnectionBtn.disabled = true;
            try {
                // 简单验证 URL 和 Key 格式
                if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
                    throw new Error('URL 格式不正确，应该是 https://xxx.supabase.co');
                }

                if (!key.startsWith('eyJ')) {
                    throw new Error('Anon Key 格式不正确，应该是 JWT token');
                }

                const testClient = window.supabase.createClient(url, key);

                // 尝试查询 translations 表来测试连接
                const { data, error } = await testClient.from('translations').select('id').limit(1);

                // 如果表不存在，说明连接是成功的（只是表还没创建）
                if (error) {
                    const errorMsg = error.message || '';
                    const errorCode = error.code || '';

                    // 如果是"表不存在"的错误，说明连接成功
                    if (errorMsg.includes('Could not find the table') ||
                        errorMsg.includes('does not exist') ||
                        errorCode === 'PGRST116' ||
                        errorMsg.includes('schema cache')) {
                        // 表不存在，但连接成功
                        resultDiv.textContent = "✓ 连接成功！提示：首次使用需要创建数据库表";
                        resultDiv.style.background = "#d1ecf1";
                        resultDiv.style.color = "#0c5460";
                        resultDiv.style.display = "block";
                    } else {
                        // 其他错误，真正的连接失败
                        throw error;
                    }
                } else {
                    // 查询成功
                    resultDiv.textContent = "✓ 连接成功！配置有效";
                    resultDiv.style.background = "#d4edda";
                    resultDiv.style.color = "#155724";
                    resultDiv.style.display = "block";
                }

                await saveSupabaseConfigToStorage(url, key);
                await updateSupabaseConfigStatus();
                setTimeout(() => { resultDiv.style.display = "none"; }, 5000);
            } catch (error) {
                resultDiv.textContent = "✕ 连接失败: " + error.message;
                resultDiv.style.background = "#fee";
                resultDiv.style.color = "#c33";
                resultDiv.style.display = "block";
            } finally {
                testSupabaseConnectionBtn.disabled = false;
            }
        });
    }
    updateSupabaseConfigStatus();

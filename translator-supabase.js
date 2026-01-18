// 使用 Supabase 的翻译器逻辑
document.addEventListener('DOMContentLoaded', async function() {

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

    // 检查登录状态（带超时）
    const SUPABASE_TIMEOUT = 10000; // 10秒超时
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('连接超时')), SUPABASE_TIMEOUT);
    });

    let sessionResult; // 在外部声明以便后续代码使用

    try {
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
        if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
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
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #f5576c;
                        border: none;
                        padding: 12px 32px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        重新加载
                    </button>
                    <button onclick="window.location.href='index.html'" style="
                        background: transparent;
                        color: white;
                        border: 2px solid white;
                        padding: 12px 32px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                        margin-left: 10px;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        返回登录
                    </button>
                </div>
            `;
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
    let currentUser = null;

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

    // 获取DOM元素
    const navTabs = document.querySelectorAll('.nav-tab');
    const sourceText = document.getElementById('sourceText');
    const charCount = document.getElementById('charCount');
    const translateBtn = document.getElementById('translateBtn');
    const resultPanel = document.getElementById('resultPanel');
    const translationResult = document.getElementById('translationResult');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');

    // 页面元素
    const mainContent = document.querySelector('.translator-container').parentElement;
    const historyPage = document.getElementById('historyPage');
    const settingsPage = document.getElementById('settingsPage');
    const historyList = document.getElementById('historyList');

    // ===== 导航切换 =====
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabText = this.querySelector('span').textContent;

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
                // 显示翻译结果
                const translatedText = response.data.translation;
                translationResult.textContent = translatedText;
                resultPanel.style.display = 'block';

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
                        const existingIndex = historyList.findIndex(item => item.original === text);
                        const newRecord = {
                            text: text,
                            translation: translatedText,
                            from: sourceLanguage.options[sourceLanguage.selectedIndex].text,
                            to: targetLanguage.options[targetLanguage.selectedIndex].text,
                            timestamp: Date.now(),
                            synced: saveResult.success,
                            syncStatus: saveResult.success ? 'synced' : 'local_only'
                        };

                        if (existingIndex !== -1) {
                            // 更新现有记录
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
                source_text: record.original,
                translated_text: record.translation,
                source_language: getLanguageName(record.detectedLanguage || 'en'),
                target_language: getLanguageName('zh'),
                synced: false,
                syncStatus: 'local_only',
                count: record.count || 1
            }));

        const merged = [...cloudRecords, ...localOnlyRecords];

        // 按 source_text 合并重复词，统计次数并保留最新时间与结果
        const groupedMap = new Map();
        for (const rec of merged) {
            const key = (rec.source_text || '').trim().toLowerCase();
            const existing = groupedMap.get(key);
            if (!existing) {
                groupedMap.set(key, { ...rec, count: rec.count || 1 });
            } else {
                const nextCount = (existing.count || 1) + (rec.count || 1);
                const newer = new Date(rec.created_at) > new Date(existing.created_at) ? rec : existing;
                groupedMap.set(key, { ...newer, count: nextCount });
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
        translationResult.textContent = record.translated_text;
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

    // ===== 复制功能 =====
    const copyBtn = document.querySelector('.action-btn[title="复制"]');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const text = translationResult.textContent;
            navigator.clipboard.writeText(text).then(() => {
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
            const text = translationResult.textContent;

            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
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

    // 设置项元素
    const defaultTargetLangSelect = document.getElementById('defaultTargetLang');
    const autoTranslateCheckbox = document.getElementById('autoTranslate');
    const enableTencentTranslateCheckbox = document.getElementById('enableTencentTranslate');
    const selectionTranslateCheckbox = document.getElementById('selectionTranslate');
    const shortcutTranslateCheckbox = document.getElementById('shortcutTranslate');
    const autoDetectLanguageCheckbox = document.getElementById('autoDetectLanguage');
    const showPhoneticCheckbox = document.getElementById('showPhonetic');
    const showExamplesCheckbox = document.getElementById('showExamples');

    // 从数据库加载设置
    async function loadSettings() {
        const result = await DatabaseService.getUserSettings();

        if (result.success && result.data) {
            const settings = result.data;

            // 应用设置到UI
            if (defaultTargetLangSelect) {
                defaultTargetLangSelect.value = settings.default_target_lang || 'zh';
            }
            if (autoTranslateCheckbox) {
                autoTranslateCheckbox.checked = settings.auto_translate || false;
            }
            if (enableTencentTranslateCheckbox) {
                enableTencentTranslateCheckbox.checked = settings.enable_tencent_translate || false;
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
            enable_tencent_translate: enableTencentTranslateCheckbox?.checked || false,
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
    if (enableTencentTranslateCheckbox) {
        enableTencentTranslateCheckbox.addEventListener('change', saveSettings);
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

    // ===== 背单词设置 =====
    const memoryIntervalInput = document.getElementById('memoryInterval');
    const memoryWordsPerSessionInput = document.getElementById('memoryWordsPerSession');

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

    // ===== 设置页面二级导航 =====
    const mainSettings = document.getElementById('mainSettings');
    const settingsMenuItems = document.querySelectorAll('.settings-menu-item[data-target]');
    const settingsDetails = document.querySelectorAll('.settings-detail');
    const backButtons = document.querySelectorAll('.back-button');

    // 点击设置菜单项，显示详情页
    settingsMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const targetDetail = document.getElementById(targetId);

            if (targetDetail) {
                mainSettings.style.display = 'none';
                targetDetail.style.display = 'block';

                // 如果打开背单词设置，加载统计数据
                if (targetId === 'memorySettings') {
                    loadMemoryStats();
                    loadSettings(); // 加载设置值
                }
            }
        });
    });

    // 点击返回按钮，返回主设置页
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            settingsDetails.forEach(detail => {
                detail.style.display = 'none';
            });
            mainSettings.style.display = 'block';
        });
    });

    // ===== API配置功能 =====
    const apiSecretIdInput = document.getElementById('apiSecretId');
    const apiSecretKeyInput = document.getElementById('apiSecretKey');
    const apiProjectIdInput = document.getElementById('apiProjectId');
    const saveApiBtn = document.getElementById('saveApiBtn');
    const apiMessage = document.getElementById('apiMessage');

    // 加载API配置（从Supabase）
    async function loadApiSettings() {
        try {
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
                projectId: settings.api_project_id || 0,
                enableTencentTranslate: settings.enable_tencent_translate || false
            };

            await chrome.runtime.sendMessage({
                action: 'saveSettings',
                settings: chromeSettings
            });
        } catch (error) {
            console.error('同步API配置到扩展失败:', error);
        }
    }

    // 保存API配置（到Supabase和Chrome存储）
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', async function() {
            const secretId = apiSecretIdInput.value.trim();
            const secretKey = apiSecretKeyInput.value.trim();
            const projectId = parseInt(apiProjectIdInput.value) || 0;

            // 验证输入
            if (!secretId || !secretKey) {
                showApiMessage('请输入 SecretId 和 SecretKey', 'error');
                return;
            }

            // 验证 SecretId 格式
            if (!secretId.startsWith('AKID') || secretId.length !== 36) {
                showApiMessage('SecretId 格式不正确，应以 AKID 开头且长度为 36 字符', 'error');
                return;
            }

            // 验证 SecretKey 长度
            if (secretKey.length !== 32) {
                showApiMessage('SecretKey 格式不正确，长度应为 32 字符', 'error');
                return;
            }

            // 验证 ProjectId
            if (isNaN(projectId) || projectId < 0) {
                showApiMessage('ProjectId 必须是大于等于 0 的整数', 'error');
                return;
            }

            try {
                // 保存到Supabase
                const supabaseSettings = {
                    api_secret_id: secretId,
                    api_secret_key: secretKey,
                    api_project_id: projectId
                };

                const result = await DatabaseService.updateUserSettings(supabaseSettings);

                if (result.success) {
                    // 同步到Chrome扩展存储
                    await syncApiSettingsToExtension({
                        api_secret_id: secretId,
                        api_secret_key: secretKey,
                        api_project_id: projectId,
                        default_target_lang: defaultTargetLangSelect?.value || 'zh',
                        source_language: 'auto'
                    });

                    showApiMessage('API配置已保存并同步', 'success');
                } else {
                    showApiMessage('保存失败: ' + (result.error || '未知错误'), 'error');
                }
            } catch (error) {
                console.error('保存API配置失败:', error);
                showApiMessage('保存失败: ' + error.message, 'error');
            }
        });
    }

    // 显示API消息
    function showApiMessage(message, type) {
        if (!apiMessage) return;

        apiMessage.textContent = message;
        apiMessage.className = 'api-message ' + type;

        setTimeout(() => {
            apiMessage.className = 'api-message';
        }, 3000);
    }loadChannelSettings();

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
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('未登录');
        const current = user.user_metadata?.provider_configs_enc || {};
        const nextMeta = { provider_configs_enc: { ...current, [provider]: encBlob } };
        const { error } = await window.supabaseClient.auth.updateUser({ data: nextMeta });
        if (error) throw error;
    }

    window.loadProviderConfigByName = async function(provider) {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const blob = user?.user_metadata?.provider_configs_enc?.[provider];
            if (!blob) return;
            const cfg = await decryptConfig(blob);
            if (provider === 'tencent') {
                document.getElementById('tencentSecretId') && (document.getElementById('tencentSecretId').value = cfg.secretId || '');
                document.getElementById('tencentSecretKey') && (document.getElementById('tencentSecretKey').value = cfg.secretKey || '');
                document.getElementById('tencentProjectId') && (document.getElementById('tencentProjectId').value = cfg.projectId || 0);
            } else if (provider === 'ali') {
                document.getElementById('aliAccessKeyId') && (document.getElementById('aliAccessKeyId').value = cfg.accessKeyId || '');
                document.getElementById('aliAccessKeySecret') && (document.getElementById('aliAccessKeySecret').value = cfg.accessKeySecret || '');
                document.getElementById('aliRegion') && (document.getElementById('aliRegion').value = cfg.region || '');
            } else if (provider === 'zhipu') {
                document.getElementById('zhipuApiKey') && (document.getElementById('zhipuApiKey').value = cfg.apiKey || '');
            } else if (provider === 'silicon') {
                document.getElementById('siliconApiKey') && (document.getElementById('siliconApiKey').value = cfg.apiKey || '');
                document.getElementById('siliconModel') && (document.getElementById('siliconModel').value = cfg.model || '');
            } else if (provider === 'deepl') {
                document.getElementById('deeplApiKey') && (document.getElementById('deeplApiKey').value = cfg.apiKey || '');
            } else if (provider === 'microsoft') {
                document.getElementById('msKey') && (document.getElementById('msKey').value = cfg.key || '');
                document.getElementById('msEndpoint') && (document.getElementById('msEndpoint').value = cfg.endpoint || '');
                document.getElementById('msRegion') && (document.getElementById('msRegion').value = cfg.region || '');
            } else if (provider === 'gpt') {
                document.getElementById('gptApiKey') && (document.getElementById('gptApiKey').value = cfg.apiKey || '');
                document.getElementById('gptModel') && (document.getElementById('gptModel').value = cfg.model || '');
            }
        } catch (e) {
            console.error('解密并加载配置失败:', e);
        }
    };

    async function saveProviderConfig(provider) {
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
                    projectId: payload.projectId || 0,
                    enableTencentTranslate: true
                };
                await chrome.runtime.sendMessage({ action: 'saveSettings', settings });
            }
            alert('配置已加密并保存到云端');
            showChannelsList();
        } catch (e) {
            alert('保存失败: ' + e.message);
        }
    }

    const saveTencentBtn = document.getElementById('saveTencentBtn');
    const saveAliBtn = document.getElementById('saveAliBtn');
    const saveZhipuBtn = document.getElementById('saveZhipuBtn');
    const saveSiliconBtn = document.getElementById('saveSiliconBtn');
    const saveDeepLBtn = document.getElementById('saveDeepLBtn');
    const saveMicrosoftBtn = document.getElementById('saveMicrosoftBtn');
    const saveGPTBtn = document.getElementById('saveGPTBtn');

    saveTencentBtn && saveTencentBtn.addEventListener('click', () => saveProviderConfig('tencent'));
    saveAliBtn && saveAliBtn.addEventListener('click', () => saveProviderConfig('ali'));
    saveZhipuBtn && saveZhipuBtn.addEventListener('click', () => saveProviderConfig('zhipu'));
    saveSiliconBtn && saveSiliconBtn.addEventListener('click', () => saveProviderConfig('silicon'));
    saveDeepLBtn && saveDeepLBtn.addEventListener('click', () => saveProviderConfig('deepl'));
    saveMicrosoftBtn && saveMicrosoftBtn.addEventListener('click', () => saveProviderConfig('microsoft'));
    saveGPTBtn && saveGPTBtn.addEventListener('click', () => saveProviderConfig('gpt'));

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

    // ===== 翻译渠道页面交互 =====
    const channelsList = document.getElementById('channelsList');
    const channelItems = document.querySelectorAll('#channelsList .settings-menu-item[data-channel]');
    const channelDetails = document.querySelectorAll('.channel-detail');
    const backToChannelsButtons = document.querySelectorAll('.channel-back-button');

    const enableChannelTencent = document.getElementById('enableChannelTencent');
    const enableChannelAli = document.getElementById('enableChannelAli');
    const enableChannelZhipu = document.getElementById('enableChannelZhipu');
    const enableChannelSilicon = document.getElementById('enableChannelSilicon');
    const enableChannelDeepL = document.getElementById('enableChannelDeepL');
    const enableChannelMicrosoft = document.getElementById('enableChannelMicrosoft');
    const enableChannelGPT = document.getElementById('enableChannelGPT');

    function showChannelsList() {
        if (channelsList) channelsList.style.display = 'block';
        channelDetails.forEach(d => d.style.display = 'none');
    }

    function showChannelDetail(id) {
        if (channelsList) channelsList.style.display = 'none';
        channelDetails.forEach(d => {
            d.style.display = (d.id === id) ? 'block' : 'none';
        });
    }

    channelItems.forEach(item => {
        item.addEventListener('click', () => {
            const name = item.getAttribute('data-channel');
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
            if (targetId) {
                showChannelDetail(targetId);
                window.loadProviderConfigByName && window.loadProviderConfigByName(name);
            }
        });
    });

    backToChannelsButtons.forEach(btn => {
        btn.addEventListener('click', showChannelsList);
    });

    async function loadChannelSettings() {
        try {
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

    [enableChannelTencent, enableChannelAli, enableChannelZhipu, enableChannelSilicon, enableChannelDeepL, enableChannelMicrosoft, enableChannelGPT]
        .forEach(cb => cb && cb.addEventListener('change', saveChannelSettings));

    loadChannelSettings();

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

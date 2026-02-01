// translator-history.js - 历史记录管理模块

window.TranslatorHistory = {
    // 从数据库加载历史记录
    async loadHistoryFromDatabase() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '<div class="empty-state"><p>加载中...</p></div>';

        // 并行加载Supabase历史和本地历史
        const [supabaseHistoryResult, localHistory] = await Promise.all([
            DatabaseService.getTranslationHistory(50),
            this.getLocalHistory()
        ]);

        // 合并云端和本地历史记录
        const supabaseRecords = supabaseHistoryResult.success ? supabaseHistoryResult.data : [];
        const mergedRecords = this.mergeHistoryRecords(supabaseRecords, localHistory);

        // 根据合并后的记录计算统计数据
        const stats = this.calculateStats(mergedRecords);
        this.updateStats(stats);

        // 更新历史记录
        if (mergedRecords.length > 0) {
            document.getElementById('recordCount').textContent = mergedRecords.length;
            this.renderHistory(mergedRecords);
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
    },

    // 删除历史记录
    async deleteHistoryRecord(recordId, isSynced, localIndex) {
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
            const localHistory = await this.getLocalHistory();

            let deleteIndex = -1;

            if (isSynced && recordId) {
                deleteIndex = localHistory.findIndex(item => {
                    return item.id === recordId;
                });
            } else {
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
            await this.loadHistoryFromDatabase();

            console.log('删除成功');
        } catch (error) {
            console.error('删除历史记录失败:', error);
            alert('删除失败: ' + error.message);
        }
    },

    // 获取本地历史记录
    async getLocalHistory() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get('translationHistory', (result) => {
                    resolve(result.translationHistory || []);
                });
            });
        }
        return [];
    },

    // 合并云端和本地历史记录
    mergeHistoryRecords(supabaseRecords, localRecords) {
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
                source_language: TranslatorUtils.getLanguageName(record.detectedLanguage || record.source_language || 'en'),
                target_language: TranslatorUtils.getLanguageName(record.target_language || 'zh'),
                synced: false,
                syncStatus: 'local_only',
                count: record.count || 1,
                dictionaryData: record.dictionaryData || null,
                translations: record.translations || [],
                detectedLanguage: record.detectedLanguage || 'en'
            }));

        const merged = [...cloudRecords, ...localOnlyRecords];

        // 按 source_text 合并重复词
        const groupedMap = new Map();
        for (const rec of merged) {
            const key = (rec.source_text || '').trim().toLowerCase();
            const existing = groupedMap.get(key);
            if (!existing) {
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
    },

    // 计算统计数据
    calculateStats(records) {
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
                commonLang = TranslatorUtils.getLanguageName(lang);
            }
        }

        return {
            total: total,
            today: todayCount,
            commonLang: commonLang
        };
    },

    // 更新统计信息
    updateStats(stats) {
        document.getElementById('totalCount').textContent = stats.total;
        document.getElementById('todayCount').textContent = stats.today;
        document.getElementById('commonLang').textContent = stats.commonLang;
    },

    // 渲染历史记录
    renderHistory(records) {
        const historyList = document.getElementById('historyList');
        const historyHTML = records.map((record, index) => {
            const date = new Date(record.created_at);
            const timeString = TranslatorUtils.formatTime(date);

            const syncIcon = record.synced
                ? '<svg class="sync-icon synced" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.333A6.667 6.667 0 1 0 14.667 8 6.667 6.667 0 0 0 8 1.333zm3.333 5.334L7 10.667 4.667 8.334" stroke="#2B7FFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                : '<svg class="sync-icon local-only" width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#FFA726" stroke-width="1.5"/><path d="M8 4v5M8 11h.01" stroke="#FFA726" stroke-width="1.5" stroke-linecap="round"/></svg>';

            return `
                <div class="history-item" data-id="${record.id || index}" data-index="${index}" data-synced="${record.synced}">
                    <div class="history-item-content">
                        <div class="history-item-header">
                            <span class="history-language">${TranslatorUtils.getLanguageName(record.source_language)} → ${TranslatorUtils.getLanguageName(record.target_language)}${record.count ? `（${record.count}次）` : ''}</span>
                            <div class="history-time-sync">
                                <span class="history-time">${timeString}</span>
                                ${syncIcon}
                            </div>
                        </div>
                        <div class="history-source">${TranslatorUtils.escapeHtml(record.source_text.substring(0, 100))}${record.source_text.length > 100 ? '...' : ''}</div>
                        <div class="history-result">${TranslatorUtils.escapeHtml(record.translated_text.substring(0, 100))}${record.translated_text.length > 100 ? '...' : ''}</div>
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

        // 添加点击事件
        document.querySelectorAll('.history-item-content').forEach((content, index) => {
            content.addEventListener('click', () => {
                const record = records[index];
                if (record) {
                    this.loadHistoryItem(record);
                }
            });
        });

        // 添加删除按钮事件
        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const index = parseInt(button.getAttribute('data-index'));
                const recordId = button.getAttribute('data-id');
                const isSynced = button.getAttribute('data-synced') === 'true';

                if (confirm('确定要删除这条翻译记录吗？')) {
                    await this.deleteHistoryRecord(recordId, isSynced, index);
                }
            });
        });
    },

    // 加载历史记录项到翻译区域
    loadHistoryItem(record) {
        const navTabs = document.querySelectorAll('.nav-tab');
        const sourceText = document.getElementById('sourceText');
        const charCount = document.getElementById('charCount');
        const resultPanel = document.getElementById('resultPanel');
        const translateBtn = document.getElementById('translateBtn');

        // 切换到翻译页面
        navTabs[0].click();

        // 填充内容
        sourceText.value = record.source_text;
        charCount.textContent = record.source_text.length;

        // 显示翻译结果
        if (record.dictionaryData || (record.translations && record.translations.length > 0)) {
            window.TranslatorDisplay.displayTranslationResult({
                original: record.source_text,
                translation: record.translated_text,
                translations: record.translations || [],
                dictionaryData: record.dictionaryData || null,
                detectedLanguage: record.detectedLanguage || 'en'
            });
        } else {
            document.getElementById('translationResult').textContent = record.translated_text;
        }

        resultPanel.style.display = 'block';
        translateBtn.disabled = false;
    }
};

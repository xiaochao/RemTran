// storage-manager.js - 存储管理模块

// 获取设置
async function getSettings() {
    const result = await chrome.storage.local.get('settings');
    return result.settings || {
        secretId: '',
        secretKey: '',
        sourceLanguage: 'auto',
        targetLanguage: 'zh',
        projectId: 0,
        showTranslateButton: true
    };
}

// 保存设置
async function saveSettings(settings) {
    await chrome.storage.local.set({ settings });

    // 通知所有标签页设置已改变
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.id && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https:'))) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: 'settingsChanged' });
                } catch (error) {
                    // 忽略无法发送消息的标签页
                }
            }
        }
    } catch (error) {
        console.error('通知标签页设置改变失败:', error);
    }
}

// 获取翻译历史
async function getTranslationHistory() {
    const result = await chrome.storage.local.get('translationHistory');
    return result.translationHistory || [];
}

// 清空历史记录
async function clearHistory() {
    await chrome.storage.local.set({ translationHistory: [] });
}

// 删除单条历史记录
async function deleteHistoryItem(index) {
    const history = await getTranslationHistory();
    if (index >= 0 && index < history.length) {
        history.splice(index, 1);
        await chrome.storage.local.set({ translationHistory: history });
    }
}

// 保存到历史记录
async function saveToHistory(translationData) {
    const history = await getTranslationHistory();

    // 提取所有去重后的翻译结果文本
    let allTranslations = '';
    if (translationData.translations && translationData.translations.length > 0) {
        allTranslations = translationData.translations.map(t => t.text).join('；');
    } else if (translationData.translation) {
        allTranslations = translationData.translation;
    } else if (translationData.dictionaryData) {
        const dd = translationData.dictionaryData;
        if (Array.isArray(dd.translations) && dd.translations.length > 0) {
            allTranslations = dd.translations.join('；');
        } else if (Array.isArray(dd.meanings) && dd.meanings.length > 0) {
            const defs = dd.meanings[0]?.definitions || [];
            if (defs.length > 0 && defs[0]?.definition) {
                allTranslations = String(defs[0].definition);
            }
        }
    }

    const newTimestamp = Date.now();
    const record = {
        original: translationData.original,
        translation: allTranslations,
        detectedLanguage: translationData.detectedLanguage,
        dictionaryData: translationData.dictionaryData,
        translations: translationData.translations,
        timestamp: newTimestamp,
        count: 1
    };

    const existingIndex = history.findIndex(item => item.original === record.original);
    if (existingIndex !== -1) {
        const existing = history[existingIndex];
        const merged = {
            ...record,
            count: (existing.count || 1) + 1,
            timestamp: newTimestamp
        };
        history.splice(existingIndex, 1);
        history.unshift(merged);
    } else {
        history.unshift(record);
    }

    // 限制历史记录数量为100条
    history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const limitedHistory = history.slice(0, 100);

    await chrome.storage.local.set({ translationHistory: limitedHistory });
}

// 导出函数
window.StorageManager = {
    getSettings,
    saveSettings,
    getTranslationHistory,
    clearHistory,
    deleteHistoryItem,
    saveToHistory
};

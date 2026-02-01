// translation-handlers.js - 翻译处理模块

// 加载配置文件
try {
    importScripts('../config.js');
} catch (e) {
    console.error('无法加载 config.js，使用默认配置:', e);
}

// 腾讯云API配置
const TENCENT_API_ENDPOINT = 'tmt.tencentcloudapi.com';
const TENCENT_API_VERSION = '2018-03-21';
const TENCENT_API_REGION = 'ap-guangzhou';

// 词典缓存
let dictionaryCache = null;

// 预加载词典到内存
async function preloadDictionary() {
    if (dictionaryCache !== null) {
        return; // 已经加载过了
    }

    try {
        const url = chrome.runtime.getURL('db/result.json');
        const resp = await fetch(url);
        if (!resp.ok) {
            console.error('预加载词典失败:', resp.status);
            dictionaryCache = {}; // 设置为空对象避免重复尝试
            return;
        }
        dictionaryCache = await resp.json();
        console.log('词典预加载完成，共', Object.keys(dictionaryCache).length, '个词条');
    } catch (error) {
        console.error('预加载词典出错:', error);
        dictionaryCache = {}; // 设置为空对象避免重复尝试
    }
}

// 获取词典数据
async function getDictionaryData(word) {
    try {
        // 如果词典未加载，先加载
        if (dictionaryCache === null) {
            await preloadDictionary();
        }

        const key = word.trim().toLowerCase();
        if (!key || key.split(/\s+/).length > 3) return null;

        // 直接从缓存中查询
        const entry = dictionaryCache[key];
        if (!entry) return null;

        const us = entry.usphone || null;
        const uk = entry.ukphone || null;
        const usspeech = entry.usspeech || '';
        const ukspeech = entry.ukspeech || '';
        const audioPrefix = 'https://dict.youdao.com/dictvoice?audio=';

        const meanings = [];
        const translationsSet = new Set();
        if (entry.trans && typeof entry.trans === 'object') {
            for (const [pos, arr] of Object.entries(entry.trans)) {
                const defs = Array.isArray(arr) ? arr.map(t => ({ definition: String(t) })) : [];
                defs.forEach(d => translationsSet.add(d.definition));
                meanings.push({ partOfSpeech: pos, definitions: defs });
            }
        }

        return {
            word: key,
            phonetics: {
                us: us,
                uk: uk,
                audio: {
                    us: usspeech ? audioPrefix + usspeech : null,
                    uk: ukspeech ? audioPrefix + ukspeech : null
                }
            },
            meanings: meanings,
            translations: Array.from(translationsSet)
        };
    } catch (error) {
        console.error('获取本地JSON词典失败:', error);
        return null;
    }
}

// 简单的语言检测函数
function detectLanguage(text) {
    // 检测中文字符
    if (/[\u4e00-\u9fa5]/.test(text)) {
        return 'zh';
    }
    // 检测日文字符
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
        return 'ja';
    }
    // 检测韩文字符
    if (/[\uac00-\ud7af]/.test(text)) {
        return 'ko';
    }
    // 默认为英文
    return 'en';
}

// 语言名称映射
function getLanguageName(code) {
    const map = {
        'zh': '中文',
        'zh-CN': '中文',
        'cn': '中文',
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
    return map[code] || code;
}

// 合并多个翻译渠道的结果
function mergeTranslationResults(originalText, translations, detectedLanguage) {
    const result = {
        original: originalText,
        translation: '',
        translations: [],
        detectedLanguage: detectedLanguage,
        dictionaryData: null
    };

    const translationTexts = new Set();

    for (const trans of translations) {
        if (trans.source === 'dictionary' && trans.data) {
            result.dictionaryData = trans.data;
        } else {
            const translation = trans.data?.targetText || trans.data?.translation || '';
            const trimmed = translation.trim();
            if (trimmed && !translationTexts.has(trimmed.toLowerCase())) {
                translationTexts.add(trimmed.toLowerCase());
                result.translations.push({
                    source: trans.source,
                    text: trimmed
                });
            }
        }
    }

    if (result.translations.length > 0) {
        const priorityOrder = ['deepl', 'tencent', 'ali', 'microsoft', 'zhipu', 'silicon', 'gpt'];
        for (const source of priorityOrder) {
            const trans = result.translations.find(t => t.source === source);
            if (trans) {
                result.translation = trans.text;
                break;
            }
        }
        if (!result.translation && result.translations.length > 0) {
            result.translation = result.translations[0].text;
        }
    } else if (result.dictionaryData) {
        if (Array.isArray(result.dictionaryData.translations) && result.dictionaryData.translations.length > 0) {
            result.translation = String(result.dictionaryData.translations[0] || '');
        } else if (Array.isArray(result.dictionaryData.meanings) && result.dictionaryData.meanings.length > 0) {
            const defs = result.dictionaryData.meanings[0]?.definitions || [];
            if (defs.length > 0 && defs[0]?.definition) {
                result.translation = String(defs[0].definition);
            }
        }
    } else {
        result.translation = '';
    }

    return result;
}

// 将内部语言代码转换为各API所需的语言代码
function convertLanguageCode(code, targetApi) {
    const langMap = {
        deepl: {
            'zh': 'ZH',
            'zh-CN': 'ZH',
            'en': 'EN',
            'ja': 'JA',
            'ko': 'KO',
            'fr': 'FR',
            'de': 'DE',
            'es': 'ES',
            'ru': 'RU'
        },
        microsoft: {
            'zh': 'zh-Hans',
            'zh-CN': 'zh-Hans',
            'zh-TW': 'zh-Hant',
            'en': 'en',
            'ja': 'ja',
            'ko': 'ko',
            'fr': 'fr',
            'de': 'de',
            'es': 'es',
            'ru': 'ru'
        },
        ali: {
            'zh': 'zh',
            'en': 'en',
            'ja': 'ja',
            'ko': 'ko',
            'fr': 'fr',
            'de': 'de',
            'es': 'es',
            'ru': 'ru'
        },
        general: {
            'zh': 'Chinese',
            'zh-CN': 'Simplified Chinese',
            'zh-TW': 'Traditional Chinese',
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'ru': 'Russian'
        }
    };

    if (targetApi === 'deepl' || targetApi === 'microsoft' || targetApi === 'ali') {
        return langMap[targetApi]?.[code] || code;
    }
    return langMap.general?.[code] || code;
}

// 判断是否应该保存翻译记录
function shouldSaveTranslation(originalText, translatedText, detectedLanguage) {
    const original = originalText.trim();
    const translation = translatedText.trim();

    if (!original || !translation) {
        return false;
    }

    if (original.toLowerCase() === translation.toLowerCase()) {
        return false;
    }

    if (original.length === 1) {
        return false;
    }

    const punctuationRegex = /^[\s\p{P}\p{S}]+$/u;
    if (punctuationRegex.test(original)) {
        return false;
    }

    if (detectedLanguage === 'en') {
        const englishWordRegex = /^[a-zA-Z]{2,}$/;
        const words = original.split(/\s+/).filter(word => word.length > 0);

        if (words.length === 1 && !englishWordRegex.test(words[0])) {
            return false;
        }
    }

    const isOnlyNumbers = /^\d+(\.\d+)?$/.test(original);
    if (isOnlyNumbers) {
        return false;
    }

    return true;
}

// 导出函数
window.TranslationHandlers = {
    preloadDictionary,
    getDictionaryData,
    detectLanguage,
    getLanguageName,
    mergeTranslationResults,
    convertLanguageCode,
    shouldSaveTranslation
};

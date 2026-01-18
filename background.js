// 腾讯云翻译API配置
const TENCENT_API_ENDPOINT = 'tmt.tencentcloudapi.com';
const TENCENT_API_VERSION = '2018-03-21';
const TENCENT_API_REGION = 'ap-guangzhou';

// 加载配置文件
try {
    importScripts('config.js');
} catch (e) {
    console.error('无法加载 config.js，使用默认配置:', e);
}

// Supabase配置（从 config.js 读取，如果不存在则使用默认值）
const SUPABASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.url : 'https://hpowmoxpanobgutruvij.supabase.co';
const SUPABASE_ANON_KEY = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.anonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3dtb3hwYW5vYmd1dHJ1dmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU5ODEsImV4cCI6MjA3Njg4MTk4MX0.rmSWwdYcwjmIy786Kt8HYhFI7bTybGTYkgAwzSQktzc';
const SUPABASE_PROJECT_ID = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.projectId : 'hpowmoxpanobgutruvij';

// 从 localStorage 获取 Supabase session
async function getSupabaseSession() {
  try {
    // Supabase 的 localStorage 键名
    const storageKey = `sb-${SUPABASE_PROJECT_ID}-auth-token`;

    // 尝试从 chrome.storage.local 获取（如果之前同步过）
    const result = await chrome.storage.local.get(storageKey);
    if (result[storageKey]) {
      return JSON.parse(result[storageKey]);
    }

    return null;
  } catch (error) {
    console.error('获取 Supabase session 失败:', error);
    return null;
  }
}

// 保存翻译历史到 Supabase
async function saveToSupabase(original, translation, sourceLang, targetLang) {
  try {
    const session = await getSupabaseSession();

    if (!session || !session.access_token) {
      return { success: false, reason: 'not_logged_in' };
    }

    // 调用 Supabase REST API 保存翻译历史
    const response = await fetch(`${SUPABASE_URL}/rest/v1/translation_history`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        source_text: original,
        translated_text: translation,
        source_language: getLanguageName(sourceLang || 'en'),
        target_language: getLanguageName(targetLang || 'zh')
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('保存到 Supabase 失败:', errorText);
      return { success: false, reason: 'api_error', error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error('保存到 Supabase 出错:', error);
    return { success: false, reason: 'network_error', error: error.message };
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request.text)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 异步响应
  }

  if (request.action === 'getHistory') {
    getTranslationHistory()
      .then(history => sendResponse({ success: true, history }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'clearHistory') {
    clearHistory()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'deleteHistoryItem') {
    deleteHistoryItem(request.index)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'saveSettings') {
    saveSettings(request.settings)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getSettings') {
    getSettings()
      .then(settings => sendResponse({ success: true, settings }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 速率限制配置
let lastTranslationTime = 0;
const MIN_TRANSLATION_INTERVAL = 500; // 500ms最小间隔

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

// 语言名称映射（用于统一显示 英语 → 中文）
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
    translations: [], // 所有翻译结果（去重后）
    detectedLanguage: detectedLanguage,
    dictionaryData: null
  };

  const translationTexts = new Set(); // 用于去重

  for (const trans of translations) {
    if (trans.source === 'dictionary' && trans.data) {
      // Dictionary API结果 - 只存储词典数据，不作为翻译结果
      result.dictionaryData = trans.data;
      // Dictionary API 不提供中文翻译，只提供英文定义
    } else if (trans.source === 'tencent' && trans.data) {
      // 腾讯云翻译结果
      const translation = trans.data.targetText.trim();
      if (translation && !translationTexts.has(translation.toLowerCase())) {
        translationTexts.add(translation.toLowerCase());
        result.translations.push({
          source: 'tencent',
          text: translation
        });
      }
    }
  }

  if (result.translations.length > 0) {
    const tencentTrans = result.translations.find(t => t.source === 'tencent');
    result.translation = tencentTrans ? tencentTrans.text : result.translations[0].text;
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

// 处理翻译请求
async function handleTranslation(text) {
  try {
    // 输入验证
    if (!text || typeof text !== 'string') {
      return {
        success: false,
        error: '翻译文本不能为空'
      };
    }

    // 去除首尾空格
    text = text.trim();

    if (text.length === 0) {
      return {
        success: false,
        error: '翻译文本不能为空'
      };
    }

    // 腾讯云TMT API限制：单次请求不超过2000字符
    if (text.length > 2000) {
      return {
        success: false,
        error: '翻译文本不能超过2000字符'
      };
    }

    // 速率限制检查
    const now = Date.now();
    if (now - lastTranslationTime < MIN_TRANSLATION_INTERVAL) {
      return {
        success: false,
        error: '请求过于频繁，请稍后再试'
      };
    }
    lastTranslationTime = now;

    // 获取设置
    const settings = await getSettings();

    // 检测语言（简单检测）
    const detectedLanguage = detectLanguage(text);

    // 存储所有翻译结果
    const translations = [];

    const wordsCount = text.split(/\s+/).filter(w => w.length > 0).length;
    let dictUsed = false;
    if (wordsCount === 1) {
      const dictionaryResult = await getDictionaryData(text);
      if (dictionaryResult) {
        translations.push({ source: 'dictionary', data: dictionaryResult });
        dictUsed = true;
      }
    }

    const cs = await chrome.storage.local.get('channelSettings');
    const enables = cs.channelSettings || {};
    if (!dictUsed && enables.tencent && settings.secretId && settings.secretKey) {
      try {
        const tencentResult = await translateWithTencent(
          text,
          settings.secretId,
          settings.secretKey,
          settings.sourceLanguage,
          settings.targetLanguage,
          settings.projectId
        );
        translations.push({ source: 'tencent', data: tencentResult });
      } catch (error) {
        console.error('腾讯云翻译失败:', error);
      }
    }

    if (translations.length === 0) {
      return { success: false, error: '没有可用的翻译结果' };
    }

    // 3. 合并翻译结果
    const mergedResult = mergeTranslationResults(text, translations, detectedLanguage);

    // 允许仅词典结果（无机器翻译）
    // 若无主翻译文本，仍返回词典释义与来源翻译列表

    const result = {
      success: true,
      data: mergedResult
    };

    // 判断是否应该保存到历史记录
    const shouldSaveToHistory = shouldSaveTranslation(
      text,
      mergedResult.translation,
      detectedLanguage
    );

    if (shouldSaveToHistory) {
      // 保存到历史记录
      await saveToHistory(result.data);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// SHA256哈希函数
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256
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

// 生成腾讯云API签名
async function generateTencentSignature(secretId, secretKey, payload, timestamp) {
  const service = 'tmt';
  const host = TENCENT_API_ENDPOINT;
  const algorithm = 'TC3-HMAC-SHA256';
  const date = new Date(timestamp * 1000).toISOString().substr(0, 10);

  // 1. 构建规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  const hashedRequestPayload = await sha256(payload);
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  // 2. 构建待签名字符串
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = await sha256(canonicalRequest);
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  // 3. 计算签名
  const secretDate = await hmacSha256(`TC3${secretKey}`, date);
  const secretService = await hmacSha256(secretDate, service);
  const secretSigning = await hmacSha256(secretService, 'tc3_request');
  const signature = await hmacSha256(secretSigning, stringToSign);
  const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');

  // 4. 构建Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

  return authorization;
}

// 调用腾讯云翻译API
async function translateWithTencent(text, secretId, secretKey, sourceLang = 'auto', targetLang = 'zh', projectId = 0) {
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = JSON.stringify({
    SourceText: text,
    Source: sourceLang,
    Target: targetLang,
    ProjectId: projectId
  });

  const authorization = await generateTencentSignature(secretId, secretKey, payload, timestamp);

  const headers = {
    'Authorization': authorization,
    'Content-Type': 'application/json',
    'Host': TENCENT_API_ENDPOINT,
    'X-TC-Action': 'TextTranslate',
    'X-TC-Timestamp': timestamp.toString(),
    'X-TC-Version': TENCENT_API_VERSION,
    'X-TC-Region': TENCENT_API_REGION
  };

  let response;
  try {
    response = await fetch(`https://${TENCENT_API_ENDPOINT}`, {
      method: 'POST',
      headers: headers,
      body: payload
    });
  } catch (error) {
    // 网络错误
    throw new Error(`网络连接失败: ${error.message}。请检查网络连接。`);
  }

  if (!response.ok) {
    // HTTP 错误
    throw new Error(`腾讯云API请求失败 (HTTP ${response.status})。请检查密钥是否正确。`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`API响应解析失败: ${error.message}`);
  }

  if (data.Response.Error) {
    // API 业务错误
    const errorCode = data.Response.Error.Code || '未知错误';
    const errorMessage = data.Response.Error.Message || '未知错误';
    throw new Error(`翻译失败 [${errorCode}]: ${errorMessage}`);
  }

  return {
    targetText: data.Response.TargetText,
    source: data.Response.Source,
    target: data.Response.Target
  };
}

// 简单的英文到中文翻译映射（基于词性）
const simpleChinese = {
  noun: '名词',
  verb: '动词',
  adjective: '形容词',
  adverb: '副词',
  pronoun: '代词',
  preposition: '介词',
  conjunction: '连词',
  interjection: '感叹词'
};

// 从英文定义中提取关键词作为简单中文翻译
function extractChineseFromDefinition(definition) {
  // 这是一个简化版本，实际应用中可以使用更复杂的翻译逻辑
  // 这里我们只是返回英文定义，让用户看到英文释义
  return definition;
}

// 获取完整词典信息（使用Free Dictionary API）
async function getDictionaryData(word) {
  try {
    const key = word.trim().toLowerCase();
    if (!key || key.split(/\s+/).length > 3) return null;

    const url = chrome.runtime.getURL('db/result.json');
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const dict = await resp.json();

    const entry = dict[key];
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

// 判断是否应该保存翻译记录
function shouldSaveTranslation(originalText, translatedText, detectedLanguage) {
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
  // 如果是单个字符或纯符号，不保存
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

  // 保存到 Supabase（使用第一个翻译结果）
  const supabaseResult = await saveToSupabase(
    translationData.original,
    translationData.translation, // 主翻译结果
    translationData.detectedLanguage,
    'zh' // 目标语言，可以从设置中获取
  );

  const newTimestamp = Date.now();
  const record = {
    original: translationData.original,
    translation: allTranslations,
    detectedLanguage: translationData.detectedLanguage,
    dictionaryData: translationData.dictionaryData,
    translations: translationData.translations,
    timestamp: newTimestamp,
    synced: supabaseResult.success,
    syncStatus: supabaseResult.success ? 'synced' : 'local_only',
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

// 保存设置
async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

// 获取设置
async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return result.settings || {
    secretId: '',
    secretKey: '',
    sourceLanguage: 'auto',
    targetLanguage: 'zh',
    projectId: 0,
    enableTencentTranslate: false
  };
}

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('腾讯云翻译插件已安装');
});

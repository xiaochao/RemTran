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

// 获取 Supabase 配置（从本地存储或 config.js 读取）
async function getSupabaseConfig() {
  try {
    const result = await chrome.storage.local.get(['supabaseUrl', 'supabaseAnonKey']);
    if (result.supabaseUrl && result.supabaseAnonKey) {
      return {
        url: result.supabaseUrl,
        anonKey: result.supabaseAnonKey,
        projectId: extractProjectId(result.supabaseUrl)
      };
    }
  } catch (error) {
    console.error('从本地存储读取 Supabase 配置失败:', error);
  }

  // 回退到 config.js 或默认值
  return {
    url: (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.url : 'https://hpowmoxpanobgutruvij.supabase.co',
    anonKey: (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.anonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3dtb3hwYW5vYmd1dHJ1dmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU5ODEsImV4cCI6MjA3Njg4MTk4MX0.rmSWwdYcwjmIy786Kt8HYhFI7bTybGTYkgAwzSQktzc',
    projectId: (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.projectId : 'hpowmoxpanobgutruvij'
  };
}

// 从 URL 中提取项目 ID
function extractProjectId(url) {
  try {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : 'hpowmoxpanobgutruvij';
  } catch (error) {
    return 'hpowmoxpanobgutruvij';
  }
}

// 从 localStorage 获取 Supabase session
async function getSupabaseSession() {
  try {
    const config = await getSupabaseConfig();
    const storageKey = `sb-${config.projectId}-auth-token`;

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

    const config = await getSupabaseConfig();

    // 调用 Supabase REST API 保存翻译历史
    const response = await fetch(`${config.url}/rest/v1/translation_history`, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
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

// 从 Supabase 获取用户设置（包括加密的 API 配置）
async function fetchUserSettings() {
  try {
    const session = await getSupabaseSession();
    if (!session || !session.access_token) {
      return null;
    }

    const config = await getSupabaseConfig();
    const userId = session.user?.id;

    if (!userId) {
      return null;
    }

    const response = await fetch(
      `${config.url}/rest/v1/user_settings?user_id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return null;
  }
}

// 解密配置数据（简化版 - 使用 base64 解码）
async function decryptConfig(encryptedData) {
  try {
    // encryptedData 可能是字符串或对象
    let dataStr = encryptedData;
    if (typeof encryptedData === 'object') {
      dataStr = encryptedData.ct;
    }

    if (!dataStr) {
      return null;
    }

    // Base64 解码
    const decoded = atob(dataStr);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }

    // 转换为 JSON
    const decodedStr = new TextDecoder().decode(bytes);
    return JSON.parse(decodedStr);
  } catch (error) {
    console.error('解密配置失败:', error);
    return null;
  }
}

// 获取渠道的 API 配置
async function getChannelConfig(channel) {
  try {
    const settings = await fetchUserSettings();
    if (!settings) {
      return null;
    }

    // 获取加密的渠道配置
    const configKey = `provider_config_${channel}_enc`;
    const encryptedConfig = settings[configKey];

    if (!encryptedConfig) {
      return null;
    }

    // 解密配置
    const decryptedConfig = await decryptConfig(encryptedConfig);
    return decryptedConfig;
  } catch (error) {
    console.error(`获取 ${channel} 渠道配置失败:`, error);
    return null;
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[background] 收到消息:', request.action);

  if (request.action === 'translate') {
    handleTranslation(request.text)
      .then(result => {
        console.log('[background] 翻译完成，发送响应:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[background] 翻译出错:', error);
        sendResponse({ success: false, error: error.message });
      });
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
    console.log('[background] 开始获取设置...');
    getSettings()
      .then(settings => {
        console.log('[background] 获取设置完成:', settings);
        sendResponse({ success: true, settings });
      })
      .catch(error => {
        console.error('[background] 获取设置失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  return true;
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

  // 渠道名称映射
  const channelNames = {
    'dictionary': '词典',
    'tencent': '腾讯云',
    'ali': '阿里云',
    'zhipu': '智谱',
    'silicon': '硅基',
    'deepl': 'DeepL',
    'microsoft': '微软',
    'gpt': 'GPT'
  };

  for (const trans of translations) {
    if (trans.source === 'dictionary' && trans.data) {
      // Dictionary API结果 - 只存储词典数据
      result.dictionaryData = trans.data;
    } else {
      // 处理所有翻译渠道的结果
      let translation = '';

      if (trans.data && trans.data.targetText) {
        translation = trans.data.targetText.trim();
      } else if (trans.data && trans.data.translation) {
        translation = trans.data.translation.trim();
      } else if (typeof trans.data === 'string') {
        translation = trans.data.trim();
      }

      if (translation && !translationTexts.has(translation.toLowerCase())) {
        translationTexts.add(translation.toLowerCase());
        result.translations.push({
          source: trans.source,
          sourceName: channelNames[trans.source] || trans.source,
          text: translation
        });
      }
    }
  }

  // 设置主翻译结果（优先级：deepl > tencent > microsoft > ali > zhipu > silicon > gpt）
  const priorityOrder = ['deepl', 'tencent', 'microsoft', 'ali', 'zhipu', 'silicon', 'gpt'];
  if (result.translations.length > 0) {
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

// 处理翻译请求
async function handleTranslation(text) {
  try {
    console.log('[background] 开始处理翻译请求:', text);

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
    console.log('[background] 获取到设置:', settings);

    // 检测语言（简单检测）
    const detectedLanguage = detectLanguage(text);
    console.log('[background] 检测到的语言:', detectedLanguage);

    // 获取目标语言
    const targetLanguage = settings.targetLanguage || 'zh';

    // 如果检测到的语言与目标语言相同，直接返回原文本
    if (detectedLanguage === targetLanguage) {
      console.log(`[background] 选中文本语言 (${detectedLanguage}) 与目标语言 (${targetLanguage}) 相同，跳过翻译`);
      return {
        success: false,
        error: '语言相同，无需翻译'
      };
    }

    // 存储所有翻译结果
    const translations = [];

    const wordsCount = text.split(/\s+/).filter(w => w.length > 0).length;
    let dictUsed = false;

    console.log('[background] 单词数量:', wordsCount);

    if (wordsCount === 1) {
      console.log('[background] 尝试查询词典...');
      const dictionaryResult = await getDictionaryData(text);
      if (dictionaryResult) {
        console.log('[background] 词典查询成功');
        translations.push({ source: 'dictionary', data: dictionaryResult });
        dictUsed = true;
      }
    }

    const cs = await chrome.storage.local.get('channelSettings');
    const enables = cs.channelSettings || {};
    console.log('[background] 渠道设置:', enables);
    console.log('[background] 腾讯云启用状态:', enables.tencent, '类型:', typeof enables.tencent);

    // 并行调用所有已开启的翻译渠道
    const translationPromises = [];

    // 腾讯云翻译（优先从 storage，然后尝试数据库）
    // 词典和翻译是独立的，词典查询成功不影响翻译渠道的调用
    if (enables.tencent) {
      console.log('[background] 腾讯云已启用，准备调用翻译API');
      translationPromises.push(
        (async () => {
          try {
            console.log('[background] 开始腾讯云翻译...');

            // 优先使用 storage 中的配置
            let tencentConfig = {
              secretId: settings.secretId || '',
              secretKey: settings.secretKey || '',
              projectId: settings.projectId || 0
            };

            // 如果 storage 中没有，尝试从数据库获取
            if (!tencentConfig.secretId || !tencentConfig.secretKey) {
              console.log('[background] Storage中没有腾讯云配置，尝试从数据库获取...');
              const dbConfig = await getChannelConfig('tencent');
              if (dbConfig) {
                tencentConfig = {
                  secretId: dbConfig.secretId || '',
                  secretKey: dbConfig.secretKey || '',
                  projectId: dbConfig.projectId || 0
                };
                console.log('[background] 从数据库获取到腾讯云配置');
              }
            }

            if (!tencentConfig.secretId || !tencentConfig.secretKey) {
              console.log('[background] 腾讯云配置缺失，secretId:', !!tencentConfig.secretId, 'secretKey:', !!tencentConfig.secretKey);
              return null;
            }

            console.log('[background] 腾讯云配置完整，开始调用API...');
            const result = await translateWithTencent(
              text,
              tencentConfig.secretId,
              tencentConfig.secretKey,
              settings.sourceLanguage,
              settings.targetLanguage,
              tencentConfig.projectId
            );
            console.log('[background] 腾讯云翻译成功:', result);
            return { source: 'tencent', data: result };
          } catch (error) {
            console.error('[background] 腾讯云翻译失败:', error);
            return null;
          }
        })()
      );
    } else {
      console.log('[background] 腾讯云未启用或词典已使用，dictUsed:', dictUsed, 'enables.tencent:', enables.tencent);
    }

    // 硅基流动翻译
    if (enables.silicon) {
      translationPromises.push(
        (async () => {
          try {
            console.log('[background] 开始硅基翻译...');
            const config = await getChannelConfig('silicon');
            if (!config || !config.apiKey) {
              console.log('[background] 硅基流动配置缺失');
              return null;
            }
            const result = await translateWithSilicon(text, config.apiKey, settings.sourceLanguage, settings.targetLanguage);
            console.log('[background] 硅基翻译成功');
            return { source: 'silicon', data: result };
          } catch (error) {
            console.error('[background] 硅基翻译失败:', error);
            return null;
          }
        })()
      );
    }

    // 阿里云翻译（占位符）
    if (enables.ali) {
      translationPromises.push(
        (async () => {
          try {
            console.log('[background] 开始阿里云翻译...');
            const config = await getChannelConfig('ali');
            if (!config) {
              console.log('[background] 阿里云配置缺失');
              return null;
            }
            const result = await translateWithAli(text, config, settings.sourceLanguage, settings.targetLanguage);
            console.log('[background] 阿里云翻译成功');
            return { source: 'ali', data: result };
          } catch (error) {
            console.error('[background] 阿里云翻译失败:', error);
            return null;
          }
        })()
      );
    }

    // DeepL 翻译（占位符）
    if (enables.deepl) {
      translationPromises.push(
        (async () => {
          try {
            console.log('[background] 开始 DeepL 翻译...');
            const config = await getChannelConfig('deepl');
            if (!config) {
              console.log('[background] DeepL 配置缺失');
              return null;
            }
            const result = await translateWithDeepL(text, config, settings.sourceLanguage, settings.targetLanguage);
            console.log('[background] DeepL 翻译成功');
            return { source: 'deepl', data: result };
          } catch (error) {
            console.error('[background] DeepL 翻译失败:', error);
            return null;
          }
        })()
      );
    }

    // 微软翻译（占位符）
    if (enables.microsoft) {
      translationPromises.push(
        (async () => {
          try {
            console.log('[background] 开始微软翻译...');
            const config = await getChannelConfig('microsoft');
            if (!config) {
              console.log('[background] 微软配置缺失');
              return null;
            }
            const result = await translateWithMicrosoft(text, config, settings.sourceLanguage, settings.targetLanguage);
            console.log('[background] 微软翻译成功');
            return { source: 'microsoft', data: result };
          } catch (error) {
            console.error('[background] 微软翻译失败:', error);
            return null;
          }
        })()
      );
    }

    // 智谱 AI（占位符）
    if (enables.zhipu) {
      translationPromises.push(
        (async () => {
          try {
            console.log('[background] 开始智谱翻译...');
            const config = await getChannelConfig('zhipu');
            if (!config) {
              console.log('[background] 智谱配置缺失');
              return null;
            }
            const result = await translateWithZhipu(text, config, settings.sourceLanguage, settings.targetLanguage);
            console.log('[background] 智谱翻译成功');
            return { source: 'zhipu', data: result };
          } catch (error) {
            console.error('[background] 智谱翻译失败:', error);
            return null;
          }
        })()
      );
    }

    // GPT（占位符）
    if (enables.gpt) {
      translationPromises.push(
        (async () => {
          try {
            console.log('[background] 开始 GPT 翻译...');
            const config = await getChannelConfig('gpt');
            if (!config) {
              console.log('[background] GPT 配置缺失');
              return null;
            }
            const result = await translateWithGPT(text, config, settings.sourceLanguage, settings.targetLanguage);
            console.log('[background] GPT 翻译成功');
            return { source: 'gpt', data: result };
          } catch (error) {
            console.error('[background] GPT 翻译失败:', error);
            return null;
          }
        })()
      );
    }

    // 等待所有翻译完成
    if (translationPromises.length > 0) {
      const results = await Promise.all(translationPromises);
      for (const result of results) {
        if (result) {
          translations.push(result);
        }
      }
    }

    if (translations.length === 0) {
      console.log('[background] 没有可用的翻译结果');
      return { success: false, error: '没有可用的翻译结果' };
    }

    // 3. 合并翻译结果
    const mergedResult = mergeTranslationResults(text, translations, detectedLanguage);
    console.log('[background] 合并后的翻译结果:', mergedResult);

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
      console.log('[background] 保存到历史记录...');
      // 保存到历史记录
      await saveToHistory(result.data);
      console.log('[background] 保存成功');
    }

    return result;
  } catch (error) {
    console.error('[background] 处理翻译请求出错:', error);
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
  const date = new Date(timestamp * 1000).toISOString().substring(0, 10);

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
    throw new Error(`网络连接失败: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`腾讯云API请求失败 (HTTP ${response.status})`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`API响应解析失败: ${error.message}`);
  }

  if (data.Response.Error) {
    const errorCode = data.Response.Error.Code || '未知错误';
    const errorMessage = data.Response.Error.Message || '未知错误';
    throw new Error(`[${errorCode}]: ${errorMessage}`);
  }

  return {
    targetText: data.Response.TargetText,
    source: data.Response.Source,
    target: data.Response.Target
  };
}

// 阿里云翻译（待实现）
async function translateWithAli(text, sourceLang = 'auto', targetLang = 'zh') {
  // TODO: 实现阿里云翻译 API 调用
  throw new Error('阿里云翻译功能待实现，请在设置中配置 API 密钥');
}

// DeepL 翻译（待实现）
async function translateWithDeepL(text, sourceLang = 'auto', targetLang = 'zh') {
  // TODO: 实现 DeepL API 调用
  throw new Error('DeepL 翻译功能待实现，请在设置中配置 API 密钥');
}

// 微软翻译（待实现）
async function translateWithMicrosoft(text, sourceLang = 'auto', targetLang = 'zh') {
  // TODO: 实现微软翻译 API 调用
  throw new Error('微软翻译功能待实现，请在设置中配置 API 密钥');
}

// 智谱 AI 翻译（待实现）
async function translateWithZhipu(text, sourceLang = 'auto', targetLang = 'zh') {
  // TODO: 实现智谱 AI API 调用
  throw new Error('智谱 AI 翻译功能待实现，请在设置中配置 API 密钥');
}

// 硅基流动翻译
async function translateWithSilicon(text, config, sourceLang = 'auto', targetLang = 'zh') {
  const apiKey = config.apiKey;
  const model = config.model || 'Qwen/Qwen2.5-7B-Instruct';

  // 语言代码映射
  const langMap = {
    'zh': '中文',
    'zh-CN': '中文',
    'en': 'English',
    'ja': '日语',
    'ko': '韩语',
    'auto': '自动检测'
  };

  const targetLanguage = langMap[targetLang] || '中文';
  const sourceLanguage = sourceLang === 'auto' ? '自动检测' : (langMap[sourceLang] || 'English');

  const prompt = `请将以下文本翻译为${targetLanguage}${sourceLanguage !== '自动检测' ? `（原文是${sourceLanguage}）` : ''}，只返回翻译结果，不要任何解释：\n\n${text}`;

  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`硅基流动 API 请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`硅基流动 API 错误: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const translation = data.choices?.[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error('硅基流动 API 返回空结果');
  }

  return {
    targetText: translation,
    source: sourceLang,
    target: targetLang
  };
}

// GPT 翻译（待实现）
async function translateWithGPT(text, sourceLang = 'auto', targetLang = 'zh') {
  // TODO: 实现 GPT API 调用
  throw new Error('GPT 翻译功能待实现，请在设置中配置 API 密钥');
}

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
    console.log('[background] 词典预加载完成，共', Object.keys(dictionaryCache).length, '个词条');
  } catch (error) {
    console.error('[background] 预加载词典出错:', error);
    dictionaryCache = {}; // 设置为空对象避免重复尝试
  }
}

// 获取完整词典信息（使用本地JSON词典，带缓存）
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
    projectId: 0
  };
}

// Service Worker 激活
self.addEventListener('activate', () => {
  console.log('[background] Service Worker 已激活');
  // 预加载词典
  preloadDictionary();
});

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('[background] 翻译插件已安装');
  // 预加载词典
  preloadDictionary();
});

console.log('[background] Service Worker 正在启动...');
// 启动时预加载词典
preloadDictionary();

// 翻译提示框元素
let tooltipElement = null;
let currentAudioElement = null;

// 检查扩展上下文是否有效
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
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

// 检查是否应该跳过翻译
function shouldSkipTranslation(text) {
  // 1. 检查是否全是数字（包括小数点）
  if (/^[\d\s.,]+$/.test(text.replace(/\s/g, ''))) {
    return true;
  }

  // 2. 检查是否是单个字符
  if (text.length === 1) {
    return true;
  }

  // 3. 检查是否包含特殊字符（包括emoji、符号等）
  // 特殊字符包括：emoji、数学符号、箭头符号、各种装饰性符号等
  const specialCharPattern = /[\p{S}\p{Sk}\p{So}\u2600-\u26FF\u2700-\u27BF\u2B50-\u2BFF\u{1F300}-\u{1F9FF}]/u;
  if (specialCharPattern.test(text)) {
    return true;
  }

  // 4. 检查是否纯标点符号
  const punctuationPattern = /^[\s\p{P}\p{S}]+$/u;
  if (punctuationPattern.test(text)) {
    return true;
  }

  // 5. 检查是否是代码片段（包含多个特殊字符的组合）
  // 例如：+=, ->, =>, !=, <=, >=, ===, !==, &&, ||, ++, -- 等
  const codePattern = /^(\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=|->|=>|!=|==|===|!==|<=|>=|&&|\|\||\+\+|--|\+|-|\*|\/|%|<|>|=|&|\||\^|!|~)+$/;
  if (codePattern.test(text.trim())) {
    return true;
  }

  return false;
}

// 监听双击事件
document.addEventListener('dblclick', async (event) => {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText) {
    // 检查扩展上下文
    if (!isExtensionContextValid()) {
      console.warn('扩展已重新加载，请刷新页面以继续使用翻译功能');
      return;
    }

    // 检查是否应该跳过翻译（纯数字、特殊字符、单个字符等）
    if (shouldSkipTranslation(selectedText)) {
      console.log('选中文本包含特殊字符或不需要翻译，跳过');
      return;
    }

    try {
      // 获取设置以确定目标语言
      const settingsResponse = await chrome.runtime.sendMessage({
        action: 'getSettings'
      });

      if (!settingsResponse.success) {
        console.error('获取设置失败:', settingsResponse.error);
        return;
      }

      const settings = settingsResponse.settings;
      const targetLanguage = settings.targetLanguage || 'zh';

      // 检测选中文本的语言
      const detectedLanguage = detectLanguage(selectedText);

      // 如果检测到的语言与目标语言相同，不显示翻译窗口
      if (detectedLanguage === targetLanguage) {
        console.log(`选中文本语言 (${detectedLanguage}) 与目标语言 (${targetLanguage}) 相同，跳过翻译`);
        return;
      }

      // 移除旧的提示框
      removeTooltip();

      // 创建加载中的提示框
      createTooltip(event.pageX, event.pageY, selectedText, true);

      // 发送消息给background script进行翻译
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text: selectedText
      });

      if (response.success) {
        // 显示翻译结果
        updateTooltip(response.data);
      } else {
        updateTooltip({
          translation: '翻译失败: ' + response.error,
          original: selectedText
        });
      }
    } catch (error) {
      console.error('翻译错误:', error);

      // 检查是否是扩展上下文失效
      if (!isExtensionContextValid() || error.message.includes('Extension context invalidated')) {
        updateTooltip({
          translation: '扩展已重新加载，请刷新页面后重试',
          original: selectedText
        });
      } else {
        updateTooltip({
          translation: '翻译出错: ' + error.message,
          original: selectedText
        });
      }
    }
  }
});

// 创建提示框
function getSelectionRect() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  const rect = r.getBoundingClientRect();
  if (!rect || (!isFinite(rect.top) && !isFinite(rect.left))) return null;
  return rect;
}

function repositionTooltip(fallbackX, fallbackY) {
  if (!tooltipElement) return;
  const rect = getSelectionRect();
  const margin = 12;
  let top = fallbackY + 20;
  let left = fallbackX;
  const ttWidth = tooltipElement.offsetWidth;
  const ttHeight = tooltipElement.offsetHeight;
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const anchorCenterX = window.scrollX + (rect.left + rect.right) / 2;
    const placeAbove = spaceBelow < ttHeight + margin && spaceAbove >= ttHeight + margin;
    top = placeAbove ? (window.scrollY + rect.top - ttHeight - margin) : (window.scrollY + rect.bottom + margin);
    left = anchorCenterX - ttWidth / 2;
    const minLeft = window.scrollX + margin;
    const maxLeft = window.scrollX + vw - ttWidth - margin;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    if (top < window.scrollY + margin) top = window.scrollY + margin;
  }
  tooltipElement.style.left = left + 'px';
  tooltipElement.style.top = top + 'px';
}

function createTooltip(x, y, text, isLoading = false) {
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'tencent-translator-tooltip';

  if (isLoading) {
    tooltipElement.innerHTML = `
      <div class="tooltip-header">
        <h2 class="tooltip-word">${escapeHtml(text)}</h2>
        <div class="tooltip-actions">
          <button class="tooltip-action-btn" data-action="close" title="关闭">×</button>
        </div>
      </div>
      <div class="tooltip-content">
        <div class="loading">翻译中...</div>
      </div>
    `;
  }

  // 设置位置
  repositionTooltip(x, y);

  document.body.appendChild(tooltipElement);

  // 绑定事件
  bindTooltipEvents();

  // 点击提示框外部关闭
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
}

// 更新提示框内容
function updateTooltip(data) {
  if (!tooltipElement) return;

  // 检查是否有词典数据
  const hasDictionaryData = data.dictionaryData && data.dictionaryData.meanings && data.dictionaryData.meanings.length > 0;

  let html = '';

  // 构建头部
  html += `
    <div class="tooltip-header">
      <h2 class="tooltip-word">${escapeHtml(data.original)}</h2>
      <div class="tooltip-actions">
        <button class="tooltip-action-btn" data-action="check" title="已掌握">✓</button>
        <button class="tooltip-action-btn" data-action="bookmark" title="收藏">🔖</button>
      </div>
    </div>
  `;

  // 如果有词典数据，显示词典模式
  if (hasDictionaryData) {
    const dict = data.dictionaryData;

    // 音标区域
    if (dict.phonetics && (dict.phonetics.us || dict.phonetics.uk)) {
      html += '<div class="phonetics-section">';

      if (dict.phonetics.us) {
        html += `
          <div class="phonetic-item">
            <span class="phonetic-label">US</span>
            <span class="phonetic-text">/${escapeHtml(dict.phonetics.us)}/</span>
            ${dict.phonetics.audio.us ? `<button class="phonetic-audio-btn" data-audio="${escapeHtml(dict.phonetics.audio.us)}" title="发音">🔊</button>` : ''}
          </div>
        `;
      }

      if (dict.phonetics.uk) {
        html += `
          <div class="phonetic-item">
            <span class="phonetic-label">UK</span>
            <span class="phonetic-text">/${escapeHtml(dict.phonetics.uk)}/</span>
            ${dict.phonetics.audio.uk ? `<button class="phonetic-audio-btn" data-audio="${escapeHtml(dict.phonetics.audio.uk)}" title="发音">🔊</button>` : ''}
          </div>
        `;
      }

      html += '</div>';
    }

    // 内容区域
    html += '<div class="tooltip-content">';

    // 如果有多个翻译结果，显示所有翻译
    if (data.translations && data.translations.length > 0) {
      html += '<div class="content-title">翻译</div>';
      html += '<div class="translations-list">';

      data.translations.forEach((trans, index) => {
        const sourceName = trans.source === 'dictionary' ? '词典' : trans.source === 'tencent' ? '腾讯云' : trans.source;
        html += `
          <div class="translation-item">
            <span class="translation-source">[${escapeHtml(sourceName)}]</span>
            <span class="translation-text">${escapeHtml(trans.text)}</span>
          </div>
        `;
      });

      html += '</div>';
    }

    html += '<div class="content-title">标准释义</div>';

    // 词性和释义 - 同一词性的释义显示在一行
    dict.meanings.forEach(meaning => {
      html += '<div class="meaning-item">';
      html += `
        <div class="meaning-header">
          <span class="part-of-speech">${escapeHtml(meaning.partOfSpeech)}.</span>
        </div>
      `;

      // 将所有定义用顿号连接，显示在一行
      const definitionsText = meaning.definitions.map(def => def.definition).join('、');
      html += `<div class="definition-inline">${escapeHtml(definitionsText)}</div>`;

      // 只显示第一个例句
      const firstExample = meaning.definitions.find(def => def.example);
      if (firstExample) {
        html += `
          <div class="example-section">
            <div class="example-en">"${escapeHtml(firstExample.example)}"</div>
          </div>
        `;
      }

      html += '</div>';
    });

    html += '</div>';
  } else {
    // 简单翻译模式
    html += '<div class="tooltip-content">';
    html += `<div class="original-text">${escapeHtml(data.original)}</div>`;

    if (data.phonetic) {
      html += `<div class="phonetic">/${escapeHtml(data.phonetic)}/</div>`;
    }

    // 显示所有翻译结果
    if (data.translations && data.translations.length > 0) {
      html += '<div class="translations-list">';

      data.translations.forEach((trans, index) => {
        const sourceName = trans.source === 'dictionary' ? '词典' : trans.source === 'tencent' ? '腾讯云' : trans.source;
        html += `
          <div class="translation-item">
            <span class="translation-source">[${escapeHtml(sourceName)}]</span>
            <span class="translation-text">${escapeHtml(trans.text)}</span>
          </div>
        `;
      });

      html += '</div>';
    } else {
      // 兼容旧格式
      html += `<div class="translation-text">${escapeHtml(data.translation)}</div>`;
    }

    if (data.detectedLanguage) {
      html += `<div class="detected-lang">检测语言: ${data.detectedLanguage}</div>`;
    }

    html += '</div>';
  }

  tooltipElement.innerHTML = html;

  // 重新绑定事件
  bindTooltipEvents();
  const rect = getSelectionRect();
  const fx = rect ? window.scrollX + (rect.left + rect.right) / 2 : 0;
  const fy = rect ? window.scrollY + rect.top : 0;
  repositionTooltip(fx, fy);
}

// 绑定提示框事件
function bindTooltipEvents() {
  if (!tooltipElement) return;

  // 关闭按钮
  const closeBtn = tooltipElement.querySelector('[data-action="close"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', removeTooltip);
  }

  // 收藏按钮
  const bookmarkBtn = tooltipElement.querySelector('[data-action="bookmark"]');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', handleBookmark);
  }

  // 已掌握按钮
  const checkBtn = tooltipElement.querySelector('[data-action="check"]');
  if (checkBtn) {
    checkBtn.addEventListener('click', handleCheck);
  }

  // 发音按钮
  const audioButtons = tooltipElement.querySelectorAll('.phonetic-audio-btn');
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

// 处理收藏
function handleBookmark(event) {
  const btn = event.currentTarget;
  btn.classList.toggle('bookmarked');
  // TODO: 实现收藏功能，保存到本地存储
}

// 处理已掌握
function handleCheck(event) {
  // TODO: 实现已掌握功能
  // 暂时只是移除提示框
  removeTooltip();
}

// 简单的例句翻译（占位实现）
function translateExampleToSimpleChinese(example, word) {
  // 这里只是一个简单的占位实现
  // 实际应该调用翻译API，但为了不增加API调用，这里只做简单处理
  return example; // 暂时返回原文，未来可以改进
}

// 移除提示框
function removeTooltip() {
  if (tooltipElement) {
    tooltipElement.remove();
    tooltipElement = null;
    document.removeEventListener('click', handleOutsideClick);
  }

  // 停止音频播放
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement = null;
  }
}

// 处理点击提示框外部
function handleOutsideClick(event) {
  if (tooltipElement && !tooltipElement.contains(event.target)) {
    removeTooltip();
  }
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    return;
  }

  if (request.action === 'closeTooltip') {
    removeTooltip();
  }

  return true; // 保持消息通道开放
});

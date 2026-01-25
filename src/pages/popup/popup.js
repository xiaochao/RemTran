// 标签页切换
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');

    // 切换按钮状态
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // 切换内容
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// 加载历史记录
async function loadHistory() {
  const response = await chrome.runtime.sendMessage({ action: 'getHistory' });

  if (response.success) {
    displayHistory(response.history);
  }
}

// 显示历史记录
function displayHistory(history) {
  const historyList = document.getElementById('history-list');

  if (!history || history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">暂无翻译记录</div>';
    return;
  }

  historyList.innerHTML = history.map((item, index) => `
    <div class="history-item">
      <div class="history-content">
        <div class="history-time">${formatTime(item.timestamp)}</div>
        <div class="history-original">${escapeHtml(item.original)}</div>
        ${item.phonetic ? `<div class="history-phonetic">[${escapeHtml(item.phonetic)}]</div>` : ''}
        <div class="history-translation">${escapeHtml(item.translation)}</div>
        ${item.detectedLanguage ? `<div class="history-lang">${item.detectedLanguage}</div>` : ''}
      </div>
      <button class="delete-btn" data-index="${index}" title="删除">×</button>
    </div>
  `).join('');

  // 为所有删除按钮添加事件监听
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation(); // 防止触发history-item的点击事件
      const index = parseInt(button.getAttribute('data-index'));
      if (confirm('确定要删除这条记录吗？')) {
        const response = await chrome.runtime.sendMessage({
          action: 'deleteHistoryItem',
          index: index
        });

        if (response.success) {
          loadHistory();
        }
      }
    });
  });
}

// 清空历史记录
document.getElementById('clear-history').addEventListener('click', async () => {
  if (confirm('确定要清空所有翻译历史记录吗？')) {
    const response = await chrome.runtime.sendMessage({ action: 'clearHistory' });

    if (response.success) {
      loadHistory();
    }
  }
});

// 加载设置
async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

  if (response.success) {
    const settings = response.settings;
    document.getElementById('secret-id').value = settings.secretId || '';
    document.getElementById('secret-key').value = settings.secretKey || '';
    document.getElementById('source-language').value = settings.sourceLanguage || 'auto';
    document.getElementById('target-language').value = settings.targetLanguage || 'zh';
    document.getElementById('project-id').value = settings.projectId || 0;
  }
}

// 保存设置
document.getElementById('save-settings').addEventListener('click', async () => {
  const secretId = document.getElementById('secret-id').value.trim();
  const secretKey = document.getElementById('secret-key').value.trim();
  const sourceLanguage = document.getElementById('source-language').value;
  const targetLanguage = document.getElementById('target-language').value;
  const projectId = parseInt(document.getElementById('project-id').value) || 0;

  // 验证输入
  if (!secretId || !secretKey) {
    showMessage('请输入 SecretId 和 SecretKey', 'error');
    return;
  }

  // 验证 SecretId 格式（腾讯云 SecretId 通常以 AKID 开头，长度为 36 字符）
  if (!secretId.startsWith('AKID') || secretId.length !== 36) {
    showMessage('SecretId 格式不正确，应以 AKID 开头且长度为 36 字符', 'error');
    return;
  }

  // 验证 SecretKey 长度（腾讯云 SecretKey 通常为 32 字符）
  if (secretKey.length !== 32) {
    showMessage('SecretKey 格式不正确，长度应为 32 字符', 'error');
    return;
  }

  // 验证 ProjectId 是否为有效数字
  if (isNaN(projectId) || projectId < 0) {
    showMessage('ProjectId 必须是大于等于 0 的整数', 'error');
    return;
  }

  const settings = {
    secretId,
    secretKey,
    sourceLanguage,
    targetLanguage,
    projectId
  };

  const response = await chrome.runtime.sendMessage({
    action: 'saveSettings',
    settings
  });

  if (response.success) {
    showMessage('设置已保存', 'success');
  } else {
    showMessage('保存失败: ' + response.error, 'error');
  }
});

// 显示消息
function showMessage(message, type = 'info') {
  const messageDiv = document.getElementById('save-message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';

  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + ' 分钟前';
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + ' 小时前';
  } else {
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  loadSettings();
});

// translator-utils.js - 工具函数模块

// 工具函数命名空间
window.TranslatorUtils = {
    // 获取语言名称
    getLanguageName(code) {
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
    },

    // 格式化时间
    formatTime(date) {
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
    },

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 判断是否应该保存翻译记录
    shouldSaveTranslationRecord(originalText, translatedText, detectedLanguage) {
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
    },

    // 显示通知
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `translator-notification translator-notification-${type}`;
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
    },

    // 播放音频
    playAudio(url) {
        // 停止当前播放的音频
        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement = null;
        }

        // 创建新的音频元素
        this.currentAudioElement = new Audio(url);
        this.currentAudioElement.play().catch(error => {
            console.error('播放音频失败:', error);
        });
    },

    // 更新占位符文本
    updatePlaceholder(sourceLanguage, sourceText) {
        const lang = sourceLanguage.options[sourceLanguage.selectedIndex].text;
        sourceText.placeholder = `输入要翻译的${lang}文本...`;
    }
};

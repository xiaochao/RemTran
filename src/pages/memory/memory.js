// 背单词功能
class MemoryWordGame {
    constructor() {
        this.words = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.wrongWords = []; // 记录错误的单词
        this.selectedOption = null;
        this.settings = {
            interval: 3,
            wordsPerSession: 10
        };
        this.isRetryRound = false; // 是否是重试轮次
    }

    // 初始化
    async init() {
        try {
            // 显示加载状态
            this.showLoading();

            // 加载设置
            await this.loadSettings();

            // 导入历史记录到记忆队列（首次使用）
            // 注意：这个操作失败不会影响继续使用
            try {
                const importResult = await DatabaseService.importHistoryToMemory(50);
                if (!importResult.success) {
                    console.warn('导入历史记录失败:', importResult.error);
                }
            } catch (importError) {
                console.warn('导入历史记录异常:', importError);
            }

            // 获取待复习单词
            const result = await DatabaseService.getDueWords(this.settings.wordsPerSession);

            if (!result.success) {
                this.showError('加载单词失败: ' + (result.error || '未知错误'));
                return;
            }

            this.words = result.data;

            if (this.words.length === 0) {
                this.showEmpty();
            } else {
                this.showWord();
            }
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    // 显示加载状态
    showLoading() {
        const container = document.getElementById('memoryContainer');
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 40px;">
                <div class="loading-spinner"></div>
                <div style="color: white; font-size: 18px; margin-top: 20px;">正在加载单词...</div>
            </div>
        `;
    }

    // 加载设置
    async loadSettings() {
        const result = await DatabaseService.getUserSettings();
        if (result.success && result.data) {
            this.settings.interval = result.data.memory_interval_hours || 3;
            this.settings.wordsPerSession = result.data.memory_words_per_session || 10;
        }
    }

    // 显示当前单词
    async showWord() {
        if (this.currentIndex >= this.words.length) {
            this.showComplete();
            return;
        }

        const word = this.words[this.currentIndex];
        const container = document.getElementById('memoryContainer');

        // 生成选项
        const options = await this.generateOptions(word);

        container.innerHTML = `
            <div class="memory-header">
                <div class="memory-progress">
                    <span class="progress-text">${this.currentIndex + 1} / ${this.words.length}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${((this.currentIndex) / this.words.length) * 100}%"></div>
                    </div>
                </div>
                ${this.isRetryRound ? '<div style="color: #f56565; font-size: 14px; font-weight: 600;">重试错误单词</div>' : ''}
            </div>

            <div class="word-display">
                <div class="original-word">${this.escapeHtml(word.source_text)}</div>
                <div class="word-language">${this.getLanguageName(word.source_language)} → ${this.getLanguageName(word.target_language)}</div>
            </div>

            <div class="quiz-options">
                ${options.map((opt, index) => `
                    <div class="quiz-option" data-index="${index}" data-correct="${opt.isCorrect ? 'true' : 'false'}">
                        ${this.escapeHtml(opt.text)}
                    </div>
                `).join('')}
            </div>

            <div class="memory-actions">
                <button class="action-button submit-button" id="submitBtn" disabled>提交答案</button>
            </div>
        `;

        // 添加事件监听器（替代内联事件处理器）
        const optionElements = container.querySelectorAll('.quiz-option');
        optionElements.forEach((el, index) => {
            el.addEventListener('click', () => this.selectOption(index));
        });

        const submitBtn = container.querySelector('#submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submit());
        }

        this.selectedOption = null;
    }

    // 生成选项（1个正确 + 3个错误）
    async generateOptions(correctWord) {
        let wrongOptionsPool = [];

        // 优先从当前单词列表中收集
        this.words.forEach(w => {
            if (w.target_language === correctWord.target_language &&
                w.source_text !== correctWord.source_text &&
                w.translated_text !== correctWord.translated_text &&
                !wrongOptionsPool.includes(w.translated_text)) {
                wrongOptionsPool.push(w.translated_text);
            }
        });

        // 如果不够，从翻译历史中收集
        const historyResult = await DatabaseService.getAllTranslationHistory();
        if (historyResult.success && historyResult.data) {
            historyResult.data.forEach(h => {
                if (h.target_language === correctWord.target_language &&
                    h.source_text !== correctWord.source_text &&
                    h.translated_text !== correctWord.translated_text &&
                    !wrongOptionsPool.includes(h.translated_text)) {
                    wrongOptionsPool.push(h.translated_text);
                }
            });
        }

        // 如果还不够，从记忆单词中收集
        const memoryResult = await DatabaseService.getAllMemoryWords();
        if (memoryResult.success && memoryResult.data) {
            memoryResult.data.forEach(w => {
                if (w.target_language === correctWord.target_language &&
                    w.source_text !== correctWord.source_text &&
                    w.translated_text !== correctWord.translated_text &&
                    !wrongOptionsPool.includes(w.translated_text)) {
                    wrongOptionsPool.push(w.translated_text);
                }
            });
        }

        // 正确答案
        const correctAnswer = correctWord.translated_text;

        // 生成错误选项（根据可用选项数量调整）
        const wrongAnswers = [];
        const maxOptions = Math.min(3, wrongOptionsPool.length);
        const maxAttempts = 100;
        let attempts = 0;

        while (wrongAnswers.length < maxOptions && attempts < maxAttempts && wrongOptionsPool.length > 0) {
            const randomIndex = Math.floor(Math.random() * wrongOptionsPool.length);
            const randomText = wrongOptionsPool[randomIndex];

            if (!wrongAnswers.includes(randomText)) {
                wrongAnswers.push(randomText);
            }
            attempts++;
        }

        // 组合所有选项并打乱
        const options = [
            { text: correctAnswer, isCorrect: true },
            ...wrongAnswers.map(text => ({ text, isCorrect: false }))
        ];

        return this.shuffleArray(options);
    }

    // 打乱数组
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // 选择选项
    selectOption(index) {
        // 清除之前的选择
        document.querySelectorAll('.quiz-option').forEach(el => {
            el.classList.remove('selected');
        });

        // 选中当前选项
        const selectedEl = document.querySelector(`.quiz-option[data-index="${index}"]`);
        if (selectedEl) {
            selectedEl.classList.add('selected');
        }

        this.selectedOption = index;

        // 启用提交按钮
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }

    // 提交答案
    async submit() {
        if (this.selectedOption === null) return;

        const word = this.words[this.currentIndex];
        const options = document.querySelectorAll('.quiz-option');
        const selectedOption = options[this.selectedOption];
        const isCorrect = selectedOption.dataset.correct === 'true';

        // 显示正确/错误状态
        options.forEach((opt, index) => {
            opt.style.pointerEvents = 'none'; // 禁用点击

            if (opt.dataset.correct === 'true') {
                opt.classList.add('correct');
            } else if (index === this.selectedOption && !isCorrect) {
                opt.classList.add('wrong');
            }
        });

        // 更新统计
        if (isCorrect) {
            this.correctCount++;
        } else {
            this.wrongCount++;
            // 记录错误的单词用于重试
            this.wrongWords.push(word);
        }

        // 更新数据库
        await DatabaseService.updateMemoryWord(word.id, isCorrect);

        // 延迟后显示下一个单词
        setTimeout(() => {
            this.currentIndex++;
            this.showWord();
        }, isCorrect ? 1000 : 2000);
    }

    // 显示完成页面
    showComplete() {
        // 如果有错误的单词，进入重试轮次
        if (this.wrongWords.length > 0 && !this.isRetryRound) {
            // 开始重试错误的单词
            this.words = [...this.wrongWords];
            this.wrongWords = [];
            this.currentIndex = 0;
            this.correctCount = 0;
            this.wrongCount = 0;
            this.isRetryRound = true;

            // 提示用户
            const container = document.getElementById('memoryContainer');
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: #fed7d7; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#f56565" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div style="font-size: 24px; font-weight: 600; color: #2d3748; margin-bottom: 10px;">需要重新背诵</div>
                    <div style="font-size: 16px; color: #718096; margin-bottom: 20px;">您答错了 ${this.wrongWords.length} 个单词，需要重新背诵</div>
                    <div style="font-size: 14px; color: #718096;">即将开始重试...</div>
                </div>
            `;

            setTimeout(() => {
                this.showWord();
            }, 2000);
            return;
        }

        // 全部正确，显示完成页面
        const container = document.getElementById('memoryContainer');
        const totalWords = this.isRetryRound ? this.words.length + this.wrongWords.length : this.words.length;
        const accuracy = totalWords > 0 ? 100 : 0;

        container.innerHTML = `
            <div class="memory-complete">
                <div class="complete-icon">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="complete-title">🎉 全部背诵正确！</div>
                <div class="complete-stats">
                    <div class="complete-stat">
                        <div class="complete-stat-value">${totalWords}</div>
                        <div class="complete-stat-label">总单词</div>
                    </div>
                    <div class="complete-stat">
                        <div class="complete-stat-value" style="color: #48bb78;">${accuracy}%</div>
                        <div class="complete-stat-label">正确率</div>
                    </div>
                    <div class="complete-stat">
                        <div class="complete-stat-value" style="color: #667eea;">${this.isRetryRound ? '是' : '否'}</div>
                        <div class="complete-stat-label">经过重试</div>
                    </div>
                </div>
                <button class="action-button submit-button memory-exit-btn">返回</button>
            </div>
        `;

        // 添加事件监听器
        const exitBtn = container.querySelector('.memory-exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.exit());
        }
    }

    // 显示空状态
    showEmpty() {
        const container = document.getElementById('memoryContainer');
        container.innerHTML = `
            <div class="empty-words">
                <div class="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="empty-title">暂无待复习单词</div>
                <div class="empty-subtitle">您还没有需要复习的单词</div>
                <button class="import-button memory-exit-btn">返回</button>
            </div>
        `;

        // 添加事件监听器
        const exitBtn = container.querySelector('.memory-exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.exit());
        }
    }

    // 显示错误
    showError(message) {
        const container = document.getElementById('memoryContainer');
        container.innerHTML = `
            <div class="empty-words">
                <div class="empty-icon" style="background: #fed7d7;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#f56565" stroke-width="2"/>
                        <path d="M12 8v4m0 4h.01" stroke="#f56565" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="empty-title">出错了</div>
                <div class="empty-subtitle">${this.escapeHtml(message)}</div>
                <button class="import-button memory-exit-btn">返回</button>
            </div>
        `;

        // 添加事件监听器
        const exitBtn = container.querySelector('.memory-exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.exit());
        }
    }

    // 退出
    exit() {
        if (window.opener) {
            window.close();
        } else {
            window.location.href = 'translator.html';
        }
    }

    // 辅助方法：获取语言名称
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
    }

    // 辅助方法：HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 创建全局实例
const MemoryGame = new MemoryWordGame();

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    MemoryGame.init();
});

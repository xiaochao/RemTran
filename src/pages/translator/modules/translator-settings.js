// translator-settings.js - 设置和配置管理模块

window.TranslatorSettings = {
    // 设置相关DOM元素
    elements: {
        defaultTargetLangSelect: null,
        autoTranslateCheckbox: null,
        showTranslateButtonCheckbox: null,
        showPhoneticCheckbox: null,
        showExamplesCheckbox: null,
        memoryIntervalInput: null,
        memoryWordsPerSessionInput: null
    },

    // 从数据库加载设置
    async loadSettings() {
        const result = await DatabaseService.getUserSettings();

        if (result.success && result.data) {
            const settings = result.data;

            // 获取DOM元素
            this.getElements();

            // 应用设置到UI
            if (this.elements.defaultTargetLangSelect) {
                this.elements.defaultTargetLangSelect.value = settings.default_target_lang || 'zh';
            }
            if (this.elements.showTranslateButtonCheckbox) {
                this.elements.showTranslateButtonCheckbox.checked = settings.show_translate_button !== false;
            }
            if (this.elements.autoTranslateCheckbox) {
                this.elements.autoTranslateCheckbox.checked = settings.auto_translate || false;
            }
            if (this.elements.showPhoneticCheckbox) {
                this.elements.showPhoneticCheckbox.checked = settings.show_phonetic !== false;
            }
            if (this.elements.showExamplesCheckbox) {
                this.elements.showExamplesCheckbox.checked = settings.show_examples || false;
            }

            // 背单词设置
            if (this.elements.memoryIntervalInput) {
                this.elements.memoryIntervalInput.value = settings.memory_interval_hours || 3;
            }
            if (this.elements.memoryWordsPerSessionInput) {
                this.elements.memoryWordsPerSessionInput.value = settings.memory_words_per_session || 10;
            }

            // 同步API配置到Chrome扩展
            if (settings.api_secret_id && settings.api_secret_key) {
                await this.syncApiSettingsToExtension(settings);
            }
        }

        // 加载本地翻译历史数量
        await this.loadLocalHistoryCount();
    },

    // 获取DOM元素
    getElements() {
        this.elements.defaultTargetLangSelect = document.getElementById('defaultTargetLang');
        this.elements.showTranslateButtonCheckbox = document.getElementById('showTranslateButton');
        this.elements.autoTranslateCheckbox = document.getElementById('autoTranslate');
        this.elements.showPhoneticCheckbox = document.getElementById('showPhonetic');
        this.elements.showExamplesCheckbox = document.getElementById('showExamples');
        this.elements.memoryIntervalInput = document.getElementById('memoryInterval');
        this.elements.memoryWordsPerSessionInput = document.getElementById('memoryWordsPerSession');
    },

    // 绑定事件监听器
    bindEvents() {
        // 获取DOM元素
        this.getElements();

        // 绑定设置变化事件
        const settingElements = [
            this.elements.defaultTargetLangSelect,
            this.elements.showTranslateButtonCheckbox,
            this.elements.autoTranslateCheckbox,
            this.elements.showPhoneticCheckbox,
            this.elements.showExamplesCheckbox
        ];

        settingElements.forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.saveSettings());
            }
        });

        // 背单词设置事件
        if (this.elements.memoryIntervalInput) {
            this.elements.memoryIntervalInput.addEventListener('change', async () => {
                const value = parseInt(this.elements.memoryIntervalInput.value);
                if (value >= 1 && value <= 24) {
                    await DatabaseService.updateUserSettings({
                        memory_interval_hours: value
                    });
                }
            });
        }

        if (this.elements.memoryWordsPerSessionInput) {
            this.elements.memoryWordsPerSessionInput.addEventListener('change', async () => {
                const value = parseInt(this.elements.memoryWordsPerSessionInput.value);
                if (value >= 5 && value <= 50) {
                    await DatabaseService.updateUserSettings({
                        memory_words_per_session: value
                    });
                }
            });
        }

        // 同步按钮
        const syncButton = document.getElementById('syncButton');
        if (syncButton) {
            syncButton.addEventListener('click', () => this.syncLocalHistory());
        }
    },

    // 保存设置
    async saveSettings() {
        this.getElements();

        const settings = {
            default_target_lang: this.elements.defaultTargetLangSelect?.value || 'zh',
            show_translate_button: this.elements.showTranslateButtonCheckbox?.checked !== false,
            auto_translate: this.elements.autoTranslateCheckbox?.checked || false,
            show_phonetic: this.elements.showPhoneticCheckbox?.checked !== false,
            show_examples: this.elements.showExamplesCheckbox?.checked || false
        };

        const result = await DatabaseService.updateUserSettings(settings);

        if (result.success) {
            console.log('设置已保存到云端');
            TranslatorUtils.showNotification('设置已保存');

            if (result.data) {
                await this.syncApiSettingsToExtension(result.data);
            }
        } else {
            console.error('保存设置失败:', result.error);
        }
    },

    // 同步API配置到扩展
    async syncApiSettingsToExtension(settings) {
        try {
            const chromeSettings = {
                secretId: settings.api_secret_id || '',
                secretKey: settings.api_secret_key || '',
                sourceLanguage: settings.source_language || 'auto',
                targetLanguage: settings.default_target_lang || 'zh',
                projectId: settings.api_project_id || 0,
                showTranslateButton: settings.show_translate_button !== false
            };

            await chrome.runtime.sendMessage({
                action: 'saveSettings',
                settings: chromeSettings
            });
        } catch (error) {
            console.error('同步API配置到扩展失败:', error);
        }
    },

    // 加载本地历史数量
    async loadLocalHistoryCount() {
        try {
            const localHistory = await DatabaseService.getLocalTranslationHistory();
            const countElement = document.getElementById('localHistoryCount');
            if (countElement) {
                countElement.textContent = `${localHistory.length} 条`;
            }
        } catch (error) {
            console.error('获取本地历史数量失败:', error);
        }
    },

    // 同步本地历史到云端
    async syncLocalHistory() {
        const syncButton = document.getElementById('syncButton');
        const countElement = document.getElementById('localHistoryCount');

        if (!syncButton) return;

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
                if (countElement) {
                    countElement.textContent = `同步中: ${current}/${total}`;
                }
            });

            if (result.success) {
                if (countElement) {
                    countElement.textContent = result.message || '同步完成';
                }
                await this.loadLocalHistoryCount();
                TranslatorUtils.showNotification(result.message || '同步成功', 'success');
            } else {
                if (countElement) {
                    countElement.textContent = '同步失败';
                }
                TranslatorUtils.showNotification(`同步失败: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('同步出错:', error);
            TranslatorUtils.showNotification(`同步出错: ${error.message}`, 'error');
        } finally {
            syncButton.disabled = false;
            syncButton.innerHTML = originalHTML;
        }
    },

    // 加载单词统计
    async loadMemoryStats() {
        const result = await DatabaseService.getMemoryStats();
        if (result.success && result.data) {
            const totalWordsEl = document.getElementById('totalWords');
            const dueWordsEl = document.getElementById('dueWords');
            const masteredWordsEl = document.getElementById('masteredWords');

            if (totalWordsEl) totalWordsEl.textContent = result.data.total;
            if (dueWordsEl) dueWordsEl.textContent = result.data.due;
            if (masteredWordsEl) masteredWordsEl.textContent = result.data.mastered;
        }
    },

    // 加载API设置
    async loadApiSettings() {
        try {
            const apiSecretIdInput = document.getElementById('apiSecretId');
            const apiSecretKeyInput = document.getElementById('apiSecretKey');
            const apiProjectIdInput = document.getElementById('apiProjectId');

            const result = await DatabaseService.getUserSettings();

            if (result.success && result.data) {
                const settings = result.data;
                if (apiSecretIdInput) apiSecretIdInput.value = settings.api_secret_id || '';
                if (apiSecretKeyInput) apiSecretKeyInput.value = settings.api_secret_key || '';
                if (apiProjectIdInput) apiProjectIdInput.value = settings.api_project_id || 0;

                if (settings.api_secret_id && settings.api_secret_key) {
                    await this.syncApiSettingsToExtension(settings);
                }
            }
        } catch (error) {
            console.error('加载API配置失败:', error);
        }
    },

    // 绑定Supabase配置相关事件
    bindSupabaseConfigEvents() {
        const saveBtn = document.getElementById('saveSupabaseConfig');
        const testBtn = document.getElementById('testSupabaseConnection');
        const urlInput = document.getElementById('supabaseUrl');
        const keyInput = document.getElementById('supabaseAnonKey');
        const messageDiv = document.getElementById('supabaseConfigMessage');
        const testResultDiv = document.getElementById('supabaseTestResult');

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const url = urlInput?.value?.trim();
                const key = keyInput?.value?.trim();

                if (!url || !key) {
                    this.showSupabaseMessage('请填写完整的URL和Key', 'error');
                    return;
                }

                // 验证URL格式
                if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
                    this.showSupabaseMessage('URL格式不正确，应为 https://xxx.supabase.co', 'error');
                    return;
                }

                try {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<span>保存中...</span>';

                    // 保存到chrome.storage
                    await window.SupabaseConfigManager.save(url, key);

                    this.showSupabaseMessage('配置已保存，正在重新初始化...', 'success');

                    // 重新初始化Supabase客户端
                    setTimeout(async () => {
                        try {
                            // 创建新的Supabase客户端
                            const newClient = window.supabase.createClient(url, key);
                            window.supabaseClient = newClient;

                            // 更新配置状态显示
                            const statusElement = document.getElementById('supabaseConfigStatus');
                            if (statusElement) {
                                statusElement.textContent = '已配置';
                            }

                            this.showSupabaseMessage('配置保存成功！', 'success');
                        } catch (error) {
                            this.showSupabaseMessage('重新初始化失败: ' + error.message, 'error');
                        } finally {
                            saveBtn.disabled = false;
                            saveBtn.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 1v6M8 7l2-2M8 7l-2-2M13 11v1a3 3 0 01-6 0v-2M3 11v1a3 3 0 006 0v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                <span>保存配置</span>
                            `;
                        }
                    }, 500);
                } catch (error) {
                    this.showSupabaseMessage('保存失败: ' + error.message, 'error');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1v6M8 7l2-2M8 7l-2-2M13 11v1a3 3 0 01-6 0v-2M3 11v1a3 3 0 006 0v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <span>保存配置</span>
                    `;
                }
            });
        }

        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                const url = urlInput?.value?.trim();
                const key = keyInput?.value?.trim();

                if (!url || !key) {
                    this.showSupabaseTestResult('请先保存配置', 'error');
                    return;
                }

                try {
                    testBtn.disabled = true;
                    testBtn.innerHTML = '<span>测试中...</span>';

                    // 使用当前输入的配置创建临时客户端测试
                    const tempClient = window.supabase.createClient(url, key);

                    // 尝试获取session来测试连接
                    const { data, error } = await tempClient.auth.getSession();

                    if (error) {
                        this.showSupabaseTestResult('连接失败: ' + error.message, 'error');
                    } else {
                        this.showSupabaseTestResult('连接成功！Supabase配置正确。', 'success');
                    }
                } catch (error) {
                    this.showSupabaseTestResult('连接测试失败: ' + error.message, 'error');
                } finally {
                    testBtn.disabled = false;
                    testBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1.333A6.667 6.667 0 1 0 14.667 8 6.667 6.667 0 0 0 8 1.333zm3.333 5.334L7 10.667 4.667 8.334" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>测试连接</span>
                    `;
                }
            });
        }

        // 加载已保存的配置
        this.loadSupabaseConfig();
    },

    // 加载Supabase配置
    async loadSupabaseConfig() {
        try {
            const config = await window.SupabaseConfigManager.get();
            const urlInput = document.getElementById('supabaseUrl');
            const keyInput = document.getElementById('supabaseAnonKey');
            const statusElement = document.getElementById('supabaseConfigStatus');

            if (urlInput) urlInput.value = config.url || '';
            if (keyInput) keyInput.value = config.anonKey || '';

            if (statusElement) {
                if (config.url && config.anonKey) {
                    statusElement.textContent = '已配置';
                } else {
                    statusElement.textContent = '未配置';
                }
            }
        } catch (error) {
            console.error('加载Supabase配置失败:', error);
        }
    },

    // 显示Supabase配置消息
    showSupabaseMessage(message, type = 'success') {
        const messageDiv = document.getElementById('supabaseConfigMessage');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.textContent = message;
            messageDiv.style.background = type === 'success' ? '#d1fae5' : '#fee';
            messageDiv.style.color = type === 'success' ? '#065f46' : '#c53030';

            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    },

    // 显示Supabase测试结果
    showSupabaseTestResult(message, type = 'success') {
        const resultDiv = document.getElementById('supabaseTestResult');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.textContent = message;
            resultDiv.style.background = type === 'success' ? '#d1fae5' : '#fee';
            resultDiv.style.color = type === 'success' ? '#065f46' : '#c53030';

            setTimeout(() => {
                resultDiv.style.display = 'none';
            }, 5000);
        }
    }
};

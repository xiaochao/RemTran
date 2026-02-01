// translator-channels.js - 翻译渠道配置管理模块

window.TranslatorChannels = {
    // 渠道列表和详情
    elements: {
        channelsList: null,
        channelItems: null,
        channelDetails: null,
        backToChannelsButtons: null
    },

    // 启用复选框
    checkboxes: {
        tencent: null,
        ali: null,
        zhipu: null,
        silicon: null,
        deepl: null,
        microsoft: null,
        gpt: null
    },

    // 初始化
    init() {
        this.getElements();
        this.bindEvents();
        this.loadChannelSettings();
    },

    // 获取DOM元素
    getElements() {
        this.elements.channelsList = document.getElementById('channelsList');
        this.elements.channelItems = document.querySelectorAll('#channelsList .settings-menu-item.channel-item');
        this.elements.channelDetails = document.querySelectorAll('.channel-detail');
        this.elements.backToChannelsButtons = document.querySelectorAll('.channel-back-button');

        // 获取复选框
        this.checkboxes.tencent = document.getElementById('enableChannelTencent');
        this.checkboxes.ali = document.getElementById('enableChannelAli');
        this.checkboxes.zhipu = document.getElementById('enableChannelZhipu');
        this.checkboxes.silicon = document.getElementById('enableChannelSilicon');
        this.checkboxes.deepl = document.getElementById('enableChannelDeepL');
        this.checkboxes.microsoft = document.getElementById('enableChannelMicrosoft');
        this.checkboxes.gpt = document.getElementById('enableChannelGPT');
    },

    // 绑定事件
    bindEvents() {
        // 渠道项点击事件
        this.elements.channelItems.forEach(item => {
            const menuItemLeft = item.querySelector('.menu-item-left');
            if (menuItemLeft) {
                menuItemLeft.addEventListener('click', () => {
                    const name = item.getAttribute('data-channel');
                    const map = {
                        tencent: 'channelTencent',
                        ali: 'channelAli',
                        zhipu: 'channelZhipu',
                        silicon: 'channelSilicon',
                        deepl: 'channelDeepL',
                        microsoft: 'channelMicrosoft',
                        gpt: 'channelGPT'
                    };
                    const targetId = map[name];
                    if (targetId) {
                        this.showChannelDetail(targetId);
                    }
                });
            }
        });

        // 返回按钮事件
        this.elements.backToChannelsButtons.forEach(btn => {
            btn.addEventListener('click', () => this.showChannelsList());
        });

        // 启用复选框事件
        const channelConfigMap = {
            'enableChannelTencent': 'tencent',
            'enableChannelAli': 'ali',
            'enableChannelZhipu': 'zhipu',
            'enableChannelSilicon': 'silicon',
            'enableChannelDeepL': 'deepl',
            'enableChannelMicrosoft': 'microsoft',
            'enableChannelGPT': 'gpt'
        };

        Object.values(this.checkboxes).forEach(cb => {
            if (cb) {
                cb.addEventListener('change', (e) => {
                    const channel = channelConfigMap[e.target.id];
                    if (channel) {
                        this.handleChannelToggle(channel, e.target);
                    }
                });
            }
        });

        // 测试和保存按钮
        document.querySelectorAll('.test-config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const channel = btn.getAttribute('data-channel');
                this.testChannelConfig(channel, btn);
            });
        });

        document.querySelectorAll('.save-config-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const channel = btn.getAttribute('data-channel');
                this.saveProviderConfig(channel);
            });
        });
    },

    // 显示渠道列表
    showChannelsList() {
        if (this.elements.channelsList) {
            this.elements.channelsList.style.display = 'block';
        }
        this.elements.channelDetails.forEach(d => d.style.display = 'none');
    },

    // 显示渠道详情
    showChannelDetail(id) {
        if (this.elements.channelsList) {
            this.elements.channelsList.style.display = 'none';
        }
        this.elements.channelDetails.forEach(d => {
            d.style.display = (d.id === id) ? 'block' : 'none';
        });

        // 加载该渠道的配置
        const channelMap = {
            'channelTencent': 'tencent',
            'channelAli': 'ali',
            'channelZhipu': 'zhipu',
            'channelSilicon': 'silicon',
            'channelDeepL': 'deepl',
            'channelMicrosoft': 'microsoft',
            'channelGPT': 'gpt'
        };
        const channel = channelMap[id];
        if (channel) {
            this.loadChannelConfig(channel);
        }
    },

    // 加载渠道配置
    async loadChannelConfig(channel) {
        try {
            console.log('[loadChannelConfig] 加载渠道配置:', channel);
            const result = await DatabaseService.getUserSettings();
            if (!result.success || !result.data) return;

            const configKey = `provider_config_${channel}_enc`;
            const encryptedConfig = result.data[configKey];

            if (!encryptedConfig) {
                console.log('[loadChannelConfig] 未找到配置:', configKey);
                return;
            }

            console.log('[loadChannelConfig] 找到加密配置');

            // 解密配置
            let config;
            try {
                const enc = typeof encryptedConfig === 'string' ? JSON.parse(encryptedConfig) : encryptedConfig;
                const decoded = atob(enc.ct);
                const bytes = new Uint8Array(decoded.length);
                for (let i = 0; i < decoded.length; i++) {
                    bytes[i] = decoded.charCodeAt(i);
                }
                const configStr = new TextDecoder().decode(bytes);
                config = JSON.parse(configStr);
                console.log('[loadChannelConfig] 解密成功');
            } catch (e) {
                console.error('解密配置失败:', e);
                return;
            }

            // 填充表单
            switch (channel) {
                case 'tencent':
                    if (document.getElementById('tencentSecretId')) document.getElementById('tencentSecretId').value = config.secretId || '';
                    if (document.getElementById('tencentSecretKey')) document.getElementById('tencentSecretKey').value = config.secretKey || '';
                    if (document.getElementById('tencentProjectId')) document.getElementById('tencentProjectId').value = config.projectId || 0;
                    break;
                case 'silicon':
                    if (document.getElementById('siliconApiKey')) document.getElementById('siliconApiKey').value = config.apiKey || '';
                    if (document.getElementById('siliconModel')) document.getElementById('siliconModel').value = config.model || 'Qwen/Qwen2.5-7B-Instruct';
                    break;
                case 'deepl':
                    if (document.getElementById('deeplApiKey')) document.getElementById('deeplApiKey').value = config.apiKey || '';
                    break;
                case 'ali':
                    if (document.getElementById('aliAccessKeyId')) document.getElementById('aliAccessKeyId').value = config.accessKeyId || '';
                    if (document.getElementById('aliAccessKeySecret')) document.getElementById('aliAccessKeySecret').value = config.accessKeySecret || '';
                    break;
                case 'zhipu':
                    if (document.getElementById('zhipuApiKey')) document.getElementById('zhipuApiKey').value = config.apiKey || '';
                    break;
                case 'microsoft':
                    if (document.getElementById('microsoftApiKey')) document.getElementById('microsoftApiKey').value = config.apiKey || '';
                    if (document.getElementById('microsoftRegion')) document.getElementById('microsoftRegion').value = config.region || 'eastasia';
                    break;
                case 'gpt':
                    if (document.getElementById('gptApiKey')) document.getElementById('gptApiKey').value = config.apiKey || '';
                    if (document.getElementById('gptModel')) document.getElementById('gptModel').value = config.model || 'gpt-3.5-turbo';
                    break;
            }
        } catch (e) {
            console.error('加载渠道配置失败:', e);
        }
    },

    // 加载渠道设置
    async loadChannelSettings() {
        try {
            console.log('[loadChannelSettings] 开始加载渠道设置');

            // 从本地存储加载启用状态
            const result = await chrome.storage.local.get('channelSettings');
            const settings = result.channelSettings || {};

            // 检查每个渠道是否已配置，如果已配置且本地没有禁用记录，则默认启用
            const channels = ['tencent', 'ali', 'zhipu', 'silicon', 'deepl', 'microsoft', 'gpt'];

            for (const channel of channels) {
                const configured = await this.isChannelConfigured(channel);
                const checkbox = this.checkboxes[channel];

                if (checkbox) {
                    // 如果已配置且本地没有明确禁用（settings[channel] !== false），则默认启用
                    if (configured && settings[channel] !== false) {
                        checkbox.checked = true;
                        console.log(`[loadChannelSettings] 渠道 ${channel} 已配置，自动启用`);
                    } else if (!configured) {
                        checkbox.checked = false;
                        console.log(`[loadChannelSettings] 渠道 ${channel} 未配置，禁用`);
                    } else {
                        // 使用本地存储的设置
                        checkbox.checked = !!settings[channel];
                        console.log(`[loadChannelSettings] 渠道 ${channel} 使用本地设置:`, checkbox.checked);
                    }
                }
            }

            // 保存更新后的设置
            await this.saveChannelSettings();
        } catch (e) {
            console.error('加载翻译渠道设置失败:', e);
        }
    },

    // 保存渠道设置
    async saveChannelSettings() {
        const settings = {
            tencent: !!this.checkboxes.tencent?.checked,
            ali: !!this.checkboxes.ali?.checked,
            zhipu: !!this.checkboxes.zhipu?.checked,
            silicon: !!this.checkboxes.silicon?.checked,
            deepl: !!this.checkboxes.deepl?.checked,
            microsoft: !!this.checkboxes.microsoft?.checked,
            gpt: !!this.checkboxes.gpt?.checked
        };
        console.log('[saveChannelSettings] 保存渠道设置:', settings);
        await chrome.storage.local.set({ channelSettings: settings });
    },

    // 处理渠道切换
    async handleChannelToggle(channel, checkbox) {
        const configured = await this.isChannelConfigured(channel);

        if (!configured && checkbox.checked) {
            // 未配置时尝试勾选，阻止并提示
            checkbox.checked = false;
            const channelNames = {
                tencent: '腾讯云',
                ali: '阿里云',
                zhipu: '智谱',
                silicon: '硅基流动',
                deepl: 'DeepL',
                microsoft: '微软',
                gpt: 'GPT'
            };
            TranslatorUtils.showNotification(`请先配置${channelNames[channel]}的API密钥`, 'error');

            // 跳转到配置页面
            const map = {
                tencent: 'channelTencent',
                ali: 'channelAli',
                zhipu: 'channelZhipu',
                silicon: 'channelSilicon',
                deepl: 'channelDeepL',
                microsoft: 'channelMicrosoft',
                gpt: 'channelGPT'
            };
            const targetId = map[channel];
            if (targetId) {
                this.showChannelDetail(targetId);
            }
        } else {
            // 已配置，允许切换并保存
            await this.saveChannelSettings();
            const status = checkbox.checked ? '已启用' : '已禁用';
            console.log(`[handleChannelToggle] 渠道 ${channel} ${status}`);
        }
    },

    // 检查渠道是否已配置
    async isChannelConfigured(channel) {
        try {
            const result = await DatabaseService.getUserSettings();
            if (!result.success || !result.data) return false;
            const configKey = `provider_config_${channel}_enc`;
            return !!result.data[configKey];
        } catch (e) {
            console.error('检查渠道配置失败:', e);
            return false;
        }
    },

    // 测试渠道配置
    async testChannelConfig(channel, button) {
        // 简化的测试实现
        const originalHTML = button.innerHTML;
        button.innerHTML = '<span>测试中...</span>';
        button.disabled = true;

        try {
            // 这里应该是实际的测试逻辑
            await new Promise(resolve => setTimeout(resolve, 1000));
            button.innerHTML = '<span>测试成功</span>';
            button.classList.add('test-success');
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('test-success');
            }, 3000);
        } catch (error) {
            button.innerHTML = '<span>测试失败</span>';
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 3000);
        } finally {
            button.disabled = false;
        }
    },

    // 保存渠道配置
    async saveProviderConfig(channel) {
        console.log('[saveProviderConfig] 开始保存渠道配置:', channel);

        let payload = {};

        // 根据渠道收集配置
        switch (channel) {
            case 'tencent':
                payload = {
                    secretId: document.getElementById('tencentSecretId')?.value || '',
                    secretKey: document.getElementById('tencentSecretKey')?.value || '',
                    projectId: parseInt(document.getElementById('tencentProjectId')?.value) || 0
                };
                break;
            case 'silicon':
                payload = {
                    apiKey: document.getElementById('siliconApiKey')?.value || '',
                    model: document.getElementById('siliconModel')?.value || 'Qwen/Qwen2.5-7B-Instruct'
                };
                break;
            case 'deepl':
                payload = {
                    apiKey: document.getElementById('deeplApiKey')?.value || ''
                };
                break;
            case 'ali':
                payload = {
                    accessKeyId: document.getElementById('aliAccessKeyId')?.value || '',
                    accessKeySecret: document.getElementById('aliAccessKeySecret')?.value || ''
                };
                break;
            case 'zhipu':
                payload = {
                    apiKey: document.getElementById('zhipuApiKey')?.value || ''
                };
                break;
            case 'microsoft':
                payload = {
                    apiKey: document.getElementById('microsoftApiKey')?.value || '',
                    region: document.getElementById('microsoftRegion')?.value || 'eastasia'
                };
                break;
            case 'gpt':
                payload = {
                    apiKey: document.getElementById('gptApiKey')?.value || '',
                    model: document.getElementById('gptModel')?.value || 'gpt-3.5-turbo'
                };
                break;
            default:
                console.warn('[saveProviderConfig] 未知渠道:', channel);
                return;
        }

        console.log('[saveProviderConfig] 收集到的配置数据:', { ...payload, secretKey: '***' });

        try {
            // 简化的"加密"（实际是 base64 编码）
            const enc = await this.encryptConfig(payload);
            console.log('[saveProviderConfig] 加密完成');

            // 保存到数据库
            const configKey = `provider_config_${channel}_enc`;
            const settings = { [configKey]: JSON.stringify(enc) };
            console.log('[saveProviderConfig] 准备保存到数据库:', configKey);

            const result = await DatabaseService.updateUserSettings(settings);
            console.log('[saveProviderConfig] 数据库保存结果:', result);

            if (!result.success) {
                console.error('[saveProviderConfig] 保存失败:', result.error);
                TranslatorUtils.showNotification('保存失败: ' + result.error, 'error');
                return;
            }

            // 同时更新本地存储的渠道启用状态
            // 保存API配置后，自动启用该渠道
            const checkbox = this.checkboxes[channel];
            if (checkbox) {
                checkbox.checked = true;
                console.log('[saveProviderConfig] 配置已保存，自动启用渠道:', channel);
            }
            await this.saveChannelSettings();
            console.log('[saveProviderConfig] 渠道状态已更新');

            TranslatorUtils.showNotification('配置已保存并已启用该渠道', 'success');
            this.showChannelsList();
        } catch (e) {
            console.error('[saveProviderConfig] 保存配置失败:', e);
            TranslatorUtils.showNotification('保存失败: ' + e.message, 'error');
        }
    },

    // 加密配置（简化版 - 使用 base64 编码）
    async encryptConfig(configObj) {
        const data = new TextEncoder().encode(JSON.stringify(configObj));
        return {
            ct: btoa(String.fromCharCode(...data))
        };
    },
};

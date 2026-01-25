// Supabase 配置文件
// 从本地存储读取配置，如果没有配置则使用默认值或从 config.js 读取

// 获取 Supabase 配置（异步函数）
async function getSupabaseConfig() {
    try {
        // 尝试从本地存储获取配置
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get(['supabaseUrl', 'supabaseAnonKey'], (result) => {
                    if (result.supabaseUrl && result.supabaseAnonKey) {
                        resolve({
                            url: result.supabaseUrl,
                            anonKey: result.supabaseAnonKey,
                            projectId: extractProjectId(result.supabaseUrl)
                        });
                    } else {
                        // 如果本地存储没有配置，尝试从 config.js 读取
                        if (typeof CONFIG !== 'undefined' && CONFIG.supabase) {
                            resolve(CONFIG.supabase);
                        } else {
                            // 使用默认值
                            resolve({
                                url: 'https://hpowmoxpanobgutruvij.supabase.co',
                                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3dtb3hwYW5vYmd1dHJ1dmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU5ODEsImV4cCI6MjA3Njg4MTk4MX0.rmSWwdYcwjmIy786Kt8HYhFI7bTybGTYkgAwzSQktzc',
                                projectId: 'hpowmoxpanobgutruvij'
                            });
                        }
                    }
                });
            });
        } else {
            // 非 Chrome 扩展环境，使用 localStorage
            const url = localStorage.getItem('supabaseUrl');
            const key = localStorage.getItem('supabaseAnonKey');

            if (url && key) {
                return {
                    url: url,
                    anonKey: key,
                    projectId: extractProjectId(url)
                };
            } else {
                // 尝试从 config.js 读取
                if (typeof CONFIG !== 'undefined' && CONFIG.supabase) {
                    return CONFIG.supabase;
                } else {
                    // 使用默认值
                    return {
                        url: 'https://hpowmoxpanobgutruvij.supabase.co',
                        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3dtb3hwYW5vYmd1dHJ1dmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU5ODEsImV4cCI6MjA3Njg4MTk4MX0.rmSWwdYcwjmIy786Kt8HYhFI7bTybGTYkgAwzSQktzc',
                        projectId: 'hpowmoxpanobgutruvij'
                    };
                }
            }
        }
    } catch (error) {
        console.error('获取 Supabase 配置失败:', error);
        // 返回默认配置
        return {
            url: 'https://hpowmoxpanobgutruvij.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3dtb3hwYW5vYmd1dHJ1dmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU5ODEsImV4cCI6MjA3Njg4MTk4MX0.rmSWwdYcwjmIy786Kt8HYhFI7bTybGTYkgAwzSQktzc',
            projectId: 'hpowmoxpanobgutruvij'
        };
    }
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

// 保存 Supabase 配置到本地存储
async function saveSupabaseConfig(url, anonKey) {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve, reject) => {
                chrome.storage.local.set({
                    supabaseUrl: url,
                    supabaseAnonKey: anonKey
                }, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            });
        } else {
            localStorage.setItem('supabaseUrl', url);
            localStorage.setItem('supabaseAnonKey', anonKey);
        }
    } catch (error) {
        console.error('保存 Supabase 配置失败:', error);
        throw error;
    }
}

// 检查是否配置了 Supabase
async function hasSupabaseConfig() {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get(['supabaseUrl', 'supabaseAnonKey'], (result) => {
                    resolve(!!(result.supabaseUrl && result.supabaseAnonKey));
                });
            });
        } else {
            const url = localStorage.getItem('supabaseUrl');
            const key = localStorage.getItem('supabaseAnonKey');
            return !!(url && key);
        }
    } catch (error) {
        console.error('检查 Supabase 配置失败:', error);
        return false;
    }
}

// 同步获取配置（用于初始化，如果没有则返回默认值）
function getSupabaseConfigSync() {
    // 如果从 config.js 读取到了配置，使用它
    if (typeof CONFIG !== 'undefined' && CONFIG.supabase) {
        return CONFIG.supabase;
    }

    // 否则返回默认配置
    return {
        url: 'https://hpowmoxpanobgutruvij.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3dtb3hwYW5vYmd1dHJ1dmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU5ODEsImV4cCI6MjA3Njg4MTk4MX0.rmSWwdYcwjmIy786Kt8HYhFI7bTybGTYkgAwzSQktzc',
        projectId: 'hpowmoxpanobgutruvij'
    };
}

// 使用同步方式初始化 Supabase 客户端（使用默认配置或 config.js 的配置）
const SUPABASE_CONFIG = getSupabaseConfigSync();

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// 导出供其他文件使用
window.supabaseClient = supabase;

// 导出配置管理函数
window.SupabaseConfigManager = {
    get: getSupabaseConfig,
    save: saveSupabaseConfig,
    hasConfig: hasSupabaseConfig,
    extractProjectId: extractProjectId
};

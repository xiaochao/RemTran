// Supabase 配置文件示例
// 复制此文件为 config.js 并填入你的实际配置
// config.js 已在 .gitignore 中，不会被提交到 Git

const CONFIG = {
    supabase: {
        url: 'https://your-project-id.supabase.co',
        anonKey: 'your-anon-key-here',
        projectId: 'your-project-id'
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

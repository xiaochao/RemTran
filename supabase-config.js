// Supabase 配置文件
// 从 config.js 读取配置（需要在 HTML 中先引入 config.js）
const SUPABASE_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase : {
    url: 'https://hpowmoxpanobgutruvij.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwb3dtb3hwYW5vYmd1dHJ1dmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDU5ODEsImV4cCI6MjA3Njg4MTk4MX0.rmSWwdYcwjmIy786Kt8HYhFI7bTybGTYkgAwzSQktzc'
};

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// 导出供其他文件使用
window.supabaseClient = supabase;

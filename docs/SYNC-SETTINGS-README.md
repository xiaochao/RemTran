# 跨平台设置同步配置说明

## 概述

所有用户设置（包括API配置、翻译偏好等）现在都保存在Supabase云端，实现跨设备同步。

## 数据库配置步骤

### 1. 执行完整初始化脚本

**重要**: 项目现已整合所有SQL脚本为一个完整文件 `database-init-complete.sql`

在Supabase控制台执行此脚本：

1. 登录 [Supabase控制台](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧菜单的 "SQL Editor"
4. 点击 "New query"
5. 复制 `database-init-complete.sql` 的全部内容
6. 点击 "Run" 执行
7. 等待执行完成，检查是否有错误

### 2. 验证数据库配置

执行以下SQL检查表是否正确创建：

```sql
-- 检查所有表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'user_settings', 'translation_history');

-- 检查 user_settings 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;
```

应该看到以下字段：
- `id` (UUID)
- `user_id` (UUID)
- `api_secret_id` (TEXT)
- `api_secret_key` (TEXT)
- `api_project_id` (INTEGER)
- `default_target_lang` (TEXT)
- `source_language` (TEXT)
- `auto_translate` (BOOLEAN)
- `selection_translate` (BOOLEAN)
- `shortcut_translate` (BOOLEAN)
- `auto_detect_language` (BOOLEAN)
- `show_phonetic` (BOOLEAN)
- `show_examples` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 用户使用流程

### 首次使用

1. 用户注册/登录账号
2. 进入"设置" → "API配置"
3. 输入腾讯云 SecretId 和 SecretKey
4. 点击"保存配置"
5. 设置自动保存到Supabase并同步到Chrome扩展

### 在新设备使用

1. 在新设备安装Chrome扩展
2. 打开扩展并登录（使用相同账号）
3. 系统自动从Supabase加载所有设置
4. API配置自动同步到Chrome扩展存储
5. 立即可以使用划词翻译功能

### 修改设置

1. 在任何设备修改设置
2. 设置立即保存到Supabase
3. 在其他已登录设备刷新页面即可获取最新设置

## 技术实现细节

### 保存设置流程

```
用户点击保存
    ↓
保存到 Supabase (user_settings表)
    ↓
同步到 Chrome Storage (chrome.storage.local)
    ↓
显示"已保存并同步"提示
```

### 加载设置流程

```
页面加载/用户登录
    ↓
从 Supabase 读取设置 (DatabaseService.getUserSettings)
    ↓
显示到UI界面
    ↓
同步API配置到 Chrome Storage (供background.js使用)
```

### 代码关键点

1. **API配置保存** (`translator-supabase.js:542-602`)
   - 保存到Supabase: `DatabaseService.updateUserSettings()`
   - 同步到Chrome: `syncApiSettingsToExtension()`

2. **设置加载** (`translator-supabase.js:358-395`)
   - 从Supabase加载: `DatabaseService.getUserSettings()`
   - 自动同步API配置到Chrome扩展

3. **通用设置保存** (`translator-supabase.js:397-422`)
   - 所有设置都保存到Supabase
   - API配置同时同步到Chrome

## 安全性说明

### API密钥加密（未来改进）

当前API密钥以明文形式存储在Supabase。建议的改进方案：

1. **客户端加密**: 使用用户密码派生的密钥加密API密钥
2. **服务端加密**: 在Supabase中启用列级加密
3. **密钥轮换**: 定期提醒用户更换API密钥

### 行级安全策略（RLS）

已配置RLS策略，确保：
- 用户只能访问自己的设置
- 防止未授权访问

## 故障排查

### 问题：设置无法同步

**解决方案**:
1. 检查网络连接
2. 确认已登录Supabase
3. 检查浏览器控制台错误
4. 验证Supabase项目配置

### 问题：划词翻译提示"请配置API密钥"

**解决方案**:
1. 在设置页面保存API配置
2. 刷新当前网页
3. 检查Chrome扩展是否已加载设置

### 问题：新设备无法获取设置

**解决方案**:
1. 确认使用相同账号登录
2. 检查Supabase数据库中是否有设置记录
3. 尝试退出登录后重新登录

## 相关文件

- `database-service.js` - Supabase数据库操作服务
- `translator-supabase.js` - 设置加载和保存逻辑
- `background.js` - Chrome扩展后台脚本（使用Chrome Storage）
- `database-schema-update.sql` - 数据库表结构更新脚本

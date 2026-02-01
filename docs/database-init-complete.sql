-- =============================================
-- 翻译助手 - 完整数据库初始化脚本
-- Supabase PostgreSQL
-- 版本: 2.0 (合并所有历史版本)
--
-- 说明: 在Supabase SQL编辑器中执行此脚本
-- 执行后将创建所有必要的表、索引、策略和触发器
-- =============================================

-- =============================================
-- 第一部分: 创建表结构
-- =============================================

-- 1. 用户扩展资料表
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    wechat_id TEXT,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 翻译历史记录表
CREATE TABLE IF NOT EXISTS public.translation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 用户设置表（包含所有设置字段）
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

    -- API配置
    api_secret_id TEXT,
    api_secret_key TEXT,
    api_project_id INTEGER DEFAULT 0,

    -- 翻译设置
    source_language TEXT DEFAULT 'auto',
    default_target_lang TEXT DEFAULT 'zh',

    -- 功能开关
    auto_detect_language BOOLEAN DEFAULT true,
    save_history BOOLEAN DEFAULT true,
    auto_translate BOOLEAN DEFAULT false,
    selection_translate BOOLEAN DEFAULT true,
    shortcut_translate BOOLEAN DEFAULT true,

    -- 显示设置
    show_phonetic BOOLEAN DEFAULT true,
    show_examples BOOLEAN DEFAULT false,

    -- 其他设置
    theme TEXT DEFAULT 'light',

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 第二部分: 如果表已存在，添加缺失的列
-- =============================================

DO $$
BEGIN
    -- 为 user_profiles 添加缺失字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='username') THEN
        ALTER TABLE public.user_profiles ADD COLUMN username TEXT;
    END IF;

    -- 为 user_settings 添加API配置字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='api_secret_id') THEN
        ALTER TABLE public.user_settings ADD COLUMN api_secret_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='api_secret_key') THEN
        ALTER TABLE public.user_settings ADD COLUMN api_secret_key TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='api_project_id') THEN
        ALTER TABLE public.user_settings ADD COLUMN api_project_id INTEGER DEFAULT 0;
    END IF;

    -- 为 user_settings 添加其他缺失字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='source_language') THEN
        ALTER TABLE public.user_settings ADD COLUMN source_language TEXT DEFAULT 'auto';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='theme') THEN
        ALTER TABLE public.user_settings ADD COLUMN theme TEXT DEFAULT 'light';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='save_history') THEN
        ALTER TABLE public.user_settings ADD COLUMN save_history BOOLEAN DEFAULT true;
    END IF;
END $$;

-- =============================================
-- 第三部分: 创建索引以提高查询性能
-- =============================================

-- user_profiles 索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- translation_history 索引
CREATE INDEX IF NOT EXISTS idx_translation_history_user_id ON public.translation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_history_created_at ON public.translation_history(created_at DESC);

-- user_settings 索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- =============================================
-- 第四部分: 启用行级安全策略 (RLS)
-- =============================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 第五部分: 创建 RLS 策略
-- =============================================

-- user_profiles 策略
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON public.user_profiles;
CREATE POLICY "用户可以查看自己的资料" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "用户可以更新自己的资料" ON public.user_profiles;
CREATE POLICY "用户可以更新自己的资料" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "用户可以插入自己的资料" ON public.user_profiles;
CREATE POLICY "用户可以插入自己的资料" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "用户可以删除自己的资料" ON public.user_profiles;
CREATE POLICY "用户可以删除自己的资料" ON public.user_profiles
    FOR DELETE USING (auth.uid() = id);

-- translation_history 策略
DROP POLICY IF EXISTS "用户可以查看自己的翻译历史" ON public.translation_history;
CREATE POLICY "用户可以查看自己的翻译历史" ON public.translation_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以插入自己的翻译历史" ON public.translation_history;
CREATE POLICY "用户可以插入自己的翻译历史" ON public.translation_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的翻译历史" ON public.translation_history;
CREATE POLICY "用户可以删除自己的翻译历史" ON public.translation_history
    FOR DELETE USING (auth.uid() = user_id);

-- user_settings 策略
DROP POLICY IF EXISTS "用户可以查看自己的设置" ON public.user_settings;
CREATE POLICY "用户可以查看自己的设置" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的设置" ON public.user_settings;
CREATE POLICY "用户可以更新自己的设置" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以插入自己的设置" ON public.user_settings;
CREATE POLICY "用户可以插入自己的设置" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的设置" ON public.user_settings;
CREATE POLICY "用户可以删除自己的设置" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 第六部分: 创建触发器函数
-- =============================================

-- 自动更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 新用户注册时自动创建资料和设置的函数
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- 创建用户资料
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, timezone('utc'::text, now()), timezone('utc'::text, now()))
    ON CONFLICT (id) DO NOTHING;

    -- 创建用户设置（使用默认值）
    INSERT INTO public.user_settings (user_id, created_at, updated_at)
    VALUES (NEW.id, timezone('utc'::text, now()), timezone('utc'::text, now()))
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 第七部分: 创建触发器
-- =============================================

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建自动更新 updated_at 的触发器
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建新用户自动初始化的触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- =============================================
-- 完成！数据库初始化成功
-- =============================================

/*
执行此脚本后，您的数据库将包含：

【表结构】
1. user_profiles - 用户扩展资料
   - 基本信息: email, phone, wechat_id, username, display_name
   - 头像: avatar_url
   - 时间戳: created_at, updated_at

2. translation_history - 翻译历史记录
   - 翻译内容: source_text, translated_text
   - 语言信息: source_language, target_language
   - 关联用户: user_id
   - 时间戳: created_at

3. user_settings - 用户设置（支持跨平台同步）
   - API配置: api_secret_id, api_secret_key, api_project_id
   - 翻译设置: source_language, default_target_lang
   - 功能开关: auto_detect_language, save_history, auto_translate,
                selection_translate, shortcut_translate
   - 显示设置: show_phonetic, show_examples
   - UI设置: theme
   - 时间戳: created_at, updated_at

【安全特性】
- 行级安全策略（RLS）已启用
- 用户只能访问自己的数据
- 防止未授权访问

【自动化功能】
- 新用户注册时自动创建 user_profiles 和 user_settings
- updated_at 字段自动更新
- 索引优化查询性能

【使用说明】
1. 在Supabase SQL编辑器中执行此脚本
2. 检查执行结果，确保没有错误
3. 测试用户注册功能，验证自动创建记录
4. 在应用中配置API密钥，测试跨平台同步
*/

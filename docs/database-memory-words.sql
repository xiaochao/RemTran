-- 背单词功能数据库表

-- 背单词进度表
CREATE TABLE IF NOT EXISTS memory_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,

    -- 艾宾浩斯记忆曲线相关字段
    memory_level INTEGER DEFAULT 0, -- 记忆等级 0-8
    review_count INTEGER DEFAULT 0, -- 复习次数
    correct_count INTEGER DEFAULT 0, -- 正确次数
    wrong_count INTEGER DEFAULT 0, -- 错误次数

    -- 复习时间
    last_review_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：每个用户的每个单词（原文+目标语言）唯一
    UNIQUE(user_id, source_text, target_language)
);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_memory_words_user_id ON memory_words(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_words_next_review ON memory_words(next_review_at);
CREATE INDEX IF NOT EXISTS idx_memory_words_user_review ON memory_words(user_id, next_review_at);

-- 背单词设置表（已存在于 user_settings 中，这里添加字段）
-- 这些字段将存储在 user_settings 表的 settings JSONB 字段中:
-- - memory_interval_hours: 复习间隔（小时）
-- - memory_words_per_session: 每次背诵数量

-- 添加注释
COMMENT ON TABLE memory_words IS '背单词进度表';
COMMENT ON COLUMN memory_words.memory_level IS '记忆等级 0-8，根据艾宾浩斯遗忘曲线';
COMMENT ON COLUMN memory_words.next_review_at IS '下次复习时间';

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memory_words_updated_at BEFORE UPDATE
    ON memory_words FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略（RLS）
ALTER TABLE memory_words ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的背单词记录
CREATE POLICY "Users can view own memory words"
    ON memory_words FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory words"
    ON memory_words FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory words"
    ON memory_words FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory words"
    ON memory_words FOR DELETE
    USING (auth.uid() = user_id);

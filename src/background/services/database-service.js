// Supabase 数据库服务
const DatabaseService = {
    // 获取 Supabase 客户端
    getClient() {
        return window.supabaseClient;
    },

    // ===== 翻译历史管理 =====

    // 保存翻译历史
    async saveTranslation(sourceText, translatedText, sourceLang, targetLang) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('translation_history')
                .insert([
                    {
                        user_id: user.id,
                        source_text: sourceText,
                        translated_text: translatedText,
                        source_language: sourceLang,
                        target_language: targetLang
                    }
                ])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('保存翻译历史失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取翻译历史列表
    async getTranslationHistory(limit = 50, offset = 0) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('translation_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('获取翻译历史失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 删除翻译历史记录
    async deleteTranslation(id) {
        try {
            const { error } = await this.getClient()
                .from('translation_history')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('删除翻译历史失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 清空所有翻译历史
    async clearAllHistory() {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { error } = await this.getClient()
                .from('translation_history')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('清空翻译历史失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 搜索翻译历史
    async searchTranslationHistory(keyword) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('translation_history')
                .select('*')
                .eq('user_id', user.id)
                .or(`source_text.ilike.%${keyword}%,translated_text.ilike.%${keyword}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('搜索翻译历史失败:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== 用户设置管理 =====

    // 获取用户设置
    async getUserSettings() {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // 如果没有设置记录，创建默认设置
                if (error.code === 'PGRST116') {
                    return await this.createDefaultSettings(user.id);
                }
                throw error;
            }

            return { success: true, data: data };
        } catch (error) {
            console.error('获取用户设置失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 创建默认设置
    async createDefaultSettings(userId) {
        try {
            const { data, error } = await this.getClient()
                .from('user_settings')
                .insert([{ user_id: userId }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('创建默认设置失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 更新用户设置
    async updateUserSettings(settings) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('user_settings')
                .update(settings)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('更新用户设置失败:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== 翻译历史统计 =====

    // 获取翻译历史统计信息
    async getTranslationStats() {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            // 获取总数
            const { count: totalCount, error: totalError } = await this.getClient()
                .from('translation_history')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (totalError) throw totalError;

            // 获取今日数量
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: todayCount, error: todayError } = await this.getClient()
                .from('translation_history')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', today.toISOString());

            if (todayError) throw todayError;

            // 获取最常用的目标语言
            const { data: langData, error: langError } = await this.getClient()
                .from('translation_history')
                .select('target_language')
                .eq('user_id', user.id);

            if (langError) throw langError;

            // 统计每种语言的使用次数
            const langCount = {};
            langData.forEach(item => {
                const lang = item.target_language;
                langCount[lang] = (langCount[lang] || 0) + 1;
            });

            // 找出最常用的语言
            let mostCommonLang = '简体中文';
            let maxCount = 0;
            for (const [lang, count] of Object.entries(langCount)) {
                if (count > maxCount) {
                    maxCount = count;
                    mostCommonLang = lang;
                }
            }

            return {
                success: true,
                data: {
                    total: totalCount || 0,
                    today: todayCount || 0,
                    commonLang: mostCommonLang
                }
            };
        } catch (error) {
            console.error('获取翻译统计失败:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== 用户资料管理 =====

    // 获取用户资料
    async getUserProfile() {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('获取用户资料失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 更新用户资料
    async updateUserProfile(profile) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('user_profiles')
                .upsert({
                    id: user.id,
                    ...profile,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('更新用户资料失败:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== 背单词管理 =====

    // 添加单词到记忆队列
    async addMemoryWord(sourceText, translatedText, sourceLang, targetLang) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('memory_words')
                .upsert({
                    user_id: user.id,
                    source_text: sourceText,
                    translated_text: translatedText,
                    source_language: sourceLang,
                    target_language: targetLang
                }, {
                    onConflict: 'user_id,source_text,target_language'
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('添加单词失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 批量添加单词到记忆队列（从翻译历史导入）
    async importHistoryToMemory(limit = 50) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            // 获取最近的翻译历史
            const { data: history, error: historyError } = await this.getClient()
                .from('translation_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (historyError) throw historyError;

            // 批量插入到记忆表
            const memoryWords = history.map(item => ({
                user_id: user.id,
                source_text: item.source_text,
                translated_text: item.translated_text,
                source_language: item.source_language,
                target_language: item.target_language
            }));

            const { data, error } = await this.getClient()
                .from('memory_words')
                .upsert(memoryWords, {
                    onConflict: 'user_id,source_text,target_language'
                })
                .select();

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('导入历史到记忆队列失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取待复习的单词
    async getDueWords(limit = 10) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            console.log('[getDueWords] 需要获取单词数量:', limit);

            const now = new Date().toISOString();

            // 1. 先获取已到期的单词
            const { data: dueData, error: dueError } = await this.getClient()
                .from('memory_words')
                .select('*')
                .eq('user_id', user.id)
                .lte('next_review_at', now)
                .order('next_review_at', { ascending: true })
                .limit(limit);

            if (dueError) throw dueError;

            console.log('[getDueWords] 已到期单词数量:', dueData?.length || 0);

            // 如果有足够的到期单词，直接返回
            if (dueData && dueData.length >= limit) {
                console.log('[getDueWords] 已到期单词足够，返回', dueData.length, '个');
                return { success: true, data: dueData };
            }

            // 2. 获取从未复习过的单词（next_review_at 为 null）
            const { data: newData, error: newError } = await this.getClient()
                .from('memory_words')
                .select('*')
                .eq('user_id', user.id)
                .is('next_review_at', null)
                .order('created_at', { ascending: true })
                .limit(limit - (dueData?.length || 0));

            if (newError) throw newError;

            console.log('[getDueWords] 未复习单词数量:', newData?.length || 0);

            // 合并到期单词和未复习单词
            let words = [...(dueData || []), ...(newData || [])];
            console.log('[getDueWords] 当前已获取单词数量:', words.length);

            // 3. 如果仍然不足，获取所有记忆单词中的其他单词
            if (words.length < limit) {
                const needed = limit - words.length;
                // 收集已获取的单词的 source_text 和 target_language 组合
                const excludePairs = new Set(words.map(w => `${w.source_text}|||${w.target_language}`));

                // 获取所有记忆单词
                const { data: allMemoryData, error: allMemoryError } = await this.getClient()
                    .from('memory_words')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('next_review_at', { ascending: true });

                if (!allMemoryError && allMemoryData) {
                    console.log('[getDueWords] 记忆单词表总数量:', allMemoryData.length);
                    // 过滤掉已包含的单词
                    const additionalWords = allMemoryData.filter(w =>
                        !excludePairs.has(`${w.source_text}|||${w.target_language}`) &&
                        !words.some(existing => existing.id === w.id)
                    ).slice(0, needed);
                    words = [...words, ...additionalWords];
                    console.log('[getDueWords] 从记忆单词补充后数量:', words.length);
                }
            }

            // 4. 如果记忆单词表仍然不足，从翻译历史中补充
            if (words.length < limit) {
                const needed = limit - words.length;
                const excludePairs = new Set(words.map(w => `${w.source_text}|||${w.target_language}`));

                console.log('[getDueWords] 需要从翻译历史补充:', needed, '个');

                // 从本地存储获取翻译历史
                const localHistory = await this.getLocalTranslationHistory();
                console.log('[getDueWords] 本地存储翻译历史数量:', localHistory.length);

                // 过滤掉已经包含的源文本和目标语言组合
                const uniqueHistory = localHistory.filter(h =>
                    !excludePairs.has(`${h.source_text}|||${h.target_language}`)
                );

                console.log('[getDueWords] 去重后可用历史数量:', uniqueHistory.length);

                // 转换格式使其与 memory_words 一致
                const historyWords = uniqueHistory.slice(0, needed).map((h, index) => ({
                    id: `local_${Date.now()}_${index}`, // 生成唯一的临时 ID
                    user_id: user.id,
                    source_text: h.source_text,
                    translated_text: h.translated_text,
                    source_language: h.source_language,
                    target_language: h.target_language,
                    memory_level: 0,
                    review_count: 0,
                    correct_count: 0,
                    wrong_count: 0,
                    next_review_at: null,
                    created_at: h.created_at,
                    is_temporary: true // 标记为临时单词
                }));

                words = [...words, ...historyWords];
                console.log('[getDueWords] 最终获取单词数量:', words.length);
            }

            return { success: true, data: words };
        } catch (error) {
            console.error('获取待复习单词失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 更新单词记忆状态
    async updateMemoryWord(wordId, isCorrect) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            // 检查是否是临时单词（从翻译历史中补充的）
            const isTemporary = wordId.toString().startsWith('history_');

            let currentWord;
            if (isTemporary) {
                // 临时单词不需要查询数据库，使用默认值
                currentWord = {
                    memory_level: 0,
                    review_count: 0,
                    correct_count: 0,
                    wrong_count: 0
                };
            } else {
                // 先获取当前单词状态
                const { data: wordData, error: fetchError } = await this.getClient()
                    .from('memory_words')
                    .select('*')
                    .eq('id', wordId)
                    .single();

                if (fetchError) throw fetchError;
                currentWord = wordData;
            }

            // 计算新的记忆等级和下次复习时间
            let newMemoryLevel = currentWord.memory_level || 0;
            let reviewCount = (currentWord.review_count || 0) + 1;
            let correctCount = currentWord.correct_count || 0;
            let wrongCount = currentWord.wrong_count || 0;

            if (isCorrect) {
                correctCount++;
                newMemoryLevel = Math.min(newMemoryLevel + 1, 8); // 最高8级
            } else {
                wrongCount++;
                newMemoryLevel = Math.max(newMemoryLevel - 1, 0); // 最低0级
            }

            // 艾宾浩斯遗忘曲线间隔（分钟）
            const intervals = [5, 30, 720, 1440, 2880, 5760, 10080, 21600]; // [5分钟, 30分钟, 12小时, 1天, 2天, 4天, 7天, 15天]
            const intervalMinutes = intervals[newMemoryLevel] || intervals[0];

            const nextReviewAt = new Date();
            nextReviewAt.setMinutes(nextReviewAt.getMinutes() + intervalMinutes);

            // 对于临时单词，需要先从 memory.js 传入完整信息进行插入
            // 这里我们假设临时单词已经在前端被添加到 memory_words 表
            // 所以直接尝试更新，如果失败则说明是临时单词

            let data, error;

            // 尝试更新数据库
            const updateResult = await this.getClient()
                .from('memory_words')
                .update({
                    memory_level: newMemoryLevel,
                    review_count: reviewCount,
                    correct_count: correctCount,
                    wrong_count: wrongCount,
                    last_review_at: new Date().toISOString(),
                    next_review_at: nextReviewAt.toISOString()
                })
                .eq('id', wordId)
                .select()
                .single();

            if (updateResult.error) {
                // 如果更新失败，说明可能是临时单词，返回成功但不做任何事
                // 因为临时单词会在下次复习时从数据库中正常获取
                return { success: true, data: null };
            }

            return { success: true, data: updateResult.data };
        } catch (error) {
            console.error('更新单词记忆状态失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取单词统计信息
    async getMemoryStats() {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const now = new Date().toISOString();

            // 获取总数
            const { count: totalCount, error: totalError } = await this.getClient()
                .from('memory_words')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (totalError) throw totalError;

            // 获取待复习数量
            const { count: dueCount, error: dueError } = await this.getClient()
                .from('memory_words')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .lte('next_review_at', now);

            if (dueError) throw dueError;

            // 获取已完成高记忆等级单词数量（level >= 5）
            const { count: masteredCount, error: masteredError } = await this.getClient()
                .from('memory_words')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('memory_level', 5);

            if (masteredError) throw masteredError;

            return {
                success: true,
                data: {
                    total: totalCount || 0,
                    due: dueCount || 0,
                    mastered: masteredCount || 0
                }
            };
        } catch (error) {
            console.error('获取单词统计失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取所有记忆单词（用于生成错误选项）
    async getAllMemoryWords() {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                throw new Error('用户未登录');
            }

            const { data, error } = await this.getClient()
                .from('memory_words')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('获取所有记忆单词失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取所有翻译历史记录（用于生成错误选项）
    async getAllTranslationHistory() {
        try {
            // 先从本地存储获取（如果有）
            const localHistory = await this.getLocalTranslationHistory();

            // 再从 Supabase 获取
            const supabaseHistory = await this.getSupabaseTranslationHistory();

            // 合并并去重（以本地存储为主）
            const combinedMap = new Map();

            // 先添加本地存储的历史
            localHistory.forEach(item => {
                const key = `${item.source_text}|||${item.target_language}`;
                combinedMap.set(key, item);
            });

            // 再添加 Supabase 的历史（不覆盖本地的）
            if (supabaseHistory.success && supabaseHistory.data) {
                supabaseHistory.data.forEach(item => {
                    const key = `${item.source_text}|||${item.target_language}`;
                    if (!combinedMap.has(key)) {
                        combinedMap.set(key, item);
                    }
                });
            }

            return { success: true, data: Array.from(combinedMap.values()) };
        } catch (error) {
            console.error('获取所有翻译历史失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 从本地存储获取翻译历史
    async getLocalTranslationHistory() {
        try {
            // 如果在 Chrome extension 环境中
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get('translationHistory');
                const history = result.translationHistory || [];

                // 转换格式以匹配 Supabase 格式
                return history
                    .map(item => ({
                        source_text: item.text || item.original || item.source_text || '',
                        translated_text: item.translation || item.translated_text || '',
                        source_language: item.from || item.source_language || 'auto',
                        target_language: item.to || item.target_language || 'zh',
                        created_at: item.timestamp || item.created_at || new Date().toISOString(),
                        is_local: true
                    }))
                    .filter(item => {
                        // 过滤掉无效记录（原文或译文为空）
                        const isValid = item.source_text && item.source_text.trim() &&
                                       item.translated_text && item.translated_text.trim();
                        if (!isValid) {
                            console.warn('过滤无效记录:', item);
                        }
                        return isValid;
                    });
            }
            return [];
        } catch (error) {
            console.warn('从本地存储获取翻译历史失败:', error);
            return [];
        }
    },

    // 从 Supabase 获取翻译历史
    async getSupabaseTranslationHistory() {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                return { success: true, data: [] };
            }

            const { data, error } = await this.getClient()
                .from('translation_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.warn('从 Supabase 获取翻译历史失败:', error);
            return { success: true, data: [] };
        }
    },

    // 同步本地翻译历史到云端
    async syncLocalHistoryToSupabase(onProgress) {
        try {
            const { data: { user } } = await this.getClient().auth.getUser();
            if (!user) {
                return { success: false, error: '用户未登录' };
            }

            // 1. 获取本地翻译历史
            const localHistory = await this.getLocalTranslationHistory();
            if (localHistory.length === 0) {
                return { success: true, synced: 0, message: '本地没有翻译历史记录' };
            }

            // 2. 获取云端已有的翻译历史
            const supabaseResult = await this.getSupabaseTranslationHistory();
            if (!supabaseResult.success) {
                return { success: false, error: '获取云端历史失败' };
            }

            // 3. 构建云端记录的唯一键集合，用于去重
            const supabaseKeys = new Set();
            supabaseResult.data.forEach(item => {
                supabaseKeys.add(`${item.source_text}|||${item.target_language}`);
            });

            // 4. 筛选出需要同步的记录（云端不存在的）
            const toSync = localHistory.filter(item =>
                !supabaseKeys.has(`${item.source_text}|||${item.target_language}`)
            );

            if (toSync.length === 0) {
                return { success: true, synced: 0, message: '所有记录已同步' };
            }

            // 5. 批量插入到云端
            const batchSize = 50;
            let syncedCount = 0;
            const total = toSync.length;

            for (let i = 0; i < total; i += batchSize) {
                const batch = toSync.slice(i, i + batchSize);
                const records = batch.map(item => ({
                    user_id: user.id,
                    source_text: item.source_text,
                    translated_text: item.translated_text,
                    source_language: item.source_language,
                    target_language: item.target_language
                }));

                const { error } = await this.getClient()
                    .from('translation_history')
                    .insert(records);

                if (error) {
                    console.error('同步批次失败:', error);
                    return {
                        success: false,
                        error: `同步失败: ${error.message}`,
                        synced: syncedCount
                    };
                }

                syncedCount += batch.length;

                // 调用进度回调
                if (onProgress) {
                    onProgress(syncedCount, total);
                }
            }

            return {
                success: true,
                synced: syncedCount,
                message: `成功同步 ${syncedCount} 条记录`
            };
        } catch (error) {
            console.error('同步翻译历史失败:', error);
            return { success: false, error: error.message };
        }
    }
};

// 导出供其他文件使用
window.DatabaseService = DatabaseService;

// Supabase 认证服务
const AuthService = {
    // 获取 Supabase 客户端
    getClient() {
        return window.supabaseClient;
    },

    // 邮箱密码登录
    async signInWithEmail(email, password) {
        try {
            const { data, error } = await this.getClient().auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('邮箱登录失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 手机号登录（使用 OTP）
    async signInWithPhone(phone, code) {
        try {
            // 验证验证码
            const { data, error } = await this.getClient().auth.verifyOtp({
                phone: phone,
                token: code,
                type: 'sms'
            });

            if (error) throw error;
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('手机号登录失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 发送手机验证码
    async sendPhoneOTP(phone) {
        try {
            const { data, error } = await this.getClient().auth.signInWithOtp({
                phone: phone
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('发送验证码失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 发送邮箱验证码
    async sendEmailOTP(email) {
        try {
            const { data, error } = await this.getClient().auth.signInWithOtp({
                email: email
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('发送验证码失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 邮箱验证码登录
    async signInWithEmailOTP(email, code) {
        try {
            const { data, error } = await this.getClient().auth.verifyOtp({
                email: email,
                token: code,
                type: 'email'
            });

            if (error) throw error;
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('邮箱验证码登录失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 注册新用户
    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await this.getClient().auth.signUp({
                email: email,
                password: password,
                options: {
                    data: userData
                }
            });

            if (error) throw error;
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('注册失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 退出登录
    async signOut() {
        try {
            const { error } = await this.getClient().auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('退出登录失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取当前用户
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.getClient().auth.getUser();
            if (error) throw error;
            return { success: true, user: user };
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 获取当前会话
    async getSession() {
        try {
            const { data: { session }, error } = await this.getClient().auth.getSession();
            if (error) throw error;
            return { success: true, session: session };
        } catch (error) {
            console.error('获取会话失败:', error);
            return { success: false, error: error.message };
        }
    },

    // 监听认证状态变化
    onAuthStateChange(callback) {
        return this.getClient().auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // Google 登录
    async signInWithGoogle() {
        try {
            const { data, error } = await this.getClient().auth.signInWithOAuth({
                provider: 'google'
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Google登录失败:', error);
            return { success: false, error: error.message };
        }
    }
};

// 导出供其他文件使用
window.AuthService = AuthService;

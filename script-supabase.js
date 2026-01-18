// 立即检查登录状态（在DOM加载前）
(async function checkAuthEarly() {
    // 添加超时和错误处理机制
    const SUPABASE_TIMEOUT = 10000; // 10秒超时

    // 创建超时Promise
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('连接超时')), SUPABASE_TIMEOUT);
    });

    try {
        // 竞速：认证检查 vs 超时
        const result = await Promise.race([
            AuthService.getSession(),
            timeoutPromise
        ]);

        if (result.success && result.session) {
            // 已登录，直接跳转到翻译器页面（不需要等待DOM）
            window.location.href = 'translator.html';
            return; // 阻止后续代码执行
        }

        // 未登录，显示登录界面
        showLoginInterface();
    } catch (error) {
        console.error('登录检查失败:', error);

        // 检查是否是网络或Supabase连接问题
        const isNetworkError = error.message.includes('连接超时') ||
                              error.message.includes('Failed to fetch') ||
                              error.message.includes('NetworkError');

        if (isNetworkError) {
            // 显示错误提示界面
            showErrorInterface();
        } else {
            // 其他错误也显示登录界面
            showLoginInterface();
        }
    }
})();

// 显示登录界面
function showLoginInterface() {
    function hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loginContainer = document.querySelector('.login-container');

        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        if (loginContainer) {
            loginContainer.classList.add('show');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideLoadingOverlay);
    } else {
        hideLoadingOverlay();
    }
}

// 显示错误界面
function showErrorInterface() {
    function showErrorMessage() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) return;

        // 修改加载界面为错误提示
        loadingOverlay.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        loadingOverlay.innerHTML = `
            <div style="text-align: center; color: white; padding: 20px;">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 20px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h2 style="font-size: 24px; margin-bottom: 10px;">连接失败</h2>
                <p style="font-size: 16px; margin-bottom: 20px; opacity: 0.9;">无法连接到服务器</p>
                <div style="font-size: 14px; opacity: 0.8; max-width: 300px; margin: 0 auto 20px;">
                    可能的原因：<br>
                    • 网络连接异常<br>
                    • Supabase 服务暂时不可用<br>
                    • 防火墙或代理设置问题
                </div>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #f5576c;
                    border: none;
                    padding: 12px 32px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    重新加载
                </button>
            </div>
        `;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showErrorMessage);
    } else {
        showErrorMessage();
    }
}

// 使用 Supabase 的登录逻辑
document.addEventListener('DOMContentLoaded', function() {

    // 标签切换功能
    const tabButtons = document.querySelectorAll('.tab-button');
    const emailInput = document.querySelector('.form-input[type="email"]');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const tabType = this.dataset.tab;
            updateInputPlaceholder(tabType);
        });
    });

    function updateInputPlaceholder(type) {
        const formLabel = document.querySelector('.form-label');

        switch(type) {
            case 'email':
                emailInput.type = 'email';
                emailInput.placeholder = '请输入邮箱地址';
                formLabel.textContent = '邮箱地址';
                break;
            case 'phone':
                emailInput.type = 'tel';
                emailInput.placeholder = '请输入手机号码';
                formLabel.textContent = '手机号码';
                break;
            case 'wechat':
                emailInput.type = 'text';
                emailInput.placeholder = '请输入微信号';
                formLabel.textContent = '微信号';
                break;
        }
    }

    // 登录类型切换（密码登录 vs 验证码登录）
    const switchButtons = document.querySelectorAll('.switch-button');
    const passwordGroup = document.querySelector('.password-group');
    const codeGroup = document.querySelector('.code-group');

    switchButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const loginType = this.dataset.type;
            if (loginType === 'password') {
                passwordGroup.style.display = 'flex';
                codeGroup.style.display = 'none';
            } else {
                passwordGroup.style.display = 'none';
                codeGroup.style.display = 'flex';
            }
        });
    });

    // 密码可见性切换
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('.password-group .form-input');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;

            const svg = this.querySelector('svg');
            if (type === 'text') {
                svg.innerHTML = `
                    <path d="M1.33334 8C1.33334 8 3.33334 3.33333 8.00001 3.33333C12.6667 3.33333 14.6667 8 14.6667 8C14.6667 8 12.6667 12.6667 8.00001 12.6667C3.33334 12.6667 1.33334 8 1.33334 8Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.33333"/>
                    <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round"/>
                `;
            } else {
                svg.innerHTML = `
                    <path d="M1.33334 8C1.33334 8 3.33334 3.33333 8.00001 3.33333C12.6667 3.33333 14.6667 8 14.6667 8C14.6667 8 12.6667 12.6667 8.00001 12.6667C3.33334 12.6667 1.33334 8 1.33334 8Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.33333"/>
                `;
            }
        });
    }

    // 发送验证码功能
    const sendCodeBtn = document.querySelector('.send-code');
    let countdown = 60;
    let countdownTimer = null;

    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async function() {
            if (this.disabled) return;

            const currentTab = document.querySelector('.tab-button.active').dataset.tab;
            const inputValue = emailInput.value.trim();

            if (!inputValue) {
                alert('请先输入' + (currentTab === 'email' ? '邮箱地址' : currentTab === 'phone' ? '手机号码' : '微信号'));
                return;
            }

            // 发送验证码
            this.textContent = '发送中...';
            this.disabled = true;

            let result;
            if (currentTab === 'email') {
                result = await AuthService.sendEmailOTP(inputValue);
            } else if (currentTab === 'phone') {
                result = await AuthService.sendPhoneOTP(inputValue);
            } else {
                alert('微信登录暂不支持验证码方式');
                this.disabled = false;
                this.textContent = '发送验证码';
                return;
            }

            if (result.success) {
                alert('验证码已发送，请查收！');

                // 开始倒计时
                countdown = 60;
                countdownTimer = setInterval(() => {
                    countdown--;
                    sendCodeBtn.textContent = `${countdown}秒后重试`;

                    if (countdown <= 0) {
                        clearInterval(countdownTimer);
                        sendCodeBtn.disabled = false;
                        sendCodeBtn.textContent = '发送验证码';
                    }
                }, 1000);
            } else {
                alert('发送验证码失败: ' + result.error);
                this.disabled = false;
                this.textContent = '发送验证码';
            }
        });
    }

    // 表单提交 - 使用 Supabase 认证
    const loginForm = document.querySelector('.login-form');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const currentTab = document.querySelector('.tab-button.active').dataset.tab;
        const loginType = document.querySelector('.switch-button.active').dataset.type;
        const inputValue = emailInput.value.trim();

        let credential = '';
        if (loginType === 'password') {
            credential = passwordInput.value;
        } else {
            credential = document.querySelector('.code-group .form-input').value;
        }

        // 基本验证
        if (!inputValue) {
            alert('请输入账号信息');
            return;
        }

        if (!credential) {
            alert('请输入' + (loginType === 'password' ? '密码' : '验证码'));
            return;
        }

        // 显示加载状态
        const submitBtn = this.querySelector('.submit-button');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '登录中...';
        submitBtn.disabled = true;

        let result;

        try {
            // 根据登录方式调用不同的认证方法
            if (currentTab === 'email') {
                if (loginType === 'password') {
                    result = await AuthService.signInWithEmail(inputValue, credential);
                } else {
                    result = await AuthService.signInWithEmailOTP(inputValue, credential);
                }
            } else if (currentTab === 'phone') {
                if (loginType === 'password') {
                    // 手机号暂不支持密码登录（需要配置）
                    alert('手机号登录请使用验证码方式');
                    result = { success: false };
                } else {
                    result = await AuthService.signInWithPhone(inputValue, credential);
                }
            } else {
                // 微信登录（暂不支持）
                alert('微信登录功能开发中...');
                result = { success: false };
            }

            if (result.success) {
                if (result.session && typeof chrome !== 'undefined' && chrome.storage) {
                    // 从 CONFIG 获取项目 ID，如果不存在则使用默认值
                    const projectId = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase.projectId : 'hpowmoxpanobgutruvij';
                    const storageKey = `sb-${projectId}-auth-token`;
                    const sessionData = JSON.stringify(result.session);
                    chrome.storage.local.set({ [storageKey]: sessionData }, () => {
                        console.log('Session 已同步到 chrome.storage');
                    });
                }

                try {
                    if (loginType === 'password' && typeof crypto !== 'undefined') {
                        const salt = 'tran2026';
                        const te = new TextEncoder();
                        const data = te.encode(credential + salt);
                        const digest = await crypto.subtle.digest('SHA-256', data);
                        const bytes = new Uint8Array(digest);
                        let bin = '';
                        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                        const hashB64 = btoa(bin);
                        if (typeof chrome !== 'undefined' && chrome.storage) {
                            await chrome.storage.local.set({ encKeyHash: hashB64 });
                        } else {
                            localStorage.setItem('encKeyHash', hashB64);
                        }
                    }
                } catch (e) {
                    console.error('生成并保存加密密钥失败:', e);
                }

                window.location.href = 'translator.html';
            } else {
                alert('登录失败: ' + (result.error || '未知错误'));
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('登录错误:', error);
            alert('登录失败: ' + error.message);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // 社交登录按钮
    const socialButtons = document.querySelectorAll('.social-button');

    socialButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const provider = this.querySelector('span').textContent;

            if (provider.includes('Google')) {
                const result = await AuthService.signInWithGoogle();
                if (!result.success) {
                    alert('Google登录失败: ' + result.error);
                }
            } else {
                alert(provider + ' 登录功能开发中...');
            }
        });
    });

    // 添加输入框焦点效果
    const allInputs = document.querySelectorAll('.form-input');

    allInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });

    // 记住我复选框
    const rememberCheckbox = document.querySelector('.checkbox-label input[type="checkbox"]');

    if (rememberCheckbox) {
        const remembered = localStorage.getItem('rememberMe');
        if (remembered === 'true') {
            rememberCheckbox.checked = true;
            const savedAccount = localStorage.getItem('savedAccount');
            if (savedAccount) {
                emailInput.value = savedAccount;
            }
        }

        rememberCheckbox.addEventListener('change', function() {
            if (this.checked) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('savedAccount', emailInput.value);
            } else {
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('savedAccount');
            }
        });
    }
});

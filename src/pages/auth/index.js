// 登录页面脚本
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const loadingOverlay = document.getElementById('loading-overlay');

    // 检查是否已登录
    checkLoginStatus();

    // 表单提交
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showError('请输入邮箱和密码');
            return;
        }

        showLoading(true);

        try {
            const result = await AuthService.signIn(email, password);

            if (result.success) {
                // 登录成功，跳转到主页面
                window.location.href = '../translator/translator.html';
            } else {
                showError(result.error || '登录失败，请检查邮箱和密码');
            }
        } catch (error) {
            console.error('登录错误:', error);
            showError('登录出错: ' + error.message);
        } finally {
            showLoading(false);
        }
    });

    // 检查登录状态
    async function checkLoginStatus() {
        try {
            const sessionResult = await AuthService.getSession();

            if (sessionResult.success && sessionResult.session) {
                // 已登录，跳转到主页面
                window.location.href = '../translator/translator.html';
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
        }
    }

    // 显示错误信息
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    // 显示/隐藏加载遮罩
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
});

// translator-main.js - 主初始化和导航模块

// 全局函数：打开 Supabase 配置页面
window.openSupabaseSettings = function() {
    console.log('=== openSupabaseSettings called ===');
    console.log('Current URL:', window.location.href);

    // 等待DOM完全加载
    if (document.readyState !== 'complete') {
        console.log('DOM not ready, waiting...');
        setTimeout(() => window.openSupabaseSettings(), 200);
        return;
    }

    const navTabs = document.querySelectorAll('.nav-tab');
    console.log('Found nav tabs:', navTabs.length);

    if (navTabs.length === 0) {
        console.error('No nav tabs found, page may not be fully loaded');
        setTimeout(() => window.openSupabaseSettings(), 500);
        return;
    }

    if (navTabs.length < 3) {
        console.error('Not enough nav tabs found. Found:', navTabs.length);
        alert('页面未完全加载，正在重新尝试...');
        setTimeout(() => window.openSupabaseSettings(), 500);
        return;
    }

    // 直接操作 DOM 切换到设置页面
    console.log('Manually switching to settings page');

    // 移除所有 active 类
    navTabs.forEach(t => t.classList.remove('active'));
    // 给第3个标签添加 active 类
    navTabs[2].classList.add('active');

    // 获取页面元素
    const mainContent = document.querySelector('.translator-container')?.parentElement;
    const historyPage = document.getElementById('historyPage');
    const settingsPage = document.getElementById('settingsPage');

    console.log('Page elements:', { mainContent: !!mainContent, historyPage: !!historyPage, settingsPage: !!settingsPage });

    if (!mainContent || !historyPage || !settingsPage) {
        console.error('Page elements not found');
        setTimeout(() => window.openSupabaseSettings(), 300);
        return;
    }

    // 切换页面显示
    mainContent.style.display = 'none';
    historyPage.style.display = 'none';
    settingsPage.style.display = 'block';

    console.log('Switched to settings page');

    // 等待页面切换后，点击 Supabase 配置菜单
    setTimeout(() => {
        const supabaseMenuItem = document.querySelector('[data-target="supabaseSettings"]');
        console.log('Looking for supabase menu item...');

        if (supabaseMenuItem) {
            console.log('Found supabase menu item, clicking...');
            supabaseMenuItem.click();
            console.log('✓ Successfully clicked supabase menu item');
        } else {
            console.error('Supabase settings menu not found');
            alert('无法找到"云端同步"配置选项\n\n请手动操作：\n1. 点击"设置"标签\n2. 点击"云端同步"选项');
        }
    }, 300);
};

// 导出导航初始化函数
window.initNavigation = function() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const mainContent = document.querySelector('.translator-container')?.parentElement;
    const historyPage = document.getElementById('historyPage');
    const settingsPage = document.getElementById('settingsPage');

    console.log('Page elements found:', {
        navTabs: navTabs.length,
        mainContent: !!mainContent,
        historyPage: !!historyPage,
        settingsPage: !!settingsPage
    });

    // 绑定导航事件
    console.log('Attaching navigation event listeners...');
    navTabs.forEach((tab, index) => {
        tab.addEventListener('click', function(e) {
            console.log('Nav tab clicked:', index, this.querySelector('span')?.textContent);
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabText = this.querySelector('span')?.textContent;

            if (!mainContent || !historyPage || !settingsPage) {
                console.error('Page elements not available!');
                return;
            }

            if (tabText === '翻译') {
                mainContent.style.display = 'block';
                historyPage.style.display = 'none';
                settingsPage.style.display = 'none';
            } else if (tabText === '历史') {
                mainContent.style.display = 'none';
                historyPage.style.display = 'block';
                settingsPage.style.display = 'none';
                // 触发历史记录加载事件
                window.dispatchEvent(new CustomEvent('loadHistory'));
            } else if (tabText === '设置') {
                mainContent.style.display = 'none';
                historyPage.style.display = 'none';
                settingsPage.style.display = 'block';
            }
        });
    });
    console.log('✓ Navigation event listeners attached successfully');
};

// 导出设置页面导航初始化函数
window.initSettingsNavigation = function() {
    const mainSettings = document.getElementById('mainSettings');
    const settingsMenuItems = document.querySelectorAll('.settings-menu-item[data-target]');
    const settingsDetails = document.querySelectorAll('.settings-detail');
    const backButtons = document.querySelectorAll('.back-button');

    console.log('Found settings menu items:', settingsMenuItems.length);

    // 点击设置菜单项，显示详情页
    settingsMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            console.log('Settings menu item clicked:', this.dataset.target);
            const targetId = this.dataset.target;
            const targetDetail = document.getElementById(targetId);

            if (targetDetail && mainSettings) {
                console.log('Showing detail:', targetId);
                mainSettings.style.display = 'none';
                targetDetail.style.display = 'block';

                // 触发设置详情页面打开事件
                window.dispatchEvent(new CustomEvent('settingsDetailOpened', { detail: { targetId } }));
            }
        });
    });

    // 点击返回按钮，返回主设置页
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Back button clicked');
            settingsDetails.forEach(detail => {
                detail.style.display = 'none';
            });
            if (mainSettings) {
                mainSettings.style.display = 'block';
            }
        });
    });
    console.log('✓ Settings page menu listeners attached');
};

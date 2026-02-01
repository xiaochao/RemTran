// 离屏音频播放器
// 这个页面运行在离屏文档中，不受页面 CSP 限制

let currentAudio = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'playAudio') {
        playAudio(request.url)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 异步响应
    }

    if (request.action === 'stopAudio') {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        sendResponse({ success: true });
        return true;
    }
});

function playAudio(url) {
    return new Promise((resolve, reject) => {
        // 停止当前播放
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        // 创建新音频
        currentAudio = new Audio(url);

        currentAudio.onended = () => {
            currentAudio = null;
            resolve();
        };

        currentAudio.onerror = (error) => {
            console.error('离屏音频播放失败:', error);
            currentAudio = null;
            reject(new Error('音频播放失败'));
        };

        currentAudio.play().catch(reject);
    });
}

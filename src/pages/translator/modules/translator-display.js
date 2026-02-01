// translator-display.js - 翻译结果显示模块

window.TranslatorDisplay = {
    // 显示翻译结果
    displayTranslationResult(data) {
        const translationResult = document.getElementById('translationResult');
        const hasDictionaryData = data.dictionaryData && data.dictionaryData.meanings && data.dictionaryData.meanings.length > 0;

        let html = '';

        if (hasDictionaryData) {
            html += this.buildDictionaryHTML(data);
        } else {
            html += this.buildSimpleTranslationHTML(data);
        }

        translationResult.innerHTML = html;

        // 绑定发音按钮事件
        const audioButtons = translationResult.querySelectorAll('.phonetic-audio-btn');
        audioButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const audioUrl = e.currentTarget.getAttribute('data-audio');
                if (audioUrl) {
                    TranslatorUtils.playAudio(audioUrl);
                }
            });
        });
    },

    // 构建词典模式HTML
    buildDictionaryHTML(data) {
        const dict = data.dictionaryData;
        let html = '';

        // 音标区域
        if (dict.phonetics && (dict.phonetics.us || dict.phonetics.uk)) {
            html += '<div class="result-phonetics" style="margin-bottom: 12px; display: flex; gap: 16px; flex-wrap: wrap;">';

            if (dict.phonetics.us) {
                const usAudio = dict.phonetics.audio.us ?
                    `<button class="phonetic-audio-btn" data-audio="${TranslatorUtils.escapeHtml(dict.phonetics.audio.us)}" style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;line-height:1;" title="发音">🔊</button>` : '';
                html += `<div style="display:flex;align-items:center;gap:6px;"><span style="color:#666;font-size:13px;">US</span><span style="color:#333;font-size:14px;">/${TranslatorUtils.escapeHtml(dict.phonetics.us)}/</span>${usAudio}</div>`;
            }

            if (dict.phonetics.uk) {
                const ukAudio = dict.phonetics.audio.uk ?
                    `<button class="phonetic-audio-btn" data-audio="${TranslatorUtils.escapeHtml(dict.phonetics.audio.uk)}" style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;line-height:1;" title="发音">🔊</button>` : '';
                html += `<div style="display:flex;align-items:center;gap:6px;"><span style="color:#666;font-size:13px;">UK</span><span style="color:#333;font-size:14px;">/${TranslatorUtils.escapeHtml(dict.phonetics.uk)}/</span>${ukAudio}</div>`;
            }

            html += '</div>';
        }

        // 翻译结果
        if (data.translations && data.translations.length > 0) {
            html += '<div style="margin-bottom: 12px;"><div style="color: #666; font-size: 13px; margin-bottom: 6px;">翻译</div><div style="display: flex; flex-direction: column; gap: 4px;">';

            data.translations.forEach((trans) => {
                // 优先使用 sourceName，如果没有则使用 source
                const sourceName = trans.sourceName || trans.source || '未知';
                html += `<div style="display:flex;align-items:center;gap:8px;"><span style="color:#999;font-size:12px;">[${TranslatorUtils.escapeHtml(sourceName)}]</span><span style="color:#333;font-size:15px;">${TranslatorUtils.escapeHtml(trans.text)}</span></div>`;
            });

            html += '</div></div>';
        }

        // 标准释义
        html += '<div style="color: #666; font-size: 13px; margin-bottom: 8px;">标准释义</div>';

        dict.meanings.forEach(meaning => {
            html += '<div style="margin-bottom: 12px;">';
            html += `<div style="margin-bottom: 4px;"><span style="color: #667eea; font-weight: 500; font-size: 14px;">${TranslatorUtils.escapeHtml(meaning.partOfSpeech)}.</span></div>`;

            const definitionsText = meaning.definitions.map(def => def.definition).join('、');
            html += `<div style="color: #333; font-size: 14px; line-height: 1.6;">${TranslatorUtils.escapeHtml(definitionsText)}</div>`;

            const firstExample = meaning.definitions.find(def => def.example);
            if (firstExample) {
                html += `<div style="margin-top: 6px;"><div style="color: #666; font-size: 13px; font-style: italic;">"${TranslatorUtils.escapeHtml(firstExample.example)}"</div></div>`;
            }

            html += '</div>';
        });

        return html;
    },

    // 构建简单翻译模式HTML
    buildSimpleTranslationHTML(data) {
        let html = '';

        if (data.translations && data.translations.length > 0) {
            html += '<div style="display: flex; flex-direction: column; gap: 8px;">';

            data.translations.forEach((trans) => {
                // 优先使用 sourceName，如果没有则使用 source
                const sourceName = trans.sourceName || trans.source || '未知';
                html += `<div style="display:flex;align-items:center;gap:8px;"><span style="color:#999;font-size:12px;">[${TranslatorUtils.escapeHtml(sourceName)}]</span><span style="color:#333;font-size:15px;">${TranslatorUtils.escapeHtml(trans.text)}</span></div>`;
            });

            html += '</div>';
        } else if (data.translation) {
            html += `<div style="color: #333; font-size: 15px;">${TranslatorUtils.escapeHtml(data.translation)}</div>`;
        }

        if (data.detectedLanguage) {
            html += `<div style="color: #999; font-size: 12px; margin-top: 8px;">检测语言: ${data.detectedLanguage}</div>`;
        }

        return html;
    }
};

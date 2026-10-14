/* ============================================================
 *  个人联想词库逻辑 (Search, Edit, Import, Export)
 *  与速刷联想词共用同一份 localStorage 数据
 * ============================================================ */
(function () {
    'use strict';

    // ============ 与 speed-association.js 保持一致 ============
    const STORAGE_KEY = 'cube_assoc_trainer_v1';     // 新主 key
    const OLD_KEY     = 'cube_assoc_wordlist_v1';    // 旧 key（用于迁移）
    const EXCLUDE = 'IOUV';
    const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c => !EXCLUDE.includes(c));
    const ALL_KEYS = [];
    for (const a of LETTERS) for (const b of LETTERS) if (a !== b) ALL_KEYS.push(a + b);

    // 默认词库数据（内存中的扁平视图，UI 层用它）
    let assocData = {};

    // DOM 元素
    const $ = id => document.getElementById(id);
    const searchInput = $('assocSearch');
    const grid = $('assocGrid');
    const exportBtn = $('assocExportBtn');
    const importBtn = $('assocImportBtn');

    // --- 工具函数 ---
    function esc(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function newEntry() {
        return { word: '', mastered: false, needsFocus: false, history: [] };
    }

    function buildFreshState() {
        const entries = {};
        ALL_KEYS.forEach(k => { entries[k] = newEntry(); });
        return { version: 2, round: 1, total: 0, queue: [], entries };
    }

    // 把旧的扁平数据合并进新的嵌套结构
    function mergeFlatIntoState(flat, state) {
        for (const k in flat) {
            if (state.entries[k] && typeof flat[k] === 'string' && flat[k].trim()) {
                state.entries[k].word = flat[k].trim();
                state.entries[k].history.push({ round: 1, word: flat[k].trim(), type: 'import' });
            }
        }
    }

    // 从 trainer state 中提取有联想词的扁平视图
    function extractFlat(state) {
        const flat = {};
        for (const k in state.entries) {
            const w = state.entries[k].word;
            if (typeof w === 'string' && w.trim()) flat[k] = w.trim();
        }
        return flat;
    }

    // --- 一次性数据迁移：老 key -> 新 key ---
    (function migrateIfNeeded() {
        try {
            const oldRaw = localStorage.getItem(OLD_KEY);
            if (!oldRaw) return;

            const newRaw = localStorage.getItem(STORAGE_KEY);
            let state = null;
            if (newRaw) {
                try { state = JSON.parse(newRaw); } catch (e) { state = null; }
            }
            if (!state || !state.entries) state = buildFreshState();

            // 把旧扁平数据合并进新结构（保留已有新数据优先）
            let oldData = {};
            try { oldData = JSON.parse(oldRaw) || {}; } catch (e) {}
            for (const k in oldData) {
                const w = oldData[k];
                if (typeof w === 'string' && w.trim() &&
                    state.entries[k] && !state.entries[k].word) {
                    state.entries[k].word = w.trim();
                    state.entries[k].history.push({ round: 1, word: w.trim(), type: 'migrate' });
                }
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            localStorage.removeItem(OLD_KEY);   // 迁移完成，清掉旧 key
        } catch (e) {
            console.warn('联想词数据迁移失败：', e);
        }
    })();

    // --- 持久化操作 ---
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.entries && typeof parsed.entries === 'object') {
                    assocData = extractFlat(parsed);
                } else {
                    // 兜底兼容纯扁平格式（万一有人手动改过 localStorage）
                    assocData = normalizeFlat(parsed);
                }
            } else {
                assocData = {};
            }
        } catch (e) {
            console.error('加载联想词库失败:', e);
            assocData = {};
        }
    }

    function normalizeFlat(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
        if (data.entries && typeof data.entries === 'object') {
            const cleaned = {};
            for (const key in data.entries) {
                const entry = data.entries[key];
                if (entry && typeof entry.word === 'string' && entry.word.trim() !== '') {
                    cleaned[key] = entry.word.trim();
                }
            }
            return cleaned;
        }
        const cleaned = {};
        for (const key in data) {
            if (typeof data[key] === 'string' && data[key].trim() !== '') {
                cleaned[key] = data[key].trim();
            }
        }
        return cleaned;
    }

    function saveData() {
        try {
            // 读取现有 trainer state（没有就建新的）
            let state = null;
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) state = JSON.parse(raw);
            } catch (e) { state = null; }
            if (!state || !state.entries) state = buildFreshState();

            // 把 assocData 里的词写回 entries，未出现的 key 清空 word
            for (const k in state.entries) {
                const w = assocData[k];
                if (typeof w === 'string' && w.trim()) {
                    state.entries[k].word = w.trim();
                } else {
                    state.entries[k].word = '';
                }
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('保存联想词库失败:', e);
            alert('保存失败，可能是浏览器存储空间不足。');
        }
    }

    // --- 渲染逻辑 ---
    function render(filterText = '') {
        const q = filterText.trim().toUpperCase();

        const items = Object.keys(assocData).filter(key => {
            const word = assocData[key];
            return key.includes(q) || word.toUpperCase().includes(q);
        });

        if (items.length === 0) {
            grid.innerHTML = '<div class="wl-empty">暂无记录，快去建立你的联想词库吧！</div>';
            return;
        }

        // 按字母顺序排列，看起来更整齐
        items.sort();

        grid.innerHTML = items.map(key => {
            const word = assocData[key];
            return `
                <div class="wl-item" data-key="${esc(key)}" title="点击修改联想词">
                    <span class="wl-key">${esc(key)}</span>
                    <span class="wl-word">${esc(word)}</span>
                </div>
            `;
        }).join('');
    }

    // --- 事件绑定 ---

    // 搜索
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            render(e.target.value);
        });
    }

    // 新增联想词按钮（只在 index.html 里有）
    const addBtn = $('assocAddBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const key = prompt("请输入字母组合（例如 AB）：");
            if (!key) return;
            const upperKey = key.toUpperCase().trim();

            if (upperKey.length !== 2 || /[IOUV]/.test(upperKey) || upperKey[0] === upperKey[1]) {
                alert("字母组合必须是两个不相同的字母，且不能包含 I、O、U、V！");
                return;
            }

            if (assocData[upperKey]) {
                if (!confirm(`字母组合 [${upperKey}] 已经存在，是否覆盖？`)) {
                    return;
                }
            }

            const word = prompt(`请输入 [${upperKey}] 的联想词：`);
            if (!word || !word.trim()) return;

            assocData[upperKey] = word.trim();
            saveData();
            render(searchInput ? searchInput.value : '');
            alert(`已成功添加：${upperKey} -> ${word.trim()}`);
        });
    }

    // 点击词条进入编辑模式
    if (grid) {
        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.wl-item');
            if (!item || item.querySelector('.wl-edit-input')) return;

            const key = item.dataset.key;
            const oldWord = assocData[key];
            const wordSpan = item.querySelector('.wl-word');

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'wl-edit-input';
            input.value = oldWord;

            wordSpan.replaceWith(input);
            input.focus();
            input.select();

            input.addEventListener('blur', () => {
                const newWord = input.value.trim();

                if (newWord === '') {
                    if (confirm(`确定要清空 [${key}] 的联想词吗？`)) {
                        delete assocData[key];
                        saveData();
                        render(searchInput ? searchInput.value : '');
                    } else {
                        render(searchInput ? searchInput.value : '');
                    }
                } else if (newWord !== oldWord) {
                    assocData[key] = newWord;
                    saveData();
                    render(searchInput ? searchInput.value : '');
                } else {
                    render(searchInput ? searchInput.value : '');
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    input.replaceWith(wordSpan);
                }
            });
        });
    }

    // 导出（保持扁平格式，兼容旧备份）
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            // 导出时读最新的存储，避免内存里是旧的
            loadData();
            const dataStr = JSON.stringify(assocData, null, 2);
            const fileName = `assoc_wordlist_${new Date().toISOString().slice(0, 10)}.json`;

            const capacitor = window.Capacitor;
            const isNative = capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform();

            if (isNative && capacitor.Plugins && capacitor.Plugins.Filesystem && capacitor.Plugins.Share) {
                try {
                    const Filesystem = capacitor.Plugins.Filesystem;
                    const Share = capacitor.Plugins.Share;
                    const result = await Filesystem.writeFile({
                        path: fileName,
                        data: dataStr,
                        directory: 'CACHE',
                        encoding: 'utf8'
                    });
                    await Share.share({
                        title: '导出联想词库',
                        text: '这是我的盲拧联想词库备份文件',
                        url: result.uri,
                        dialogTitle: '保存或分享备份文件'
                    });
                } catch (e) {
                    console.error("导出失败:", e);
                    alert("原生导出失败: " + e.message);
                }
            } else {
                try {
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                } catch (e) {
                    alert("导出失败，当前环境不支持直接下载。");
                }
            }
        });
    }

    // 导入
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';

            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const imported = JSON.parse(reader.result);
                        const cleaned = normalizeFlat(imported);

                        if (Object.keys(cleaned).length === 0) {
                            alert("导入失败：文件里没有找到有效的联想词数据。");
                            return;
                        }

                        if (confirm(`检测到 ${Object.keys(cleaned).length} 条联想词，导入将覆盖当前记录，确定继续吗？`)) {
                            assocData = cleaned;
                            saveData();
                            render(searchInput ? searchInput.value : '');
                            alert("导入成功！");
                        }
                    } catch (err) {
                        console.error(err);
                        alert("导入失败：文件不是有效的 JSON 数据。");
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }

    // --- 跨标签页同步：当 speed-association 页面改了数据，这里也要刷新 ---
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            loadData();
            render(searchInput ? searchInput.value : '');
        }
    });

    // --- 初始化 ---
    loadData();
    render();

})();
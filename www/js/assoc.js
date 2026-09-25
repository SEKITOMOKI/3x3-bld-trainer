/* ============================================================
 *  个人联想词库逻辑 (Search, Edit, Import, Export)
 *  支持兼容旧版训练器的完整备份数据
 * ============================================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'cube_assoc_wordlist_v1';

    // 默认词库数据（空对象）
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

    // 数据格式转换：兼容旧版备份的嵌套结构
    function normalizeData(data) {
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

    // --- 持久化操作 ---
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                assocData = normalizeData(parsed);
            }
        } catch (e) {
            console.error("加载联想词库失败:", e);
        }
    }

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(assocData));
        } catch (e) {
            console.error("保存联想词库失败:", e);
            alert("保存失败，可能是浏览器存储空间不足。");
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
    searchInput.addEventListener('input', (e) => {
        render(e.target.value);
    });
    // 【新增】绑定新增联想词按钮逻辑
    const addBtn = document.getElementById('assocAddBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const key = prompt("请输入字母组合（例如 AB）：");
            if (!key) return;
            const upperKey = key.toUpperCase().trim();

            // 校验规则：不能为空，必须是2个字母，不能包含 I/O/U/V，且两个字母不能相同
            if (upperKey.length !== 2 || /[IOUV]/.test(upperKey) || upperKey[0] === upperKey[1]) {
                alert("字母组合必须是两个不相同的字母，且不能包含 I、O、U、V！");
                return;
            }

            // 如果这个字母组合已经存在，提示用户是否覆盖
            if (assocData[upperKey]) {
                if (!confirm(`字母组合 [${upperKey}] 已经存在，是否覆盖？`)) {
                    return;
                }
            }

            const word = prompt(`请输入 [${upperKey}] 的联想词：`);
            if (!word || !word.trim()) return;

            assocData[upperKey] = word.trim();
            saveData(); // 保存到 localStorage
            render(searchInput.value); // 重新渲染列表
            alert(`已成功添加：${upperKey} -> ${word.trim()}`);
        });
    }

    // 点击词条进入编辑模式
    grid.addEventListener('click', (e) => {
        const item = e.target.closest('.wl-item');
        if (!item || item.querySelector('.wl-edit-input')) return; // 已经处于编辑状态则忽略

        const key = item.dataset.key;
        const oldWord = assocData[key];
        const wordSpan = item.querySelector('.wl-word');

        // 创建输入框替换文字
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'wl-edit-input';
        input.value = oldWord;

        wordSpan.replaceWith(input);
        input.focus();
        input.select(); // 自动全选文字，方便直接覆盖输入

        // 失焦（点击其他地方）保存
        input.addEventListener('blur', () => {
            const newWord = input.value.trim();

            if (newWord === '') {
                if (confirm(`确定要清空 [${key}] 的联想词吗？`)) {
                    delete assocData[key];
                    saveData();
                    render(searchInput.value);
                } else {
                    render(searchInput.value); // 取消清空，恢复原样
                }
            } else if (newWord !== oldWord) {
                assocData[key] = newWord;
                saveData();
                render(searchInput.value);
            } else {
                render(searchInput.value); // 没变化，恢复原样
            }
        });

        // 处理回车和ESC
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                // 直接替换回原来的文字 span，不触发保存逻辑
                input.replaceWith(wordSpan);
            }
        });
    });

    // 导出数据（【核心修改】适配平板原生分享）
    // 导出数据（适配平板原生分享）
    exportBtn.addEventListener('click', async () => {
        const dataStr = JSON.stringify(assocData, null, 2);
        const fileName = `assoc_wordlist_${new Date().toISOString().slice(0, 10)}.json`;

        // 安全获取全局 Capacitor 对象
        const capacitor = window.Capacitor;
        const isNative = capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform();

        if (isNative && capacitor.Plugins && capacitor.Plugins.Filesystem && capacitor.Plugins.Share) {
            // ===== 安卓原生 App 环境 =====
            try {
                const Filesystem = capacitor.Plugins.Filesystem;
                const Share = capacitor.Plugins.Share;

                // 1. 把文件写入 App 的缓存目录
                // 注意：直接用字符串 'CACHE' 替代 Directory.Cache，用 'utf8' 替代 Encoding.UTF8
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: dataStr,
                    directory: 'CACHE',
                    encoding: 'utf8'
                });

                // 2. 调起安卓系统底层的分享菜单
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
            // ===== PC 浏览器 或 插件未加载环境 =====
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

    // 导入数据
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
                    const cleaned = normalizeData(imported);

                    if (Object.keys(cleaned).length === 0) {
                        alert("导入失败：文件里没有找到有效的联想词数据。");
                        return;
                    }

                    if (confirm(`检测到 ${Object.keys(cleaned).length} 条联想词，导入将覆盖当前记录，确定继续吗？`)) {
                        assocData = cleaned;
                        saveData();
                        render(searchInput.value);
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

    // --- 初始化 ---
    loadData();
    render();

})();
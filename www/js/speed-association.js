/* ============================================================
 *  速刷联想词 · 主逻辑 + 主题切换
 * ============================================================ */

(function () {
    'use strict';

    /* ============================================================
     *  常量
     * ============================================================ */
    const STORAGE_KEY = 'cube_assoc_trainer_v1';
    const THEME_KEY = 'bld_trainer_theme';
    const EXCLUDE = 'IOUV';
    const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c => !EXCLUDE.includes(c));
    const ALL_KEYS = [];
    for (const a of LETTERS) for (const b of LETTERS) if (a !== b) ALL_KEYS.push(a + b);
    const TOTAL = ALL_KEYS.length;

    /* ============================================================
     *  状态
     * ============================================================ */
    let state = null;
    let revealKey = null;
    let toastTimer = null;

    const $ = id => document.getElementById(id);

    /* ============================================================
     *  主题切换
     * ============================================================ */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    function getStoredTheme() {
        try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
    }

    function storeTheme(theme) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { }
    }

    function initTheme() {
        let theme = getStoredTheme();
        if (theme !== 'light' && theme !== 'dark') {
            theme = 'dark';   // 默认深色
        }
        applyTheme(theme);
    }

    function toggleTheme() {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        storeTheme(next);
    }

    /* ============================================================
     *  工具
     * ============================================================ */
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function newEntry() {
        return { word: '', mastered: false, needsFocus: false, history: [] };
    }

    function toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
    }

    /* ============================================================
     *  持久化
     * ============================================================ */
    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch (e) { console.warn('保存失败：', e); }
    }

    function buildFreshState() {
        const entries = {};
        ALL_KEYS.forEach(k => { entries[k] = newEntry(); });
        return { version: 2, round: 1, total: 0, queue: [], entries };
    }

    function loadState() {
        let raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
        if (!raw) return null;
        try {
            const s = JSON.parse(raw);
            if (!s || typeof s !== 'object' || !s.entries) return null;
            ALL_KEYS.forEach(k => {
                const e = s.entries[k];
                if (!e) { s.entries[k] = newEntry(); }
                else {
                    if (typeof e.word !== 'string') e.word = '';
                    e.mastered = !!e.mastered;
                    if (typeof e.needsFocus !== 'boolean') e.needsFocus = false;
                    if (!Array.isArray(e.history)) e.history = [];
                }
            });
            s.round = (typeof s.round === 'number' && s.round > 0) ? s.round : 1;
            s.total = (typeof s.total === 'number' && s.total >= 0) ? s.total : 0;
            s.queue = Array.isArray(s.queue) ? s.queue.filter(k => !!s.entries[k]) : [];
            return s;
        } catch (e) { return null; }
    }

    /* ============================================================
     *  回合控制
     * ============================================================ */
    function beginRound(roundNum) {
        state.round = roundNum;
        const pool = ALL_KEYS.filter(k => !state.entries[k].mastered);
        const focusPool = pool.filter(k => state.entries[k].needsFocus);
        const normalPool = pool.filter(k => !state.entries[k].needsFocus);
        state.queue = [...shuffle(focusPool), ...shuffle(normalPool)];
        state.total = pool.length;
        revealKey = null;
        save();
    }

    function advance() {
        state.queue.shift();
        revealKey = null;
        save();
        render();
    }

    function masterCount() {
        let n = 0;
        for (const k of ALL_KEYS) if (state.entries[k].mastered) n++;
        return n;
    }

    function focusCount() {
        let n = 0;
        for (const k of ALL_KEYS) if (state.entries[k].needsFocus) n++;
        return n;
    }

    /* ============================================================
     *  渲染
     * ============================================================ */
    function render() {
        const mc = masterCount();
        const fc = focusCount();
        $('roundInfo').textContent = `第 ${state.round} 轮`;
        $('masteredInfo').textContent = `已掌握 ${mc} / ${TOTAL}`;
        $('focusInfo').textContent = `重点 ${fc}`;
        if (state.queue.length === 0) { renderComplete(mc); }
        else { renderQuestion(); }
        if ($('wordlistPanel').open) renderWordList();
    }

    function renderQuestion() {
        $('mainCard').style.display = '';
        $('completeCard').style.display = 'none';
        const key = state.queue[0];
        const entry = state.entries[key];
        const done = state.total - state.queue.length;
        $('progressInfo').textContent = `${done} / ${state.total}`;
        $('progressBar').style.width = (state.total ? (done / state.total * 100) : 0) + '%';
        $('pair').innerHTML = `<span>${key[0]}</span><span>${key[1]}</span>`;
        const inputRow = $('inputRow');
        const feedback = $('feedback');
        const input = $('answerInput');

        if (revealKey === key) {
            /* ---------- 展示答案（来自"不知道"按钮或空 Enter） ---------- */
            inputRow.style.display = 'none';
            feedback.innerHTML = `
        <div class="reveal">
          <div class="reveal-label">它的联想词是</div>
          <div class="reveal-answer">${esc(entry.word || '（还没设定）')}</div>
          <div class="actions" style="justify-content:center">
            <button class="btn primary" id="btnNextAfterReveal">下一个 →</button>
          </div>
        </div>`;
            const nextBtn = $('btnNextAfterReveal');
            if (nextBtn) {
                nextBtn.onclick = () => { revealKey = null; advance(); };
            }
        } else {
            /* ---------- 正常答题界面 ---------- */
            inputRow.style.display = '';
            feedback.innerHTML = '';
            $('hint').textContent = state.round === 1
                ? '为这个字母组合输入你的联想词'
                : '回忆一下，输入你之前为它设定的联想词（空着按 Enter 可看答案）';
            input.value = '';
            input.focus();
        }
    }

    function renderComplete(mc) {
        $('mainCard').style.display = 'none';
        const card = $('completeCard');
        card.style.display = '';
        const allDone = mc >= TOTAL;
        card.innerHTML = `
      <div class="complete-icon">${allDone ? '🏆' : '🎉'}</div>
      <h2>第 ${state.round} 轮完成</h2>
      <p>${allDone ? '所有字母组合的联想词都已巩固完成，太厉害了！' : `本轮结束。已掌握 <b>${mc}</b> / ${TOTAL} 个组合，还有 <b>${TOTAL - mc}</b> 个需要继续巩固。`}</p>
      <div class="actions" style="justify-content:center">
        ${allDone ? '' : `<button class="btn primary" id="btnNextRound">开始第 ${state.round + 1} 轮</button>`}
        <button class="btn ghost" id="btnReset2">重置全部数据</button>
      </div>`;
        if (!allDone) { $('btnNextRound').onclick = () => { beginRound(state.round + 1); render(); }; }
        $('btnReset2').onclick = resetAll;
    }

    /* ============================================================
     *  答题逻辑
     * ============================================================ */
    function handleSubmit() {
        if (state.queue.length === 0) return;

        const input = $('answerInput');
        const val = input.value.trim();

        // ① 正在展示答案 → 再按 Enter / 点下一个，进入下一题
        if (revealKey) {
            revealKey = null;
            advance();
            return;
        }

        const key = state.queue[0];
        const entry = state.entries[key];

        // ② 空输入 → 展示之前记录的联想词（不标记重点）
        if (!val) {
            if (entry.word) {
                revealKey = key;
                save();
                render();
            } else {
                // 没记录过，没什么可展示
                input.focus();
                toast('这个组合还没记录过联想词，请先输入一个');
            }
            return;
        }

        // ③ 之前没记录 → 直接存
        if (!entry.word) {
            entry.word = val;
            entry.history.push({ round: state.round, word: val, type: 'set' });
            advance();
            return;
        }

        // ④ 与记录一致 → 掌握
        if (entry.word === val) {
            entry.history.push({ round: state.round, word: val, type: 'match' });
            const wasFocus = entry.needsFocus;
            if (wasFocus) entry.needsFocus = false;
            if (!entry.mastered) {
                entry.mastered = true;
                advance();
                toast(wasFocus ? '✅ 已掌握，重点标记已取消' : '✅ 两次一致，这个组合已掌握');
            } else {
                advance();
            }
            return;
        }

        // ⑤ 与记录不一致 → 直接替换（优先用新词）
        entry.word = val;
        entry.mastered = false;
        entry.history.push({ round: state.round, word: val, type: 'replace' });
        advance();
        toast(`已把联想词更新为「${val}」`);
    }

    function handleDontKnow() {
        if (revealKey) return;
        if (state.queue.length === 0) return;
        const key = state.queue[0];
        const entry = state.entries[key];
        entry.needsFocus = true;
        entry.history.push({ round: state.round, word: '', type: 'unknown' });
        if (!entry.word) {
            save(); render();
            toast('★ 已标记为重点，请先为它设定一个联想词');
            $('answerInput').focus();
            return;
        }
        revealKey = key;
        save(); render();
    }

    /* ============================================================
     *  词库面板
     * ============================================================ */
    function renderWordList() {
        const grid = $('wordGrid');
        const q = $('searchBox').value.trim().toUpperCase();
        const focusOnly = $('focusOnly').checked;
        const recorded = ALL_KEYS.filter(k => state.entries[k].word).length;
        const focused = ALL_KEYS.filter(k => state.entries[k].needsFocus).length;
        $('wordlistCount').textContent = `已记录 ${recorded} / ${TOTAL} · 重点 ${focused}`;
        const items = [];
        for (const k of ALL_KEYS) {
            const e = state.entries[k];
            if (focusOnly) { if (!e.needsFocus) continue; }
            else { if (!e.word && !e.needsFocus) continue; }
            if (q && !k.includes(q) && !(e.word || '').toUpperCase().includes(q)) continue;
            items.push([k, e]);
        }
        if (!items.length) { grid.innerHTML = '<div class="wl-empty">暂无记录</div>'; return; }
        grid.innerHTML = items.map(([k, e]) => {
            const cls = 'wl-item' + (e.mastered ? ' ok' : '') + (e.needsFocus ? ' focus' : '');
            const badges = [];
            if (e.needsFocus) badges.push('<span class="wl-badge focus" title="重点">★</span>');
            if (e.mastered) badges.push('<span class="wl-badge" title="已掌握">✓</span>');
            const wordText = e.word || '（未填写）';
            return `<div class="${cls}"><span class="wl-key">${k}</span><span class="wl-word" title="${esc(wordText)}">${esc(wordText)}</span>${badges.join('')}</div>`;
        }).join('');
    }

    /* ============================================================
     *  导出 / 导入
     * ============================================================ */
    function exportBackup() {
        const flatData = {};
        ALL_KEYS.forEach(k => {
            const entry = state.entries[k];
            if (entry && entry.word && entry.word.trim() !== '') flatData[k] = entry.word.trim();
        });
        if (Object.keys(flatData).length === 0) { toast('还没有可导出的数据'); return; }
        const date = new Date().toISOString().slice(0, 10);
        const jsonStr = JSON.stringify(flatData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assoc_wordlist_${date}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast('备份已导出（兼容新手练习平台格式）');
    }

    function importBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = e => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                let parsed = null;
                try { parsed = JSON.parse(reader.result); }
                catch (err) { toast('文件不是有效的 JSON'); return; }
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { toast('文件格式不正确，导入已取消'); return; }
                let flatData = {};
                if (parsed.entries && typeof parsed.entries === 'object') {
                    for (const key in parsed.entries) {
                        const entry = parsed.entries[key];
                        if (entry && typeof entry.word === 'string' && entry.word.trim() !== '') flatData[key] = entry.word.trim();
                    }
                } else {
                    for (const key in parsed) {
                        if (typeof parsed[key] === 'string' && parsed[key].trim() !== '') flatData[key] = parsed[key].trim();
                    }
                }
                if (Object.keys(flatData).length === 0) { toast('文件里没有找到有效的联想词数据'); return; }
                if (!confirm(`检测到 ${Object.keys(flatData).length} 条联想词，导入会覆盖当前所有记录，确定继续吗？`)) return;
                const newEntries = {};
                ALL_KEYS.forEach(k => { newEntries[k] = newEntry(); });
                let importedCount = 0;
                Object.keys(flatData).forEach(k => {
                    if (newEntries[k]) {
                        newEntries[k].word = flatData[k];
                        newEntries[k].history.push({ round: 1, word: flatData[k], type: 'import' });
                        importedCount++;
                    }
                });
                state.entries = newEntries;
                state.round = 1; state.total = 0; state.queue = [];
                beginRound(1); save();
                $('searchBox').value = ''; $('focusOnly').checked = false;
                render(); renderWordList();
                toast(`导入成功，共 ${importedCount} 条联想词`);
            };
            reader.onerror = () => toast('读取文件失败');
            reader.readAsText(file);
        };
        input.click();
    }

    /* ============================================================
     *  重置 / 清除重点
     * ============================================================ */
    function resetAll() {
        if (!confirm('确定要清空所有联想词记录并重新开始吗？此操作不可撤销。')) return;
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
        state = buildFreshState(); beginRound(1);
        $('searchBox').value = ''; $('focusOnly').checked = false;
        render(); toast('已重置，开始第 1 轮');
    }

    function clearAllFocus() {
        const fc = focusCount();
        if (fc === 0) { toast('当前没有重点标记'); return; }
        if (!confirm(`确定要清除全部 ${fc} 个重点标记吗？`)) return;
        ALL_KEYS.forEach(k => { state.entries[k].needsFocus = false; });
        save(); render(); toast('已清除所有重点标记');
    }

    /* ============================================================
     *  事件绑定
     * ============================================================ */
    function bindEvents() {
        $('submitBtn').addEventListener('click', handleSubmit);
        $('dontKnowBtn').addEventListener('click', handleDontKnow);
        // 全局 Enter 监听：无论焦点在哪都能触发（按钮/链接除外）
        document.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            if (e.isComposing) return;   // 中文输入法组字时不触发

            const active = document.activeElement;
            // 焦点在按钮或链接上时，让浏览器自己处理（激活按钮）
            if (active && (active.tagName === 'BUTTON' || active.tagName === 'A')) return;

            e.preventDefault();
            handleSubmit();
        });
        $('resetBtn').addEventListener('click', resetAll);
        $('clearFocusBtn').addEventListener('click', clearAllFocus);
        $('exportBtn').addEventListener('click', exportBackup);
        $('importBtn').addEventListener('click', importBackup);
        const panel = $('wordlistPanel');
        panel.addEventListener('toggle', () => { if (panel.open) renderWordList(); });
        $('searchBox').addEventListener('input', renderWordList);
        $('focusOnly').addEventListener('change', renderWordList);
    }

    /* ============================================================
     *  初始化
     * ============================================================ */
    function init() {
        initTheme();
        state = loadState();
        if (!state) { state = buildFreshState(); beginRound(1); }
        else if (state.total === 0 && state.queue.length === 0 && state.round === 1) { beginRound(1); }
        bindEvents();
        render();
        renderWordList();
    }
    // 监听其他页面（index.html）的主题变化
    window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY && e.newValue) {
            applyTheme(e.newValue);
        }
        if (e.key === STORAGE_KEY) {
            // 联想词在别处被改了，重新加载状态
            const newState = loadState();
            if (newState) {
                state = newState;
                render();
                if ($('wordlistPanel').open) renderWordList();
            }
        }
    });
    init();
})();
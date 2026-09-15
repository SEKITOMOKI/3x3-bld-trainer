import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ================= 1. 读取 URL 参数与数据 =================
const urlParams = new URLSearchParams(window.location.search);
const type = urlParams.get('type') || 'corner';
const formulaId = urlParams.get('id') || 'OX';

const category = formulaData[type];
if (!category) {
    alert("未找到该分类！");
}

const currentFormula = category.list.find(item => item.id === formulaId);
if (!currentFormula) {
    alert("未找到该公式！");
}

document.getElementById('formulaTitle').textContent = `${category.name} - ${currentFormula.name}`;
document.getElementById('forwardFormula').textContent = currentFormula.formula;


// 生成侧边栏列表（支持分组）
const sidebarList = document.getElementById('sidebarList');
sidebarList.innerHTML = '';

// 按 group 分组
const sidebarGroups = {};
category.list.forEach(item => {
    const groupName = item.group || '其他公式';
    if (!sidebarGroups[groupName]) sidebarGroups[groupName] = [];
    sidebarGroups[groupName].push(item);
});

// 渲染侧边栏
for (const [groupName, items] of Object.entries(sidebarGroups)) {
    // 分组标题
    const groupTitle = document.createElement('div');
    groupTitle.textContent = groupName;
    groupTitle.style.fontSize = '12px';
    groupTitle.style.color = '#888';
    groupTitle.style.margin = '15px 0 5px 5px';
    groupTitle.style.fontWeight = 'bold';
    sidebarList.appendChild(groupTitle);

    // 分组内的按钮
    items.forEach(item => {
        const a = document.createElement('a');
        a.href = `formula.html?type=${type}&id=${item.id}`;
        a.className = `sidebar-btn ${item.id === formulaId ? 'active' : ''}`;
        a.textContent = item.name;
        sidebarList.appendChild(a);
    });
}

// 解析公式字符串
const formulaStr = currentFormula.formula;
const forwardSteps = parseFormula(formulaStr);

// 生成逆向步骤
function generateReverseSteps(steps) {
    const reversed = [];
    for (let i = steps.length - 1; i >= 0; i--) {
        const step = steps[i];
        reversed.push({ axis: step.axis, layers: step.layers, direction: -step.direction });
    }
    return reversed;
}
const reverseSteps = generateReverseSteps(forwardSteps);

// ================= 2. 基础场景设置 =================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

let width = container.clientWidth;
let height = container.clientHeight;
if (width === 0 || height === 0) {
    width = window.innerWidth - 300;
    height = window.innerHeight;
}

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.set(4, 4, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ================= 3. 状态与数据定义 =================
const cubies = [];
const cubeSize = 0.95;
let showLetters = false;

const colors = {
    right: 0x00ff00, left: 0x0000ff, up: 0xffff00,
    down: 0xffffff, front: 0xff0000, back: 0xffa500
};

const letterMaps = {
    U: [['D', 'E', 'G'], ['C', '', 'G'], ['*', '*', 'J']],
    F: [['*', '*', 'L'], ['S', '', 'Q'], ['N', 'J', 'Y']],
    L: [['E', 'D', '*'], ['X', '', 'T'], ['Q', 'L', 'M']],
    R: [['K', 'H', 'I'], ['R', '', 'Z'], ['Z', 'P', 'S']],
    D: [['W', 'A', 'X'], ['K', '', 'B'], ['O', 'M', 'R']],
    B: [['H', 'F', 'F'], ['Y', '', 'W'], ['T', 'N', 'P']]
};

function createStickerTexture(colorHex, letter) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const hexStr = '#' + colorHex.toString(16).padStart(6, '0');
    ctx.fillStyle = hexStr; ctx.fillRect(0, 0, 128, 128);
    if (letter && letter !== '') {
        ctx.font = 'bold 70px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 8; ctx.strokeText(letter, 64, 64);
        ctx.fillStyle = '#ffffff'; ctx.fillText(letter, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createCubie(x, y, z) {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshStandardMaterial({ color: 0x111111 });
    group.add(new THREE.Mesh(geometry, material));

    const stickerGeo = new THREE.PlaneGeometry(0.85, 0.85);
    const stickerOffset = cubeSize / 2 + 0.01;

    const stickers = [];
    if (y === 1) { const row = z + 1; const col = x + 1; stickers.push({ color: colors.up, letter: letterMaps.U[row][col], pos: [0, stickerOffset, 0], rot: [-Math.PI / 2, 0, 0] }); }
    if (y === -1) { const row = 1 - z; const col = x + 1; stickers.push({ color: colors.down, letter: letterMaps.D[row][col], pos: [0, -stickerOffset, 0], rot: [Math.PI / 2, 0, 0] }); }
    if (z === 1) { const row = 1 - y; const col = x + 1; stickers.push({ color: colors.front, letter: letterMaps.F[row][col], pos: [0, 0, stickerOffset], rot: [0, 0, 0] }); }
    if (z === -1) { const row = 1 - y; const col = 1 - x; stickers.push({ color: colors.back, letter: letterMaps.B[row][col], pos: [0, 0, -stickerOffset], rot: [0, Math.PI, 0] }); }
    if (x === 1) { const row = 1 - y; const col = 1 - z; stickers.push({ color: colors.right, letter: letterMaps.R[row][col], pos: [stickerOffset, 0, 0], rot: [0, Math.PI / 2, 0] }); }
    if (x === -1) { const row = 1 - y; const col = z + 1; stickers.push({ color: colors.left, letter: letterMaps.L[row][col], pos: [-stickerOffset, 0, 0], rot: [0, -Math.PI / 2, 0] }); }

    stickers.forEach(data => {
        const texNoLetter = createStickerTexture(data.color, '');
        const texWithLetter = createStickerTexture(data.color, data.letter);
        const matNoLetter = new THREE.MeshBasicMaterial({ map: texNoLetter, side: THREE.DoubleSide });
        const matWithLetter = new THREE.MeshBasicMaterial({ map: texWithLetter, side: THREE.DoubleSide });
        const sticker = new THREE.Mesh(stickerGeo, showLetters ? matWithLetter : matNoLetter);
        sticker.position.set(...data.pos); sticker.rotation.set(...data.rot);
        sticker.userData = { isSticker: true, matNoLetter, matWithLetter };
        group.add(sticker);
    });

    group.userData = { x, y, z };
    group.position.set(x, y, z);
    return group;
}

for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x === 0 && y === 0 && z === 0) continue;
    const cubie = createCubie(x, y, z); scene.add(cubie); cubies.push(cubie);
}

// ================= 4. 公式解析逻辑 (核心修改) =================
function parseFormula(formula) {
    // 【新增1】智能处理 ×n 语法（支持 ×2 和 ×4）
    formula = formula.replace(/\((.*?)\)\s*×\s*(\d+)/g, (match, p1, p2) => {
        let count = parseInt(p2);
        return Array(count).fill(p1).join(' ');
    });

    const moves = [];
    const cleanFormula = formula.replace(/[()\s×]/g, '');

    // 【新增2】正则加入 M、E、S 中层转动
    const regex = /([RLUDFBrxyzMES])(2|')?/g;
    let match;

    while ((match = regex.exec(cleanFormula)) !== null) {
        const face = match[1];
        const modifier = match[2];

        let baseMoves = [];
                switch(face) {
            case 'R': baseMoves = [{axis: 'x', layers: [1], dir: -1}]; break;
            case 'L': baseMoves = [{axis: 'x', layers: [-1], dir: 1}]; break;
            case 'U': baseMoves = [{axis: 'y', layers: [1], dir: -1}]; break;
            case 'D': baseMoves = [{axis: 'y', layers: [-1], dir: 1}]; break;
            case 'F': baseMoves = [{axis: 'z', layers: [1], dir: -1}]; break;
            case 'B': baseMoves = [{axis: 'z', layers: [-1], dir: 1}]; break;
            
            // 中层转动 (M, E, S)
            case 'M': baseMoves = [{axis: 'x', layers: [0], dir: 1}]; break;  // 方向同 L
            case 'E': baseMoves = [{axis: 'y', layers: [0], dir: 1}]; break;  // 方向同 D
            case 'S': baseMoves = [{axis: 'z', layers: [0], dir: -1}]; break; // 方向同 F
            
            // 宽转动
            case 'r': baseMoves = [{axis: 'x', layers: [1, 0], dir: -1}]; break;
            
            // 整体旋转
            case 'x': baseMoves = [{axis: 'x', layers: [1, 0, -1], dir: -1}]; break;
            case 'y': baseMoves = [{axis: 'y', layers: [1, 0, -1], dir: -1}]; break;
            case 'z': baseMoves = [{axis: 'z', layers: [1, 0, -1], dir: -1}]; break;
        }

        let finalMoves = [];
        baseMoves.forEach(move => {
            let dir = move.dir;
            if (modifier === "'") dir = -dir;

            if (modifier === "2") {
                finalMoves.push({ axis: move.axis, layers: move.layers, direction: dir });
                finalMoves.push({ axis: move.axis, layers: move.layers, direction: dir });
            } else {
                finalMoves.push({ axis: move.axis, layers: move.layers, direction: dir });
            }
        });
        moves.push(...finalMoves);
    }
    return moves;
}

// ================= 5. 核心动画逻辑 =================
let isAnimating = false;
let isPaused = false;
let currentAnimationFrameId = null;
const animationQueue = [];

// 瞬间旋转（用于重置打乱）
function executeRotationInstant(axis, layers, direction) {
    const targetCubies = cubies.filter(c => layers.includes(c.userData[axis]));
    targetCubies.forEach(cubie => {
        let { x, y, z } = cubie.userData;
        let nX = x, nY = y, nZ = z;
        if (axis === 'x') { if (direction === 1) { nY = -z; nZ = y; } else { nY = z; nZ = -y; } }
        else if (axis === 'y') { if (direction === 1) { nX = z; nZ = -x; } else { nX = -z; nZ = x; } }
        else if (axis === 'z') { if (direction === 1) { nX = -y; nY = x; } else { nX = y; nY = -x; } }
        cubie.userData.x = nX; cubie.userData.y = nY; cubie.userData.z = nZ;
    });

    const pivot = new THREE.Group();
    scene.add(pivot);
    targetCubies.forEach(cubie => pivot.attach(cubie));
    const angle = direction * Math.PI / 2;
    if (axis === 'x') pivot.rotation.x = angle;
    if (axis === 'y') pivot.rotation.y = angle;
    if (axis === 'z') pivot.rotation.z = angle;
    pivot.updateMatrixWorld(true);
    targetCubies.forEach(cubie => {
        scene.attach(cubie);
        cubie.position.set(cubie.userData.x, cubie.userData.y, cubie.userData.z);
    });
    scene.remove(pivot);
}

// 逐步旋转
function executeRotation(axis, layers, direction, duration) {
    isAnimating = true;
    // 筛选出所有待转动的方块，使用 layers.includes 完美支持多层的宽转动和整体旋转
    const targetCubies = cubies.filter(c => layers.includes(c.userData[axis]));

    targetCubies.forEach(cubie => {
        let { x, y, z } = cubie.userData;
        let nX = x, nY = y, nZ = z;
        if (axis === 'x') { if (direction === 1) { nY = -z; nZ = y; } else { nY = z; nZ = -y; } }
        else if (axis === 'y') { if (direction === 1) { nX = z; nZ = -x; } else { nX = -z; nZ = x; } }
        else if (axis === 'z') { if (direction === 1) { nX = -y; nY = x; } else { nX = y; nY = -x; } }
        cubie.userData.x = nX; cubie.userData.y = nY; cubie.userData.z = nZ;
    });

    const pivot = new THREE.Group();
    scene.add(pivot);
    targetCubies.forEach(cubie => pivot.attach(cubie));

    const targetAngle = direction * Math.PI / 2;
    let elapsed = 0;
    let lastTime = performance.now();

    function animateRotation() {
        if (!isPaused) {
            const now = performance.now();
            elapsed += now - lastTime;
            lastTime = now;

            const progress = Math.min(elapsed / duration, 1);
            const currentAngle = targetAngle * (progress * (2 - progress)); // easeOutQuad

            if (axis === 'x') pivot.rotation.x = currentAngle;
            if (axis === 'y') pivot.rotation.y = currentAngle;
            if (axis === 'z') pivot.rotation.z = currentAngle;

            if (progress >= 1) {
                targetCubies.forEach(cubie => {
                    scene.attach(cubie);
                    cubie.position.set(cubie.userData.x, cubie.userData.y, cubie.userData.z);
                });
                scene.remove(pivot);
                isAnimating = false;
                processQueue();
                return;
            }
        } else {
            lastTime = performance.now();
        }
        currentAnimationFrameId = requestAnimationFrame(animateRotation);
    }
    currentAnimationFrameId = requestAnimationFrame(animateRotation);
}

function queueRotation(axis, layers, direction, duration = 800) {
    animationQueue.push({ axis, layers, direction, duration });
    processQueue();
}

function processQueue() {
    if (isAnimating || animationQueue.length === 0 || isPaused) return;
    const move = animationQueue.shift();
    executeRotation(move.axis, move.layers, move.direction, move.duration);
}

// ================= 6. 核心控制逻辑 =================
function resetCubeToSolved() {
    let index = 0;
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const cubie = cubies[index];
        cubie.position.set(x, y, z);
        cubie.rotation.set(0, 0, 0);
        cubie.userData = { x, y, z };
        index++;
    }
}

function scrambleToTarget() {
    if (currentAnimationFrameId) { cancelAnimationFrame(currentAnimationFrameId); currentAnimationFrameId = null; }
    animationQueue.length = 0;
    isAnimating = false;
    isPaused = false;
    document.getElementById('pauseBtn').textContent = '暂停';

    resetCubeToSolved();
    // 逆向执行打乱
    reverseSteps.forEach(step => executeRotationInstant(step.axis, step.layers, step.direction));
}

function isSolved() {
    let solved = true;
    let index = 0;
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const cubie = cubies[index];
        if (cubie.userData.x !== x || cubie.userData.y !== y || cubie.userData.z !== z) solved = false;
        index++;
    }
    return solved;
}

// 页面初始化：直接进入该公式的打乱状态
scrambleToTarget();

// ================= 7. 按钮事件绑定 =================
document.getElementById('playBtn').addEventListener('click', () => {
    if (isSolved()) {
        scrambleToTarget();
    } else {
        if (currentAnimationFrameId) { cancelAnimationFrame(currentAnimationFrameId); currentAnimationFrameId = null; }
        animationQueue.length = 0;
        isAnimating = false;
        isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停';
    }
    // 以 800ms 的速度执行正放公式
    forwardSteps.forEach(step => queueRotation(step.axis, step.layers, step.direction, 800));
});

document.getElementById('pauseBtn').addEventListener('click', (e) => {
    isPaused = !isPaused;
    e.target.textContent = isPaused ? '继续' : '暂停';
    if (!isPaused) {
        processQueue();
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    scrambleToTarget();
});

// ================= 8. 渲染循环 =================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// 窗口自适应
window.addEventListener('resize', () => {
    if (container.clientWidth && container.clientHeight) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
});
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 全局错误捕捉
window.onerror = function(msg, url, line) {
    console.error("全局报错:", msg, "行号:", line);
    return false;
};

// ================= 1. 基础场景设置 =================
const container = document.getElementById('canvas-container');
if (!container) console.error("找不到 id 为 'canvas-container' 的元素！");

container.style.width = '100%';
container.style.height = '100%';
let width = container.clientWidth || window.innerWidth;
let height = container.clientHeight || window.innerHeight;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
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
controls.minPolarAngle = 0;       
controls.maxPolarAngle = Math.PI; 
controls.enablePan = false;       

// ================= 2. 状态与数据定义 =================
const cubies = []; 
const cubeSize = 0.95;
let showLetters = false; 
let focusMode = 'none'; 

const colors = {
    up: 0xffff00, down: 0xffffff, front: 0xff0000,
    back: 0xffa500, right: 0x00ff00, left: 0x0000ff
};

const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });

const letterMaps = {
    U: [['D', 'E', 'G'], ['C', '', 'G'], ['*', '*', 'J']], 
    F: [['*', '*', 'L'], ['S', '', 'Q'], ['N', 'J', 'Y']], 
    L: [['E', 'D', '*'], ['X', '', 'T'], ['Q', 'L', 'M']], 
    R: [['K', 'H', 'A'], ['R', '', 'Z'], ['Z', 'P', 'S']], 
    D: [['W', 'A', 'X'], ['K', '', 'B'], ['B', 'M', 'R']], 
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

const cubeGroup = new THREE.Group();
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x === 0 && y === 0 && z === 0) continue;
    const cubie = createCubie(x, y, z); 
    cubeGroup.add(cubie); 
    cubies.push(cubie);
}
cubeGroup.position.x = 0;
controls.target.set(0, 0, 0); 
controls.update();
scene.add(cubeGroup);

// ================= 3. 公式解析逻辑 =================
function parseFormula(formula) {
    const moves = [];
    const cleanFormula = formula.replace(/[()\s]/g, '');
    const regex = /([RLUDFBrxyz])(2|')?/g;
    let match;
    while ((match = regex.exec(cleanFormula)) !== null) {
        const face = match[1]; const modifier = match[2];
        let baseMoves = [];
        switch(face) {
            case 'R': baseMoves = [{axis: 'x', layers: [1], dir: -1}]; break;
            case 'L': baseMoves = [{axis: 'x', layers: [-1], dir: 1}]; break;
            case 'U': baseMoves = [{axis: 'y', layers: [1], dir: -1}]; break;
            case 'D': baseMoves = [{axis: 'y', layers: [-1], dir: 1}]; break;
            case 'F': baseMoves = [{axis: 'z', layers: [1], dir: -1}]; break;
            case 'B': baseMoves = [{axis: 'z', layers: [-1], dir: 1}]; break;
            case 'r': baseMoves = [{axis: 'x', layers: [1, 0], dir: -1}]; break;
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

// ================= 4. 核心动画与队列逻辑 =================
let isAnimating = false;
const animationQueue = []; 

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

function rotateToWhiteGreen() {
    const moves = parseFormula("y' x2");
    moves.forEach(move => executeRotationInstant(move.axis, move.layers, move.direction));
}

function rotateToYellowRed() {
    const moves = parseFormula("x2 y");
    moves.forEach(move => executeRotationInstant(move.axis, move.layers, move.direction));
}

function processQueue() {
    if (isAnimating || animationQueue.length === 0) {
        if (animationQueue.length === 0 && isScrambling) {
            isScrambling = false;
            rotateToYellowRed(); 
        }
        return;
    }
    const move = animationQueue.shift();
    executeRotation(move.axis, move.layers, move.direction, move.duration || 300);
}

function queueRotation(axis, layers, direction, duration = 300) {
    animationQueue.push({ axis, layers, direction, duration });
    processQueue();
}

function executeRotation(axis, layers, direction, duration) {
    isAnimating = true;
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
        const now = performance.now();
        elapsed += now - lastTime;
        lastTime = now;
        const progress = Math.min(elapsed / duration, 1);
        const currentAngle = targetAngle * (progress * (2 - progress));
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
        requestAnimationFrame(animateRotation);
    }
    requestAnimationFrame(animateRotation);
}

// ================= 5. 交互按钮逻辑 =================
let currentScrambleState = 0; 
let isScrambling = false;
let lastScramble = '';

function resetCubeState() {
    animationQueue.length = 0;
    isAnimating = false;
    isScrambling = false;
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

function generateLocalScramble() {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    let scrambleStr = '';
    let lastFace = '';
    for (let i = 0; i < 20; i++) {
        let face;
        do { face = faces[Math.floor(Math.random() * faces.length)]; } while (face === lastFace);
        lastFace = face;
        const mod = modifiers[Math.floor(Math.random() * 3)];
        scrambleStr += face + mod + ' ';
        const parsed = parseFormula(face + mod);
        parsed.forEach(step => { queueRotation(step.axis, step.layers, step.direction, 30); });
    }
    return scrambleStr.trim();
}

function applyVisibility() {
    cubies.forEach(cubie => {
        const x = cubie.userData.x; const y = cubie.userData.y; const z = cubie.userData.z;
        const sum = Math.abs(x) + Math.abs(y) + Math.abs(z);
        const isCorner = (sum === 3); const isEdge = (sum === 2);
        let showThisCubie = true;
        if (focusMode === 'corner' && isEdge) showThisCubie = false;
        if (focusMode === 'edge' && isCorner) showThisCubie = false;
        cubie.children.forEach(child => {
            if (child.userData && child.userData.isSticker) {
                child.material = !showThisCubie ? blackMaterial : (showLetters ? child.userData.matWithLetter : child.userData.matNoLetter);
            }
        });
    });
}

document.getElementById('scrambleBtn').addEventListener('click', function() {
    const displayEl = document.getElementById('scramble-display');
    if (currentScrambleState === 0) {
        resetCubeState();
        rotateToWhiteGreen(); 
        lastScramble = generateLocalScramble();
        isScrambling = true;
        currentScrambleState = 1;
        displayEl.style.display = 'none';
        document.getElementById('noteCorner').value = '';
        document.getElementById('noteEdge').value = '';
        document.getElementById('noteFlip').value = '';
        this.textContent = '显示打乱公式';
    } else if (currentScrambleState === 1) {
        document.getElementById('scrambleText').textContent = "白顶绿前打乱: " + lastScramble;
        displayEl.style.display = 'block';
        this.textContent = '隐藏打乱公式';
        currentScrambleState = 2;
    } else {
        displayEl.style.display = 'none';
        this.textContent = '显示打乱公式';
        currentScrambleState = 1;
    }
});

document.getElementById('focusCornerBtn').addEventListener('click', function() {
    if (focusMode === 'corner') { focusMode = 'none'; this.textContent = '角块'; this.style.background = '#9C27B0'; }
    else { focusMode = 'corner'; this.textContent = '取消角块专注'; this.style.background = '#f44336'; }
    const edgeBtn = document.getElementById('focusEdgeBtn');
    edgeBtn.textContent = '棱块'; edgeBtn.style.background = '#FF9800';
    applyVisibility();
});

document.getElementById('focusEdgeBtn').addEventListener('click', function() {
    if (focusMode === 'edge') { focusMode = 'none'; this.textContent = '棱块'; this.style.background = '#FF9800'; }
    else { focusMode = 'edge'; this.textContent = '取消棱块专注'; this.style.background = '#f44336'; }
    const cornerBtn = document.getElementById('focusCornerBtn');
    cornerBtn.textContent = '角块'; cornerBtn.style.background = '#9C27B0';
    applyVisibility();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    resetCubeState();
    document.getElementById('scramble-display').style.display = 'none';
    currentScrambleState = 0;
    document.getElementById('scrambleBtn').textContent = '打乱';
    focusMode = 'none';
    document.getElementById('focusCornerBtn').textContent = '角块';
    document.getElementById('focusCornerBtn').style.background = '#9C27B0';
    document.getElementById('focusEdgeBtn').textContent = '棱块';
    document.getElementById('focusEdgeBtn').style.background = '#FF9800';
    applyVisibility();
    document.getElementById('noteCorner').value = '';
    document.getElementById('noteEdge').value = '';
    document.getElementById('noteFlip').value = '';
});

document.getElementById('toggleLetterBtn').addEventListener('click', (e) => {
    showLetters = !showLetters;
    e.target.textContent = showLetters ? '隐藏编码' : '显示编码';
    e.target.style.background = showLetters ? '#f44336' : '#4CAF50';
    e.target.style.borderColor = showLetters ? '#f44336' : '#4CAF50';
    applyVisibility();
});

let isCubeVisible = true;
document.getElementById('toggleCubeBtn').addEventListener('click', (e) => {
    isCubeVisible = !isCubeVisible;
    cubies.forEach(cubie => { cubie.visible = isCubeVisible; });
    e.target.textContent = isCubeVisible ? '隐藏' : '显示';
    e.target.style.background = isCubeVisible ? '#fff' : '#f44336'; 
    e.target.style.color = isCubeVisible ? '#333' : 'white';
});

// ================= 6. 笔记输入自动格式化 =================
// 自动在每两个字母后添加空格，方便字母对联想记忆（完美兼容删除键）
function formatNoteInput(inputElement, event) {
    // 【核心修复】如果输入类型是删除操作，直接返回，不进行任何格式化，让用户顺利删除
    if (event && event.inputType && event.inputType.includes('delete')) {
        return;
    }

    // 移除非字母字符，转大写
    let rawValue = inputElement.value.replace(/[^A-Za-z]/g, '').toUpperCase();
    
    // 如果用户全部删除，则清空
    if (rawValue.length === 0) {
        inputElement.value = '';
        return;
    }
    
    // 每两个字符插入一个空格
    let formattedValue = '';
    for (let i = 0; i < rawValue.length; i += 2) {
        formattedValue += rawValue.substring(i, i + 2) + ' ';
    }
    
    // 设置回输入框
    inputElement.value = formattedValue;
}

// 为“角”和“棱”输入框绑定自动格式化事件
['noteCorner', 'noteEdge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', function(e) {
            formatNoteInput(this, e); // 把事件对象 e 传进去
        });
    }
});

// ================= 7. 渲染循环 =================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// ================= 8. 自适应布局逻辑 =================
function updateLayout() {
    const sidebarEl = document.querySelector('.sidebar');
    const sidebarWidth = sidebarEl ? sidebarEl.clientWidth : 0;
    const practiceArea = document.querySelector('.practice-area');
    const displayEl = document.getElementById('scramble-display');
    const resizerEl = document.getElementById('dragMe'); // 获取拖拽条

    // 如果侧边栏隐藏，宽度视为 0；否则减去侧边栏宽度
    let w = window.innerWidth - sidebarWidth;
    if (w < 100) w = window.innerWidth; 
    let h = window.innerHeight;

    if (practiceArea) {
        practiceArea.style.width = w + 'px';
        practiceArea.style.left = '0px';
    }

    // 【核心修复】同步拖拽条的位置到侧边栏左侧边缘
    // 只要侧边栏不是隐藏状态，拖拽条就必须紧贴它的左边
    if (resizerEl && sidebarEl && sidebarEl.style.display !== 'none') {
        resizerEl.style.right = sidebarWidth + 'px';
    }

    const baseWidth = 800; 
    const baseDistance = 8.2; 
    const scaleFactor = baseWidth / w; 
    const finalScale = Math.max(0.8, Math.min(1.5, scaleFactor)); 
    const d = baseDistance * finalScale;
    
    const dir = new THREE.Vector3(4, 4, 6).normalize();
    camera.position.copy(dir.multiplyScalar(d));

    cubeGroup.position.x = 0;
    controls.target.set(0, 0, 0);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    controls.update();

    if (displayEl) {
        displayEl.style.left = '0px';
        displayEl.style.top = '0px';
        displayEl.style.transform = 'none';
        displayEl.style.borderRadius = '0 0 10px 0';
        displayEl.style.maxWidth = '100vw';
    }
}

// ================= 9. 侧边栏拖拽与折叠逻辑 =================
const resizer = document.getElementById('dragMe');
const sidebar = document.querySelector('.sidebar');
const sidebarHandle = document.getElementById('sidebarHandle');

let isResizing = false;
let isSidebarCollapsed = false;
let lastSidebarWidth = 350; 

function expandSidebar() {
    isSidebarCollapsed = false;
    sidebar.style.display = 'flex'; 
    const targetWidth = (lastSidebarWidth && lastSidebarWidth > 250) ? lastSidebarWidth : 350;
    sidebar.style.width = targetWidth + 'px';
    sidebar.style.padding = '30px 20px';
    sidebar.style.overflowY = 'auto';
    sidebarHandle.style.display = 'none'; 
    resizer.style.display = 'block'; 
    updateLayout();
}

function collapseSidebar() {
    isSidebarCollapsed = true;
    sidebar.style.display = 'none'; 
    sidebarHandle.style.display = 'block'; 
    resizer.style.display = 'none'; 
    updateLayout();
}

if (sidebarHandle) sidebarHandle.addEventListener('click', expandSidebar);

resizer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizer.classList.add('active');
    resizer.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    lastSidebarWidth = sidebar.clientWidth; 
});

resizer.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;

    // 【核心修复】只要拖拽到宽度小于 200px，立刻触发折叠，不需要等手指松开
    // 这完美解决了快速滑动时无法触发折叠的问题
    if (newWidth < 200) {
        collapseSidebar();
        isResizing = false;
        resizer.classList.remove('active');
        document.body.style.userSelect = '';
        if (e.pointerId) resizer.releasePointerCapture(e.pointerId);
        return;
    }

    const maxWidth = window.innerWidth - 100;
    if (newWidth >= 200 && newWidth < maxWidth) {
        sidebar.style.width = newWidth + 'px';
        resizer.style.right = newWidth + 'px';
        updateLayout();
    }
});

resizer.addEventListener('pointerup', (e) => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('active');
        if (e.pointerId) resizer.releasePointerCapture(e.pointerId);
        document.body.style.userSelect = '';
        
        // 如果松开时宽度依然在合理范围，记录为最终宽度
        if (sidebar.clientWidth >= 200) {
            lastSidebarWidth = sidebar.clientWidth;
            updateLayout();
        }
    }
});

resizer.addEventListener('pointercancel', (e) => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('active');
        if (e.pointerId) resizer.releasePointerCapture(e.pointerId);
        document.body.style.userSelect = '';
        updateLayout();
    }
});
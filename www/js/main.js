import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 在所有代码最前面加上这行，防止某个元素找不到导致全局崩溃
window.onerror = function(msg, url, line) {
    console.error("全局报错:", msg, "行号:", line);
    return false;
};

// ================= 1. 基础场景设置 =================
const container = document.getElementById('canvas-container');
if (!container) {
    console.error("找不到 id 为 'canvas-container' 的元素，请检查 index.html！");
}

container.style.width = '100%';
container.style.height = '100%';
let width = container.clientWidth || (window.innerWidth - 300);
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

const colors = {
    up: 0xffff00,    // 黄 (+y)
    down: 0xffffff,  // 白 (-y)
    front: 0xff0000, // 红 (+z)
    back: 0xffa500,  // 橙 (-z)
    right: 0x00ff00, // 绿 (+x)
    left: 0x0000ff   // 蓝 (-x)
};

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

// 【新增】创建一个组，用于整体平移魔方
const cubeGroup = new THREE.Group();

for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x === 0 && y === 0 && z === 0) continue;
    const cubie = createCubie(x, y, z); 
    cubeGroup.add(cubie); 
    cubies.push(cubie);
}

// 【核心调整】魔方整体向左偏移
// 【重置】物理层面完全居中，保证旋转手感完美
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
let isScrambling = false;
let lastScramble = ''; 
let scrambleState = 0; // 0: 打乱; 1: 显示公式; 2: 隐藏公式

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
        do {
            face = faces[Math.floor(Math.random() * 6)];
        } while (face === lastFace);
        lastFace = face;
        
        const mod = modifiers[Math.floor(Math.random() * 3)];
        scrambleStr += face + mod + ' ';
        
        const parsed = parseFormula(face + mod);
        parsed.forEach(step => {
            queueRotation(step.axis, step.layers, step.direction, 30);
        });
    }
    
    return scrambleStr.trim();
}

// 初始化：页面加载时，魔方物理状态为黄顶红前
resetCubeState();

document.getElementById('scrambleBtn').addEventListener('click', () => {
    const displayEl = document.getElementById('scramble-display');
    const scrambleBtn = document.getElementById('scrambleBtn');

    if (scrambleState === 0) {
        // 状态0：执行打乱，公式隐藏，按钮变为“显示打乱公式”
        resetCubeState();
        rotateToWhiteGreen(); 

        displayEl.style.display = 'none';
        
        lastScramble = generateLocalScramble();
        console.log("白顶绿前打乱序列:", lastScramble);

        isScrambling = true;
        
        // 打乱时自动清空笔记
        document.getElementById('noteCorner').value = '';
        document.getElementById('noteEdge').value = '';
        document.getElementById('noteFlip').value = '';

        scrambleState = 1;
        scrambleBtn.textContent = '显示打乱公式';
    } else if (scrambleState === 1) {
        // 状态1：用户点击显示公式，按钮变为“隐藏打乱公式”
        document.getElementById('scrambleText').textContent = "白顶绿前打乱: " + lastScramble;
        displayEl.style.display = 'block';
        
        scrambleState = 2;
        scrambleBtn.textContent = '隐藏打乱公式';
    } else {
        // 状态2：用户再次点击，公式隐藏，按钮变回“显示打乱公式”
        displayEl.style.display = 'none';
        
        scrambleState = 1;
        scrambleBtn.textContent = '显示打乱公式';
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    resetCubeState();
    const displayEl = document.getElementById('scramble-display');
    displayEl.style.display = 'none';
    
    // 复原魔方后，按钮文字变回“WCA打乱”，方便下一次打乱
    scrambleState = 0;
    document.getElementById('scrambleBtn').textContent = 'WCA打乱';

    // 复原时也清空笔记
    document.getElementById('noteCorner').value = '';
    document.getElementById('noteEdge').value = '';
    document.getElementById('noteFlip').value = '';
});

document.getElementById('toggleLetterBtn').addEventListener('click', (e) => {
    showLetters = !showLetters;
    e.target.textContent = showLetters ? '隐藏编码' : '显示编码';
    e.target.style.background = showLetters ? '#f44336' : '#4CAF50';
    e.target.style.borderColor = showLetters ? '#f44336' : '#4CAF50';

    cubies.forEach(cubie => {
        cubie.children.forEach(child => {
            if (child.userData && child.userData.isSticker) {
                child.material = showLetters ? child.userData.matWithLetter : child.userData.matNoLetter;
            }
        });
    });
});

// 隐藏/显示魔方按钮逻辑
let isCubeVisible = true;
document.getElementById('toggleCubeBtn').addEventListener('click', (e) => {
    isCubeVisible = !isCubeVisible;
    cubies.forEach(cubie => {
        cubie.visible = isCubeVisible;
    });
    e.target.textContent = isCubeVisible ? '隐藏魔方' : '显示魔方';
    e.target.style.background = isCubeVisible ? '#fff' : '#f44336'; 
    e.target.style.color = isCubeVisible ? '#333' : 'white';
});

// ================= 6. 渲染循环 =================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    // 动态计算左侧画布宽度，而不是写死 -300
    const sidebarEl = document.querySelector('.sidebar');
    const sidebarWidth = sidebarEl ? sidebarEl.clientWidth : 300;
    const w = container.clientWidth || (window.innerWidth - sidebarWidth);
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});


// ================= 7. 侧边栏拖拽调整宽度逻辑（适配平板触摸） =================
const resizer = document.getElementById('dragMe');
const sidebar = document.querySelector('.sidebar');

let isResizing = false;

function startResize(clientX) {
    isResizing = true;
    resizer.classList.add('active');
    document.body.style.userSelect = 'none';
}

function moveResize(clientX) {
    if (!isResizing) return;
    
    // 计算新宽度
    const newWidth = window.innerWidth - clientX;
    const maxWidth = window.innerWidth - 100; // 左侧至少保留 100px
    
    if (newWidth > 200 && newWidth < maxWidth) {
        sidebar.style.width = newWidth + 'px';
        // 【核心修复】同步更新拖拽条的 right 属性
        resizer.style.right = newWidth + 'px';
    }
}

function endResize() {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('active');
        document.body.style.userSelect = '';
        // 通知 Three.js 重新计算画布大小
        window.dispatchEvent(new Event('resize'));
    }
}

// ---------- 鼠标事件 (PC) ----------
resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startResize(e.clientX);
});
document.addEventListener('mousemove', (e) => moveResize(e.clientX));
document.addEventListener('mouseup', endResize);

// ---------- 触摸事件 (平板/手机) ----------
resizer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startResize(touch.clientX);
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!isResizing) return;
    e.preventDefault();
    const touch = e.touches[0];
    moveResize(touch.clientX);
}, { passive: false });

document.addEventListener('touchend', endResize);
// 所有公式的数据字典
const formulaData = {
    corner: {
        name: '角块公式',
        list: [
            { id: 'BX', group: 'B系列', name: 'BX', formula: "D F (R U R') D' (R U2 R') D (R U R') F' D'" },
            { id: 'XB', group: 'B系列', name: 'XB', formula: "D' F (R U R') D' (R U2 R') D (R U R') F' D" },
            { id: 'BY', group: 'B系列', name: 'BY', formula: "(U' R U) L2 (U' R' U) L2" },
            { id: 'YB', group: 'B系列', name: 'YB', formula: "L2 (U' R U) L2 (U' R' U)" },
            { id: 'BZ', group: 'B系列', name: 'BZ', formula: "(U' R U' R) (D' R' U R D) (R2 U)" },
            { id: 'ZB', group: 'B系列', name: 'ZB', formula: "(U' R2) (D' R' U' R D) (R' U R' U)" },

            { id: 'PX', group: 'P系列', name: 'PX', formula: "x'(R' U R) D2 (R' U' R) D2 x" },
            { id: 'XP', group: 'P系列', name: 'XP', formula: "x' D2(R' U R) D2 (R' U' R) x" },
            { id: 'PY', group: 'P系列', name: 'PY', formula: "D2(R U' R') D2 (R U R')" },
            { id: 'YP', group: 'P系列', name: 'YP', formula: "(R U' R') D2 (R U R')D2" },
            { id: 'PZ', group: 'P系列', name: 'PZ', formula: "z(R U R') D (R U R') D' R U2 R' z'" },
            { id: 'ZP', group: 'P系列', name: 'ZP', formula: "z R U2 R' D (R U' R') D' (R U' R') z'" },

            { id: 'QX', group: 'Q系列', name: 'QX', formula: "y L2 (U R' U') L2 (U R U') y'" },
            { id: 'XQ', group: 'Q系列', name: 'XQ', formula: "y (U R' U') L2 (U R U') L2 y'" },
            { id: 'QY', group: 'Q系列', name: 'QY', formula: "(R U' R D')(R' U' R D)(R' U2 R')" },
            { id: 'YQ', group: 'Q系列', name: 'YQ', formula: "(R U2 R D')(R' U R D)(R' U R')" },
            { id: 'QZ', group: 'Q系列', name: 'QZ', formula: "y (R' U R) D2 (R' U' R) D2 y'" },
            { id: 'ZQ', group: 'Q系列', name: 'ZQ', formula: "y D2 (R' U R) D2 (R' U' R) y'" }
        ]
    },
    edge: {
        name: '棱块公式',
        list: [
            { id: 'CG', group: '基础棱块公式', name: 'CG', formula: "(M2 U') (M U2 M') (U' M2)" },
            { id: 'GC', group: '基础棱块公式', name: 'GC', formula: "(M2 U) (M U2 M') (U M2)" },
            { id: 'DH', group: '基础棱块公式', name: 'DH', formula: "(M U M' U2) (M U M')" },
            { id: 'HD', group: '基础棱块公式', name: 'HD', formula: "(M U' M' U2) (M U' M')" },
            { id: 'CH', group: '基础棱块公式', name: 'CH', formula: "(S R' F R) (S' R' F' R)" },
            { id: 'HC', group: '基础棱块公式', name: 'HC', formula: "(R' F R S) (R' F' R S')" },
            { id: 'DG', group: '基础棱块公式', name: 'DG', formula: "(L F' L' S') (L F L' S)" },
            { id: 'GD', group: '基础棱块公式', name: 'GD', formula: "(S' L F' L') (S L F L')" }
        ]
    },
    // 【核心修改】合并为一个 flip 模块
    flip: {
        name: '翻色公式',
        list: [
            // === 棱块翻色 ===
            { id: 'EF_Opp', group: '棱块翻色', name: '对棱翻', formula: "(M'U)×2 M'U2 (MU)×2 MU2" },
            { id: 'EF_Adj', group: '棱块翻色', name: '邻棱翻', formula: "(R'U2)(R2UR'U')(R'U2) (r U R U') r'" },
            { id: 'EF_All', group: '棱块翻色', name: '四棱翻', formula: "(M' U M' U M' U M' U')×2" },
            
            // === 角块翻色 ===
            { id: '2C_Adj1', group: '角块翻色', name: '相邻顺翻(1)', formula: "(R U R' U R U2 R')(L' U' L U' L' U2 L)" },
            { id: '2C_Adj2', group: '角块翻色', name: '相邻逆翻(2)', formula: "(L' U2 L U L' U L)(R U2 R' U' R U' R')" },
            { id: '2C_Adj3', group: '角块翻色', name: '相邻顺翻(3)', formula: "(L' U' L U' L' U2 L) (R U R' U R U2 R')" },
            { id: '2C_Adj4', group: '角块翻色', name: '相邻逆翻(4)', formula: "(R U2 R' U' R U' R')(L' U2 L U L' U L)" },
            { id: '2C_Opp1', group: '角块翻色', name: '相对翻(1)', formula: "z' (R U R' U')×2 L2 (U R U' R')×2 L2 z" },
            { id: '2C_Opp2', group: '角块翻色', name: '相对翻(2)', formula: "z' (U R U' R')×2 L2 (R U R' U')×2 L2 z" },
            { id: '3C_CW', group: '角块翻色', name: '三角顺翻', formula: "z' (U R U' R')×2 L' (U R U' R')×2 L' (U R U' R')×2 L2 z" },
            { id: '3C_CCW', group: '角块翻色', name: '三角逆翻', formula: "z' (R U R' U')×2 L' (R U R' U')×2 L' (R U R' U')×2 L2 z" }
        ]
    },
    parity: {
        name: '奇偶校验公式',
        list: [
            { 
                id: 'Y_Perm', 
                group: '奇偶校验', 
                name: 'Y Perm (C+G)', 
                formula: "F R U' R' U' R U R' F' R U R' U' R' F R F'" 
            }
        ]
    }
};
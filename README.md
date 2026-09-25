# 三阶盲拧彳亍法新手练习平台 (3x3 BLD Trainer)

这是一个专为三阶盲拧（彳亍法 / 3-style）新手设计的 Web 与 Android 练习平台。平台包含 3D 虚拟魔方、坐标白顶绿前的打乱、专注角块/棱块模式、联想词库管理以及专门的字母对记忆训练模块，帮助魔友系统性地提升盲拧记忆与复原能力。

## 🌐 在线体验
你可以直接在浏览器中体验网页版：
👉 [点击进入在线练习平台](https://sekitomoki.github.io/3x3-bld-trainer/www/index.html)

*(注：如需体验 Android 版，可前往本仓库 Releases 页面下载最新的 APK 安装包)*

---

## 🧩 魔方编码体系（黄顶红前）

本项目采用黄顶红前坐标系，以下为我个人使用的字母编码与缓冲块设定：

### 🔸 缓冲块（Buffer）
*   **棱块缓冲**：UF (A)
*   **角块缓冲**：UFL (A)
*   **奇偶校验**：棱块加 C，角块加 G

### 🔹 各面编码分布
*(以下编码图基于黄顶红前，`*` 代表缓冲块)*
![编码图](https://github.com/user-attachments/assets/8c3d4964-e1b9-415b-88c2-f4bce7d3c5ce)
![界面截图](https://github.com/user-attachments/assets/143b7cb8-7b6e-46ce-a852-1e9df983b053)


---

## ✨ 主要功能

*   **3D 虚拟魔方**：支持鼠标/触摸拖拽自由旋转视角，黄顶红前标准朝向。
*   **标准打乱**：支持白顶绿前打乱公式，打乱后自动切回黄顶红前方便读码。
*   **专注模式**：一键隐藏棱块或角块，专注练习单项编码与记忆。
*   **编码显示**：将编码直接贴在魔方色块上，边打乱边读码。
*   **联想词库**：支持搜索、修改、导入/导出个人联想词（JSON 格式备份）。
*   **记忆训练**：随机生成 11 个字母对进行记忆与回忆测试，自动校对结果，支持手机端竖屏。
*   **数据持久化**：所有联想词数据保存在浏览器/App 的本地存储中，无需联网即可使用。

---

## 🛠️ 本地运行与打包

**网页版运行**：
使用 VS Code 的 Live Server 打开 `www/index.html` 即可。

**Android App 打包**：
本项目基于 Capacitor 构建。如果需要自行打包 APK：
```bash
npm install
npx cap sync
npx cap open android
```
然后在 Android Studio 中点击 Build -> Generate App Bundles or APKs -> Generate APK(s) 即可。

---

## 👨‍💻 作者
### SEKITOMOKI
* GitHub: @SEKITOMOKI
* 项目仓库: 3x3-bld-trainer
* E-mail: SEKITOMOKI@163.com
* WeChat: SEKITOMOKI

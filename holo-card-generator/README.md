# Holo Card Generator · 破界 Neon Protocol

一个纯前端的全息镭射收藏卡生成器。上传有人物或动物轮廓的照片后，页面会在浏览器本地完成抠图、线稿提取、主体适配、分层视差、全息镭射材质和卡面合成。正面与卡背文字都可以实时自定义。

## 功能

- 本地上传人物或动物照片，照片不会发送到服务器
- 浏览器内自动抠图，自动区分站立人物与横向动物构图
- 自动生成主体线稿、接触阴影、边缘辉光和分层素材
- Three.js 真实卡牌厚度、分层视差、拖拽旋转、滚轮缩放和卡背翻转
- 四种表面工艺：镭射、虹光、星尘、素面
- 可调节镭射强度、画面比例、主体景深、特效景深、底纹景深
- 正面文字与卡背文字实时重绘
- 一键下载卡牌截图
- 支持桌面端和移动端，WebGL 不可用时自动降级为 CSS 3D 卡片

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Three.js
- @imgly/background-removal
- ONNX Runtime Web

## 本地运行

要求 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开终端中显示的本地地址即可使用。

## 构建生产版本

```bash
npm run build
```

构建产物会输出到 `dist/`。你也可以在本地预览：

```bash
npm run preview
```

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，例如 `holo-card-generator`。
2. 将本项目推送到仓库：

```bash
git init
git add .
git commit -m "feat: add holo card generator"
git branch -M main
git remote add origin https://github.com/你的用户名/holo-card-generator.git
git push -u origin main
```

3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
5. 推送代码后，`.github/workflows/deploy-github-pages.yml` 会自动构建并发布页面。

## 模型资源与离线说明

首次使用抠图功能时，浏览器需要下载一次 ONNX 模型和运行时文件。项目内置了多份资源索引，会按顺序尝试：

1. npmmirror
2. npmmirror CDN
3. unpkg
4. 官方 staticimgly

资源索引文件位于 `public/model-resources/`，模型本体不直接放入 Git 仓库，以避免仓库过大。

如果网络环境无法访问任何模型源，页面会提示生成失败。已下载过的模型通常会被浏览器缓存，再次使用会更快。

## 隐私

照片处理完全发生在当前浏览器中。项目没有后端服务，也不会把照片上传到服务器。只有首次加载模型时，浏览器会向公共 CDN 请求模型文件。

## 项目结构

```text
holo-card-generator/
├── .github/workflows/          # GitHub Pages 自动部署
├── public/
│   ├── assets/                 # 默认背景、特效、示例主体和线稿
│   └── model-resources/        # 模型资源索引
├── src/
│   ├── components/card/        # Three.js 卡牌舞台与编辑面板
│   ├── lib/card/               # 抠图、Canvas、文字层和素材合成
│   ├── pages/HomePage/         # 主页面
│   └── index.css               # 全局样式
├── LICENSE
└── package.json
```

## 注意事项

- 主体轮廓越清楚、背景对比越明显，抠图效果越稳定。
- 复杂背景、低光照、主体被遮挡或主体与背景颜色过近时，可能需要手动更换照片。
- 浏览器中的全息材质使用 GLSL 实时计算，和离线 Blender 渲染效果接近，但不保证像素级一致。
- 推荐使用新版 Chrome、Edge 或 Firefox。

## License

[MIT](./LICENSE)

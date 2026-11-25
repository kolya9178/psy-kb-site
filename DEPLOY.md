# 部署说明（双线：Cloudflare Pages + GitHub Pages）

> 这个目录就是要上传的东西。`index.html` 在根，没有构建步骤，不需要 npm。

---

## 一、先建 GitHub 仓库

1. 打开 https://github.com/new
2. Repository name 填 **`psy-kb-site`**（这个名字会在 Cloudflare 域名里出现，想好再定）
3. 选 Public 或 Private 都行（GitHub Pages 免费版要求 Public 才能直接发布；Cloudflare 不限）
4. **不要**勾 "Add a README file"
5. Create repository

然后上传文件，两种方式任选：

**方式 A：网页拖拽（简单）**
- 仓库页面 → **Add file** → **Upload files**
- 把本目录**所有文件**拖进去（包括 `.nojekyll`、`stamp.py`）
- 底部填提交信息，**Commit changes**

**方式 B：命令行（以后更新更方便）**
```bash
git clone https://github.com/你的用户名/psy-kb-site.git
# 把本目录文件拷进去
cd psy-kb-site
git add -A
git commit -m "首次部署"
git push
```

---

## 二、Cloudflare Pages（主线路）

1. https://dash.cloudflare.com 注册（邮箱即可，免费）
2. 左侧 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 授权 GitHub，选中 `psy-kb-site` 仓库
4. 构建设置：

| 项 | 值 |
|---|---|
| Framework preset | **None** |
| Build command | **留空** |
| Build output directory | **`/`**（就一个斜杠） |

5. **Save and Deploy**
6. 等 30 秒，拿到 `https://psy-kb-site.pages.dev`

---

## 三、GitHub Pages（备用线路）

1. 仓库 → **Settings** → 左侧 **Pages**
2. Source 选 **Deploy from a branch**
3. Branch 选 **main**，目录选 **/ (root)**
4. Save，等 1–2 分钟
5. 地址是 `https://你的用户名.github.io/psy-kb-site/`

> 仓库里的 `.nojekyll` 已经放好了，它让 GitHub Pages 原样发布文件、不跑 Jekyll 处理。**不要删它。**

---

## 四、以后怎么更新

改完内容后（比如重新跑了 `build.py` 生成了新的 `data.js`）：

```bash
cd psy-kb-site
python3 stamp.py          # ① 更新版本号（重要，见下）
git add -A
git commit -m "更新知识点"
git push                  # ② 两条线路自动重新部署
```

Cloudflare 约 1 分钟生效，GitHub Pages 约 1–2 分钟。

**`stamp.py` 为什么必须跑**：它给 `data.js`、`pages.js` 等文件名后面加内容指纹（`data.js?v=694b8b2a`）。文件一变，版本号就变，浏览器才会去拿新文件。不跑这一步，改完推送了，用户手机上还是旧版，而且刷新也没用。

脚本是幂等的：文件没改，版本号不动。

---

## 五、常见问题

**Q：有人打不开 `pages.dev`？**
让他换 `github.io` 那条线路。国内对这两个域名的连通性时好时坏，双线路的意义就在这。

**Q：更新了但看到的是旧版？**
先确认推送后跑过 `stamp.py`。如果跑过还这样，让用户下拉刷新或清一次缓存。

**Q：能不能加自定义域名？**
能，Cloudflare 和 GitHub Pages 都支持。国内访问需要备案，不建议折腾。

**Q：要花钱吗？**
0 元。Cloudflare Pages 免费额度：每月 500 次构建、无限带宽、单个文件 25 MB。GitHub Pages：公开仓库免费，每月 100 GB 流量。当前站点 2.4 MB，10 个人试用绰绰有余。

---

## 六、上线后自查清单

- [ ] 首页能打开，顶部显示「593 个知识点」
- [ ] 四个 tab 都能切：章节 / 搜索 / 易混 / 结构
- [ ] 搜「韦伯定律」「组块」「大五」都有结果
- [ ] 点任意知识点 → 底部「第 N 页原文」能弹出 OCR 全文
- [ ] 右下角绿色「反馈」按钮能打开、能提交
- [ ] 手机浏览器「添加到主屏幕」后图标正常

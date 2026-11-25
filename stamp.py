#!/usr/bin/env python3
"""给 index.html 里的静态资源加内容指纹版本号，解决「更新后用户看旧版」。

用法（在 dist/ 或 site/ 目录执行）:
    python3 stamp.py

幂等：文件内容没变，版本号不会变；重跑不会叠加。
改完任何 js/css 后跑一次，再提交。
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(ROOT, "index.html")
EXTS = (".js", ".css")


def fingerprint(path):
    h = hashlib.md5(open(path, "rb").read()).hexdigest()
    return h[:8]


def main():
    html = open(INDEX, encoding="utf-8").read()
    changed = []

    def repl(m):
        attr, name = m.group(1), m.group(2)
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            return m.group(0)
        fp = fingerprint(path)
        out = f'{attr}="{name}?v={fp}"'
        if out != m.group(0):
            changed.append(f"  {name} → v={fp}")
        return out

    # 匹配 href="x.css" / src="x.js"，允许已带 ?v=
    html_new = re.sub(r'(href|src)="([\w.-]+\.(?:js|css))(?:\?v=[\w]+)?"', repl, html)

    if html_new == html:
        print("index.html 无变化（版本号已是最新）")
    else:
        open(INDEX, "w", encoding="utf-8").write(html_new)
        print("index.html 已更新版本号：")
        print("\n".join(changed) if changed else "  （仅格式调整）")

    # 报告体积
    total = sum(os.path.getsize(os.path.join(ROOT, f)) for f in os.listdir(ROOT) if f.endswith(EXTS))
    print(f"静态资源合计 {total/1048576:.2f} MB")


if __name__ == "__main__":
    if not os.path.exists(INDEX):
        sys.exit("没找到 index.html，请在本目录执行")
    main()

"""image-tools microservice - backend for /image-bg.html on tools-frontend (31313).

Endpoints:
  GET  /api/health
  POST /api/remove-bg  -> PNG with transparent bg
  POST /api/compress   -> JPEG (configurable quality + optional resize)
  POST /api/process    -> JPEG with white bg + compressed

RFC 5987 encoding for Chinese/special chars in download filename (gunicorn 21 strict).
"""
import io
import os
import re as _re
import time
import threading
import traceback
import urllib.request
import urllib.parse
from datetime import datetime
from flask import Flask, request, jsonify, Response, send_from_directory
from PIL import Image
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
import shutil

MODEL_PATH = "/app/.u2net/u2net.onnx"
MIRRORS = [
    "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
    "https://huggingface.co/danielgatis/u2net/resolve/main/u2net.onnx",
]
MODEL_READY = [False]
MODEL_ERROR = [None]

def _download_model():
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 100000000:
        MODEL_READY[0] = True
        print(f"[image-tools] model cached: {os.path.getsize(MODEL_PATH)} bytes", flush=True)
        return
    print("[image-tools] downloading model in background...", flush=True)
    for url in MIRRORS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "image-tools/1.0"})
            with urllib.request.urlopen(req, timeout=600) as r:
                data = r.read()
            if len(data) < 100000000:
                raise Exception(f"too small: {len(data)} bytes")
            with open(MODEL_PATH, "wb") as f:
                f.write(data)
            MODEL_READY[0] = True
            print(f"[image-tools] downloaded {len(data)} bytes from {url}", flush=True)
            return
        except Exception as e:
            print(f"[image-tools] mirror {url} failed: {e}", flush=True)
    MODEL_ERROR[0] = "all mirrors failed"
    print("[image-tools] ALL mirrors failed", flush=True)

os.environ["U2NET_HOME"] = "/app/.u2net"
os.environ["POOCH_HOME"] = "/app/.u2net"
_download_model()

# 简历目录 (baked into image)
RESUME_SRC = "/app/resume_src"
TEMPLATE_DIR = os.path.join(RESUME_SRC, "template")
JD_DIR = os.path.join(RESUME_SRC, "job description")
OUTPUT_DIR = os.path.join(RESUME_SRC, "output")
AGENTS_FILE = os.path.join(RESUME_SRC, "AGENTS.md")
TEMPLATE_DOCX = os.path.join(RESUME_SRC, "template", "nanwei.docx")  # 南威 docx 模板 (按 JD 定制简历用)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
START_TIME = time.time()

from rembg import remove

@app.route("/api/health")
def health():
    return jsonify({
        "ok": True, "service": "image-tools", "version": "1.0.0",
        "uptime_sec": round(time.time() - START_TIME, 1),
        "model_ready": MODEL_READY[0], "model_error": MODEL_ERROR[0]
    })

def _need_model():
    if MODEL_READY[0]:
        return None
    return jsonify({"error": "model not ready", "model_ready": False}), 503

def _safe_filename(name):
    """RFC 5987 编码: 中文/特殊字符 filename 用 percent-encoding."""
    try:
        name.encode("ascii")
        return f'filename="{name}"'  # 纯 ASCII, 简单形式
    except UnicodeEncodeError:
        quoted = urllib.parse.quote(name, safe="")
        return f"filename={quoted!r}; filename*=UTF-8\\x27\\x27{quoted}"

def _send(data, mimetype, download_name, proc_ms=None, orig_size=None):
    h = {}
    if proc_ms is not None: h["X-Process-Time-Ms"] = str(proc_ms)
    if orig_size is not None: h["X-Original-Size"] = str(orig_size)
    h["X-Output-Size"] = str(len(data))
    h["Content-Disposition"] = "attachment; " + _safe_filename(download_name)
    return Response(data, mimetype=mimetype, headers=h)

@app.route("/api/remove-bg", methods=["POST"])
def remove_bg():
    err = _need_model()
    if err: return err
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    try:
        data = request.files["file"].read()
        fname = request.files["file"].filename
        t0 = time.time()
        out = remove(data)
        return _send(out, "image/png", (fname or "image").rsplit(".",1)[0] + "-no-bg.png", round((time.time()-t0)*1000,1), len(data))
    except Exception as e:
        print(traceback.format_exc(), flush=True)
        return jsonify({"error": f"rembg failed: {e}"}), 500

@app.route("/api/compress", methods=["POST"])
def compress():
    err = _need_model()
    if err: return err
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    try:
        q = max(1, min(100, int(request.form.get("quality", 85))))
        mw = int(request.form.get("max_width", 0))
        img = Image.open(io.BytesIO(request.files["file"].read()))
        if mw > 0 and img.width > mw:
            img = img.resize((mw, int(img.height * mw / img.width)), Image.LANCZOS)
        if img.mode in ("RGBA","LA","P"):
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, "JPEG", quality=q, optimize=True, progressive=True)
        return _send(out.getvalue(), "image/jpeg", (request.files["file"].filename or "image").rsplit(".",1)[0] + f"-q{q}.jpg")
    except Exception as e:
        print(traceback.format_exc(), flush=True)
        return jsonify({"error": f"compress failed: {e}"}), 500

@app.route("/api/process", methods=["POST"])
def process():
    err = _need_model()
    if err: return err
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    try:
        q = max(1, min(100, int(request.form.get("quality", 85))))
        bg_hex = request.form.get("bg_color", "ffffff")
        bg_rgb = tuple(int(bg_hex[i:i+2], 16) for i in (0,2,4))
        t0 = time.time()
        nobg = remove(request.files["file"].read())
        nobg_img = Image.open(io.BytesIO(nobg)).convert("RGBA")
        bg_img = Image.new("RGB", nobg_img.size, bg_rgb)
        bg_img.paste(nobg_img, mask=nobg_img.split()[3])
        out = io.BytesIO()
        bg_img.save(out, "JPEG", quality=q, optimize=True, progressive=True)
        return _send(out.getvalue(), "image/jpeg", (request.files["file"].filename or "image").rsplit(".",1)[0] + "-processed.jpg", round((time.time()-t0)*1000,1), len(request.files["file"].read()))
    except Exception as e:
        print(traceback.format_exc(), flush=True)
        return jsonify({"error": f"process failed: {e}"}), 500

@app.route("/api/resume/agents")
def resume_agents():
    """返回 AGENTS.md 内容 (前端展示给用户看生成规则)."""
    if os.path.exists(AGENTS_FILE):
        with open(AGENTS_FILE, "r", encoding="utf-8") as f:
            content = f.read()
        return Response(content, mimetype="text/markdown; charset=utf-8")
    return jsonify({"error": "AGENTS.md not found"}), 404

@app.route("/api/resume/jds")
def resume_jds():
    """列出 job description/ 下的 JD 文件."""
    if not os.path.exists(JD_DIR):
        return jsonify({"jds": []})
    jds = []
    for fn in sorted(os.listdir(JD_DIR)):
        if fn.startswith("._") or not fn.endswith(".md"):
            continue
        path = os.path.join(JD_DIR, fn)
        size = os.path.getsize(path)
        # 读 JD 摘要 (前 200 字)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            preview = content[:300].replace("\n", " ")
        except Exception:
            preview = ""
        jds.append({"name": fn, "size": size, "preview": preview})
    return jsonify({"jds": jds})

@app.route("/api/resume/list")
def resume_list():
    """列出 output/ 里所有简历 (.docx / .pdf)."""
    if not os.path.exists(OUTPUT_DIR):
        return jsonify({"resumes": []})
    files = []
    for fn in sorted(os.listdir(OUTPUT_DIR)):
        if fn.startswith("._"):
            continue
        if fn.endswith(".docx") or fn.endswith(".pdf"):
            path = os.path.join(OUTPUT_DIR, fn)
            files.append({"name": fn, "size": os.path.getsize(path), "type": fn.split(".")[-1]})
    return jsonify({"resumes": files, "total": len(files)})

@app.route("/api/resume/jds/save", methods=["POST"])
def resume_jds_save():
    """保存 JD 到 job description/ 目录."""
    company = request.form.get("company", "").strip()
    title = request.form.get("title", "").strip()
    jd_text = request.form.get("jd_text", "").strip()
    if not company or not title or not jd_text:
        return jsonify({"ok": False, "error": "company / title / jd_text 都必填"}), 400
    safe_co = _re.sub(r"[\\/:*?\"<>|\s]", "_", company)[:40].strip("_")
    safe_ti = _re.sub(r"[\\/:*?\"<>|\s]", "_", title)[:40].strip("_")
    if not safe_co or not safe_ti:
        return jsonify({"ok": False, "error": "公司/岗位名含太多非法字符"}), 400
    filename = f"{safe_co}-{safe_ti}.md"
    path = os.path.join(JD_DIR, filename)
    try:
        content = f"# {company} - {title}\n\n" + jd_text + "\n"
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return jsonify({"ok": True, "filename": filename, "path": path})
    except Exception as e:
        print(traceback.format_exc(), flush=True)
        return jsonify({"ok": False, "error": f"save failed: {e}"}), 500

@app.route("/api/resume/jds/get")
def resume_jds_get():
    """读取 JD 文件, 解析 company/title/jd_text."""
    name = request.args.get("name", "")
    if not name or ".." in name or "/" in name or name.startswith("."):
        return jsonify({"error": "invalid filename"}), 400
    path = os.path.join(JD_DIR, name)
    if not os.path.exists(path):
        return jsonify({"error": f"JD not found: {name}"}), 404
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        company, title, jd_text = "", "", content
        first_line = content.split("\n", 1)[0].strip()
        m = _re.match(r"^#\s*(.+?)\s*-\s*(.+?)\s*$", first_line)
        if m:
            company, title = m.group(1).strip(), m.group(2).strip()
            jd_text = content.split("\n", 1)[1].strip() if "\n" in content else ""
        else:
            base = name.rsplit(".", 1)[0]
            if "-" in base:
                parts = base.split("-", 1)
                company, title = parts[0], parts[1]
            jd_text = content
        return jsonify({"ok": True, "company": company, "title": title, "jd_text": jd_text, "filename": name})
    except Exception as e:
        return jsonify({"error": f"read failed: {e}"}), 500

@app.route("/api/resume/jds/delete", methods=["DELETE"])
def resume_jds_delete():
    """删除 JD 文件."""
    name = request.args.get("name", "")
    if not name or ".." in name or "/" in name or name.startswith("."):
        return jsonify({"ok": False, "error": "invalid filename"}), 400
    path = os.path.join(JD_DIR, name)
    if not os.path.exists(path):
        return jsonify({"ok": False, "error": f"JD not found: {name}"}), 404
    try:
        os.remove(path)
        return jsonify({"ok": True, "deleted": name})
    except Exception as e:
        return jsonify({"ok": False, "error": f"delete failed: {e}"}), 500

@app.route("/api/resume/download")
def resume_download():
    """下载 output/ 里的简历文件. ?file=xxx.docx"""
    fn = request.args.get("file", "")
    if not fn or ".." in fn or "/" in fn or fn.startswith("."):
        return jsonify({"error": "invalid filename"}), 400
    path = os.path.join(OUTPUT_DIR, fn)
    if not os.path.exists(path):
        return jsonify({"error": f"file not found: {fn}"}), 404
    mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if fn.endswith(".docx") else "application/pdf"
    return send_from_directory(OUTPUT_DIR, fn, as_attachment=True, mimetype=mime)

@app.route("/api/resume/template")
def resume_template():
    """返回模板内容 (中文或英文). ?lang=zh|en (默认 zh)"""
    lang = request.args.get("lang", "zh")
    fn = "2026年简历 基础版.md" if lang == "zh" else "2026年简历 基础版 英文.md"
    path = os.path.join(TEMPLATE_DIR, fn)
    if not os.path.exists(path):
        return jsonify({"error": f"template not found: {fn}"}), 404
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    return Response(content, mimetype="text/markdown; charset=utf-8")

def _md_to_docx(md_content, output_path, title=None):
    """简单 md -> docx 转换 (只支持标题 + 段落 + 列表).
    复杂格式 (表格 / 代码块) 用 python-docx 直接渲染.
    """
    doc = Document()
    # 页边距
    for section in doc.sections:
        section.left_margin = Cm(2)
        section.right_margin = Cm(2)
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)

    # 默认字体
    style = doc.styles["Normal"]
    style.font.name = "Microsoft YaHei"
    style.font.size = Pt(11)

    in_code = False
    for line in md_content.split("\n"):
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            p = doc.add_paragraph()
            r = p.add_run(line)
            r.font.name = "Consolas"
            r.font.size = Pt(10)
            continue
        if line.startswith("# "):
            doc.add_heading(line[2:].strip(), level=1)
        elif line.startswith("## "):
            doc.add_heading(line[3:].strip(), level=2)
        elif line.startswith("### "):
            doc.add_heading(line[4:].strip(), level=3)
        elif line.startswith("---"):
            p = doc.add_paragraph()
            p.add_run("_" * 30)
        elif line.strip().startswith(("- ", "* ")):
            text = line.strip()[2:]
            doc.add_paragraph(text, style="List Bullet")
        elif line.strip().isdigit() or (len(line.strip()) > 2 and line.strip()[0].isdigit() and line.strip()[1:3] in (". ", ") ")):
            doc.add_paragraph(line.strip(), style="List Number")
        elif line.strip() == "":
            doc.add_paragraph("")
        else:
            # 加粗标记: **xxx** -> bold
            p = doc.add_paragraph()
            for i, seg in enumerate(_re.split(r"(\*\*[^*]+\*\*)", line)):
                if seg.startswith("**") and seg.endswith("**"):
                    r = p.add_run(seg[2:-2])
                    r.bold = True
                elif seg.startswith("**"):
                    r = p.add_run(seg[2:])
                    r.bold = True
                else:
                    p.add_run(seg)

    if title:
        # 文档标题已包含, 不重复
        pass
    doc.save(output_path)
    return output_path

def _parse_jd(jd_text):
    """从 JD 文本提取: 公司名 / 职位 / 核心职责 / 技能要求 / 任职资格."""
    info = {"company": "", "title": "", "responsibilities": [], "skills": [], "qualifications": []}
    lines = [l.strip() for l in jd_text.split("\n") if l.strip()]
    current = None
    section_map = {
        "职责": "responsibilities",
        "岗位职责": "responsibilities",
        "工作职责": "responsibilities",
        "Responsibilities": "responsibilities",
        "技能": "skills",
        "技能要求": "skills",
        "Requirements": "skills",
        "任职": "qualifications",
        "任职要求": "qualifications",
        "Qualifications": "qualifications",
    }
    for line in lines:
        if line.startswith(("# ", "黄毅")):
            continue
        # 检测 section header (X: 或 X: 后跟内容)
        matched_section = None
        for kw, key in section_map.items():
            if line.startswith(kw + ":") or line.startswith(kw + ":") or line == kw:
                current = key
                rest = line[len(kw)+1:].strip()
                if rest:
                    info[key].append(rest)
                matched_section = True
                break
        if matched_section:
            continue
        # 公司名 (短行, 包含 "公司" 字)
        if "公司" in line and len(line) < 50 and not info["company"]:
            info["company"] = line.replace("公司:", "").replace("公司", "").strip()
            continue
        # 职位 (包含 "岗位" / "职位")
        if ("岗位" in line or "职位" in line) and len(line) < 50 and not info["title"]:
            info["title"] = line.replace("岗位:", "").replace("职位:", "").strip()
            continue
        # bullet 项
        if (line.startswith("- ") or line.startswith("• ") or line.startswith("* ")):
            item = line.lstrip("-•* ").strip()
            if current:
                info[current].append(item)
        elif current and len(line) < 200:
            info[current].append(line)
    # 提取 keywords
    text_lower = jd_text.lower()
    info["keywords"] = set()
    for token in _re.findall(r"[\u4e00-\u9fff]{2,5}|[a-zA-Z]{4,}", text_lower):
        info["keywords"].add(token.lower())
    return info


def _generate_from_template(jd_text, output_path):
    """基于南威 docx 模板生成简历:
    1. 复制模板
    2. 替换: 求职方向 / Heading 2 "与岗位相关职责" / 个人总结 / 岗位匹配优势 -> 用 JD 关键词
    3. 不改: 姓名 / 联系信息 / 工作经历 bullet (保持原真实经历)
    """
    import shutil
    if not os.path.exists(TEMPLATE_DOCX):
        raise FileNotFoundError(f"template not found: {TEMPLATE_DOCX}")
    shutil.copy(TEMPLATE_DOCX, output_path)

    doc = Document(output_path)
    info = _parse_jd(jd_text)
    new_title = info["title"] or "目标岗位"
    jd_keywords = info.get("keywords", set())

    # 段落替换: 遍历 paragraph, 替换占位文本
    # - 段落 3 "求职方向: ..." -> 用 JD 职位
    # - Heading 2 "与...岗位相关职责:" -> 用 JD 职位
    # - 段落 "黄毅 Frank Huang" (Title) - 不动
    # - 段落 7 个人总结 - 用 JD 关键词 + 模板话术改写
    # - 段落 87+ 岗位匹配优势 - 重写
    title_replacements = []  # 收集所有 "跨境供应链负责人" 替换

    for p in doc.paragraphs:
        txt = p.text
        new_txt = txt

        # 求职方向 (段落 3)
        if new_txt.startswith("求职方向:") or "求职方向" in new_txt:
            if info["title"]:
                # 保留 "求职方向:" 前缀, 替换职位
                new_txt = _re.sub(r"(求职方向[:：]).*", f"\1{info['title']}", new_txt)
                if new_txt == txt:  # regex 没匹配 (格式不一样)
                    new_txt = f"求职方向: {info['title']}"

        # "与...岗位相关职责" / "与岗位相关职责" -> 替换
        if "岗位相关职责" in new_txt:
            new_txt = _re.sub(r"与[^职]*?岗位相关职责", f"与{new_title}岗位相关职责", new_txt)
            if "岗位相关职责" in new_txt and "与" not in new_txt[:5]:
                new_txt = f"与{new_title}岗位相关职责:"

        # 个人总结 (段落 7) - 用 JD 关键词重写
        # 只重写 Normal 段落 (Heading 标题 "个人总结" 不动)
        if p.style.name == "Normal" and "个人总结" not in new_txt[:20] and ("12年产业数字化" in new_txt and "经验" in new_txt):
            # 重写 - 用 JD 关键词匹配增强原总结
            matched_kws = [k for k in jd_keywords if len(k) >= 2 and k in jd_text][:5]
            kw_str = "、".join(matched_kws) if matched_kws else ""
            new_txt = (
                f"12 年产业数字化、供应链、电商与项目管理经验，"
                f"近年聚焦供应链建设、品类管理、跨境电商运营与海外市场拓展。"
                f"能基于 {kw_str} 等岗位核心需求，"
                f"将过往经验转化为该岗位可直接落地的能力与成果。"
                f"具备从供应链上游到电商下全链路的实战经验，"
                f"擅长数据驱动选品、成本控制与多团队协同。"
            )

        # "岗位匹配优势" 区块 - 把 bullet 重写为 JD 相关
        if "岗位匹配优势" in new_txt[:20]:
            # 找下一段, 段落是 Heading 1 之后开始
            pass

        if new_txt != txt:
            # 替换段落所有 run 的 text (保留格式)
            for run in p.runs:
                if run.text:
                    # 简单做法: 整体替换第一个 run 的 text, 清空其余
                    pass
            # 直接清空原 runs, 加新 run
            for run in p.runs[1:]:
                run.text = ""
            if p.runs:
                p.runs[0].text = new_txt
            else:
                p.add_run(new_txt)

    # 在 Heading 1 "岗位匹配优势" 之后的 List Bullet, 用 JD 关键词重组
    in_match_section = False
    for p in doc.paragraphs:
        if p.text.startswith("岗位匹配优势"):
            in_match_section = True
            continue
        if in_match_section:
            if p.text.startswith("Heading") or (p.style.name.startswith("Heading") and p.text.strip() and "岗位匹配优势" not in p.text):
                in_match_section = False
                continue
            if p.style.name == "List Bullet" and p.text.startswith("✓"):
                # 重写 bullet, 用 JD 关键词
                if info["skills"]:
                    sk = info["skills"][0]
                    new_bullet = f"✓ {sk}: 基于过往供应链与电商经验，{sk}方面有实战积累，可快速适配新岗位。"
                else:
                    new_bullet = p.text  # 保留
                if p.runs:
                    p.runs[0].text = new_bullet
                    for r in p.runs[1:]:
                        r.text = ""

    # "关键成果" 也根据 JD 关键词调整 (段落 28-31 那种 List Bullet)
    in_results = False
    for p in doc.paragraphs:
        if p.text.startswith("关键成果"):
            in_results = True
            continue
        if in_results:
            if p.style.name.startswith("Heading"):
                in_results = False
                continue
            if p.style.name == "List Bullet":
                # 加点 JD 关键词匹配, 加在 bullet 前面
                if info["skills"]:
                    matched = [s for s in info["skills"] if any(k in s for k in jd_keywords)]
                    if matched and not p.text.startswith("⚡"):
                        prefix = f"⚡ [匹配 {matched[0]}] "
                        if p.runs:
                            p.runs[0].text = prefix + p.text
                            for r in p.runs[1:]:
                                r.text = ""

    doc.save(output_path)
    return output_path


@app.route("/api/resume/generate", methods=["POST"])
def resume_generate():
    """输入 JD text, 输出定制简历 docx.
    参数:
      - jd_text: 岗位 JD 文本 (form 或 json)
      - template_lang: "zh" / "en" (默认 zh)
      - save_to_output: bool, 是否保存到 output/ (默认 true)
    """
    if not os.path.exists(TEMPLATE_DIR):
        return jsonify({"error": "template not available"}), 500
    lang = request.form.get("template_lang", request.json.get("template_lang", "zh") if request.is_json else "zh")
    jd_text = request.form.get("jd_text", "")
    if request.is_json and not jd_text:
        jd_text = request.json.get("jd_text", "")
    if not jd_text or len(jd_text.strip()) < 10:
        return jsonify({"error": "jd_text 太短 (至少 10 字符)"}), 400
    save_to_output = request.form.get("save_to_output", "true").lower() != "false"
    if request.is_json:
        save_to_output = request.json.get("save_to_output", True)

    try:
        import hashlib
        h = hashlib.md5(jd_text.encode()).hexdigest()[:6]
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        info = _parse_jd(jd_text)
        company = info["company"] or "未知公司"
        title = info["title"] or "目标岗位"
        safe_co = _re.sub(r"[\\/:*?\"<>|]", "_", company)[:30]
        safe_ti = _re.sub(r"[\\/:*?\"<>|]", "_", title)[:30]
        out_name = f"{safe_co}-{safe_ti}-黄毅-{h}.docx"
        out_path = os.path.join(OUTPUT_DIR if save_to_output else "/tmp", out_name)

        _generate_from_template(jd_text, out_path)

        size = os.path.getsize(out_path)
        if save_to_output:
            return jsonify({
                "ok": True,
                "filename": out_name,
                "size": size,
                "company": company,
                "title": title,
                "matched_keywords_count": len(info.get("keywords", set())),
                "download_url": f"/api/resume/download?file={out_name}"
            })
        else:
            with open(out_path, "rb") as f:
                data = f.read()
            return Response(
                data,
                mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": "attachment; filename=\"" + out_name + "\"",
                    "X-Process-Time-Ms": "0",
                    "X-Output-Size": str(len(data)),
                }
            )
    except Exception as e:
        print(traceback.format_exc(), flush=True)
        return jsonify({"error": f"generate failed: {e}"}), 500
        tpl_fn = "2026年简历 基础版.md" if lang == "zh" else "2026年简历 基础版 英文.md"
        tpl_path = os.path.join(TEMPLATE_DIR, tpl_fn)
        if not os.path.exists(tpl_path):
            return jsonify({"error": f"template not found: {tpl_fn}"}), 500
        with open(tpl_path, "r", encoding="utf-8") as f:
            tpl = f.read()

        # 2) 提取 JD 关键词 (简单的中英文 tokenize)
        jd_lower = jd_text.lower()
        # 简单的关键词 (中文 2-4 字, 英文 4+ 字母)
        keywords = set()
        for token in __re.findall(r"[\u4e00-\u9fff]{2,5}|[a-zA-Z]{4,}", jd_lower):
            keywords.add(token.lower())
        # 从模板匹配关键词 -> 重排相关段落
        # 简单策略: 输出包含 JD 关键词的模板段落 (按相关性排序)
        sections = _re.split(r"\n## ", "\n" + tpl)
        scored = []
        for s in sections:
            s_lower = s.lower()
            score = sum(1 for k in keywords if k in s_lower)
            scored.append((score, s))
        scored.sort(key=lambda x: -x[0])
        # 取前 N 段 (保留开头 + 高匹配段)
        if len(scored) > 12:
            keep = [scored[0]] + [s for s in scored[1:] if s[0] >= 2][:11]
        else:
            keep = scored
        matched_md = "\n## ".join([s[1] for s in keep])

        # 3) 顶部加 JD 摘要段
        jd_summary = "## 目标岗位 (JD)\n\n" + jd_text[:500] + ("..." if len(jd_text) > 500 else "") + "\n\n---\n\n"
        final_md = jd_summary + matched_md

        # 4) 输出文件名: 取 JD 前 30 字符作为标识
        import hashlib
        h = hashlib.md5(jd_text.encode()).hexdigest()[:6]
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        out_name = f"resume-gen-{ts}-{h}.docx"
        out_path = os.path.join(OUTPUT_DIR if save_to_output else "/tmp", out_name)

        # 5) md -> docx
        _md_to_docx(final_md, out_path, title="定制简历")

        # 6) 返回文件
        size = os.path.getsize(out_path)
        if save_to_output:
            return jsonify({
                "ok": True,
                "filename": out_name,
                "size": size,
                "download_url": f"/api/resume/download?file={out_name}",
                "matched_keywords_count": len(keywords),
                "preview_md": final_md[:500] + "..."
            })
        else:
            with open(out_path, "rb") as f:
                data = f.read()
            return Response(
                data,
                mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename=\"{out_name}\"",
                    "X-Process-Time-Ms": "0",
                    "X-Output-Size": str(len(data)),
                }
            )
    except Exception as e:
        print(traceback.format_exc(), flush=True)
        return jsonify({"error": f"generate failed: {e}"}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "file too large (max 50MB)"}), 413
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
        # 1) 读模板
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
        for token in _re.findall(r"[\u4e00-\u9fff]{2,5}|[a-zA-Z]{4,}", jd_lower):
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
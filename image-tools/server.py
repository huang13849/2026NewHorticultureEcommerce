import io
import os
import time
import traceback
import urllib.request
from flask import Flask, request, jsonify, send_file, Response
from PIL import Image

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

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
START_TIME = time.time()

from rembg import remove

@app.route("/api/health")
def health():
    return jsonify({"ok": True, "service": "image-tools", "version": "1.0.0", "uptime_sec": round(time.time() - START_TIME, 1), "model_ready": MODEL_READY[0], "model_error": MODEL_ERROR[0]})

def _need_model():
    if MODEL_READY[0]:
        return None
    return jsonify({"error": "model not ready", "model_ready": False}), 503

def _send(data, mimetype, download_name, proc_ms=None, orig_size=None):
    headers = {}
    if proc_ms: headers["X-Process-Time-Ms"] = str(proc_ms)
    if orig_size is not None: headers["X-Original-Size"] = str(orig_size)
    headers["X-Output-Size"] = str(len(data))
    h = dict(headers)
    h["Content-Disposition"] = f"attachment; filename={download_name}"
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

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "file too large (max 50MB)"}), 413

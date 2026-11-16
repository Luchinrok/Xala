"""Grava frases amb Matxa (Projecte Aina, català) a través de la demo pública de Hugging Face.
No cal instal·lar res: només Python (urllib). Llicència de la veu: CC-BY-NC-4.0 (ús no comercial).

  python tools/matxa-demo.py <accent> <veu> <sortida.wav> "<text>"
  accents i veus: central (grau, elia), balear (quim, olga), valencia (lluc, gina), nord-occidental (pere, emma)

La llista de veus de la demo només canvia dins d'una sessió: primer es tria l'accent (rs_change)
i, amb la mateixa sessió, es genera (predict).
"""
import json
import sys
import uuid
import urllib.request

BASE = "https://projecte-aina-matxa-alvocat-tts-ca.hf.space"


def get_json(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def post_json(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def run(fn_index, data, session):
    post_json(f"{BASE}/gradio_api/queue/join", {"data": data, "fn_index": fn_index, "session_hash": session, "event_data": None, "trigger_id": None})
    with urllib.request.urlopen(f"{BASE}/gradio_api/queue/data?session_hash={session}", timeout=300) as r:
        for raw in r:
            line = raw.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            msg = json.loads(line[5:])
            if msg.get("msg") == "process_completed":
                if not msg.get("success"):
                    raise RuntimeError(json.dumps(msg)[:400])
                return msg["output"]["data"]
    raise RuntimeError("sense resposta")


def main():
    accent, veu, sortida, text = sys.argv[1:5]
    length = float(sys.argv[5]) if len(sys.argv) > 5 else 0.95
    cfg = get_json(f"{BASE}/config")
    idx = {d.get("api_name"): i for i, d in enumerate(cfg["dependencies"])}
    session = uuid.uuid4().hex[:11]
    run(idx["rs_change"], [accent], session)
    out = run(idx["predict"], [text, accent, veu, 0.2, length], session)
    f = out[0]
    url = f["url"] if isinstance(f, dict) and f.get("url") else f"{BASE}/gradio_api/file={f['path']}"
    with urllib.request.urlopen(url, timeout=60) as r, open(sortida, "wb") as w:
        w.write(r.read())
    print("ok", sortida)


if __name__ == "__main__":
    main()

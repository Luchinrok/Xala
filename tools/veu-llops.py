"""Grava les frases fixes del narrador de Llops en català amb VoxCPM2 i una veu clonada
del projecte video-studio (per defecte «bruno»).

S'executa amb el Python de video-studio (hi ha VoxCPM2, Whisper i el model ja baixat):
  C:/Users/danic/video-studio/voz/.venv/Scripts/python.exe tools/veu-llops.py [--voz bruno] [--tomes 4] [--nomes id1,id2]

Per a cada frase fa unes quantes preses i Whisper (en català) fa de jutge: es queda la presa
que encerta més paraules i, entre les bones, la que dura menys (sense silencis llargs).
Deixa veu/ca/<id>.wav i, amb ffmpeg, veu/ca/<id>.mp3 (mono, 64 kbps), que és el que fa servir l'app.
"""
import argparse
import json
import re
import subprocess
import unicodedata
from pathlib import Path

import torch  # abans que faster_whisper: carrega les DLL de CUDA
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel
from voxcpm import VoxCPM

XALA = Path(__file__).resolve().parent.parent
VEUS = Path("C:/Users/danic/video-studio/voz/voces")
SORTIDA = XALA / "veu" / "ca"

# id -> frase. Les que porten un nom (la víctima, qui surt del poble) es diuen sense nom:
# el nom ja surt gran a la pantalla.
FRASES = {
    "nit": "Cau la nit. Tothom tanca els ulls.",
    "llops-obriu": "Llops, obriu els ulls. En silenci, toqueu la vostra víctima.",
    "llops-tanqueu": "Llops, tanqueu els ulls.",
    "vident-obre": "Vident, obre els ulls. Toca algú per saber si és un llop.",
    "vident-tanca": "Vident, tanca els ulls.",
    "metge-obre": "Metge, obre els ulls. Toca a qui vols salvar aquesta nit.",
    "metge-tanca": "Metge, tanca els ulls.",
    "dia": "Es fa de dia. Tothom obre els ulls!",
    "victima": "Aquesta nit, els llops han atacat. Mireu qui ha caigut.",
    "ningu": "Quina sort! Aquesta nit no ha mort ningú.",
    "fora": "El poble ha decidit. Aquesta persona marxa del poble.",
    "guanyen-llops": "Els llops s'han menjat el poble. Guanyen els llops!",
    "guanya-poble": "No queda cap llop. Guanya el poble!",
}


def paraules(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-zç·']+", t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voz", default="bruno")
    ap.add_argument("--tomes", type=int, default=4)
    ap.add_argument("--nomes", default="")
    a = ap.parse_args()
    carpeta = VEUS / a.voz
    cfg = json.loads((carpeta / "voz.json").read_text(encoding="utf-8"))
    ref = str(carpeta / cfg["referencia"])
    prompt_text = (carpeta / cfg["transcripcion"]).read_text(encoding="utf-8").strip()
    SORTIDA.mkdir(parents=True, exist_ok=True)

    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False)
    sr = model.tts_model.sample_rate
    whisper = WhisperModel("large-v2", device="cuda", compute_type="int8_float16")
    import librosa

    triades = {}
    nomes = set(filter(None, a.nomes.split(",")))
    for fid, text in FRASES.items():
        if nomes and fid not in nomes:
            continue
        objectiu = paraules(text)
        preses = []
        for k in range(a.tomes):
            wav = model.generate(text=text, cfg_value=cfg["cfg_value"], inference_timesteps=cfg["inference_timesteps"],
                                 reference_wav_path=ref, prompt_wav_path=ref, prompt_text=prompt_text)
            wav = np.asarray(wav, dtype=np.float32)
            # retalla silencis del principi i del final
            idx = np.where(np.abs(wav) > 0.01)[0]
            if len(idx):
                wav = wav[max(0, idx[0] - int(0.05 * sr)): idx[-1] + int(0.15 * sr)]
            w16 = librosa.resample(wav, orig_sr=sr, target_sr=16000)
            segs, _ = whisper.transcribe(w16, language="ca", beam_size=5)
            oit = " ".join(s.text for s in segs)
            p = paraules(oit)
            encerts = sum(1 for x in objectiu if x in p)
            preses.append((encerts / max(1, len(objectiu)), -len(wav), wav, oit))
            print(f"  {fid} presa {k + 1}: {encerts}/{len(objectiu)} · «{oit.strip()}»", flush=True)
        preses.sort(key=lambda x: (x[0], x[1]), reverse=True)
        punt, _, wav, oit = preses[0]
        sf.write(SORTIDA / f"{fid}.wav", wav, sr)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(SORTIDA / f"{fid}.wav"),
                        "-ac", "1", "-b:a", "64k", "-af", "loudnorm=I=-16:TP=-1.5", str(SORTIDA / f"{fid}.mp3")], check=True)
        triades[fid] = {"text": text, "whisper": oit.strip(), "encerts": round(punt, 2), "durada": round(len(wav) / sr, 2)}
        print(f"{fid}: {punt:.0%} · {len(wav) / sr:.1f} s", flush=True)
    (SORTIDA / "veu.json").write_text(json.dumps({"voz": a.voz, "frases": triades}, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()

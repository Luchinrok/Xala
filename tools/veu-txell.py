"""Talla la gravació de la Txell (veu del narrador de Llops) en una frase per fitxer.

  C:/Users/danic/video-studio/voz/.venv/Scripts/python.exe tools/veu-txell.py <Txell.mp3>

Els trams surten de la transcripció amb Whisper (16-11-2026). Cada tall s'allarga fins al
silenci real (que no es mengi cap síl·laba), s'hi posen uns mil·lisegons de marge i un fos
suau, es treuen els greus (pas alt a 80 Hz) i s'iguala el volum (loudnorm a -16 LUFS).
Deixa veu-llops/ca/<id>.mp3 (mono, 96 kbps), que és el que fa servir llops.js.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import librosa

XALA = Path(__file__).resolve().parent.parent
SORTIDA = XALA / "veu-llops" / "ca"

# id: (inici, final) en segons, a la gravació original
TRAMS = {
    "nit": (4.62, 7.60),
    "llops-obriu": (10.52, 14.90),
    "llops-tanqueu": (17.82, 19.64),
    "vident-obre": (22.02, 25.46),
    "vident-tanca": (26.72, 28.64),
    "metge-obre": (30.34, 34.86),
    "metge-tanca": (35.92, 37.54),
    "dia": (39.74, 42.04),
    "victima": (50.92, 55.36),   # la segona presa (la primera es va repetir)
    "ningu": (56.64, 58.98),
    "fora": (60.48, 63.58),
    "guanyen-llops": (65.02, 68.10),
    "guanya-poble": (69.30, 71.42),
}


def main():
    src = sys.argv[1]
    y, sr = librosa.load(src, sr=44100, mono=True)
    hop = int(0.01 * sr)
    rms = librosa.feature.rms(y=y, frame_length=hop * 4, hop_length=hop)[0]
    soroll = np.percentile(rms, 10)
    llindar = max(soroll * 3, rms.max() * 0.02)
    actiu = rms > llindar
    t2f = lambda t: int(t * sr / hop)
    SORTIDA.mkdir(parents=True, exist_ok=True)
    trams = sorted(TRAMS.items(), key=lambda kv: kv[1][0])
    for k, (fid, (a, b)) in enumerate(trams):
        prev_b = trams[k - 1][1][1] if k else 0
        next_a = trams[k + 1][1][0] if k + 1 < len(trams) else len(y) / sr
        fa, fb = t2f(a), t2f(b)
        # allarga fins al silenci, sense passar a la frase del costat
        while fa > t2f(prev_b) + 5 and fa > 0 and actiu[fa - 1]:
            fa -= 1
        while fb < t2f(next_a) - 5 and fb < len(actiu) - 1 and actiu[fb]:
            fb += 1
        # més marge al principi: les consonants inicials (ll, v, g) són fluixes i el llindar no les veu
        i0 = max(int(prev_b * sr), fa * hop - int(0.3 * sr), 0)
        i1 = min(len(y), fb * hop + int(0.22 * sr))
        tros = y[i0:i1].copy()
        n = int(0.02 * sr)
        tros[:int(0.005 * sr)] *= np.linspace(0, 1, int(0.005 * sr))
        tros[-n:] *= np.linspace(1, 0, n)
        tmp = SORTIDA / f"{fid}.wav"
        sf.write(tmp, tros, sr)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp),
                        "-af", "highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-b:a", "96k",
                        str(SORTIDA / f"{fid}.mp3")], check=True)
        tmp.unlink()
        print(f"{fid}: {i0 / sr:.2f}-{i1 / sr:.2f} s ({(i1 - i0) / sr:.1f} s)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Corrige lessons-areas.json: (1) quebras de linha crus dentro de strings e
(2) o escape invalido barra-hifen (typo de barra-n-hifen). Itera ate parsear limpo."""
import json

PATH = "/home/z/my-project/content/lessons-areas.json"

with open(PATH, encoding="utf-8") as f:
    s = f.read()

fixes = []
while True:
    try:
        json.loads(s)
        break
    except json.JSONDecodeError as e:
        if "Invalid control character" in e.msg:
            ch = s[e.pos]
            esc = {"\n": "\\n", "\t": "\\t", "\r": "\\r"}.get(ch)
            if esc is None:
                raise
            s = s[: e.pos] + esc + s[e.pos + 1 :]
            fixes.append(f"ctrl {ch!r} -> escape em pos {e.pos}")
        elif "escape" in e.msg:
            # escape invalido: neste arquivo so ocorre barra-hifen (typo de barra-n-hifen)
            if s[e.pos : e.pos + 2] == "\\-":
                s = s[: e.pos] + "\\n-" + s[e.pos + 2 :]
                fixes.append(f"escape invalido em pos {e.pos} corrigido")
            else:
                raise
        else:
            raise
        if len(fixes) > 300:
            raise RuntimeError("muitos fixes — abortando")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(s)

data = json.loads(s)
print(f"OK: {len(fixes)} correção(ões).")
for f_ in fixes[:15]:
    print("  -", f_)
print("Chaves de topo:", len(data))

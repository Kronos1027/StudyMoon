#!/usr/bin/env python3
"""Etiqueta as questões seed com subtopic + demo_params + demo_id resolvido.

Substituição cirúrgica: preserva a formatação original dos arquivos JSON,
trocando apenas a linha `demo_id` de cada questão pelo bloco
subtopic/demo_params/demo_id (a N-ésima ocorrência corresponde à N-ésima
questão). O demo_id é SEMPRE o resolvido do subtópico pelo catálogo em
src/lib/demos/subtopics.ts — nunca um valor livre.
Executar: python3 scripts/tag-seeds.py
"""
import json
import re

TAGS = {
    "questions-matematica.json": [
        ("variacoes-sucessivas", None, "porcentagem"),
        ("porcentagem", None, "porcentagem"),
        ("juros-simples", None, None),
        ("juros-compostos", None, "porcentagem"),
        ("porcentagem", None, "porcentagem"),
        ("variacoes-sucessivas", None, "porcentagem"),
        ("fracoes", None, "fracoes"),
        ("fracoes", None, "fracoes"),
        ("escala", {"distanceCm": 4.5, "scale": 200000}, "escala-mapa"),
        ("regra-de-tres-inversa", None, "regra-de-tres"),
        ("regra-de-tres-direta", None, "regra-de-tres"),
        ("afim", None, "funcoes"),
        ("quadratica", None, "funcoes"),
        ("exponencial", None, None),
        ("media-mediana-moda", None, "estatistica"),
        ("leitura-dados", None, None),
        ("media-mediana-moda", None, "estatistica"),
        ("probabilidade-simples", None, None),
        ("eventos-compostos", None, "probabilidade"),
        ("eventos-compostos", None, "probabilidade"),
        ("areas-perimetros", None, "geometria"),
        ("pitagoras", None, None),
        ("principio-multiplicativo", None, None),
        ("triangulos-retangulos", None, None),
        ("progressoes", None, None),
    ],
    "questions-areas.json": [
        ("cruzamentos", None, "genetica"),
        ("sistema-abo", None, None),
        ("calculos-estequiometricos", None, "balanceamento"),
        ("potencia-eletrica", {"sim": "circuits"}, "phet"),
        ("eutrofizacao", None, "eutrofizacao"),
        ("mudancas-climaticas", None, None),
        ("era-vargas", None, None),
        ("interpretacao", None, "textos"),
        ("registro", None, None),
        ("homeostase", None, None),
    ],
}

# Espelho em Python do catálogo (src/lib/demos/subtopics.ts) — só para
# conferência; a fonte da verdade é o catálogo TS (testado no vitest).
CATALOG = {
    "mt-porcentagem-juros": {"porcentagem": "porcentagem", "variacoes-sucessivas": "porcentagem", "juros-simples": None, "juros-compostos": "porcentagem"},
    "mt-fracoes-decimais": {"fracoes": "fracoes", "decimais": None},
    "mt-razao-proporcao": {"razao": "razao", "proporcao": "razao", "regra-de-tres-direta": "regra-de-tres", "regra-de-tres-inversa": "regra-de-tres", "escala": "escala-mapa"},
    "mt-funcoes": {"afim": "funcoes", "quadratica": "funcoes", "exponencial": None},
    "mt-estatistica": {"media-mediana-moda": "estatistica", "leitura-dados": None},
    "mt-probabilidade": {"probabilidade-simples": None, "eventos-compostos": "probabilidade"},
    "mt-combinatoria": {"principio-multiplicativo": None, "permutacoes": None, "combinacoes": None},
    "mt-geometria-plana": {"areas-perimetros": "geometria", "pitagoras": None},
    "mt-trigonometria": {"triangulos-retangulos": None},
    "mt-sequencias": {"progressoes": None},
    "cn-genetica": {"cruzamentos": "genetica", "sistema-abo": None, "heredogramas": None},
    "cn-estequiometria": {"balanceamento": "balanceamento", "calculos-estequiometricos": "balanceamento"},
    "cn-eletricidade": {"circuitos": "phet", "potencia-eletrica": "phet", "eletrostatica": None},
    "cn-ecologia": {"eutrofizacao": "eutrofizacao"},
    "ch-meio-ambiente": {"mudancas-climaticas": None},
    "ch-brasil-republica": {"era-vargas": None},
    "lc-interpretacao": {"interpretacao": "textos"},
    "lc-variacao-linguistica": {"registro": None},
    "cn-fisiologia": {"homeostase": None},
}

errors = 0
for filename, tags in TAGS.items():
    path = f"content/seeds/{filename}"
    with open(path) as f:
        data = json.load(f)
    assert len(data["questions"]) == len(tags), f"{filename}: {len(data['questions'])} questões vs {len(tags)} tags"

    # conferência catálogo ↔ tag ANTES de escrever
    for q, (subtopic, _params, demo_id) in zip(data["questions"], tags):
        expected = CATALOG[q["topic_slug"]].get(subtopic, "<<SUBTÓPICO DESCONHECIDO>>")
        if demo_id != expected:
            print(f"ERRO: {q['topic_slug']}.{subtopic}: demo_id={demo_id} esperado={expected}")
            errors += 1
    if errors:
        continue

    # substituição cirúrgica: a N-ésima linha demo_id vira o bloco novo
    with open(path) as f:
        text = f.read()
    occurrences = [m for m in re.finditer(r'(\s*)"demo_id": (null|"[^"]*"),', text)]
    assert len(occurrences) == len(tags), f"{filename}: {len(occurrences)} demo_id vs {len(tags)} tags"
    out = []
    cursor = 0
    for m, (subtopic, params, demo_id) in zip(occurrences, tags):
        full_indent = m.group(1) # quebra de linha + indentação originais
        body = full_indent.lstrip("\n")
        out.append(text[cursor:m.start()])
        replacement = f'{full_indent}"subtopic": "{subtopic}",'
        if params is not None:
            replacement += f'\n{body}"demo_params": {json.dumps(params, ensure_ascii=False)},'
        replacement += f'\n{body}"demo_id": {json.dumps(demo_id)},'
        out.append(replacement)
        cursor = m.end()
    out.append(text[cursor:])
    with open(path, "w") as f:
        f.write("".join(out))

    # re-parse para garantir JSON válido
    with open(path) as f:
        reloaded = json.load(f)
    for q, (subtopic, params, demo_id) in zip(reloaded["questions"], tags):
        assert q["subtopic"] == subtopic, (q["subtopic"], subtopic)
        assert q["demo_id"] == demo_id, (q["demo_id"], demo_id)
        if params is not None:
            assert q.get("demo_params") == params, (q.get("demo_params"), params)
    print(f"{filename}: {len(tags)} questões etiquetadas")

raise SystemExit(1 if errors else 0)

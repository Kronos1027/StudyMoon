#!/usr/bin/env python3
"""
StudyMoon — fill content/videos.json with real YouTube videos (v2).

Pipeline (never invents IDs):
  1. YouTube search (HTML -> ytInitialData) with primary + fallback queries.
  2. Relevance gate: candidate title MUST contain a topic keyword.
     Then: preferred channel, healthy duration window, no "parte 2+".
  3. Validate every pick via YouTube oEmbed (authoritative title + channel).
  4. Write content/videos.json in the format check-videos.ts expects.

Run: python3 scripts/fill-videos.py [--only slug1,slug2,...]
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request

BASE = "/home/z/my-project"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# topic slug -> queries (primary, fallback), must-keywords (title), preferred channels
TOPICS = {
    # --- Matemática (Ferretto / Dicasdemat) ---
    "mt-operacoes-basicas": (["Ferretto matemática básica operações", "operações matemáticas básicas problemas ENEM aula"], ["operaç", "matemática básica", "problemas matemát", "conjuntos"], ["ferretto", "dicasdemat"]),
    "mt-divisibilidade": (["Dicasdemat divisibilidade MMC MDC", "divisibilidade múltiplos MMC MDC aula"], ["divisibilidade", "mmc", "mdc", "múltiplos"], ["ferretto", "dicasdemat"]),
    "mt-fracoes-decimais": (["Ferretto frações", "frações e números decimais aula"], ["fraç", "decimal"], ["ferretto", "dicasdemat"]),
    "mt-razao-proporcao": (["Ferretto razão e proporção", "razão e proporção regra de três aula"], ["razão", "proporção", "regra de três"], ["ferretto", "dicasdemat"]),
    "mt-porcentagem-juros": (["Ferretto porcentagem", "porcentagem e juros aula completa"], ["porcentagem", "porcent", "juros"], ["ferretto", "dicasdemat"]),
    "mt-grandezas-unidades": (["grandezas e unidades de medida aula", "grandezas medidas ENEM matemática aula"], ["grandeza", "unidades de medida", "medidas"], ["ferretto", "dicasdemat"]),
    "mt-potencias-raizes": (["Ferretto potências e radiciação", "potenciação e radiciação notação científica aula"], ["potência", "potenciaç", "radiciaç", "raiz", "raízes", "notação científica"], ["ferretto", "dicasdemat"]),
    "mt-expressoes-equacoes": (["Ferretto equações do primeiro grau", "equações e inequações aula completa"], ["equaç", "inequaç", "expressão algébrica", "sistemas"], ["ferretto", "dicasdemat"]),
    "mt-funcoes": (["Ferretto funções teoria e exemplos", "função afim função quadrática aula completa"], ["funç"], ["ferretto", "dicasdemat"]),
    "mt-sequencias": (["Ferretto progressão aritmética", "progressão aritmética e geométrica PA PG aula"], ["progressão", " pa ", " pg "], ["ferretto", "dicasdemat"]),
    "mt-combinatoria": (["Ferretto análise combinatória", "análise combinatória aula completa"], ["combinatória", "combinator", "permutação", "princípio fundamental da contagem", "fatorial"], ["ferretto", "dicasdemat"]),
    "mt-geometria-plana": (["Ferretto geometria plana áreas", "geometria plana áreas perímetros aula"], ["geometria plana", "área", "perímetro", "polígonos", "triângulos", "pitágoras"], ["ferretto", "dicasdemat"]),
    "mt-geometria-espacial": (["Ferretto geometria espacial volumes", "geometria espacial volumes aula"], ["geometria espacial", "volume", "prisma", "cilindro", "esfera", "pirâmide", "cone"], ["ferretto", "dicasdemat"]),
    "mt-trigonometria": (["Ferretto trigonometria", "trigonometria seno cosseno tangente aula"], ["trigonometria", "seno", "cosseno", "tangente"], ["ferretto", "dicasdemat"]),
    "mt-geometria-analitica": (["Ferretto geometria analítica", "geometria analítica plano cartesiano aula"], ["analítica", "cartesiana", "cartesiano", "distância entre pontos", "reta", "circunferência"], ["ferretto", "dicasdemat"]),
    "mt-probabilidade": (["Ferretto probabilidade", "probabilidade aula completa matemática"], ["probabilidade"], ["ferretto", "dicasdemat"]),
    "mt-estatistica": (["Ferretto estatística teoria e exemplos", "estatística descritiva aula média moda mediana"], ["estatística", "média", "mediana", "moda"], ["ferretto", "dicasdemat"]),
    "mt-graficos-tabelas": (["interpretação de gráficos e tabelas ENEM aula", "leitura de gráficos e tabelas matemática ENEM"], ["gráfico", "gráficos", "tabela"], ["ferretto", "dicasdemat"]),
    # --- Linguagens ---
    "lc-interpretacao": (["interpretação de texto ENEM aula", "como interpretar textos ENEM aula"], ["interpretaç", "interpretação de texto", "compreensão de texto", "texto"], []),
    "lc-generos-tipos": (["gêneros textuais aula ENEM", "gêneros e tipos textuais aula"], ["gênero", "gêneros", "tipos textuais"], []),
    "lc-variacao-linguistica": (["variação linguística aula ENEM", "variação linguística aula completa"], ["variação", "variaç", "linguística", "língua"], []),
    "lc-funcoes-linguagem": (["funções da linguagem aula ENEM", "funções da linguagem aula completa"], ["funç", "linguagem"], []),
    "lc-figuras-linguagem": (["figuras de linguagem aula ENEM", "figuras de linguagem metáfora aula"], ["figura", "figuras", "metáfora", "linguagem figurada"], []),
    "lc-gramatica-aplicada": (["concordância verbal aula ENEM", "gramática ENEM concordância crase aula"], ["concordância", "crase", "gramática essencial"], []),
    "lc-lingua-estrangeira": (["inglês ENEM aula", "língua estrangeira inglês ENEM aula"], ["inglês", "ingles", "english", "espanhol", "língua estrangeira"], []),
    "lc-literatura-movimentos": (["escolas literárias aula ENEM", "movimentos literários resumo ENEM"], ["escolas literárias", "literária", "literárias", "literatura", "barroco", "romantismo", "modernismo", "realismo", "simbolismo", "parnasianismo", "arcadismo", "tropicália"], []),
    "lc-obras-recorrentes": (["obras que mais caem no ENEM", "leituras obrigatórias ENEM obras"], ["obras", "leitura", "leituras", "livros", "literárias obrigatórias"], []),
    "lc-artes": (["arte ENEM aula", "arte para o ENEM aula resumo"], ["arte", "artes"], []),
    "lc-educacao-fisica": (["educação física ENEM aula", "educação física e saúde ENEM resumo"], ["educação física", "esporte", "saúde", "corpo"], []),
    "lc-tecnologias-comunicacao": (["tecnologias da comunicação ENEM aula", "mídias e tecnologias da comunicação aula"], ["tecnologia", "tecnologias", "comunicaç", "mídia", "mídias"], []),
    # --- Ciências Humanas ---
    "ch-brasil-colonia": (["professor john brasil colônia", "brasil colônia aula completa história"], ["colônia", "colonial", "colonizaç"], ["john"]),
    "ch-brasil-imperio": (["brasil império aula história ENEM", "primeiro e segundo reinado aula ENEM"], ["império", "imperio", "reinado"], ["john"]),
    "ch-brasil-republica": (["professor john brasil república", "brasil república aula completa história"], ["república", "republica", "vargas"], ["john"]),
    "ch-historia-geral": (["professor john revolução industrial", "revolução industrial e iluminismo aula história"], ["revolução industrial", "iluminismo", "revoluções", "renascimento", "idade média"], ["john"]),
    "ch-historia-cultural": (["movimentos sociais história aula ENEM", "história cultural lutas sociais aula"], ["movimentos sociais", "movimento social", "cultura", "lutas", "direitos humanos"], []),
    "ch-geo-fisica": (["Ricardo Marcílio geomorfologia relevo aula", "geografia física relevo clima vegetação Brasil aula"], ["relevo", "clima", "geomorfologia", "geografia física", "solos", "vegetação", "hidrografia"], []),
    "ch-geo-humana": (["geografia população demografia aula", "demografia transição demográfica aula"], ["população", "demografia", "demográfica", "natalidade", "mortalidade"], []),
    "ch-geo-economica": (["geografia agrária aula ENEM", "espaço agrário agronegócio aula"], ["agrária", "agrária", "agrário", "agronegócio", "reforma agrária", "espaço rural", "campo", "agricultura"], []),
    "ch-cartografia": (["cartografia aula projeções escalas", "projeções cartográficas aula ENEM"], ["cartografia", "projeç", "escala", "mapa", "mapas", "fusos"], []),
    "ch-meio-ambiente": (["meio ambiente e sustentabilidade aula ENEM", "questão ambiental sustentabilidade aula"], ["meio ambiente", "sustentabilidade", "ambiental", "aquecimento global", "mudanças climáticas"], []),
    "ch-sociologia": (["sociologia ENEM aula resumo", "sociologia aula completa ENEM"], ["sociologia", "sociedade", "durkheim", "marx", "weber", "cidadania", "trabalho"], []),
    "ch-filosofia": (["filosofia ENEM aula resumo", "filosofia para o ENEM aula"], ["filosofia", "filosófica", "filosófico"], []),
    "ch-atualidades": (["atualidades ENEM como estudar", "atualidades para o ENEM aula"], ["atualidades", "atualidade"], []),
    # --- Física ---
    "cn-mecanica": (["cinemática aula completa física", "cinemática velocidade média MRU aula"], ["cinemática", "movimento", "velocidade", "mru", "mruv", "aceleração"], ["noslen", "ferretto"]),
    "cn-energia-trabalho": (["trabalho e energia física aula", "trabalho energia e potência aula física"], ["trabalho", "energia", "potência", "energia cinética", "energia potencial"], ["noslen", "ferretto"]),
    "cn-termologia": (["termologia aula completa física", "termologia temperatura calor aula"], ["termologia", "temperatura", "calor", "termodinâmica", "dilatação", "mudança de fase"], ["noslen", "ferretto"]),
    "cn-ondas-optica": (["óptica geométrica aula física", "ondas e óptica aula física ENEM"], ["óptica", "optica", "onda", "ondas", "luz", "espelho", "lente", "reflexão", "refração", "som"], ["noslen", "ferretto"]),
    "cn-eletricidade": (["eletrodinâmica aula física ENEM", "eletricidade corrente elétrica aula física"], ["elétric", "eletrodinâmica", "corrente", "ohm", "resistência", "tensão", "circuitos"], ["noslen", "ferretto", "boaro"]),
    "cn-fontes-energia": (["matriz energética brasileira aula", "fontes de energia aula ENEM"], ["matriz energética", "fontes de energia", "energia", "petróleo", "hidrelétrica", "combustíveis"], ["noslen", "ferretto"]),
    # --- Química ---
    "cn-estequiometria": (["Débora Aladim estequiometria", "estequiometria aula completa química"], ["estequiometria", "estequiométrico"], ["aladim", "débora", "cabral", "guel"]),
    "cn-solucoes": (["Débora Aladim soluções e concentração", "soluções e concentração aula química"], ["soluç", "concentração", "soluto", "solvente", "mistura"], ["aladim", "débora", "cabral", "guel"]),
    "cn-termo-cinetica": (["termoquímica aula química ENEM", "cinética química aula química"], ["termoquímica", "cinética química", "entalpia", "calor de reação", "energia de ativação", "exotérmica", "endotérmica"], ["aladim", "débora", "cabral", "guel"]),
    "cn-equilibrio-eletroquimica": (["equilíbrio químico aula ENEM", "pilhas e eletrólise aula química"], ["equilíbrio", "equilibrio", "ph", "pilhas", "eletrólise", "eletroquímica"], ["aladim", "débora", "cabral", "guel"]),
    "cn-quimica-organica": (["química orgânica aula ENEM", "funções orgânicas aula química"], ["orgânica", "organica", "hidrocarbonetos", "funções orgânicas", "carbono", "isomeria"], ["aladim", "débora", "cabral", "guel"]),
    "cn-quimica-ambiental": (["química ambiental aula ENEM", "química da água e do ambiente aula"], ["ambiental", "água", "agua", "poluição", "poluiç", "chuva ácida", "efeito estufa", "camada de ozônio"], ["aladim", "débora", "cabral", "guel"]),
    # --- Biologia ---
    "cn-citologia": (["citologia aula completa biologia", "célula citologia aula biologia"], ["citologia", "célula", "celular", "membrana", "organelas", "mitocôndria"], ["samuel", "gabiru", "amo biologia", "me gusta"]),
    "cn-fotossintese": (["fotossíntese aula completa biologia", "fotossíntese e respiração celular aula"], ["fotossíntese", "fotossintese", "respiração celular", "clorofila", "cloroplasto"], ["samuel", "gabiru", "amo biologia", "me gusta"]),
    "cn-genetica": (["genética aula completa biologia ENEM", "genética leis de Mendel aula"], ["genética", "genetica", "mendel", "dna", "heredograma", "gene", "cromossomo"], ["samuel", "gabiru", "amo biologia", "me gusta"]),
    "cn-evolucao": (["teorias evolutivas aula biologia", "evolução Darwin Lamarck aula"], ["evolução", "evolucao", "darwin", "lamarck", "seleção natural", "especiação"], ["samuel", "gabiru", "amo biologia", "me gusta"]),
    "cn-ecologia": (["ecologia aula completa biologia ENEM", "ecologia ecossistemas aula biologia"], ["ecologia", "ecossistema", "cadeia alimentar", "relações ecológicas", "biomas", "ciclos biogeoquímicos", "sucessão ecológica"], ["samuel", "gabiru", "amo biologia", "me gusta"]),
    "cn-fisiologia": (["fisiologia humana sistemas aula biologia", "sistemas do corpo humano aula biologia ENEM"], ["fisiologia", "sistema", "corpo humano", "digestório", "circulatório", "respiratório", "endócrino", "nervoso", "excretor"], ["samuel", "gabiru", "amo biologia", "me gusta"]),
    # --- Redação ---
    "rd-estrutura": (["como escrever redação ENEM estrutura", "estrutura da redação dissertativa argumentativa ENEM aula"], ["redação", "dissertativa", "introdução", "texto dissertativo", "estrutura"], ["dib", "curso enem gratuito", "descomplica"]),
    "rd-competencias": (["Felipe Dib cinco competências redação", "as cinco competências da redação ENEM aula"], ["competência", "competencias", "competências"], ["dib"]),
    "rd-repertorio": (["repertório sociocultural redação ENEM aula", "como montar repertório redação ENEM"], ["repertório", "repertorio", "citação", "citações", "argumentação", "repertórios"], ["dib"]),
    "rd-proposta-intervencao": (["Felipe Dib proposta de intervenção", "proposta de intervenção redação ENEM aula"], ["proposta de intervenção", "intervenção", "agente", "ação pública"], ["dib"]),
    "rd-coesao": (["coesão e coerência redação ENEM aula", "conectivos coesão redação aula"], ["coesão", "coesao", "conectivo", "conectivos", "coerência"], ["dib"]),
}

PART_RE = re.compile(r"parte\s*[2-9]", re.IGNORECASE)
EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F900-\U0001F9FF\U00002190-\U000021FF\U00002B00-\U00002BFF\U0001F300-\U0001F5FF]+|[\uFE0F\u200D]",
    flags=re.UNICODE,
)

# Titles that must NEVER match for a topic (off-topic or weak formats).
AVOID = {
    "mt-funcoes": ["par e ímpar", "par e impar", "composta", "inversa", "do 2º grau"],
    "mt-estatistica": ["ferretto resolve", "questão comentada", "questões comentadas"],
    "mt-graficos-tabelas": ["questões comentadas", "ferretto resolve"],
    "ch-geo-fisica": ["oriente médio", "oriente medio", "áfrica", "africa", "china", "rússia", "russia", "eua", "europa", "ásia", "asia", "japão", "japao"],
    "ch-brasil-imperio": ["pm es", "concurso", "polícia", "policia"],
    "rd-estrutura": ["concurso", "concursos"],
    "lc-gramatica-aplicada": ["como estudar", "dicas de estudo", "passo a passo para estudar"],
}


def fetch(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def parse_duration(text: str) -> int:
    parts = [int(p) for p in text.split(":") if p.strip().isdigit()]
    if not parts:
        return 0
    secs = 0
    for p in parts:
        secs = secs * 60 + p
    return secs


def search_youtube(query: str, retries: int = 3):
    url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query)
    for attempt in range(retries):
        try:
            html = fetch(url).decode("utf-8", errors="ignore")
            m = re.search(r"var ytInitialData = (\{.*?\});</script>", html)
            if not m:
                raise ValueError("ytInitialData não encontrado")
            data = json.loads(m.group(1))
            out = []

            def walk(o):
                if isinstance(o, dict):
                    if "videoRenderer" in o:
                        out.append(o["videoRenderer"])
                    for v in o.values():
                        walk(v)
                elif isinstance(o, list):
                    for v in o:
                        walk(v)

            walk(data)
            videos = []
            for v in out:
                vid = v.get("videoId")
                title = "".join(r.get("text", "") for r in v.get("title", {}).get("runs", []))
                try:
                    channel = v.get("ownerText", {}).get("runs", [{}])[0].get("text", "")
                except (IndexError, AttributeError):
                    channel = ""
                length = v.get("lengthText", {}).get("simpleText", "")
                if not vid or not title:
                    continue
                videos.append(
                    {"id": vid, "title": title, "channel": channel, "secs": parse_duration(length)}
                )
            if len(videos) >= 3:
                return videos
            raise ValueError(f"apenas {len(videos)} resultados (possível throttle)")
        except Exception as exc:  # noqa: BLE001
            if attempt == retries - 1:
                print(f"    busca falhou definitivamente: {exc}", file=sys.stderr)
                return videos if "videos" in dir() else []
            time.sleep(2.0 * (attempt + 1))


def oembed(video_id: str):
    url = (
        "https://www.youtube.com/oembed?url="
        + urllib.parse.quote(f"https://www.youtube.com/watch?v={video_id}", safe="")
        + "&format=json"
    )
    try:
        data = json.loads(fetch(url, timeout=12).decode("utf-8"))
        return data.get("title", ""), data.get("author_name", "")
    except Exception:  # noqa: BLE001
        return None


def title_matches(title: str, must: list) -> bool:
    t = title.lower()
    return any(k in t for k in must)


def pick(candidates, must, prefer, used, avoid=()):
    """Relevance gate first; then preferred channel, sane duration, no 'parte 2+'."""
    tl = lambda c: c["title"].lower()  # noqa: E731
    relevant = [
        c
        for c in candidates
        if title_matches(c["title"], must)
        and c["id"] not in used
        and not any(a in tl(c) for a in avoid)
    ]
    if not relevant:
        return None

    def sane(c):  # didactic full lesson window
        return 480 <= c["secs"] <= 10800

    def single(c):  # avoid mid-lesson fragments
        return not PART_RE.search(c["title"])

    for tier in (
        [lambda c: sane(c) and single(c) and any(p in c["channel"].lower() for p in prefer)],
        [lambda c: sane(c) and single(c)],
        [lambda c: single(c) and any(p in c["channel"].lower() for p in prefer)],
        [lambda c: c["secs"] >= 300 and single(c)],
        [lambda c: single(c)],
        [lambda c: True],
    ):
        for c in relevant:
            if tier[0](c):
                return c
    return None


def main():
    only = None
    if len(sys.argv) > 2 and sys.argv[1] == "--only":
        only = set(sys.argv[2].split(","))

    out_path = f"{BASE}/content/videos.json"
    data = json.load(open(out_path, encoding="utf-8"))
    existing = data.get("topics", {})

    used = {v["id"] for vids in existing.values() for v in vids}
    result = dict(existing) if only else {}
    rows, missing = [], []

    topics = {k: v for k, v in TOPICS.items() if (not only or k in only)}
    for i, (slug, (queries, must, prefer)) in enumerate(topics.items(), 1):
        print(f"[{i:02d}/{len(topics)}] {slug}")
        chosen = None
        tried_ids = set()
        for query in queries:
            candidates = search_youtube(query)
            if not candidates:
                continue
            for _ in range(5):  # try up to 5 candidates across oEmbed failures
                c = pick(candidates, must, prefer, used | tried_ids, AVOID.get(slug, []))
                if not c:
                    break
                check = oembed(c["id"])
                if check:
                    title, channel = check
                    chosen = {
                        "id": c["id"],
                        "title": EMOJI_RE.sub("", title).strip(),
                        "channel": EMOJI_RE.sub("", channel).strip(),
                    }
                    break
                print(f"    oEmbed falhou para {c['id']}, tentando próximo")
                tried_ids.add(c["id"])
            if chosen:
                break
        if chosen:
            used.add(chosen["id"])
            result[slug] = [chosen]
            rows.append((slug, chosen["channel"], chosen["title"], chosen["id"]))
            print(f"    OK {chosen['id']} | {chosen['channel']} | {chosen['title'][:55]}")
        else:
            result.pop(slug, None)
            missing.append(slug)
            print("    SEM VÍDEO — topic fica sem entrada")
        time.sleep(0.5)

    data["topics"] = result
    data["updated"] = time.strftime("%Y-%m-%d")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"\n==== RESUMO: {len(result)} tópicos com vídeo, {len(missing)} sem ====")
    if missing:
        print("SEM VÍDEO:", ", ".join(missing))
    for slug, channel, title, vid in rows:
        print(f"  {slug:<26} | {channel[:26]:<26} | {title[:52]}")


if __name__ == "__main__":
    main()

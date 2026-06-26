"""
FieldIQ — Exemplo de backend em Python rodando como Função Serverless na Vercel.

A Vercel executa automaticamente qualquer arquivo .py dentro da pasta /api como
uma rota de API. Este arquivo fica acessível em:
  https://seu-projeto.vercel.app/api/sugestao

Isso permite ter parte da lógica (como a IA) rodando em Python no servidor,
mesmo hospedando o front-end como site estático (pasta /public).

Como chamar a partir do front-end (assets/js/app.js):
  const res = await fetch('/api/sugestao', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ titulo, descricao, tipo_obra, chamados })
  });
  const sugestao = await res.json();

Requisitos: nenhuma instalação extra é necessária para este exemplo
(usa apenas a biblioteca padrão do Python). Se quiser usar bibliotecas
externas (ex: pandas, anthropic), crie um requirements.txt na raiz do
projeto listando-as — a Vercel instala automaticamente no deploy.
"""

import json
import unicodedata
from http.server import BaseHTTPRequestHandler

COMPONENTES = {
    'porta':      ['porta', 'portas'],
    'cabine':     ['cabine', 'ruido', 'barulho'],
    'cabo':       ['cabo', 'cabos', 'tracao'],
    'painel':     ['painel', 'quadro', 'comando', 'botoeira', 'botao'],
    'hidraulico': ['oleo', 'hidraulico', 'pistao', 'vazamento'],
    'sensor':     ['sensor', 'sensores', 'calibracao'],
    'motor':      ['motor', 'maquina'],
}


def normalizar(txt: str) -> str:
    txt = txt.lower()
    txt = unicodedata.normalize('NFD', txt)
    return ''.join(c for c in txt if unicodedata.category(c) != 'Mn')


def detectar_componentes(texto: str):
    norm = normalizar(texto)
    return [chave for chave, termos in COMPONENTES.items() if any(t in norm for t in termos)]


def gerar_sugestao(titulo, descricao, tipo_obra, base_chamados):
    """
    base_chamados: lista de dicts com {titulo, descricao, status, solucao, tipo_obra}
    Retorna uma autoavaliação agregada — nunca aponta para 1 chamado específico,
    sempre sintetiza padrões de causa/solução entre todos os casos semelhantes.
    """
    componentes = detectar_componentes(f'{titulo} {descricao}')

    if componentes:
        relacionados = [
            c for c in base_chamados
            if set(detectar_componentes(f"{c.get('titulo','')} {c.get('descricao','')}")) & set(componentes)
        ]
    else:
        relacionados = [c for c in base_chamados if c.get('tipo_obra') == tipo_obra]

    resolvidos = [c for c in relacionados if c.get('status') == 'resolvido' and c.get('solucao')]
    total = len(relacionados)
    taxa = round(len(resolvidos) / total * 100) if total else 0

    padroes = {}
    for c in resolvidos:
        sol = c['solucao'].strip()
        padroes[sol] = padroes.get(sol, 0) + 1
    padroes_ordenados = sorted(padroes.items(), key=lambda x: -x[1])[:3]

    return {
        'componentes_detectados': componentes,
        'total_casos_semelhantes': total,
        'taxa_sucesso_percent': taxa,
        'padroes_solucao': [{'solucao': s, 'ocorrencias': n} for s, n in padroes_ordenados],
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = json.loads(self.rfile.read(length) or b'{}')

        resultado = gerar_sugestao(
            titulo=body.get('titulo', ''),
            descricao=body.get('descricao', ''),
            tipo_obra=body.get('tipo_obra', ''),
            base_chamados=body.get('chamados', []),
        )

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(resultado, ensure_ascii=False).encode('utf-8'))

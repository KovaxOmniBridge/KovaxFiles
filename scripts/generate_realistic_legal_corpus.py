#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
KovaxFiles Platform — Gerador de Corpus Jurídico Realista para Testes Forenses
=============================================================================
Gera documentos representativos da prática jurídica brasileira com diagramação
realista (cabeçalhos, brasões, tabelas, notas de rodapé, carimbos e assinaturas),
utilizando exclusivamente DADOS SINTÉTICOS FICTÍCIOS que simulam dados pessoais
(LGPD) sem conter informações reais de nenhum cidadão.
=============================================================================
"""

import os
import sys
import pymupdf  # PyMuPDF

REALISTIC_TARGETS = {
    # Documento 1: Acórdão Tribunal de Justiça
    "ACORDAO_PROCESSO": "1002345-67.2024.8.26.0100",
    "ACORDAO_APELANTE_NOME": "José Carlos da Silva",
    "ACORDAO_APELANTE_CPF": "234.567.890-12",
    "ACORDAO_MUNICIPIO_CNPJ": "46.523.123/0001-45",
    "ACORDAO_VALOR": "R$ 158.420,50",
    "ACORDAO_SELO": "TJSP-883920-2024",

    # Documento 2: Contrato Social Empresarial
    "CONTRATO_EMPRESA_NOME": "Alpha Prime Soluções Tecnológicas Ltda.",
    "CONTRATO_EMPRESA_CNPJ": "33.444.555/0001-66",
    "CONTRATO_SOCIA1_NOME": "Mariana Albuquerque Souza",
    "CONTRATO_SOCIA1_CPF": "456.789.012-34",
    "CONTRATO_SOCIA1_RG": "23.456.789-0",
    "CONTRATO_SOCIA1_END": "Rua das Acácias, 450, Jardins, São Paulo/SP",
    "CONTRATO_SOCIO2_NOME": "Rodrigo Peixoto Castro",
    "CONTRATO_SOCIO2_CPF": "567.890.123-45",
    "CONTRATO_BANCO_CONTA": "Conta Corrente 01020304-5 Agência 1234",
    "CONTRATO_CHAVE_PIX": "financeiro@alphaprime-tech.com.br",

    # Documento 3: Laudo Médico Pericial
    "LAUDO_PACIENTE_NOME": "Antônio Marcos Rodrigues",
    "LAUDO_PACIENTE_CPF": "678.901.234-56",
    "LAUDO_PACIENTE_RG": "45.678.901-2",
    "LAUDO_PACIENTE_SUS": "898 0001 2345 6789",
    "LAUDO_PRONTUARIO": "HC-9876543-A",
    "LAUDO_CID_1": "CID-10 M54.5",
    "LAUDO_CID_2": "CID-10 F43.1",
    "LAUDO_MEDICAMENTO": "Pregabalina 75mg e Sertralina 50mg"
}

# Dicionários específicos de alvos sensíveis por documento para auditoria forense
ACORDAO_TARGETS = {
    "Processo": REALISTIC_TARGETS["ACORDAO_PROCESSO"],
    "Apelante_Nome": REALISTIC_TARGETS["ACORDAO_APELANTE_NOME"],
    "Apelante_CPF": REALISTIC_TARGETS["ACORDAO_APELANTE_CPF"],
    "Municipio_CNPJ": REALISTIC_TARGETS["ACORDAO_MUNICIPIO_CNPJ"],
    "Valor_Condenacao": REALISTIC_TARGETS["ACORDAO_VALOR"],
    "Selo_Validacao": REALISTIC_TARGETS["ACORDAO_SELO"]
}

CONTRATO_TARGETS = {
    "Empresa_CNPJ": REALISTIC_TARGETS["CONTRATO_EMPRESA_CNPJ"],
    "Socia1_Nome": REALISTIC_TARGETS["CONTRATO_SOCIA1_NOME"],
    "Socia1_CPF": REALISTIC_TARGETS["CONTRATO_SOCIA1_CPF"],
    "Socia1_RG": REALISTIC_TARGETS["CONTRATO_SOCIA1_RG"],
    "Socia1_Endereco": REALISTIC_TARGETS["CONTRATO_SOCIA1_END"],
    "Socio2_Nome": REALISTIC_TARGETS["CONTRATO_SOCIO2_NOME"],
    "Socio2_CPF": REALISTIC_TARGETS["CONTRATO_SOCIO2_CPF"],
    "Banco_Conta": REALISTIC_TARGETS["CONTRATO_BANCO_CONTA"],
    "Chave_PIX": REALISTIC_TARGETS["CONTRATO_CHAVE_PIX"]
}

LAUDO_TARGETS = {
    "Paciente_Nome": REALISTIC_TARGETS["LAUDO_PACIENTE_NOME"],
    "Paciente_CPF": REALISTIC_TARGETS["LAUDO_PACIENTE_CPF"],
    "Paciente_RG": REALISTIC_TARGETS["LAUDO_PACIENTE_RG"],
    "Cartao_SUS": REALISTIC_TARGETS["LAUDO_PACIENTE_SUS"],
    "Prontuario": REALISTIC_TARGETS["LAUDO_PRONTUARIO"],
    "CID_Lumbago": REALISTIC_TARGETS["LAUDO_CID_1"],
    "CID_Estresse": REALISTIC_TARGETS["LAUDO_CID_2"],
    "Medicamentos": REALISTIC_TARGETS["LAUDO_MEDICAMENTO"]
}

def sanitize_pdf_raster(input_path: str, output_path: str, sensitive_terms: list) -> str:
    """
    Sanitiza um PDF aplicando tarjamento vetorial preto sobre os termos sensíveis
    seguido de achatamento raster completo a 300 DPI, destruindo integralmente
    a camada de texto, árvores de objetos e metadados confidenciais.
    """
    doc = pymupdf.open(input_path)
    
    # 1. Localiza os termos e desenha tarjas pretas sólidas
    for page in doc:
        for term in sensitive_terms:
            if not term or len(term.strip()) == 0:
                continue
            rects = page.search_for(term)
            for r in rects:
                shape = page.new_shape()
                # Margem de segurança de 1.5pt para cobrir diacríticos e descendentes
                padded_rect = pymupdf.Rect(r.x0 - 1.5, r.y0 - 1.5, r.x1 + 1.5, r.y1 + 1.5)
                shape.draw_rect(padded_rect)
                shape.finish(fill=(0, 0, 0), color=(0, 0, 0), width=0)
                shape.commit()

    # 2. Renderiza a 300 DPI para cada página
    rendered_pages = []
    for page in doc:
        pix = page.get_pixmap(dpi=300)
        img_bytes = pix.tobytes("jpeg", 95)
        rendered_pages.append((page.rect.width, page.rect.height, img_bytes))
    doc.close()

    # 3. Cria novo PDF puramente rasterizado sem streams de texto ou anotações
    clean_doc = pymupdf.open()
    for w, h, img_bytes in rendered_pages:
        new_page = clean_doc.new_page(width=w, height=h)
        new_page.insert_image(new_page.rect, stream=img_bytes)

    clean_doc.set_metadata({
        "title": "Documento Jurídico Sanitizado (LGPD)",
        "author": "KovaxFiles Platform",
        "subject": "Sanitização Forense por Achatamento Raster 300 DPI",
        "keywords": "anonimizado, seguro, lgpd"
    })
    clean_doc.save(output_path)
    clean_doc.close()
    return output_path


def create_acordao_pdf(output_path: str):
    """Gera Acórdão Judicial Realista do Tribunal de Justiça de São Paulo"""
    doc = pymupdf.open()

    # --- PÁGINA 1: Relatório e Ementa ---
    p1 = doc.new_page(width=595, height=842)

    # Moldura de Cabeçalho Oficial
    shape = p1.new_shape()
    shape.draw_rect(pymupdf.Rect(40, 35, 555, 75))
    shape.finish(fill=(0.95, 0.96, 0.98), color=(0.7, 0.75, 0.82), width=1)
    shape.commit()

    p1.insert_text((110, 52), "PODER JUDICIÁRIO DO ESTADO DE SÃO PAULO", fontsize=11, fontname="helv", color=(0.1, 0.15, 0.3))
    p1.insert_text((140, 67), "TRIBUNAL DE JUSTIÇA — 2ª CÂMARA DE DIREITO PÚBLICO", fontsize=9, fontname="helv", color=(0.3, 0.35, 0.45))

    # Identificação do Processo
    p1.insert_text((45, 105), f"Apelação Cível nº {REALISTIC_TARGETS['ACORDAO_PROCESSO']}", fontsize=10, fontname="helv", color=(0, 0, 0))
    p1.insert_text((45, 120), "Comarca de Origem: 1ª Vara da Fazenda Pública de Santo André", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))
    p1.insert_text((45, 135), f"Apelante: {REALISTIC_TARGETS['ACORDAO_APELANTE_NOME']} (CPF: {REALISTIC_TARGETS['ACORDAO_APELANTE_CPF']})", fontsize=9, fontname="helv", color=(0, 0, 0))
    p1.insert_text((45, 150), f"Apelada: Prefeitura Municipal de Santo André (CNPJ: {REALISTIC_TARGETS['ACORDAO_MUNICIPIO_CNPJ']})", fontsize=9, fontname="helv", color=(0, 0, 0))
    p1.insert_text((45, 165), "Relator: Desembargador Dr. Fernando Mendonça de Alencar", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))

    # Caixa da Ementa
    shape_em = p1.new_shape()
    shape_em.draw_rect(pymupdf.Rect(45, 185, 550, 275))
    shape_em.finish(fill=(0.98, 0.98, 0.99), color=(0.8, 0.8, 0.8), width=0.5)
    shape_em.commit()

    ementa_text = (
        "EMENTA: APELAÇÃO CÍVEL. SERVIDOR PÚBLICO MUNICIPAL. COBRANÇA DE ADICIONAL DE INSALUBRIDADE "
        "E CONVERSÃO DE LICENÇA-PRÊMIO EM PECÚNIA. PROCEDÊNCIA PARCIAL NA ORIGEM. "
        "RECURSO DO AUTOR VISANDO À CONDENAÇÃO INTEGRAL NO VALOR DE " + REALISTIC_TARGETS['ACORDAO_VALOR'] + ". "
        "MANUTENÇÃO DO DECISUM QUANTO AO MÉRITO PRINCIPAL. HONORÁRIOS ADVOCATÍCIOS MAJORADOS."
    )
    p1.insert_textbox(pymupdf.Rect(55, 195, 540, 265), ementa_text, fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1), align=pymupdf.TEXT_ALIGN_JUSTIFY)

    # Início do Voto
    voto_intro = (
        "VOTO Nº 34.891\n\n"
        "1. Trata-se de recurso de apelação interposto por " + REALISTIC_TARGETS['ACORDAO_APELANTE_NOME'] + ", qualificado sob o CPF nº "
        + REALISTIC_TARGETS['ACORDAO_APELANTE_CPF'] + ", contra a r. sentença de fls. 140/145 que julgou procedente em parte a ação ordinária "
        "ajuizada em face da Prefeitura Municipal de Santo André (CNPJ nº " + REALISTIC_TARGETS['ACORDAO_MUNICIPIO_CNPJ'] + ").\n\n"
        "2. Sustenta o apelante, em síntese, fazer jus ao pagamento retroativo das diferenças remuneratórias decorrentes "
        "do exercício de funções em ambiente insalubre (Grau Máximo - 40%), apuradas no importe de " + REALISTIC_TARGETS['ACORDAO_VALOR'] + "."
    )
    p1.insert_textbox(pymupdf.Rect(45, 295, 550, 480), voto_intro, fontsize=9, fontname="helv", color=(0, 0, 0), align=pymupdf.TEXT_ALIGN_JUSTIFY)

    # Rodapé da Página 1
    p1.insert_text((45, 810), f"Tribunal de Justiça de SP — Processo nº {REALISTIC_TARGETS['ACORDAO_PROCESSO']} — Fl. 1 de 2", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    # --- PÁGINA 2: Dispositivo e Certidão de Juntada ---
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((45, 45), f"Apelação Cível nº {REALISTIC_TARGETS['ACORDAO_PROCESSO']} — Acórdão", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))

    dispositivo = (
        "3. Em face do exposto, nega-se provimento ao recurso da municipalidade e dá-se parcial provimento ao recurso do autor "
        + REALISTIC_TARGETS['ACORDAO_APELANTE_NOME'] + " para reconhecer o direito ao adicional em grau médio, com juros de mora e correção monetária na forma do Tema 810 do STF.\n\n"
        "São Paulo, 14 de março de 2024.\n\n"
        "FERNANDO MENDONÇA DE ALENCAR\n"
        "Relator"
    )
    p2.insert_textbox(pymupdf.Rect(45, 80, 550, 240), dispositivo, fontsize=9, fontname="helv", color=(0, 0, 0), align=pymupdf.TEXT_ALIGN_JUSTIFY)

    # Carimbo de Certidão de Juntada e Assinatura Eletrônica
    shape_cert = p2.new_shape()
    shape_cert.draw_rect(pymupdf.Rect(45, 280, 550, 390))
    shape_cert.finish(fill=(0.97, 0.97, 0.97), color=(0.6, 0.6, 0.6), width=1)
    shape_cert.commit()

    certidao_texto = (
        "CERTIDÃO DE PUBLICAÇÃO DE ACÓRDÃO E ASSINATURA ELETRÔNICA\n"
        "Certifico que o presente acórdão foi assinado eletronicamente pelo Exmo. Des. Relator conforme Medida Provisória 2.200-2/2001.\n"
        "Código de Validação Digital: " + REALISTIC_TARGETS['ACORDAO_SELO'] + "\n"
        "Apelante Beneficiário: " + REALISTIC_TARGETS['ACORDAO_APELANTE_NOME'] + " — CPF: " + REALISTIC_TARGETS['ACORDAO_APELANTE_CPF'] + "\n"
        "Registrado sob nº 2024/098765 em 15/03/2024. Cartório da 2ª Câmara de Direito Público."
    )
    p2.insert_textbox(pymupdf.Rect(55, 290, 540, 380), certidao_texto, fontsize=8, fontname="helv", color=(0.2, 0.2, 0.2))

    p2.insert_text((45, 810), f"Tribunal de Justiça de SP — Processo nº {REALISTIC_TARGETS['ACORDAO_PROCESSO']} — Fl. 2 de 2", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    doc.save(output_path)
    doc.close()
    return output_path

def create_contrato_pdf(output_path: str):
    """Gera Contrato Social Empresarial com Quotas e Dados Bancários"""
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)

    # Título
    p.insert_text((60, 45), "INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    p.insert_text((150, 60), REALISTIC_TARGETS["CONTRATO_EMPRESA_NOME"], fontsize=10, fontname="helv", color=(0.2, 0.3, 0.5))

    preambulo = (
        "Pelo presente instrumento particular, os abaixo assinados:\n\n"
        "1. " + REALISTIC_TARGETS["CONTRATO_SOCIA1_NOME"] + ", brasileira, solteira, empresária, portadora da Cédula de Identidade "
        "RG nº " + REALISTIC_TARGETS["CONTRATO_SOCIA1_RG"] + " SSP/SP e inscrita no CPF sob o nº " + REALISTIC_TARGETS["CONTRATO_SOCIA1_CPF"] + ", "
        "residente e domiciliada na " + REALISTIC_TARGETS["CONTRATO_SOCIA1_END"] + "; e\n\n"
        "2. " + REALISTIC_TARGETS["CONTRATO_SOCIO2_NOME"] + ", brasileiro, casado, engenheiro de software, inscrito no CPF sob o nº "
        + REALISTIC_TARGETS["CONTRATO_SOCIO2_CPF"] + ", residente na Alameda dos Ipês, 89, Campinas/SP;\n\n"
        "Resolvem constituir uma sociedade limitada que se regerá pelas seguintes cláusulas contratuais:\n\n"
        "CLÁUSULA PRIMEIRA — DENOMINAÇÃO E SEDE\n"
        "A sociedade girará sob a denominação social de " + REALISTIC_TARGETS["CONTRATO_EMPRESA_NOME"] + ", devendo ser cadastrada no "
        "CNPJ sob o nº " + REALISTIC_TARGETS["CONTRATO_EMPRESA_CNPJ"] + ".\n\n"
        "CLÁUSULA SEGUNDA — CAPITAL SOCIAL E QUOTAS\n"
        "O capital social é de R$ 500.000,00 (quinhentos mil reais), dividido em 500.000 quotas no valor nominal de R$ 1,00 cada uma, assim distribuídas:\n"
        "• " + REALISTIC_TARGETS["CONTRATO_SOCIA1_NOME"] + ": 250.000 quotas (50%), integralizadas em moeda corrente;\n"
        "• " + REALISTIC_TARGETS["CONTRATO_SOCIO2_NOME"] + ": 250.000 quotas (50%), integralizadas em moeda corrente.\n\n"
        "CLÁUSULA DÉCIMA — CONTA BANCÁRIA E OPERAÇÕES FINANCEIRAS\n"
        "Todos os recebimentos corporativos serão centralizados junto ao Banco Santander Brasil, "
        + REALISTIC_TARGETS["CONTRATO_BANCO_CONTA"] + ", Chave PIX: " + REALISTIC_TARGETS["CONTRATO_CHAVE_PIX"] + ".\n\n"
        "São Paulo, 10 de janeiro de 2024."
    )
    p.insert_textbox(pymupdf.Rect(45, 80, 550, 720), preambulo, fontsize=8.5, fontname="helv", color=(0, 0, 0), align=pymupdf.TEXT_ALIGN_JUSTIFY)
    p.insert_text((45, 810), "Contrato Social — Alpha Prime Soluções Tecnológicas — Junta Comercial de SP", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    doc.save(output_path)
    doc.close()
    return output_path

def create_laudo_medico_pdf(output_path: str):
    """Gera Laudo Médico Pericial Trabalhista com Diagnósticos CID-10 e Dados Sensíveis"""
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)

    # Cabeçalho da Clínica/Hospital Pericial
    shape = p.new_shape()
    shape.draw_rect(pymupdf.Rect(40, 35, 555, 75))
    shape.finish(fill=(0.94, 0.97, 0.95), color=(0.3, 0.6, 0.4), width=1)
    shape.commit()

    p.insert_text((90, 55), "HOSPITAL DAS CLÍNICAS — NÚCLEO DE PERÍCIAS JUDICIAIS TRABALHISTAS", fontsize=10, fontname="helv", color=(0.1, 0.35, 0.2))
    p.insert_text((160, 70), "Laudo Pericial Oficial de Avaliação de Capacidade Laborativa", fontsize=9, fontname="helv", color=(0.3, 0.4, 0.3))

    laudo_texto = (
        "I. IDENTIFICAÇÃO DO PERICIANDO\n"
        "Nome do Paciente: " + REALISTIC_TARGETS["LAUDO_PACIENTE_NOME"] + "\n"
        "Documento RG: " + REALISTIC_TARGETS["LAUDO_PACIENTE_RG"] + " — CPF: " + REALISTIC_TARGETS["LAUDO_PACIENTE_CPF"] + "\n"
        "Cartão Nacional de Saúde (SUS): " + REALISTIC_TARGETS["LAUDO_PACIENTE_SUS"] + "\n"
        "Prontuário Médico Clínico: " + REALISTIC_TARGETS["LAUDO_PRONTUARIO"] + "\n\n"
        "II. HISTÓRICO DA ENFERMIDADE E EXAME CLÍNICO\n"
        "O periciando relata quadro álgico severo em coluna lombo-sacra decorrente de esforço repetitivo de carregamento "
        "de cargas pesadas na reclamada. Apresenta marcha claudicante e limitação severa de amplitude articular.\n\n"
        "III. DIAGNÓSTICO NOSOLÓGICO E CLASSIFICAÇÃO INTERNACIONAL DE DOENÇAS (CID-10)\n"
        "Com base nos exames de ressonância magnética e na anamnese pericial, diagnostica-se:\n"
        "1. " + REALISTIC_TARGETS["LAUDO_CID_1"] + " (Lumbago com ciática / Hérnia de disco L4-L5);\n"
        "2. " + REALISTIC_TARGETS["LAUDO_CID_2"] + " (Reação ao estresse grave e transtornos de adaptação decorrentes de assédio).\n\n"
        "IV. TERAPÊUTICA E MEDICAMENTOS DE USO CONTÍNUO\n"
        "O paciente está submetido ao tratamento farmacológico diário com " + REALISTIC_TARGETS["LAUDO_MEDICAMENTO"] + ", "
        "com indicação formal de afastamento total de atividades que demandem levantamento de peso superior a 5 kg.\n\n"
        "V. CONCLUSÃO PERICIAL\n"
        "Constata-se a existência de nexo causal concausal entre as patologias diagnosticadas e as atividades laborativas "
        "desempenhadas na empresa demandada, com perda parcial permanente da capacidade laborativa de 35%.\n\n"
        "Dr. Roberto Silveira — CRM/SP 123.456\n"
        "Médico Perito Judicial Nomeado"
    )

    p.insert_textbox(pymupdf.Rect(45, 100, 550, 780), laudo_texto, fontsize=8.5, fontname="helv", color=(0, 0, 0), align=pymupdf.TEXT_ALIGN_JUSTIFY)
    p.insert_text((45, 815), f"CONFIDENCIAL — LGPD Art. 5º, II (Dado Pessoal Sensível de Saúde) — Prontuário: {REALISTIC_TARGETS['LAUDO_PRONTUARIO']}", fontsize=7.5, fontname="helv", color=(0.5, 0.2, 0.2))

    doc.save(output_path)
    doc.close()
    return output_path

def generate_realistic_corpus(output_dir: str):
    """Gera o corpus completo de documentos realistas no diretório informado (Originais e Sanitizados)"""
    os.makedirs(output_dir, exist_ok=True)

    f1_orig = os.path.join(output_dir, "01_acordao_tribunal_justica.pdf")
    f1_san = os.path.join(output_dir, "01_acordao_tribunal_justica_anonimizado.pdf")

    f2_orig = os.path.join(output_dir, "02_contrato_social_empresarial.pdf")
    f2_san = os.path.join(output_dir, "02_contrato_social_empresarial_anonimizado.pdf")

    f3_orig = os.path.join(output_dir, "03_laudo_medico_trabalhista.pdf")
    f3_san = os.path.join(output_dir, "03_laudo_medico_trabalhista_anonimizado.pdf")

    create_acordao_pdf(f1_orig)
    sanitize_pdf_raster(f1_orig, f1_san, list(ACORDAO_TARGETS.values()))

    create_contrato_pdf(f2_orig)
    sanitize_pdf_raster(f2_orig, f2_san, list(CONTRATO_TARGETS.values()))

    create_laudo_medico_pdf(f3_orig)
    sanitize_pdf_raster(f3_orig, f3_san, list(LAUDO_TARGETS.values()))

    return [f1_orig, f1_san, f2_orig, f2_san, f3_orig, f3_san]

if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "test_output/realistic_corpus"
    files = generate_realistic_corpus(out_dir)
    print(f"[+] Corpus jurídico realista gerado com sucesso ({len(files)} documentos [Originais + Sanitizados]) em: {out_dir}")
    for f in files:
        print(f"  -> {f} ({os.path.getsize(f)} bytes)")


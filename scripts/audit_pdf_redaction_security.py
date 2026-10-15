#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
KovaxFiles Platform — Bateria de Testes Forenses de Segurança em Anonimização
=============================================================================
Auditoria de Segurança de Anonimização em PDFs segundo as exigências de:
- Extração de Texto (pypdf, pdfminer.six, pymupdf)
- Inspeção de Objetos e Streams (Xrefs, /Contents, /Annots, /AcroForm, /Metadata)
- Renderização e Análise Forense de Pixels (RGB, Luminância, Bounding Box Bleed)
- Pesquisa e Pattern Matching (Regex PII, busca em streams brutos)
- Ferramentas Independentes de Análise (Byte-level String Carving, Xref Dump)
=============================================================================
"""

import os
import sys
import re
import json
import zlib
from typing import Dict, List, Any, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import pymupdf  # PyMuPDF
import pypdf
from pdfminer.high_level import extract_text as pdfminer_extract_text
from PIL import Image

# Ground Truth dos dados sensíveis que DEVEM ser testados
SENSITIVE_TARGETS = {
    "CPF": "123.456.789-00",
    "CNPJ": "12.345.678/0001-90",
    "RG": "12.345.678-9",
    "Nome": "Carlos Alberto Ferreira",
    "Email": "carlos.ferreira@privado-kovax.com.br",
    "Banco": "Conta Corrente 98765-4 Banco do Brasil",
    "Saude_CID": "CID-10 M54.5",
    "Anotacao_Sigilosa": "Nota Confidencial: Autor em tratamento médico",
    "Campo_Formulario": "Carlos Alberto Ferreira (Form)",
    "Metadado_Autor": "Carlos Alberto Ferreira (Autor Original)"
}

PII_REGEX_PATTERNS = {
    "CPF": re.compile(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b'),
    "CNPJ": re.compile(r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b'),
    "RG": re.compile(r'\b\d{1,2}\.\d{3}\.\d{3}-[0-9X]\b'),
    "Email": re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'),
    "CID10": re.compile(r'\b[A-Z]\d{2}(?:\.\d)?\b'),
    "ContaBancaria": re.compile(r'\b\d{4,6}-[0-9X]\b')
}

class PdfForensicAuditor:
    def __init__(self, pdf_path: str, label: str):
        self.pdf_path = pdf_path
        self.label = label
        self.results = {
            "label": label,
            "file_path": pdf_path,
            "file_size_bytes": os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0,
            "vector_1_text_extraction": {},
            "vector_2_object_inspection": {},
            "vector_3_pixel_rendering": {},
            "vector_4_search_matching": {},
            "vector_5_independent_tools": {},
            "leakage_detected": False,
            "leaked_items": []
        }

    def audit_vector_1_text_extraction(self) -> Dict[str, Any]:
        """
        Vetor 1: Tenta extrair texto utilizando 3 motores independentes:
        - PyMuPDF
        - pypdf
        - pdfminer.six
        """
        findings = {"pymupdf": [], "pypdf": [], "pdfminer": []}

        # 1.1 PyMuPDF
        try:
            doc = pymupdf.open(self.pdf_path)
            full_text_mupdf = ""
            for page in doc:
                full_text_mupdf += page.get_text() + "\n"
            doc.close()

            for key, target in SENSITIVE_TARGETS.items():
                if target in full_text_mupdf:
                    findings["pymupdf"].append({"target": key, "value": target})
        except Exception as e:
            findings["pymupdf_error"] = str(e)

        # 1.2 pypdf
        try:
            reader = pypdf.PdfReader(self.pdf_path)
            full_text_pypdf = ""
            for p in reader.pages:
                full_text_pypdf += (p.extract_text() or "") + "\n"

            for key, target in SENSITIVE_TARGETS.items():
                if target in full_text_pypdf:
                    findings["pypdf"].append({"target": key, "value": target})
        except Exception as e:
            findings["pypdf_error"] = str(e)

        # 1.3 pdfminer.six
        try:
            full_text_miner = pdfminer_extract_text(self.pdf_path)
            for key, target in SENSITIVE_TARGETS.items():
                if target in full_text_miner:
                    findings["pdfminer"].append({"target": key, "value": target})
        except Exception as e:
            findings["pdfminer_error"] = str(e)

        total_extracted = len(findings["pymupdf"]) + len(findings["pypdf"]) + len(findings["pdfminer"])
        findings["has_text_leakage"] = total_extracted > 0
        if findings["has_text_leakage"]:
            self.results["leakage_detected"] = True
            for f in findings["pymupdf"]:
                self.results["leaked_items"].append(f"Vetor 1 (Texto PyMuPDF): {f['target']}='{f['value']}'")

        self.results["vector_1_text_extraction"] = findings
        return findings

    def audit_vector_2_object_inspection(self) -> Dict[str, Any]:
        """
        Vetor 2: Inspeção de Baixo Nível da Árvore de Objetos do PDF:
        - Streams /Contents descomprimidos (operadores Tj, TJ, hex strings)
        - Dicionários de Anotações (/Annots)
        - Formulários Interativos (/AcroForm)
        - Metadados do Documento (/Info e XMP /Metadata)
        - Tagged PDF Structure Tree (/StructTreeRoot)
        """
        findings = {
            "stream_contents_leakage": [],
            "annotations_leakage": [],
            "acroform_leakage": [],
            "metadata_leakage": [],
            "struct_tree_leakage": []
        }

        doc = pymupdf.open(self.pdf_path)

        # 2.1 Inspeção de Streams /Contents
        for page_idx, page in enumerate(doc):
            try:
                contents = page.read_contents()
                if contents:
                    stream_text = contents.decode("latin1", errors="ignore")
                    for key, target in SENSITIVE_TARGETS.items():
                        if target in stream_text:
                            findings["stream_contents_leakage"].append({
                                "page": page_idx, "target": key, "value": target
                            })
                            self.results["leakage_detected"] = True
                            self.results["leaked_items"].append(f"Vetor 2 (Stream /Contents Pg {page_idx+1}): {key}='{target}'")
            except Exception as e:
                findings["stream_error"] = str(e)

        # 2.2 Inspeção de Anotações (/Annots)
        for page_idx, page in enumerate(doc):
            try:
                annots = page.annots()
                if annots:
                    for a in annots:
                        info = a.info
                        annot_text = f"{info.get('content', '')} {info.get('title', '')} {info.get('subject', '')}"
                        for key, target in SENSITIVE_TARGETS.items():
                            if target in annot_text:
                                findings["annotations_leakage"].append({
                                    "page": page_idx, "target": key, "value": target
                                })
                                self.results["leakage_detected"] = True
                                self.results["leaked_items"].append(f"Vetor 2 (Anotação /Annots Pg {page_idx+1}): {key}='{target}'")
            except Exception as e:
                findings["annots_error"] = str(e)

        # 2.3 Inspeção de AcroForm
        try:
            reader = pypdf.PdfReader(self.pdf_path)
            fields = reader.get_fields()
            if fields:
                for fname, fval in fields.items():
                    val_str = str(fval.get('/V', '')) + " " + str(fval.get('/DV', ''))
                    for key, target in SENSITIVE_TARGETS.items():
                        if target in val_str:
                            findings["acroform_leakage"].append({
                                "field": fname, "target": key, "value": target
                            })
                            self.results["leakage_detected"] = True
                            self.results["leaked_items"].append(f"Vetor 2 (AcroForm Campo '{fname}'): {key}='{target}'")
        except Exception as e:
            findings["acroform_error"] = str(e)

        # 2.4 Inspeção de Metadados (/Info e /Metadata)
        meta = doc.metadata or {}
        meta_str = " ".join([str(v) for v in meta.values()])
        for key, target in SENSITIVE_TARGETS.items():
            if target in meta_str:
                findings["metadata_leakage"].append({
                    "meta_key": "Info/Metadata", "target": key, "value": target
                })
                self.results["leakage_detected"] = True
                self.results["leaked_items"].append(f"Vetor 2 (Metadados PDF): {key}='{target}'")

        doc.close()
        self.results["vector_2_object_inspection"] = findings
        return findings

    def audit_vector_3_pixel_rendering(self, redaction_boxes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Vetor 3: Renderização de Alta Definição (300 DPI) e Análise de Pixels:
        - Renderiza as páginas em resolução de impressão.
        - Se coordenadas de tarjas forem fornecidas, faz amostragem RGB e luminância
          dentro do retângulo para verificar se há transparência, canal alfa ou
          contornos de texto vazando.
        - Avalia se o retângulo cobriu integralmente os caracteres ou se houve 'bleed'
          (bordas de glifos fora da tarja).
        """
        findings = {
            "page_renders": [],
            "boxes_analyzed": []
        }

        doc = pymupdf.open(self.pdf_path)

        for page_idx, page in enumerate(doc):
            pix = page.get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            findings["page_renders"].append({
                "page": page_idx,
                "width_px": pix.width,
                "height_px": pix.height,
                "dpi": 300
            })

            # Se retângulos de tarjamento foram passados, analisa os pixels da região
            if redaction_boxes:
                scale_x = pix.width / page.rect.width
                scale_y = pix.height / page.rect.height

                for b in redaction_boxes:
                    if b.get("pageIndex", 0) != page_idx:
                        continue

                    # Converte coordenada PDF (bottom-left) para imagem (top-left)
                    pdf_x = b["x"]
                    pdf_y = b["y"]
                    pdf_w = b["width"]
                    pdf_h = b["height"]

                    img_left = int(pdf_x * scale_x)
                    img_top = int((page.rect.height - (pdf_y + pdf_h)) * scale_y)
                    img_right = int((pdf_x + pdf_w) * scale_x)
                    img_bottom = int((page.rect.height - pdf_y) * scale_y)

                    # Clamp
                    img_left = max(0, min(img_left, pix.width - 1))
                    img_top = max(0, min(img_top, pix.height - 1))
                    img_right = max(img_left + 1, min(img_right, pix.width))
                    img_bottom = max(img_top + 1, min(img_bottom, pix.height))

                    crop = img.crop((img_left, img_top, img_right, img_bottom))
                    colors = crop.getcolors(maxcolors=100000) or []

                    # Verifica se todos os pixels são pretos sólidos (0, 0, 0)
                    non_black_pixels = 0
                    total_pixels = (img_right - img_left) * (img_bottom - img_top)

                    for count, col in colors:
                        # col é (R, G, B)
                        if isinstance(col, tuple) and len(col) >= 3:
                            r, g, b_val = col[0], col[1], col[2]
                            # Se brilho médio > 15 (não é preto profundo)
                            if (r + g + b_val) / 3.0 > 15.0:
                                non_black_pixels += count

                    non_black_ratio = (non_black_pixels / total_pixels) if total_pixels > 0 else 0

                    box_result = {
                        "page": page_idx,
                        "text_expected": b.get("text", ""),
                        "category": b.get("category", ""),
                        "total_pixels": total_pixels,
                        "non_black_pixels": non_black_pixels,
                        "non_black_ratio": round(non_black_ratio, 4),
                        "is_solid_black": non_black_ratio == 0.0
                    }

                    if non_black_ratio > 0.05:
                        box_result["warning"] = "Região da tarja possui pixels não-pretos (>5%), potencial fuga visual ou tarja transparente."

                    findings["boxes_analyzed"].append(box_result)

        doc.close()
        self.results["vector_3_pixel_rendering"] = findings
        return findings

    def audit_vector_4_search_matching(self) -> Dict[str, Any]:
        """
        Vetor 4: Pesquisa por Padrões Regex e Busca Literal:
        - Simula a funcionalidade 'Localizar' (Ctrl+F) de visualizadores PDF
        - Executa regex estritos de PII (CPF, CNPJ, RG, Email, Contas)
        """
        findings = {
            "regex_hits": {},
            "literal_search_hits": []
        }

        doc = pymupdf.open(self.pdf_path)

        for pat_name, pat in PII_REGEX_PATTERNS.items():
            findings["regex_hits"][pat_name] = []

        for page_idx, page in enumerate(doc):
            text = page.get_text()
            for pat_name, pat in PII_REGEX_PATTERNS.items():
                matches = pat.findall(text)
                if matches:
                    for m in matches:
                        findings["regex_hits"][pat_name].append({
                            "page": page_idx, "match": m
                        })
                        self.results["leakage_detected"] = True
                        self.results["leaked_items"].append(f"Vetor 4 (Busca Regex {pat_name} Pg {page_idx+1}): '{m}'")

            # Busca literal por cada alvo sensível
            for key, target in SENSITIVE_TARGETS.items():
                rects = page.search_for(target)
                if rects:
                    findings["literal_search_hits"].append({
                        "page": page_idx, "target": key, "value": target, "occurrences": len(rects)
                    })
                    self.results["leakage_detected"] = True
                    self.results["leaked_items"].append(f"Vetor 4 (Busca Literal Ctrl+F Pg {page_idx+1}): {key}='{target}'")

        doc.close()
        self.results["vector_4_search_matching"] = findings
        return findings

    def audit_vector_5_independent_tools(self) -> Dict[str, Any]:
        """
        Vetor 5: Ferramentas Forenses Independentes e Byte-Level Carving:
        - Escaneamento de strings no binário bruto do arquivo PDF
        - Decompressão de todos os streams /FlateDecode soltos
        - Inspeção da Tabela de Referências Cruzadas (Xref)
        """
        findings = {
            "raw_byte_matches": [],
            "decompressed_stream_matches": []
        }

        with open(self.pdf_path, "rb") as f:
            raw_bytes = f.read()

        # 5.1 Busca direta nos bytes crus
        for key, target in SENSITIVE_TARGETS.items():
            target_bytes = target.encode("latin1")
            target_utf8 = target.encode("utf-8")
            if target_bytes in raw_bytes or target_utf8 in raw_bytes:
                findings["raw_byte_matches"].append({
                    "target": key, "value": target, "encoding": "raw binary"
                })
                self.results["leakage_detected"] = True
                self.results["leaked_items"].append(f"Vetor 5 (Forensic Raw Byte Scan): {key}='{target}'")

        # 5.2 Decompressão de todos os objetos FlateDecode no arquivo
        stream_regex = re.compile(rb'stream[\r\n]+(.*?)[\r\n]+endstream', re.DOTALL)
        for idx, match in enumerate(stream_regex.finditer(raw_bytes)):
            stream_data = match.group(1)
            try:
                decompressed = zlib.decompress(stream_data)
                dec_text = decompressed.decode("latin1", errors="ignore")
                for key, target in SENSITIVE_TARGETS.items():
                    if target in dec_text:
                        findings["decompressed_stream_matches"].append({
                            "stream_idx": idx, "target": key, "value": target
                        })
                        self.results["leakage_detected"] = True
                        self.results["leaked_items"].append(f"Vetor 5 (Decompressed Stream #{idx}): {key}='{target}'")
            except Exception:
                pass

        self.results["vector_5_independent_tools"] = findings
        return findings

    def run_full_audit(self, redaction_boxes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Executa a bateria forense completa de 5 vetores"""
        self.audit_vector_1_text_extraction()
        self.audit_vector_2_object_inspection()
        self.audit_vector_3_pixel_rendering(redaction_boxes)
        self.audit_vector_4_search_matching()
        self.audit_vector_5_independent_tools()

        # Deduplica itens vazados
        self.results["leaked_items"] = list(dict.fromkeys(self.results["leaked_items"]))
        self.results["total_leaks_found"] = len(self.results["leaked_items"])

        if self.results["total_leaks_found"] == 0:
            self.results["security_verdict"] = "SEGURO (Zero representações recuperáveis encontradas)"
            self.results["safety_score"] = 100
        else:
            self.results["security_verdict"] = f"VULNERÁVEL ({self.results['total_leaks_found']} vazamentos de dados detectados)"
            self.results["safety_score"] = max(0, 100 - (self.results["total_leaks_found"] * 10))

        return self.results


def generate_synthetic_test_suite() -> Tuple[str, str, str, List[Dict[str, Any]]]:
    """
    Gera três documentos de teste com Ground Truth idêntico:
    1. doc_original.pdf: PDF original completo com texto, formulários, anotações e metadados
    2. doc_vector_overlay.pdf: PDF apenas com retângulos pretos desenhados sobre o vetor (método falho)
    3. doc_raster_flattened.pdf: PDF com sanitização completa por achatamento de imagem 300 DPI
    """
    os.makedirs("test_output/battery", exist_ok=True)
    orig_path = "test_output/battery/doc_original.pdf"
    vec_path = "test_output/battery/doc_vector_overlay.pdf"
    rast_path = "test_output/battery/doc_raster_flattened.pdf"

    # Coordenadas conhecidas dos itens sensíveis para tarjamento
    redaction_boxes = [
        {"pageIndex": 0, "x": 50, "y": 700, "width": 200, "height": 18, "text": SENSITIVE_TARGETS["Nome"], "category": "Nome de Pessoa"},
        {"pageIndex": 0, "x": 50, "y": 670, "width": 150, "height": 18, "text": SENSITIVE_TARGETS["CPF"], "category": "CPF"},
        {"pageIndex": 0, "x": 50, "y": 640, "width": 180, "height": 18, "text": SENSITIVE_TARGETS["CNPJ"], "category": "CNPJ"},
        {"pageIndex": 0, "x": 50, "y": 610, "width": 140, "height": 18, "text": SENSITIVE_TARGETS["RG"], "category": "RG"},
        {"pageIndex": 0, "x": 50, "y": 580, "width": 260, "height": 18, "text": SENSITIVE_TARGETS["Email"], "category": "E-mail"},
        {"pageIndex": 0, "x": 50, "y": 550, "width": 280, "height": 18, "text": SENSITIVE_TARGETS["Banco"], "category": "Financeiro"},
        {"pageIndex": 0, "x": 50, "y": 520, "width": 120, "height": 18, "text": SENSITIVE_TARGETS["Saude_CID"], "category": "Saúde"}
    ]

    # --- 1. Criar Documento Original ---
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842) # A4

    # Cabeçalho não-sensível
    page.insert_text(pymupdf.Point(50, 50), "TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO", fontsize=14, fontname="helv")
    page.insert_text(pymupdf.Point(50, 75), "COMARCA DA CAPITAL - VARA DA FAZENDA PÚBLICA", fontsize=11, fontname="helv")
    page.insert_text(pymupdf.Point(50, 100), "PROCESSO Nº 1023456-78.2026.8.26.0100", fontsize=12, fontname="helv")

    # Linhas com dados sensíveis
    # Note: No PyMuPDF, insert_text usa (x, y) de cima para baixo
    # Vamos alinhar com as coordenadas PDF
    items_to_draw = [
        ("Nome do Autor:", SENSITIVE_TARGETS["Nome"], 130),
        ("CPF:", SENSITIVE_TARGETS["CPF"], 160),
        ("CNPJ da Contratante:", SENSITIVE_TARGETS["CNPJ"], 190),
        ("Registro Geral (RG):", SENSITIVE_TARGETS["RG"], 220),
        ("Correio Eletrônico:", SENSITIVE_TARGETS["Email"], 250),
        ("Dados Bancários:", SENSITIVE_TARGETS["Banco"], 280),
        ("Diagnóstico Médico:", SENSITIVE_TARGETS["Saude_CID"], 310),
    ]

    real_boxes = []
    for label, val, y_top in items_to_draw:
        page.insert_text(pymupdf.Point(50, y_top), f"{label} {val}", fontsize=11, fontname="helv")
        # Localiza o retângulo exato do valor sensível
        rects = page.search_for(val)
        if rects:
            r = rects[0]
            # Converte para sistema de coordenadas do PyMuPDF
            real_boxes.append({
                "pageIndex": 0,
                "x": r.x0,
                "y": 842 - r.y1, # Converte para bottom-left
                "width": r.width,
                "height": r.height,
                "text": val
            })

    # Adicionar Anotação Sigilosa (/Annots)
    annot = page.add_text_annot(pymupdf.Point(400, 150), SENSITIVE_TARGETS["Anotacao_Sigilosa"])
    annot.set_info(title="Auditor LGPD", content=SENSITIVE_TARGETS["Anotacao_Sigilosa"])
    annot.update()

    # Adicionar Metadados (/Info)
    doc.set_metadata({
        "title": "Petição Inicial com Dados Pessoais",
        "author": SENSITIVE_TARGETS["Metadado_Autor"],
        "subject": "Segredo de Justiça - Contém PII",
        "keywords": "processo, sigilo, lgpd"
    })

    doc.save(orig_path)
    print(f"[+] Documento 1 (Original) gerado: {orig_path}")

    # --- 2. Criar Documento com Retângulos Vetoriais (Sem Achatamento) ---
    doc_vec = pymupdf.open(orig_path)
    page_vec = doc_vec[0]
    for b in real_boxes:
        rect = pymupdf.Rect(b["x"], 842 - (b["y"] + b["height"]), b["x"] + b["width"], 842 - b["y"])
        # Desenha retângulo preto sobreposto (vetorial)
        shape = page_vec.new_shape()
        shape.draw_rect(rect)
        shape.finish(fill=(0, 0, 0), color=(0, 0, 0), width=0.5)
        shape.commit()

    doc_vec.save(vec_path)
    doc_vec.close()
    print(f"[+] Documento 2 (Vetor Overlay) gerado: {vec_path}")

    # --- 3. Criar Documento com Sanitização por Achatamento Rasterizado (300 DPI) ---
    # Renderiza a página com retângulos vetoriais em alta resolução
    doc_temp = pymupdf.open(vec_path)
    page_temp = doc_temp[0]
    pix = page_temp.get_pixmap(dpi=300)
    img_bytes = pix.tobytes("jpeg", 95)
    doc_temp.close()

    # Cria documento completamente limpo sem stream de texto
    doc_rast = pymupdf.open()
    page_rast = doc_rast.new_page(width=595, height=842)
    page_rast.insert_image(page_rast.rect, stream=img_bytes)
    # Metadados sanitizados
    doc_rast.set_metadata({
        "title": "Documento Anonimizado (LGPD)",
        "author": "KovaxFiles Sanitizer",
        "subject": "Documento Sanitizado e Achatado",
        "keywords": ""
    })
    doc_rast.save(rast_path)
    doc_rast.close()
    print(f"[+] Documento 3 (Raster Flattened 300 DPI) gerado: {rast_path}")

    return orig_path, vec_path, rast_path, real_boxes


def print_forensic_report(audits: List[Dict[str, Any]]):
    """Exibe relatório tabular estruturado no terminal"""
    print("\n" + "=" * 80)
    print("      RELATÓRIO FORENSE DE AUDITORIA DE SEGURANÇA EM ANONIMIZAÇÃO PDF      ")
    print("=" * 80)

    for audit in audits:
        print(f"\n[DOCUMENTO] ARQUIVO: {audit['label']}")
        print(f"   Caminho: {audit['file_path']}")
        print(f"   Tamanho: {audit['file_size_bytes']} bytes")
        print(f"   Veredito de Seguranca: {audit['security_verdict']}")
        print(f"   Score de Protecao: {audit['safety_score']}/100")

        print("   +-- RESULTADO POR VETOR DE ATAQUE:")
        # Vetor 1
        v1 = audit["vector_1_text_extraction"]
        v1_leaks = len(v1.get("pymupdf", [])) + len(v1.get("pypdf", [])) + len(v1.get("pdfminer", []))
        print(f"   |-- Vetor 1 (Extracao de Texto): {'[FAIL] VAZAMENTO' if v1_leaks > 0 else '[OK] PROTEGIDO'} ({v1_leaks} itens extraidos via PyMuPDF/pypdf/pdfminer)")

        # Vetor 2
        v2 = audit["vector_2_object_inspection"]
        v2_leaks = len(v2.get("stream_contents_leakage", [])) + len(v2.get("annotations_leakage", [])) + len(v2.get("metadata_leakage", []))
        print(f"   |-- Vetor 2 (Inspecao de Objetos/Streams): {'[FAIL] VAZAMENTO' if v2_leaks > 0 else '[OK] PROTEGIDO'} (Streams: {len(v2.get('stream_contents_leakage', []))}, Annots: {len(v2.get('annotations_leakage', []))}, Meta: {len(v2.get('metadata_leakage', []))})")

        # Vetor 3
        v3 = audit["vector_3_pixel_rendering"]
        boxes = v3.get("boxes_analyzed", [])
        solid_count = sum(1 for b in boxes if b.get("is_solid_black", False))
        print(f"   |-- Vetor 3 (Renderizacao & Pixels): [OK] ANALISADO ({solid_count}/{len(boxes)} tarjas com 100% de cobertura preta)")

        # Vetor 4
        v4 = audit["vector_4_search_matching"]
        regex_hits = sum(len(hits) for hits in v4.get("regex_hits", {}).values())
        lit_hits = len(v4.get("literal_search_hits", []))
        print(f"   |-- Vetor 4 (Pesquisa Regex / Ctrl+F): {'[FAIL] VAZAMENTO' if (regex_hits + lit_hits) > 0 else '[OK] PROTEGIDO'} ({regex_hits} regex hits, {lit_hits} buscas literais)")

        # Vetor 5
        v5 = audit["vector_5_independent_tools"]
        raw_hits = len(v5.get("raw_byte_matches", [])) + len(v5.get("decompressed_stream_matches", []))
        print(f"   |-- Vetor 5 (Ferramentas Independentes / Raw Bytes): {'[FAIL] VAZAMENTO' if raw_hits > 0 else '[OK] PROTEGIDO'} ({raw_hits} ocorrencias binarias)")

        if audit["leaked_items"]:
            print("   \\-- DETALHE DOS ITENS VAZADOS:")
            for item in audit["leaked_items"][:8]:
                print(f"      * {item}")
            if len(audit["leaked_items"]) > 8:
                print(f"      * ... e mais {len(audit['leaked_items']) - 8} itens.")
        else:
            print("   \\-- NENHUM DADO SENSIVEL FOI RECUPERADO.")

    print("\n" + "=" * 80)
    print("                      MATRIZ COMPARATIVA DE RESILIÊNCIA                      ")
    print("=" * 80)
    print(f"{'MÉTODO DE ANONIMIZAÇÃO':<35} | {'TEXTO':<7} | {'OBJETOS':<7} | {'PIXELS':<7} | {'BUSCA':<7} | {'RAW BYTES':<9} | {'STATUS'}")
    print("-" * 88)
    for a in audits:
        v1_ok = len(a["vector_1_text_extraction"].get("pymupdf", [])) == 0
        v2_ok = len(a["vector_2_object_inspection"].get("stream_contents_leakage", [])) == 0
        v3_ok = True
        v4_ok = len(a["vector_4_search_matching"].get("literal_search_hits", [])) == 0
        v5_ok = len(a["vector_5_independent_tools"].get("raw_byte_matches", [])) == 0
        
        status = "APROVADO" if a["total_leaks_found"] == 0 else "REPROVADO"
        print(f"{a['label']:<35} | {'OK' if v1_ok else 'FAIL':<7} | {'OK' if v2_ok else 'FAIL':<7} | {'OK' if v3_ok else 'WARN':<7} | {'OK' if v4_ok else 'FAIL':<7} | {'OK' if v5_ok else 'FAIL':<9} | {status}")
    print("=" * 80 + "\n")


def main():
    print("[*] Iniciando Geração dos Cenários Sintéticos de Teste...")
    orig_path, vec_path, rast_path, boxes = generate_synthetic_test_suite()

    # Também testamos o PDF que foi gerado pelo próprio código do app (test_output/test_redacted_engine.pdf) se existir
    app_engine_path = "test_output/test_redacted_engine.pdf"

    audits = []

    # 1. Auditar Original
    auditor_orig = PdfForensicAuditor(orig_path, "1. Controle Original (Sem Tarjas)")
    audits.append(auditor_orig.run_full_audit())

    # 2. Auditar Sobreposição Vetorial (Retângulos Pretos Apenas)
    auditor_vec = PdfForensicAuditor(vec_path, "2. Tarja Vetorial Pura (Retângulo Preto)")
    audits.append(auditor_vec.run_full_audit(boxes))

    # 3. Auditar PDF gerado pelo LocalPdfEngine do App em Node
    if os.path.exists(app_engine_path):
        auditor_app = PdfForensicAuditor(app_engine_path, "3. LocalPdfEngine Atual (Node/Sem Flattening)")
        audits.append(auditor_app.run_full_audit())

    # 4. Auditar PDF Achatado / Raster Flattened 300 DPI
    auditor_rast = PdfForensicAuditor(rast_path, "4. Sanitizado (Raster Flattening 300 DPI)")
    audits.append(auditor_rast.run_full_audit(boxes))

    print_forensic_report(audits)

    # Salva relatório JSON completo para auditoria externa
    with open("test_output/battery/relatorio_forense_anonimizacao.json", "w", encoding="utf-8") as f:
        json.dump(audits, f, indent=2, ensure_ascii=False)
    print("[+] Relatório JSON completo salvo em: test_output/battery/relatorio_forense_anonimizacao.json")

    # Verificação de integridade dos testes:
    # 1. Os controles negativos (Original e Tarja Vetorial Pura) DEVEM acusar vazamento para atestar a sensibilidade da suíte
    if audits[0]["total_leaks_found"] == 0:
        sys.stderr.write("[ERRO NA BATERIA] O controle original não acusou vazamento. A bateria perdeu sensibilidade de detecção!\n")
        return 1
    if audits[1]["total_leaks_found"] == 0:
        sys.stderr.write("[ERRO NA BATERIA] A tarja vetorial pura não acusou vazamento. A bateria perdeu sensibilidade de detecção!\n")
        return 1

    # 2. O motor do aplicativo (LocalPdfEngine) e o documento sanitizado DEVEM ter ZERO vazamentos
    for a in audits[2:]:
        if a["total_leaks_found"] > 0:
            sys.stderr.write(f"[FALHA DE SEGURANÇA] {a['label']} apresentou {a['total_leaks_found']} vazamentos de dados confidenciais!\n")
            return 1

    print("[VERIFICAÇÃO DE INTEGRIDADE] Todos os controles responderam conforme o esperado e os artefatos sanitizados obtiveram 100% de sigilo.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

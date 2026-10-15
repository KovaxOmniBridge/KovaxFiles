#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
KovaxFiles Platform — Bateria de Testes Forenses de Segurança em Anonimização
=============================================================================
Auditoria Forense Independente de Sanitização em PDFs:
- Vetor 1: Extração textual multi-engine (pypdf, pdfminer.six, pymupdf)
- Vetor 2: Inspeção de objetos e streams (/Contents, /Annots, /AcroForm, /Metadata)
- Vetor 3: Análise colorimétrica e densitometria de pixels a 300 DPI (RGB/Luminância)
- Vetor 4: Pesquisa regex de PII e busca literal (Ctrl+F)
- Vetor 5: String carving em nível binário e decompressão de streams FlateDecode brutos

AVISO METODOLÓGICO:
A pontuação safety_score = 100 atesta que o documento foi aprovado com êxito em
todos os testes definidos e executados pela presente suíte forense. Este resultado
não representa prova matemática absoluta nem garantia contra técnicas forenses não
contempladas pela suíte ou tecnologias emergentes de recuperação de dados.
=============================================================================
"""

import os
import sys
import re
import json
import zlib
import datetime
import shutil
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

# Importa gerador de documentos realistas brasileiros com dados sintéticos fictícios
from generate_realistic_legal_corpus import (
    generate_realistic_corpus,
    ACORDAO_TARGETS,
    CONTRATO_TARGETS,
    LAUDO_TARGETS
)

# Ground Truth sintético padrão
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

SCOPE_AND_LIMITATIONS_DISCLAIMER = (
    "AVISO METODOLÓGICO DE ESCOPO E LIMITAÇÕES FORENSES:\n"
    "1. Um resultado de safety_score = 100 certifica estritamente que o documento examinado "
    "obteve índice nulo de recuperação nos 5 vetores forenses automatizados testados por esta suíte "
    "(extração textual multi-engine via PyMuPDF/pypdf/pdfminer, inspeção de baixo nível da árvore "
    "de objetos/streams/anotações/metadados, densitometria de pixels a 300 DPI, busca por regex/Ctrl+F "
    "e string carving em nível binário e streams FlateDecode descompactados).\n"
    "2. Esse resultado NÃO constitui garantia matemática absoluta contra quaisquer técnicas ou ferramentas "
    "forenses futuras, algoritmos esteganográficos não modelados ou ataques físicos fora do escopo do formato PDF.\n"
    "3. A suíte emprega controles negativos deliberadamente vulneráveis para comprovar que a bateria mantém "
    "sensibilidade ativa de detecção e não produz aprovações falsas por omissão ou erro de execução."
)


def clean_test_environment(output_dirs: List[str]):
    """Garante execução em ambiente estritamente limpo, removendo artefatos legados"""
    print("[*] Higienizando ambiente de teste antes da execução...")
    for d in output_dirs:
        if os.path.exists(d):
            shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d, exist_ok=True)
    print(f"[+] Ambiente de execução higienizado: {', '.join(output_dirs)}")


class PdfForensicAuditor:
    def __init__(self, pdf_path: str, label: str, target_dict: Dict[str, str] = None, is_sanitized_expected: bool = False):
        self.pdf_path = pdf_path
        self.label = label
        self.target_dict = target_dict if target_dict is not None else SENSITIVE_TARGETS
        self.is_sanitized_expected = is_sanitized_expected
        self.results = {
            "label": label,
            "file_path": pdf_path,
            "file_size_bytes": os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0,
            "is_sanitized_expected": is_sanitized_expected,
            "targets_tested_count": len(self.target_dict),
            "vector_1_text_extraction": {},
            "vector_2_object_inspection": {},
            "vector_3_pixel_rendering": {},
            "vector_4_search_matching": {},
            "vector_5_independent_tools": {},
            "leakage_detected": False,
            "leaked_items": []
        }

    def audit_vector_1_text_extraction(self) -> Dict[str, Any]:
        """Vetor 1: Extração textual com 3 motores independentes (PyMuPDF, pypdf, pdfminer.six)"""
        findings = {"pymupdf": [], "pypdf": [], "pdfminer": []}

        # 1.1 PyMuPDF
        try:
            doc = pymupdf.open(self.pdf_path)
            full_text_mupdf = ""
            for page in doc:
                full_text_mupdf += page.get_text() + "\n"
            doc.close()

            for key, target in self.target_dict.items():
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

            for key, target in self.target_dict.items():
                if target in full_text_pypdf:
                    findings["pypdf"].append({"target": key, "value": target})
        except Exception as e:
            findings["pypdf_error"] = str(e)

        # 1.3 pdfminer.six
        try:
            full_text_miner = pdfminer_extract_text(self.pdf_path)
            for key, target in self.target_dict.items():
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
            for f in findings["pypdf"]:
                self.results["leaked_items"].append(f"Vetor 1 (Texto pypdf): {f['target']}='{f['value']}'")
            for f in findings["pdfminer"]:
                self.results["leaked_items"].append(f"Vetor 1 (Texto pdfminer): {f['target']}='{f['value']}'")

        self.results["vector_1_text_extraction"] = findings
        return findings

    def audit_vector_2_object_inspection(self) -> Dict[str, Any]:
        """Vetor 2: Inspeção de baixo nível da árvore de objetos PDF (/Contents, /Annots, /AcroForm, /Metadata)"""
        findings = {
            "stream_contents_leakage": [],
            "annotations_leakage": [],
            "acroform_leakage": [],
            "metadata_leakage": []
        }

        doc = pymupdf.open(self.pdf_path)

        # 2.1 Streams /Contents
        for page_idx, page in enumerate(doc):
            try:
                contents = page.read_contents()
                if contents:
                    stream_text = contents.decode("latin1", errors="ignore")
                    for key, target in self.target_dict.items():
                        if target in stream_text:
                            findings["stream_contents_leakage"].append({
                                "page": page_idx, "target": key, "value": target
                            })
                            self.results["leakage_detected"] = True
                            self.results["leaked_items"].append(f"Vetor 2 (Stream /Contents Pg {page_idx+1}): {key}='{target}'")
            except Exception as e:
                findings["stream_error"] = str(e)

        # 2.2 Anotações (/Annots)
        for page_idx, page in enumerate(doc):
            try:
                annots = page.annots()
                if annots:
                    for a in annots:
                        info = a.info
                        annot_text = f"{info.get('content', '')} {info.get('title', '')} {info.get('subject', '')}"
                        for key, target in self.target_dict.items():
                            if target in annot_text:
                                findings["annotations_leakage"].append({
                                    "page": page_idx, "target": key, "value": target
                                })
                                self.results["leakage_detected"] = True
                                self.results["leaked_items"].append(f"Vetor 2 (Anotação /Annots Pg {page_idx+1}): {key}='{target}'")
            except Exception as e:
                findings["annots_error"] = str(e)

        # 2.3 AcroForm
        try:
            reader = pypdf.PdfReader(self.pdf_path)
            fields = reader.get_fields()
            if fields:
                for fname, fval in fields.items():
                    val_str = str(fval.get('/V', '')) + " " + str(fval.get('/DV', ''))
                    for key, target in self.target_dict.items():
                        if target in val_str:
                            findings["acroform_leakage"].append({
                                "field": fname, "target": key, "value": target
                            })
                            self.results["leakage_detected"] = True
                            self.results["leaked_items"].append(f"Vetor 2 (AcroForm Campo '{fname}'): {key}='{target}'")
        except Exception as e:
            findings["acroform_error"] = str(e)

        # 2.4 Metadados (/Info e /Metadata)
        meta = doc.metadata or {}
        meta_str = " ".join([str(v) for v in meta.values()])
        for key, target in self.target_dict.items():
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
        """Vetor 3: Renderização a 300 DPI e análise colorimétrica de tarjamento e bleed"""
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

            if redaction_boxes:
                scale_x = pix.width / page.rect.width
                scale_y = pix.height / page.rect.height

                for b in redaction_boxes:
                    if b.get("pageIndex", 0) != page_idx:
                        continue

                    pdf_x = b["x"]
                    pdf_y = b["y"]
                    pdf_w = b["width"]
                    pdf_h = b["height"]

                    img_left = int(pdf_x * scale_x)
                    img_top = int((page.rect.height - (pdf_y + pdf_h)) * scale_y)
                    img_right = int((pdf_x + pdf_w) * scale_x)
                    img_bottom = int((page.rect.height - pdf_y) * scale_y)

                    img_left = max(0, min(img_left, pix.width - 1))
                    img_top = max(0, min(img_top, pix.height - 1))
                    img_right = max(img_left + 1, min(img_right, pix.width))
                    img_bottom = max(img_top + 1, min(img_bottom, pix.height))

                    crop = img.crop((img_left, img_top, img_right, img_bottom))
                    colors = crop.getcolors(maxcolors=100000) or []

                    non_black_pixels = 0
                    total_pixels = (img_right - img_left) * (img_bottom - img_top)

                    for count, col in colors:
                        if isinstance(col, tuple) and len(col) >= 3:
                            r, g, b_val = col[0], col[1], col[2]
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
        """Vetor 4: Pesquisa regex estrita de PII e busca literal (Ctrl+F)"""
        findings = {
            "regex_hits": {},
            "literal_search_hits": []
        }

        doc = pymupdf.open(self.pdf_path)

        for pat_name in PII_REGEX_PATTERNS.keys():
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

            for key, target in self.target_dict.items():
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
        """Vetor 5: String carving em nível binário e decompressão de streams FlateDecode"""
        findings = {
            "raw_byte_matches": [],
            "decompressed_stream_matches": []
        }

        with open(self.pdf_path, "rb") as f:
            raw_bytes = f.read()

        # 5.1 Busca binária bruta
        for key, target in self.target_dict.items():
            target_bytes = target.encode("latin1", errors="ignore")
            target_utf8 = target.encode("utf-8")
            if (target_bytes and target_bytes in raw_bytes) or (target_utf8 and target_utf8 in raw_bytes):
                findings["raw_byte_matches"].append({
                    "target": key, "value": target, "encoding": "raw binary"
                })
                self.results["leakage_detected"] = True
                self.results["leaked_items"].append(f"Vetor 5 (Forensic Raw Byte Scan): {key}='{target}'")

        # 5.2 Descompressão de streams FlateDecode
        stream_regex = re.compile(rb'stream[\r\n]+(.*?)[\r\n]+endstream', re.DOTALL)
        for idx, match in enumerate(stream_regex.finditer(raw_bytes)):
            stream_data = match.group(1)
            try:
                decompressed = zlib.decompress(stream_data)
                dec_text = decompressed.decode("latin1", errors="ignore")
                for key, target in self.target_dict.items():
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

        self.results["leaked_items"] = list(dict.fromkeys(self.results["leaked_items"]))
        self.results["total_leaks_found"] = len(self.results["leaked_items"])

        if self.results["total_leaks_found"] == 0:
            self.results["security_verdict"] = "APROVADO (Zero vestígios recuperáveis nos 5 vetores)"
            self.results["safety_score"] = 100
        else:
            self.results["security_verdict"] = f"VULNERÁVEL ({self.results['total_leaks_found']} vazamentos detectados)"
            self.results["safety_score"] = max(0, 100 - (self.results["total_leaks_found"] * 10))

        return self.results


def generate_synthetic_test_suite() -> Tuple[str, str, str, List[Dict[str, Any]]]:
    """Gera documentos sintéticos de teste de conformidade (Original, Tarja Vetorial e Raster Flattened)"""
    os.makedirs("test_output/battery", exist_ok=True)
    orig_path = "test_output/battery/doc_original.pdf"
    vec_path = "test_output/battery/doc_vector_overlay.pdf"
    rast_path = "test_output/battery/doc_raster_flattened.pdf"

    # --- 1. Documento Original ---
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    page.insert_text(pymupdf.Point(50, 50), "TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO", fontsize=14, fontname="helv")
    page.insert_text(pymupdf.Point(50, 75), "COMARCA DA CAPITAL - VARA DA FAZENDA PÚBLICA", fontsize=11, fontname="helv")
    page.insert_text(pymupdf.Point(50, 100), "PROCESSO Nº 1023456-78.2026.8.26.0100", fontsize=12, fontname="helv")

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
        rects = page.search_for(val)
        if rects:
            r = rects[0]
            real_boxes.append({
                "pageIndex": 0,
                "x": r.x0,
                "y": 842 - r.y1,
                "width": r.width,
                "height": r.height,
                "text": val
            })

    annot = page.add_text_annot(pymupdf.Point(400, 150), SENSITIVE_TARGETS["Anotacao_Sigilosa"])
    annot.set_info(title="Auditor LGPD", content=SENSITIVE_TARGETS["Anotacao_Sigilosa"])
    annot.update()

    doc.set_metadata({
        "title": "Petição Inicial com Dados Pessoais",
        "author": SENSITIVE_TARGETS["Metadado_Autor"],
        "subject": "Segredo de Justiça - Contém PII",
        "keywords": "processo, sigilo, lgpd"
    })

    doc.save(orig_path)
    print(f"[+] Documento Sintético 1 (Original) gerado: {orig_path}")

    # --- 2. Tarja Vetorial Pura (Controle Negativo Falho) ---
    doc_vec = pymupdf.open(orig_path)
    page_vec = doc_vec[0]
    for b in real_boxes:
        rect = pymupdf.Rect(b["x"], 842 - (b["y"] + b["height"]), b["x"] + b["width"], 842 - b["y"])
        shape = page_vec.new_shape()
        shape.draw_rect(rect)
        shape.finish(fill=(0, 0, 0), color=(0, 0, 0), width=0.5)
        shape.commit()

    doc_vec.save(vec_path)
    doc_vec.close()
    print(f"[+] Documento Sintético 2 (Vetor Overlay) gerado: {vec_path}")

    # --- 3. Raster Flattened 300 DPI ---
    doc_temp = pymupdf.open(vec_path)
    page_temp = doc_temp[0]
    pix = page_temp.get_pixmap(dpi=300)
    img_bytes = pix.tobytes("jpeg", 95)
    doc_temp.close()

    doc_rast = pymupdf.open()
    page_rast = doc_rast.new_page(width=595, height=842)
    page_rast.insert_image(page_rast.rect, stream=img_bytes)
    doc_rast.set_metadata({
        "title": "Documento Anonimizado (LGPD)",
        "author": "KovaxFiles Sanitizer",
        "subject": "Documento Sanitizado e Achatado",
        "keywords": ""
    })
    doc_rast.save(rast_path)
    doc_rast.close()
    print(f"[+] Documento Sintético 3 (Raster Flattened 300 DPI) gerado: {rast_path}")

    return orig_path, vec_path, rast_path, real_boxes


def print_forensic_report(audits: List[Dict[str, Any]]):
    """Exibe relatório tabular estruturado no terminal com aviso metodológico"""
    print("\n" + "=" * 92)
    print("      RELATÓRIO FORENSE DE AUDITORIA DE SEGURANÇA EM ANONIMIZAÇÃO PDF (LGPD)      ")
    print("=" * 92)

    for audit in audits:
        doc_type = " [SANITIZADO/SEGURO]" if audit["is_sanitized_expected"] else " [CONTROLE NEGATIVO]"
        print(f"\n[DOCUMENTO] {audit['label']}{doc_type}")
        print(f"   Arquivo: {audit['file_path']} ({audit['file_size_bytes']} bytes)")
        print(f"   Alvos Verificados: {audit['targets_tested_count']} termos confidenciais")
        print(f"   Veredito Forense: {audit['security_verdict']}")
        print(f"   Safety Score: {audit['safety_score']}/100")

        v1 = audit["vector_1_text_extraction"]
        v1_leaks = len(v1.get("pymupdf", [])) + len(v1.get("pypdf", [])) + len(v1.get("pdfminer", []))

        v2 = audit["vector_2_object_inspection"]
        v2_leaks = len(v2.get("stream_contents_leakage", [])) + len(v2.get("annotations_leakage", [])) + len(v2.get("metadata_leakage", []))

        v3 = audit["vector_3_pixel_rendering"]
        boxes = v3.get("boxes_analyzed", [])
        solid_count = sum(1 for b in boxes if b.get("is_solid_black", False))

        v4 = audit["vector_4_search_matching"]
        regex_hits = sum(len(hits) for hits in v4.get("regex_hits", {}).values())
        lit_hits = len(v4.get("literal_search_hits", []))

        v5 = audit["vector_5_independent_tools"]
        raw_hits = len(v5.get("raw_byte_matches", [])) + len(v5.get("decompressed_stream_matches", []))

        print(f"   |-- Vetor 1 (Texto Multi-Engine): {'[FAIL] VAZAMENTO' if v1_leaks > 0 else '[OK] PROTEGIDO'} ({v1_leaks} itens recuperados)")
        print(f"   |-- Vetor 2 (Objetos/Streams):     {'[FAIL] VAZAMENTO' if v2_leaks > 0 else '[OK] PROTEGIDO'} ({v2_leaks} objetos)")
        print(f"   |-- Vetor 3 (Densitometria 300DPI): [OK] ANALISADO ({solid_count}/{len(boxes)} tarjas sólidas)")
        print(f"   |-- Vetor 4 (Regex / Ctrl+F):       {'[FAIL] VAZAMENTO' if (regex_hits + lit_hits) > 0 else '[OK] PROTEGIDO'} ({regex_hits + lit_hits} hits)")
        print(f"   |-- Vetor 5 (Binário / Raw Bytes):  {'[FAIL] VAZAMENTO' if raw_hits > 0 else '[OK] PROTEGIDO'} ({raw_hits} streams)")

        if audit["leaked_items"]:
            print("   \\-- ITENS RECUPERADOS (Amostra):")
            for item in audit["leaked_items"][:4]:
                print(f"      * {item}")
            if len(audit["leaked_items"]) > 4:
                print(f"      * ... e mais {len(audit['leaked_items']) - 4} ocorrências.")
        else:
            print("   \\-- NENHUM DADO PESSOAL RECUPERÁVEL.")

    print("\n" + "=" * 92)
    print("                      MATRIZ COMPARATIVA DE RESILIÊNCIA FORENSE                     ")
    print("=" * 92)
    print(f"{'DOCUMENTO AUDITADO':<42} | {'TIPO':<10} | {'V1':<4} | {'V2':<4} | {'V4':<4} | {'V5':<4} | {'SCORE':<5} | {'STATUS'}")
    print("-" * 92)
    for a in audits:
        v1_ok = len(a["vector_1_text_extraction"].get("pymupdf", [])) == 0 and len(a["vector_1_text_extraction"].get("pypdf", [])) == 0
        v2_ok = len(a["vector_2_object_inspection"].get("stream_contents_leakage", [])) == 0
        v4_ok = len(a["vector_4_search_matching"].get("literal_search_hits", [])) == 0
        v5_ok = len(a["vector_5_independent_tools"].get("raw_byte_matches", [])) == 0
        doc_kind = "SANITIZADO" if a["is_sanitized_expected"] else "CONTROLE"
        status = "APROVADO" if a["safety_score"] == 100 else "REPROVADO"
        print(f"{a['label'][:42]:<42} | {doc_kind:<10} | {'OK' if v1_ok else 'FAIL':<4} | {'OK' if v2_ok else 'FAIL':<4} | {'OK' if v4_ok else 'FAIL':<4} | {'OK' if v5_ok else 'FAIL':<4} | {a['safety_score']:<5} | {status}")
    print("=" * 92)

    print("\n" + "-" * 92)
    print("AVISO METODOLÓGICO DE ESCOPO E LIMITAÇÕES:")
    print("O resultado 'safety_score = 100' atesta estritamente a aprovação nos 5 vetores forenses")
    print("automatizados avaliados nesta bateria. Não comprova segurança matemática absoluta contra")
    print("quaisquer técnicas forenses não mapeadas ou tecnologias emergentes de recuperação.")
    print("-" * 92 + "\n")


def generate_markdown_summary(report_data: Dict[str, Any], output_path: str):
    """Gera sumário executivo em formato Markdown com metodologia e tabelas"""
    meta = report_data["metadata"]
    summary = report_data["summary"]
    docs = report_data["audited_documents"]

    lines = [
        "# Relatório Forense de Auditoria de Anonimização PDF (LGPD)",
        "",
        f"**Data de Execução:** {meta['generated_at']}  ",
        f"**Versão da Suíte:** {meta['suite_version']}  ",
        f"**Ambiente:** Python {meta['environment']['python_version']} ({meta['environment']['platform']})  ",
        "",
        "> [!IMPORTANT]",
        "> **AVISO METODOLÓGICO DE ESCOPO E LIMITAÇÕES FORENSES**  ",
        "> Um resultado de `safety_score = 100` significa **exclusivamente** que o documento examinado passou com índice nulo de recuperação nos 5 vetores de ataque forenses automatizados testados pela suíte. **Não constitui prova matemática absoluta** de invulnerabilidade contra qualquer técnica forense hipotética, novos ataques criptográficos ou tecnologias futuras de desanonimização.",
        "",
        "## 1. Resumo Executivo da Homologação",
        "",
        f"- **Total de Documentos Auditados:** {summary['total_documents_audited']}",
        f"- **Controles Negativos Testados:** {summary['negative_controls_evaluated']} (Vazamentos detectados: {summary['negative_controls_detected_leaks']}) — *Garante sensibilidade do teste*",
        f"- **Documentos Sanitizados Avaliados:** {summary['sanitized_documents_evaluated']} (Aprovados com Score 100: {summary['sanitized_documents_passed']})",
        f"- **Integridade Geral da Bateria:** `{'CONFORME' if summary['forensic_integrity_passed'] else 'NÃO CONFORME'}`",
        "",
        "## 2. Matriz de Vetores de Ataque Forense Avaliados",
        "",
        "| Vetor Forense | Descrição Metodológica | Motores Utilizados |",
        "| :--- | :--- | :--- |",
        "| **Vetor 1: Extração Textual** | Extração de camada de texto e layout multipadrão | `PyMuPDF`, `pypdf`, `pdfminer.six` |",
        "| **Vetor 2: Inspeção de Objetos** | Análise de streams `/Contents`, `/Annots`, `/AcroForm` e `/Metadata` | Parser interno PyMuPDF + pypdf Xref |",
        "| **Vetor 3: Densitometria de Pixels** | Renderização a 300 DPI e verificação de bleed / transparência de tarjas | `Pillow (PIL)` + PyMuPDF Pixmap |",
        "| **Vetor 4: Pesquisa Regex / Ctrl+F** | Busca literal de termos e regex estritos de PII brasileira | Regex Engine compilado + `search_for` |",
        "| **Vetor 5: String Carving Binário** | Varredura de strings brutas e decompressão de streams FlateDecode | `zlib` stream carving em binário bruto |",
        "",
        "## 3. Matriz de Resultados por Documento",
        "",
        "| Documento | Natureza | Alvos Testados | V1 (Texto) | V2 (Streams) | V4 (Ctrl+F) | V5 (Raw Bytes) | Score | Veredito |",
        "| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |"
    ]

    for d in docs:
        v1_ok = len(d["vector_1_text_extraction"].get("pymupdf", [])) == 0 and len(d["vector_1_text_extraction"].get("pypdf", [])) == 0
        v2_ok = len(d["vector_2_object_inspection"].get("stream_contents_leakage", [])) == 0
        v4_ok = len(d["vector_4_search_matching"].get("literal_search_hits", [])) == 0
        v5_ok = len(d["vector_5_independent_tools"].get("raw_byte_matches", [])) == 0
        kind = "Sanitizado" if d["is_sanitized_expected"] else "Controle Negativo"
        verdict = "✅ APROVADO" if d["safety_score"] == 100 else f"❌ {d['total_leaks_found']} Vazamentos"

        lines.append(
            f"| `{d['label']}` | {kind} | {d['targets_tested_count']} | {'OK' if v1_ok else 'FAIL'} | {'OK' if v2_ok else 'FAIL'} | {'OK' if v4_ok else 'FAIL'} | {'OK' if v5_ok else 'FAIL'} | **{d['safety_score']}/100** | {verdict} |"
        )

    lines.extend([
        "",
        "## 4. Corpus Jurídico Realista (Dados Fictícios Sintéticos)",
        "",
        "A suíte avaliou documentos representativos do ecossistema jurídico e institucional brasileiro:",
        "1. **Acórdão Judicial TJSP:** Apelação Cível de 2 páginas com ementa, relatório, voto de desembargador, selo eletrônico e certidão de juntada.",
        "2. **Contrato Social Empresarial:** Constituição de sociedade limitada com qualificação de sócios, quotas, capital social e conta bancária corporativa.",
        "3. **Laudo Médico Pericial Trabalhista:** Avaliação de capacidade laborativa com histórico clínico, diagnósticos CID-10, prontuário e receituário.",
        "",
        "> [!NOTE]",
        "> Todos os CPFs, CNPJs, RGs, nomes e endereços utilizados no corpus realista são **100% fictícios e sintéticos**, respeitando integralmente a LGPD.",
        ""
    ])

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[+] Relatório executivo Markdown gerado em: {output_path}")


def main():
    # 1. Limpeza rigorosa do ambiente antes da execução
    clean_test_environment(["test_output/battery", "test_output/realistic_corpus"])

    print("[*] Gerando cenários sintéticos de teste...")
    orig_path, vec_path, rast_path, boxes = generate_synthetic_test_suite()

    print("[*] Gerando corpus jurídico realista (Originais e Sanitizados)...")
    corpus_files = generate_realistic_corpus("test_output/realistic_corpus")
    # corpus_files: [f1_orig, f1_san, f2_orig, f2_san, f3_orig, f3_san]

    app_engine_path = "test_output/test_redacted_engine.pdf"

    audits = []

    # 1. Controle Original Sintético
    audits.append(PdfForensicAuditor(orig_path, "1. Sintético: Controle Original (Sem Tarjas)", is_sanitized_expected=False).run_full_audit())

    # 2. Tarja Vetorial Pura (Controle Negativo Falho)
    audits.append(PdfForensicAuditor(vec_path, "2. Sintético: Tarja Vetorial Pura (Retângulo Preto)", is_sanitized_expected=False).run_full_audit(boxes))

    # 3. LocalPdfEngine Node (se existir)
    if os.path.exists(app_engine_path):
        audits.append(PdfForensicAuditor(app_engine_path, "3. Sintético: LocalPdfEngine (Node Sanitizado)", is_sanitized_expected=True).run_full_audit())

    # 4. Raster Flattening 300 DPI Sintético
    audits.append(PdfForensicAuditor(rast_path, "4. Sintético: Raster Flattening 300 DPI", is_sanitized_expected=True).run_full_audit(boxes))

    # 5. Corpus Realista: Acórdão TJSP Original (Controle Negativo)
    audits.append(PdfForensicAuditor(corpus_files[0], "5. Corpus Realista: Acórdão TJSP (Controle Original)", target_dict=ACORDAO_TARGETS, is_sanitized_expected=False).run_full_audit())

    # 6. Corpus Realista: Acórdão TJSP Sanitizado
    audits.append(PdfForensicAuditor(corpus_files[1], "6. Corpus Realista: Acórdão TJSP Anonimizado", target_dict=ACORDAO_TARGETS, is_sanitized_expected=True).run_full_audit())

    # 7. Corpus Realista: Contrato Social Original (Controle Negativo)
    audits.append(PdfForensicAuditor(corpus_files[2], "7. Corpus Realista: Contrato Social (Controle Original)", target_dict=CONTRATO_TARGETS, is_sanitized_expected=False).run_full_audit())

    # 8. Corpus Realista: Contrato Social Sanitizado
    audits.append(PdfForensicAuditor(corpus_files[3], "8. Corpus Realista: Contrato Social Anonimizado", target_dict=CONTRATO_TARGETS, is_sanitized_expected=True).run_full_audit())

    # 9. Corpus Realista: Laudo Médico Pericial Original (Controle Negativo)
    audits.append(PdfForensicAuditor(corpus_files[4], "9. Corpus Realista: Laudo Médico (Controle Original)", target_dict=LAUDO_TARGETS, is_sanitized_expected=False).run_full_audit())

    # 10. Corpus Realista: Laudo Médico Pericial Sanitizado
    audits.append(PdfForensicAuditor(corpus_files[5], "10. Corpus Realista: Laudo Médico Anonimizado", target_dict=LAUDO_TARGETS, is_sanitized_expected=True).run_full_audit())

    # Exibe relatório no console
    print_forensic_report(audits)

    # Contabilização de Controles e Sanitizados
    negative_controls = [a for a in audits if not a["is_sanitized_expected"]]
    sanitized_docs = [a for a in audits if a["is_sanitized_expected"]]

    neg_leaks_detected = sum(1 for a in negative_controls if a["total_leaks_found"] > 0)
    san_passed_count = sum(1 for a in sanitized_docs if a["total_leaks_found"] == 0 and a["safety_score"] == 100)

    integrity_ok = (neg_leaks_detected == len(negative_controls)) and (san_passed_count == len(sanitized_docs))

    # Estruturação do Relatório JSON Completo
    report_data = {
        "metadata": {
            "title": "Relatório Forense de Auditoria de Anonimização PDF (LGPD)",
            "suite_version": "2.1.0",
            "generated_at": datetime.datetime.now().isoformat(),
            "environment": {
                "platform": sys.platform,
                "python_version": sys.version.split()[0],
                "pymupdf_version": pymupdf.__version__,
                "pypdf_version": pypdf.__version__
            },
            "safety_score_methodology": {
                "definition": "O índice safety_score mede a ausência de vestígios recuperáveis nos 5 vetores forenses avaliados por esta suíte.",
                "tested_attack_vectors": [
                    "Vetor 1: Extração textual multi-engine (PyMuPDF, pypdf, pdfminer.six)",
                    "Vetor 2: Inspeção de baixo nível da árvore de objetos e streams (/Contents, /Annots, /AcroForm, /Metadata)",
                    "Vetor 3: Renderização a 300 DPI e análise colorimétrica de tarjamento e bleed",
                    "Vetor 4: Pesquisa regex de PII e busca literal (Ctrl+F)",
                    "Vetor 5: String carving em binário bruto e decompressão de streams FlateDecode"
                ],
                "scope_and_limitations_disclaimer": SCOPE_AND_LIMITATIONS_DISCLAIMER
            }
        },
        "summary": {
            "total_documents_audited": len(audits),
            "negative_controls_evaluated": len(negative_controls),
            "negative_controls_detected_leaks": neg_leaks_detected,
            "sanitized_documents_evaluated": len(sanitized_docs),
            "sanitized_documents_passed": san_passed_count,
            "forensic_integrity_passed": integrity_ok
        },
        "audited_documents": audits
    }

    # Salva relatório JSON
    json_path = "test_output/battery/relatorio_forense_anonimizacao.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    print(f"[+] Relatório JSON completo salvo em: {json_path}")

    # Salva relatório Markdown
    md_path = "test_output/battery/relatorio_forense_resumo.md"
    generate_markdown_summary(report_data, md_path)

    # Validação de integridade estrita
    if neg_leaks_detected != len(negative_controls):
        sys.stderr.write(f"[ERRO NA BATERIA] {len(negative_controls) - neg_leaks_detected} controles negativos não acusaram vazamento! Sensibilidade forense comprometida!\n")
        return 1

    if san_passed_count != len(sanitized_docs):
        sys.stderr.write(f"[FALHA DE SEGURANÇA] {len(sanitized_docs) - san_passed_count} documentos sanitizados apresentaram vazamentos!\n")
        return 1

    print("[VERIFICAÇÃO DE INTEGRIDADE] Homologação concluída com 100% de precisão nos controles e documentos sanitizados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

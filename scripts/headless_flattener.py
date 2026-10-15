#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KovaxFiles — Headless PDF Raster Flattener Fallback
Usado para sanitização de PDFs em ambientes sem DOM/Canvas (Node.js / CLI).
Renderiza páginas em 300 DPI nominais (com escalonamento adaptativo para páginas grandes)
e encapsula em um novo PDF limpo sem streams de texto, anotações, formulários ou anexos.
"""

import sys
import os
import json

def flatten(
    input_path: str,
    output_path: str,
    target_dpi: int = 300,
    quality: int = 88,
    max_pixels: int = 25000000,
    min_dpi: int = 150,
    report_path: str = None
) -> bool:
    try:
        import pymupdf
        doc = pymupdf.open(input_path)
        out_doc = pymupdf.open()
        pages_info = []

        # Garante coerência entre limites
        min_dpi = min(min_dpi, target_dpi)

        for page in doc:
            pt_w = page.rect.width
            pt_h = page.rect.height
            nominal_scale = target_dpi / 72.0
            raw_pixels = (pt_w * nominal_scale) * (pt_h * nominal_scale)

            page_dpi = target_dpi
            was_adapted = False
            warning_msg = None
            status = "optimal"

            if raw_pixels > max_pixels:
                was_adapted = True
                theoretical_scale = (max_pixels / (pt_w * pt_h)) ** 0.5
                theoretical_dpi = int(round(theoretical_scale * 72.0))

                if theoretical_dpi < min_dpi:
                    # Aplica critério mínimo de qualidade garantido
                    page_dpi = min_dpi
                    warning_msg = (
                        f"Resolução mantida no piso mínimo de qualidade ({min_dpi} DPI) para preservar "
                        f"legibilidade de assinaturas, carimbos e notas. Dimensões: {pt_w:.0f}x{pt_h:.0f} pt."
                    )
                    status = "adapted_acceptable"
                else:
                    page_dpi = theoretical_dpi
                    warning_msg = (
                        f"Resolução adaptada para {page_dpi} DPI para controle de memória e tamanho de arquivo "
                        f"(piso mínimo de {min_dpi} DPI preservado)."
                    )
                    status = "optimal" if page_dpi >= 200 else "adapted_acceptable"

                sys.stderr.write(
                    f"[HeadlessFlattener] Página {page.number + 1} ({pt_w:.0f}x{pt_h:.0f}pt): "
                    f"DPI adaptado de {target_dpi} para {page_dpi} DPI (piso mínimo: {min_dpi} DPI).\n"
                )

            # Rotação da página é automaticamente respeitada por page.get_pixmap() e page.rect
            pix = page.get_pixmap(dpi=page_dpi)
            img_bytes = pix.tobytes("jpeg", quality)

            # Cria a página com as exatas dimensões orientadas da página original
            new_page = out_doc.new_page(width=pt_w, height=pt_h)
            new_page.insert_image(new_page.rect, stream=img_bytes)

            page_info = {
                "pageNumber": page.number + 1,
                "widthPt": round(pt_w, 1),
                "heightPt": round(pt_h, 1),
                "targetDpi": target_dpi,
                "effectiveDpi": page_dpi,
                "minDpiThreshold": min_dpi,
                "renderedWidthPx": pix.width,
                "renderedHeightPx": pix.height,
                "megaPixels": round((pix.width * pix.height) / 1000000.0, 2),
                "wasAdapted": was_adapted,
                "qualityWarning": warning_msg,
                "status": status
            }
            pages_info.append(page_info)

        # Metadados sanitizados padronizados
        out_doc.set_metadata({
            "title": "Documento Anonimizado e Sanitizado",
            "author": "KovaxFiles Document Engine",
            "subject": "Sanitizacao LGPD por Achatamento",
            "keywords": ""
        })

        out_doc.save(
            output_path,
            deflate=True,
            garbage=4,
            clean=True
        )
        out_doc.close()
        doc.close()

        if report_path:
            avg_dpi = round(sum(p["effectiveDpi"] for p in pages_info) / len(pages_info), 1) if pages_info else target_dpi
            min_eff = min((p["effectiveDpi"] for p in pages_info), default=target_dpi)
            max_eff = max((p["effectiveDpi"] for p in pages_info), default=target_dpi)
            adapted_count = sum(1 for p in pages_info if p["wasAdapted"])

            report_data = {
                "targetDpi": target_dpi,
                "minDpi": min_dpi,
                "quality": round(quality / 100.0, 2),
                "maxPixelsPerPage": max_pixels,
                "totalPages": len(pages_info),
                "averageEffectiveDpi": avg_dpi,
                "minEffectiveDpi": min_eff,
                "maxEffectiveDpi": max_eff,
                "adaptedPagesCount": adapted_count,
                "pages": pages_info,
                "securitySanitizationStatus": "fully_destroyed_and_flattened",
                "summaryMessage": (
                    f"Sanitização por achatamento concluída. {len(pages_info)} página(s) processada(s) "
                    f"com DPI efetivo médio de {avg_dpi:.0f} DPI. "
                    + (f"{adapted_count} página(s) tiveram resolução adaptada respeitando o piso de {min_dpi} DPI." if adapted_count > 0 else "Todas as páginas renderizadas no DPI alvo nominal.")
                )
            }
            try:
                with open(report_path, "w", encoding="utf-8") as f:
                    json.dump(report_data, f, indent=2, ensure_ascii=False)
            except Exception as w_err:
                sys.stderr.write(f"Erro ao salvar relatório de rasterização: {w_err}\n")

        return True
    except Exception as e:
        sys.stderr.write(f"Erro no headless flattener: {e}\n")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.stderr.write("Uso: python headless_flattener.py <input.pdf> <output.pdf> [dpi] [quality] [max_pixels] [min_dpi] [report_json_path]\n")
        sys.exit(1)
    
    in_pdf = sys.argv[1]
    out_pdf = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    qual = int(sys.argv[4]) if len(sys.argv) > 4 else 88
    max_px = int(sys.argv[5]) if len(sys.argv) > 5 else 25000000
    min_d = int(sys.argv[6]) if len(sys.argv) > 6 else 150
    rep_p = sys.argv[7] if len(sys.argv) > 7 else None
    
    success = flatten(in_pdf, out_pdf, dpi, qual, max_px, min_d, rep_p)
    sys.exit(0 if success else 1)

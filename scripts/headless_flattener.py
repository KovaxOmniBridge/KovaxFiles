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

def flatten(input_path: str, output_path: str, target_dpi: int = 300, quality: int = 88, max_pixels: int = 25000000) -> bool:
    try:
        import pymupdf
        doc = pymupdf.open(input_path)
        out_doc = pymupdf.open()

        for page in doc:
            pt_w = page.rect.width
            pt_h = page.rect.height
            nominal_scale = target_dpi / 72.0
            raw_pixels = (pt_w * nominal_scale) * (pt_h * nominal_scale)

            page_dpi = target_dpi
            if raw_pixels > max_pixels:
                # Escalonamento adaptativo para prevenir estouro de memória e tamanho de arquivo excessivo
                effective_scale = (max_pixels / (pt_w * pt_h)) ** 0.5
                page_dpi = max(72, int(effective_scale * 72.0))
                sys.stderr.write(
                    f"[HeadlessFlattener] Página grande detectada ({pt_w:.0f}x{pt_h:.0f}pt). "
                    f"DPI adaptado de {target_dpi} para {page_dpi} DPI.\n"
                )

            # Rotação da página é automaticamente respeitada por page.get_pixmap() e page.rect
            pix = page.get_pixmap(dpi=page_dpi)
            img_bytes = pix.tobytes("jpeg", quality)

            # Cria a página com as exatas dimensões orientadas da página original
            new_page = out_doc.new_page(width=pt_w, height=pt_h)
            new_page.insert_image(new_page.rect, stream=img_bytes)

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
        return True
    except Exception as e:
        sys.stderr.write(f"Erro no headless flattener: {e}\n")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.stderr.write("Uso: python headless_flattener.py <input.pdf> <output.pdf> [dpi] [quality]\n")
        sys.exit(1)
    
    in_pdf = sys.argv[1]
    out_pdf = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    qual = int(sys.argv[4]) if len(sys.argv) > 4 else 88
    
    success = flatten(in_pdf, out_pdf, dpi, qual)
    sys.exit(0 if success else 1)

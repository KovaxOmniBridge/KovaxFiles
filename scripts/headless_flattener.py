#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KovaxFiles — Headless PDF Raster Flattener Fallback
Usado para sanitização de PDFs em ambientes sem DOM/Canvas (Node.js / CLI).
Renderiza páginas em 300 DPI e encapsula em um novo PDF limpo sem streams de texto.
"""

import sys
import os

def flatten(input_path: str, output_path: str, dpi: int = 300) -> bool:
    try:
        import pymupdf
        doc = pymupdf.open(input_path)
        out_doc = pymupdf.open()

        for page in doc:
            pix = page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes("jpeg", 92)
            new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(new_page.rect, stream=img_bytes)

        out_doc.set_metadata({
            "title": "Documento Anonimizado e Sanitizado",
            "author": "KovaxFiles Document Engine",
            "subject": "Sanitizacao LGPD por Achatamento",
            "keywords": ""
        })
        out_doc.save(output_path)
        out_doc.close()
        doc.close()
        return True
    except Exception as e:
        sys.stderr.write(f"Erro no headless flattener: {e}\n")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.stderr.write("Uso: python headless_flattener.py <input.pdf> <output.pdf> [dpi]\n")
        sys.exit(1)
    
    in_pdf = sys.argv[1]
    out_pdf = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    
    success = flatten(in_pdf, out_pdf, dpi)
    sys.exit(0 if success else 1)

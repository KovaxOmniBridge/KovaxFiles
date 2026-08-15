/**
 * ACROFORMS INTERACTIVE PDF SERVICE
 * Inspeção, Preenchimento e Achatamento (Flattening) de Formulários PDF.
 * 100% Client-Side via pdf-lib.
 */

import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';

export interface FormFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'unknown';
  value: string | boolean;
  options?: string[];
}

export const acroFormService = {
  /**
   * Inspeciona um PDF e extrai todos os campos de formulário interativos.
   */
  async inspectPdfFormFields(file: File): Promise<{ hasForm: boolean; fields: FormFieldInfo[] }> {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    try {
      const form = pdfDoc.getForm();
      const rawFields = form.getFields();

      if (!rawFields || rawFields.length === 0) {
        return { hasForm: false, fields: [] };
      }

      const fieldsInfo: FormFieldInfo[] = rawFields.map((field) => {
        const name = field.getName();

        if (field instanceof PDFTextField) {
          return {
            name,
            type: 'text',
            value: field.getText() || '',
          };
        }

        if (field instanceof PDFCheckBox) {
          return {
            name,
            type: 'checkbox',
            value: field.isChecked(),
          };
        }

        if (field instanceof PDFDropdown) {
          const selected = field.getSelected();
          return {
            name,
            type: 'dropdown',
            value: selected.length > 0 ? selected[0] : '',
            options: field.getOptions(),
          };
        }

        if (field instanceof PDFRadioGroup) {
          return {
            name,
            type: 'radio',
            value: field.getSelected() || '',
            options: field.getOptions(),
          };
        }

        return {
          name,
          type: 'unknown',
          value: '',
        };
      });

      return {
        hasForm: true,
        fields: fieldsInfo,
      };
    } catch {
      return { hasForm: false, fields: [] };
    }
  },

  /**
   * Preenche os campos de um formulário PDF e opcionalmente os achata (flatten) para impedir edição.
   */
  async fillAndSavePdfForm(
    file: File,
    fieldValues: Record<string, string | boolean>,
    flatten = true,
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ blob: Blob; size: number }> {
    onProgress?.(20, 'Carregando estrutura de formulário do PDF...');
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    onProgress?.(50, 'Preenchendo campos de texto, checkboxes e seleções...');
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    fields.forEach((field) => {
      const name = field.getName();
      const val = fieldValues[name];

      if (val === undefined || val === null) return;

      try {
        if (field instanceof PDFTextField && typeof val === 'string') {
          field.setText(val);
        } else if (field instanceof PDFCheckBox && typeof val === 'boolean') {
          if (val) field.check();
          else field.uncheck();
        } else if (field instanceof PDFDropdown && typeof val === 'string') {
          if (val) field.select(val);
        } else if (field instanceof PDFRadioGroup && typeof val === 'string') {
          if (val) field.select(val);
        }
      } catch (err) {
        console.warn(`Aviso ao preencher campo "${name}":`, err);
      }
    });

    if (flatten) {
      onProgress?.(80, 'Achatando formulário (flatten) para fixar conteúdo estático...');
      try {
        form.flatten();
      } catch (err) {
        console.warn('Aviso ao achatar formulário:', err);
      }
    }

    onProgress?.(95, 'Gerando novo arquivo PDF modificado...');
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Formulário PDF preenchido e salvo com sucesso!');
    return {
      blob,
      size: blob.size,
    };
  },
};

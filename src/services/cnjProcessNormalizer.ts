/**
 * CnjProcessNormalizer - Normalizador Canônico de Números de Processo Judicial (Padrão CNJ)
 * Formata, valida e converte sequências numéricas de 20 dígitos na máscara oficial CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 */

export class CnjProcessNormalizer {
  /**
   * Converte uma string arbitrária contendo um número de processo no formato canônico com máscara CNJ.
   * Exemplo: "00012345620268260100" -> "0001234-56.2026.8.26.0100"
   */
  public static formatCnjNumber(rawInput: string): string {
    if (!rawInput) return '';

    // Extrai apenas os dígitos numéricos
    const digitsOnly = rawInput.replace(/\D/g, '');

    // Se tiver exatamente 20 dígitos, aplica a máscara padrão do CNJ
    if (digitsOnly.length === 20) {
      const n = digitsOnly.substring(0, 7);
      const d = digitsOnly.substring(7, 9);
      const a = digitsOnly.substring(9, 13);
      const j = digitsOnly.substring(13, 14);
      const tr = digitsOnly.substring(14, 16);
      const o = digitsOnly.substring(16, 20);

      return `${n}-${d}.${a}.${j}.${tr}.${o}`;
    }

    return rawInput.trim();
  }

  /**
   * Verifica se a string fornecida representa um número de processo CNJ válido com 20 dígitos
   */
  public static isValidCnjNumber(rawInput: string): boolean {
    if (!rawInput) return false;
    const digitsOnly = rawInput.replace(/\D/g, '');
    return digitsOnly.length === 20;
  }

  /**
   * Extrai apenas os dígitos limpos sem pontos ou traços
   */
  public static stripCnjMask(rawInput: string): string {
    return rawInput ? rawInput.replace(/\D/g, '') : '';
  }
}

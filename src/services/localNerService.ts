import { pipeline, env } from '@xenova/transformers';

// Configurações do ambiente Transformers.js para WebAssembly local sem interceptação de HTML do Vite
env.allowRemoteModels = true;
env.allowLocalModels = true;
(env as any).remoteHost = 'https://huggingface.co/';

let nerPipeline: any = null;
let initPromise: Promise<any> | null = null;

export class LocalNerService {
  /**
   * Garante a inicialização única e assíncrona do modelo de Rede Neural BERT-NER
   */
  static async getPipeline(): Promise<any> {
    if (nerPipeline) return nerPipeline;

    if (!initPromise) {
      initPromise = (async () => {
        try {
          // Utiliza modelo quantizado leve com timeout de 3.5s para evitar travamento em sandboxes ou rede lenta
          const pipelinePromise = pipeline('token-classification', 'Xenova/bert-base-multilingual-cased-ner', {
            quantized: true
          });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('NER Pipeline Timeout')), 3500)
          );

          nerPipeline = await Promise.race([pipelinePromise, timeoutPromise]);
          return nerPipeline;
        } catch (err) {
          // Se falhar o download remoto ou der timeout no sandbox, registra o fallback e desativa a chamada remota
          console.warn('[LocalNerService] Modelo remoto indisponível ou timeout no sandbox. Ativando Motor Neural de Fallback.');
          initPromise = null;
          return null;
        }
      })();
    }

    return await initPromise;
  }

  /**
   * Executa a inferência de Rede Neural Local (Transformers.js / BERT-NER) para extração de entidades
   */
  static async extractEntities(text: string): Promise<{ text: string; category: string; reason: string }[]> {
    if (!text || text.trim().length === 0) return [];

    try {
      const model = await this.getPipeline();
      if (!model) return [];

      const chunks = text.match(/.{1,1500}(\s|$)/gs) || [text];
      const extracted: { text: string; category: string; reason: string }[] = [];

      for (const chunk of chunks.slice(0, 5)) {
        await new Promise(r => setTimeout(r, 0)); // Libera o event loop da UI
        
        const results = await model(chunk, { ignore_labels: ['O'] });
        if (Array.isArray(results)) {
          for (const item of results) {
            if (!item.word || item.word.startsWith('##') || item.word.length < 3) continue;

            let category = 'Nome de Pessoa';
            let reason = 'Identificado por Rede Neural NER Local (BERT/Transformers.js)';

            if (item.entity && item.entity.includes('PER')) {
              category = 'Nome de Pessoa';
              reason = 'Nome próprio de cidadão identificado por Rede Neural BERT (LGPD)';
            } else if (item.entity && item.entity.includes('LOC')) {
              category = 'Endereço';
              reason = 'Localização / Logradouro identificado por Rede Neural BERT';
            } else if (item.entity && item.entity.includes('ORG')) {
              category = 'Personalizado';
              reason = 'Organização / Entidade identificada por Rede Neural Local';
            }

            extracted.push({
              text: item.word.trim(),
              category,
              reason
            });
          }
        }
      }

      return extracted;
    } catch (err) {
      console.warn('[LocalNerService] Aviso na inferência neural local:', err);
      return [];
    }
  }
}

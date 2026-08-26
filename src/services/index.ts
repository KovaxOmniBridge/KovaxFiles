// Barrel Export Master unificando todos os serviços por subdiretório
export * from './converters/docConverter';
export * from './converters/pdfConverter';
export * from './converters/xlsxConverter';
export * from './converters/csvConverter';
export * from './converters/htmlConverter';
export * from './converters/markdownConverter';
export * from './converters/imageConverter';
export * from './converters/mediaConverter';
export * from './converters/zipConverter';
export * from './converters/spreadsheetConverter';
export * from './converters/zipService';

export * from './ai/localAiService';
export * from './ai/localVectorStore';
export * from './ai/ocrService';

export * from './optimization/pdfOptimizer';
export * from './optimization/redactionService';
export * from './optimization/metadataSanitizerService';
export * from './optimization/memoryManager';

export * from './pdf/pdfTableExtractorService';
export * from './pdf/pdfPageEditorService';
export * from './pdf/pdfSplitterService';
export * from './pdf/pdfBateStampingService';
export * from './pdf/acroFormService';
export * from './pdf/digitalSignatureService';
export * from './pdf/watermarkService';

export * from './utils/networkAuditLogger';
export * from './utils/sampleGeneratorService';
export * from './utils/tabCaptureService';

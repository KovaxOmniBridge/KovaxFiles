#!/usr/bin/env node
/**
 * =============================================================================
 * KOVAXFILES DESKTOP — GERADOR E VALIDADOR ESTREITO DE MANIFESTO SHA-256
 * =============================================================================
 * Regras Obrigatórias de Estabilização de Release:
 * 1. Não ignora falhas com || true.
 * 2. Exige presença obrigatória dos artefatos da plataforma esperada.
 * 3. Valida tamanho de arquivos (> 0 bytes) e formato do hash SHA-256.
 * 4. Valida a leitura de volta do arquivo SHA256SUMS.txt gerado.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ManifestOptions {
  dir: string;
  requiredPlatforms: ('win' | 'mac' | 'linux')[];
  allowEmpty?: boolean;
}

export function generateReleaseManifest(options: ManifestOptions): {
  manifestPath: string;
  entries: { file: string; size: number; sha256: string; platform: string }[];
} {
  const releaseDir = path.resolve(options.dir);

  console.log('='.repeat(80));
  console.log('  GERAÇÃO E VALIDAÇÃO ESTREITA DE MANIFESTO CRIPTOGRÁFICO SHA-256');
  console.log('='.repeat(80));
  console.log(`Diretório de verificação: ${releaseDir}`);
  console.log(`Plataformas obrigatórias: ${options.requiredPlatforms.join(', ') || 'qualquer'}\n`);

  if (!fs.existsSync(releaseDir)) {
    throw new Error(`[ERRO FATAL DE RELEASE] Diretório de artefatos ausente: ${releaseDir}`);
  }

  const allFiles = fs.readdirSync(releaseDir);
  const targetExtensions = ['.exe', '.dmg', '.appimage', '.deb', '.rpm', '.zip'];

  // Filtra instaladores reais ignorando arquivos temporários ou manifestos anteriores
  const installerFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    if (!targetExtensions.includes(ext)) return false;
    if (file.startsWith('.') || file.includes('unconfirmed') || file.includes('tmp')) return false;
    return true;
  });

  if (installerFiles.length === 0) {
    if (options.allowEmpty) {
      console.warn('::warning title=Manifesto Vazio::Nenhum instalador encontrado no diretório.');
      return { manifestPath: '', entries: [] };
    }
    throw new Error(
      `[ERRO FATAL DE RELEASE] Nenhum artefato executável de distribuição encontrado em ${releaseDir}. A geração de SHA256SUMS.txt não pode ser executada sem artefatos.`
    );
  }

  // Identificação e validação de requisitos de plataformas
  const entries: { file: string; size: number; sha256: string; platform: string }[] = [];
  const foundPlatforms = new Set<string>();

  for (const fileName of installerFiles) {
    const fullPath = path.join(releaseDir, fileName);
    const stat = fs.statSync(fullPath);

    if (stat.size === 0) {
      throw new Error(`[ERRO FATAL DE RELEASE] Artefato vazio ou corrompido (0 bytes): ${fileName}`);
    }

    const ext = path.extname(fileName).toLowerCase();
    let platform = 'desconhecido';
    if (ext === '.exe') platform = 'win';
    else if (ext === '.dmg' || (ext === '.zip' && fileName.toLowerCase().includes('mac'))) platform = 'mac';
    else if (ext === '.appimage' || ext === '.deb' || ext === '.rpm') platform = 'linux';

    foundPlatforms.add(platform);

    const fileBuffer = fs.readFileSync(fullPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    entries.push({
      file: fileName,
      size: stat.size,
      sha256: hash,
      platform
    });
  }

  // Verifica se todas as plataformas obrigatórias estão representadas
  for (const reqPlatform of options.requiredPlatforms) {
    if (!foundPlatforms.has(reqPlatform)) {
      throw new Error(
        `[ERRO FATAL DE RELEASE] Artefato obrigatório da plataforma "${reqPlatform}" ausente no diretório ${releaseDir}. Artefatos encontrados: ${[...foundPlatforms].join(', ')}`
      );
    }
  }

  // Constrói o conteúdo formal do SHA256SUMS.txt com avisos de segurança institucional
  const headerLines = [
    '# ==============================================================================',
    '# MANIFESTO DE INTEGRIDADE CRIPTOGRÁFICA (SHA-256) — KOVAXFILES DESKTOP',
    '# ==============================================================================',
    '# DATA DE GERAÇÃO: ' + new Date().toISOString(),
    '# NOTA DE SEGURANÇA INSTITUCIONAL:',
    '# 1. Os hashes abaixo atestam exclusivamente a INTEGRIDADE DE TRANSPORTE dos',
    '#    arquivos contra corrupção física ou truncamento acidental de download.',
    '# 2. Hashes SHA-256 NÃO ATESTAM AUTORIA, NÃO COMPROVAM IDENTIDADE DO PUBLICADOR',
    '#    E NÃO SUBSTITUEM ASSINATURA DIGITAL (Authenticode / Apple Developer ID / PKI).',
    '# 3. Em ambientes institucionais (Tribunais, Prefeituras e Escritórios Jurídicos),',
    '#    valide OBRIGATORIAMENTE a assinatura digital embutida no binário executável:',
    '#      PowerShell: Get-AuthenticodeSignature .\\KovaxFiles-Setup-*.exe',
    '#      macOS:      codesign -dv --verbose=4 ./KovaxFiles-*.dmg',
    '# ==============================================================================',
    ''
  ];

  const bodyLines = entries.map(e => `${e.sha256}  ${e.file}`);
  const manifestContent = headerLines.join('\n') + bodyLines.join('\n') + '\n';

  const manifestPath = path.join(releaseDir, 'SHA256SUMS.txt');
  fs.writeFileSync(manifestPath, manifestContent, 'utf8');

  // Re-leitura e validação imediata do manifesto gerado
  const writtenContent = fs.readFileSync(manifestPath, 'utf8');
  for (const entry of entries) {
    if (!writtenContent.includes(`${entry.sha256}  ${entry.file}`)) {
      throw new Error(`[ERRO FATAL DE INTEGRIDADE] Manifesto gravado com divergência para ${entry.file}`);
    }
  }

  console.log('Manifesto SHA256SUMS.txt gerado e validado com sucesso:\n');
  console.log('| Plataforma | Arquivo | Tamanho | SHA-256 |');
  console.log('| :---: | :--- | :---: | :--- |');
  for (const e of entries) {
    const sizeMb = (e.size / (1024 * 1024)).toFixed(2) + ' MB';
    console.log(`| ${e.platform.toUpperCase()} | \`${e.file}\` | ${sizeMb} | \`${e.sha256.substring(0, 16)}...\` |`);
  }
  console.log('\nTotal de artefatos homologados no manifesto:', entries.length);

  return { manifestPath, entries };
}

// Execução direta via CLI se chamado como script
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/generate_release_manifest.ts')) {
  try {
    const args = process.argv.slice(2);
    let targetDir = 'release';
    const required: ('win' | 'mac' | 'linux')[] = [];

    for (const arg of args) {
      if (arg.startsWith('--dir=')) {
        targetDir = arg.split('=')[1];
      } else if (arg.startsWith('--require=')) {
        const plats = arg.split('=')[1].split(',') as ('win' | 'mac' | 'linux')[];
        required.push(...plats);
      }
    }

    // Se estiver em ambiente CI de release oficial sem argumentos específicos, analisa o SO
    if (required.length === 0 && process.env.CI) {
      if (process.platform === 'win32') required.push('win');
      else if (process.platform === 'darwin') required.push('mac');
      else if (process.platform === 'linux') required.push('linux');
    }

    generateReleaseManifest({
      dir: targetDir,
      requiredPlatforms: required,
      allowEmpty: false
    });
    console.log('\n[SUCESSO] Validação e geração do manifesto concluídas com êxito.');
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ [FALHA CRÍTICA NO MANIFESTO]: ${err.message}`);
    process.exit(1);
  }
}

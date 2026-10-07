import { purificarRespostaIARepetitiva } from '../src/services/respostaIA/sanitizer.js';

const rawUserPastedText = `
| **Item** | **Cláusula/Dispositivo** | **Descrição** | **Data/Prazo** | **Valor** | **Parte Responsável** | **Riscos/Observações** |
|-----------|---------------------------|----------------|----------------|----------|----------------------|---------------------------|
| 1         | 1001234-56.2024.5.02.0015 | Processo nº: 1001234-56.2024.5.02.0015 | 10/04/2024 | R$ 113.000,00 | Reclamada | - |
| 5         | 123.456.789-00, RG: 12.345.678-9, Residente na Rua das Flores, nº 123, Bairro Pinheiros, São Paulo/SP, CEP: 05401-000 | CPF e RG do Reclamante | - | - | Reclamada | - |
| 7         | 12.345.678-9, Residente na Rua das Flores, nº 123, Bairro Pinheiros, São Paulo/SP, CEP: 05401-000 | CPF do Reclamante | - | - | Reclamada | - |
| 11        | 123.456.789-00, RG: 12.345.678-9, Residente na Rua das Flores, nº 123, Bairro Pinheiros, São Paulo/SP, CEP: 05401-000 | CPF e RG do Reclamante | - | - | Reclamada | - |

**2.4. Aplicação da Indenização**
O empregado é adepto ao adicional de insalubridade em grau máximo (40%).

**2.5. Aplicação da Indenização**
O empregado foi adepto ao adicional de insalubridade em grau máximo (40%).

**2.6. Aplicação da Indenização**
**2.7. Aplicação da Indenização**
**2.8. Aplicação da Indenização**
**2.29. Aplicação da Indenização**
**2.30. Aplicação da Indenização**
O empregado foi adepto ao adicional de insalubridade
`;

console.log('--- TESTANDO SANITIZER ATUALIZADO ---');
const cleanOutput = purificarRespostaIARepetitiva(rawUserPastedText);
console.log(cleanOutput);

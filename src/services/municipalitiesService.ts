import { BRAZILIAN_MUNICIPALITIES_BY_UF, StateMunicipalities } from '../data/brazilianMunicipalitiesData';

export interface MunicipalityItem {
  name: string;
  uf: string;
  stateName: string;
}

export class MunicipalitiesService {
  /**
   * Obtém a lista de todos os municípios de uma determinada UF
   */
  static getMunicipalitiesByState(uf: string): string[] {
    const cleanUf = uf.toUpperCase().trim();
    const data = BRAZILIAN_MUNICIPALITIES_BY_UF[cleanUf];
    if (!data) return [];
    return data.cities;
  }

  /**
   * Obtém informações completas da UF
   */
  static getStateInfo(uf: string): StateMunicipalities | null {
    const cleanUf = uf.toUpperCase().trim();
    return BRAZILIAN_MUNICIPALITIES_BY_UF[cleanUf] || null;
  }

  /**
   * Pesquisa municípios por texto (opcionalmente filtrado por UF)
   */
  static searchMunicipalities(query: string, targetUf?: string, limit: number = 30): MunicipalityItem[] {
    const cleanQuery = query.toLowerCase().trim().replace(/[^\w\sáéíóúâêîôûãõç]/g, '');
    const results: MunicipalityItem[] = [];

    const ufsToSearch = targetUf && BRAZILIAN_MUNICIPALITIES_BY_UF[targetUf.toUpperCase()] 
      ? [targetUf.toUpperCase()] 
      : Object.keys(BRAZILIAN_MUNICIPALITIES_BY_UF);

    for (const uf of ufsToSearch) {
      const stateData = BRAZILIAN_MUNICIPALITIES_BY_UF[uf];
      if (!stateData) continue;

      for (const city of stateData.cities) {
        const cleanCity = city.toLowerCase();
        if (!cleanQuery || cleanCity.includes(cleanQuery)) {
          results.push({
            name: city,
            uf: stateData.uf,
            stateName: stateData.name
          });
          if (results.length >= limit) return results;
        }
      }
    }

    return results;
  }

  /**
   * Retorna todas as UFs registradas
   */
  static getAllUFs(): { uf: string; name: string }[] {
    return Object.values(BRAZILIAN_MUNICIPALITIES_BY_UF).map(s => ({
      uf: s.uf,
      name: s.name
    }));
  }
}

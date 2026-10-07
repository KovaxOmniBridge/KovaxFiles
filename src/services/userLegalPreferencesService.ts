import { LawType, StatuteStatus } from './legalKnowledgeBaseService';

export interface UserLegalPreferences {
  defaultLawType: 'ALL' | LawType;
  defaultStatusFilter: 'ALL' | StatuteStatus;
  savedMunicipality: string; // ex: "São Paulo", "Campinas", "Curitiba"
  savedStateUF: string;       // ex: "SP", "RJ", "MG", "PR"
  autoApplyOnStart: boolean;
}

const PREFERENCES_STORAGE_KEY = 'kovax_user_legal_preferences_v1';

const DEFAULT_PREFERENCES: UserLegalPreferences = {
  defaultLawType: 'ALL',
  defaultStatusFilter: 'ALL',
  savedMunicipality: '',
  savedStateUF: '',
  autoApplyOnStart: true
};

export class UserLegalPreferencesService {
  /**
   * Carrega as preferências salvas do usuário ou retorna o padrão
   */
  static getPreferences(): UserLegalPreferences {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return DEFAULT_PREFERENCES;
      }
      const data = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (!data) return DEFAULT_PREFERENCES;
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
    } catch (err) {
      console.error('[UserLegalPreferencesService] Erro ao carregar preferências:', err);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Salva as preferências de filtro e município do usuário
   */
  static savePreferences(prefs: Partial<UserLegalPreferences>): UserLegalPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('[UserLegalPreferencesService] Erro ao salvar preferências:', err);
    }
    return updated;
  }

  /**
   * Reseta as preferências do usuário para o padrão de fábrica
   */
  static resetPreferences(): UserLegalPreferences {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(PREFERENCES_STORAGE_KEY);
      }
    } catch {
      // Ignora erro
    }
    return DEFAULT_PREFERENCES;
  }
}

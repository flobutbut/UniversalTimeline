import axios from 'axios';
import type { Period } from '../types/geological';

const API_URL = '/api/database';

export class DatabaseQueryService {
  async loadPeriod(periodId: string): Promise<Period> {
    console.log(`[DatabaseQueryService] Chargement de la période depuis la base de données:`, periodId);
    try {
      const response = await axios.get(`${API_URL}/periods/${periodId}`);
      console.log(`[DatabaseQueryService] Réponse de la base de données:`, {
        id: response.data.id,
        label: response.data.label,
        childrenCount: response.data.children.length,
        children: response.data.children.map((child: Period) => ({
          id: child.id,
          label: child.label
        }))
      });
      return response.data;
    } catch (error) {
      console.error(`[DatabaseQueryService] Erreur lors du chargement de la période:`, error);
      throw error;
    }
  }

  async loadChildren(periodId: string): Promise<Period[]> {
    console.log(`[DatabaseQueryService] Chargement des enfants depuis la base de données:`, periodId);
    try {
      const response = await axios.get(`${API_URL}/periods/${periodId}/children`);
      console.log(`[DatabaseQueryService] Réponse des enfants:`, {
        parentId: periodId,
        childrenCount: response.data.length,
        children: response.data.map((child: Period) => ({
          id: child.id,
          label: child.label
        }))
      });
      return response.data;
    } catch (error) {
      console.error(`[DatabaseQueryService] Erreur lors du chargement des enfants:`, error);
      throw error;
    }
  }
} 
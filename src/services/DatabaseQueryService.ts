import axios from 'axios';
import type { Period, Event, Story } from '../types/database';

const API_BASE_URL = '/api';

export class DatabaseQueryService {
  private static instance: DatabaseQueryService;

  private constructor() {}

  public static getInstance(): DatabaseQueryService {
    if (!DatabaseQueryService.instance) {
      DatabaseQueryService.instance = new DatabaseQueryService();
    }
    return DatabaseQueryService.instance;
  }

  async loadPeriod(periodId: string): Promise<Period> {
    console.log(`[DatabaseQueryService] Chargement de la période depuis la base de données:`, periodId);
    try {
      const response = await axios.get(`${API_BASE_URL}/periods/${periodId}`);
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
      const response = await axios.get(`${API_BASE_URL}/periods/${periodId}/children`);
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

  public async getEventsByPeriod(periodId: string): Promise<Event[]> {
    try {
      console.log('Chargement des événements pour la période:', periodId);
      const response = await axios.get(`${API_BASE_URL}/periods/${periodId}/events`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      throw new Error('Erreur lors de la récupération des événements');
    }
  }

  public async getAllEvents(): Promise<Event[]> {
    try {
      console.log('[DatabaseQueryService] Chargement de tous les événements');
      const response = await axios.get(`${API_BASE_URL}/events`);
      return response.data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des événements:', error);
      throw new Error('Erreur lors de la récupération des événements');
    }
  }

  public async getAllPeriods(): Promise<Period[]> {
    try {
      console.log('[DatabaseQueryService] Chargement de toutes les périodes');
      const response = await axios.get(`${API_BASE_URL}/periods`);
      return response.data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des périodes:', error);
      throw new Error('Erreur lors de la récupération des périodes');
    }
  }

  public async getAllStories(): Promise<Story[]> {
    try {
      console.log('[DatabaseQueryService] Chargement de toutes les stories');
      const response = await axios.get(`${API_BASE_URL}/stories`);
      return response.data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des stories:', error);
      throw new Error('Erreur lors de la récupération des stories');
    }
  }
} 
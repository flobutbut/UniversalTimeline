import axios from 'axios';
import type {
  Period,
  Event,
  CreateStoryRequest,
  Category
} from '../types/database';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private readonly API_BASE_URL = '/api/database';

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async query(query: string, params: any[] = [], database: string = 'periods'): Promise<QueryResult> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/query`, {
        query,
        params,
        database
      });
      return {
        rows: response.data,
        rowCount: response.data.length
      };
    } catch (error) {
      console.error('Erreur lors de la requête à la base de données:', error);
      throw new Error('Erreur lors de la requête à la base de données');
    }
  }

  public async testConnection(config: DatabaseConfig): Promise<boolean> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/test-connection`, config);
      return response.data.success;
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      return false;
    }
  }

  // Méthodes pour la base des catégories
  async saveCategory(category: Category): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/categories`, category);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la catégorie:', error);
      throw new Error('Erreur lors de la sauvegarde de la catégorie');
    }
  }

  async getCategory(id: string): Promise<Category | null> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/categories/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Erreur lors de la récupération de la catégorie:', error);
      throw new Error('Erreur lors de la récupération de la catégorie');
    }
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/categories`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      throw new Error('Erreur lors de la récupération des catégories');
    }
  }

  // Méthodes pour la base des périodes
  async savePeriod(period: Period): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/periods`, period);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la période:', error);
      throw new Error('Erreur lors de la sauvegarde de la période');
    }
  }

  // Méthodes pour la base des événements
  async saveEvent(event: Event): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/events`, event);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'événement:', error);
      throw new Error('Erreur lors de la sauvegarde de l\'événement');
    }
  }

  // Méthodes pour la base des stories
  async saveStory(story: CreateStoryRequest): Promise<number> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/stories`, story);
      return response.data.id;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la story:', error);
      throw new Error('Erreur lors de la sauvegarde de la story');
    }
  }

  async addPeriodToStory(storyId: number, periodId: string): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/stories/${storyId}/periods/${periodId}`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la période à la story:', error);
      throw new Error('Erreur lors de l\'ajout de la période à la story');
    }
  }

  async addEventToStory(storyId: number, eventId: string): Promise<void> {
    try {
      await axios.post(`${this.API_BASE_URL}/stories/${storyId}/events/${eventId}`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'événement à la story:', error);
      throw new Error('Erreur lors de l\'ajout de l\'événement à la story');
    }
  }
} 
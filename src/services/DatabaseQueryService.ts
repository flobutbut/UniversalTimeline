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
      console.log('[DatabaseQueryService] Récupération des événements...');
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      console.log('[DatabaseQueryService] Réponse brute de l\'API:', data);
      console.log('[DatabaseQueryService] Nombre d\'événements reçus:', data.length);
      
      // Formater les données selon le type Event
      const formattedEvents = data.map((event: any) => ({
        id: event.id,
        label: {
          fr: event.label,
          en: event.label_en || event.label
        },
        date: event.date,
        description: event.description ? {
          fr: event.description,
          en: event.description_en || event.description
        } : undefined,
        categories: event.category ? [{
          id: event.category,
          label: {
            fr: event.category,
            en: event.category
          }
        }] : [],
        createdAt: new Date(event.created_at || Date.now()),
        updatedAt: new Date(event.updated_at || Date.now())
      }));
      
      if (formattedEvents.length > 0) {
        console.log('[DatabaseQueryService] Premier événement formaté:', JSON.stringify(formattedEvents[0], null, 2));
      }
      return formattedEvents;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des événements:', error);
      throw error;
    }
  }

  public async getAllPeriods(): Promise<Period[]> {
    try {
      console.log('[DatabaseQueryService] Récupération des périodes...');
      const response = await fetch('/api/periods');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      console.log('[DatabaseQueryService] Réponse brute de l\'API pour les périodes:', data);
      
      // Formater les données selon le type Period
      const formattedPeriods = data.map((period: any) => ({
        id: period.id,
        label: {
          fr: period.label_fr,
          en: period.label_en || period.label_fr
        },
        description: period.description_fr ? {
          fr: period.description_fr,
          en: period.description_en || period.description_fr
        } : undefined,
        startDate: period.start_date,
        endDate: period.end_date,
        parentId: period.parent_id,
        temporalLocation: period.temporal_location,
        categories: period.category_label ? [{
          id: period.category_id,
          label: {
            fr: period.category_label,
            en: period.category_label
          }
        }] : [],
        children: [],
        createdAt: new Date(period.created_at || Date.now()),
        updatedAt: new Date(period.updated_at || Date.now())
      }));
      
      return formattedPeriods;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des périodes:', error);
      throw error;
    }
  }

  public async getAllStories(): Promise<Story[]> {
    try {
      console.log('[DatabaseQueryService] Récupération des stories...');
      const response = await fetch('/api/stories');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      console.log('[DatabaseQueryService] Réponse brute de l\'API pour les stories:', data);
      
      // Formater les données selon le type Story
      const formattedStories = data.map((story: any) => ({
        id: story.id,
        title: {
          fr: story.title_fr,
          en: story.title_en || story.title_fr
        },
        description: story.description_fr ? {
          fr: story.description_fr,
          en: story.description_en || story.description_fr
        } : undefined,
        author: story.author,
        isPublic: story.is_public,
        categories: story.categories || [],
        periods: story.periods || [],
        events: story.events || [],
        createdAt: new Date(story.created_at || Date.now()),
        updatedAt: new Date(story.updated_at || Date.now())
      }));
      
      return formattedStories;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des stories:', error);
      throw error;
    }
  }
} 
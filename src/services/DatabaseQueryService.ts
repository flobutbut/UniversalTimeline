import axios from 'axios';
import type { Period, Event, Story, ListPeriod, ListEvent, ListStory } from '../types/database';

const API_BASE_URL = '/api';

interface Category {
  id: string;
  label: string;
}

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
        wikidata_id: event.wikidata_id,
        label: {
          fr: event.label.fr || event.label_fr || event.label,
          en: event.label.en || event.label_en || event.label_fr || event.label
        },
        date: event.date,
        description: event.description ? {
          fr: event.description.fr || event.description_fr || event.description,
          en: event.description.en || event.description_en || event.description_fr || event.description
        } : undefined,
        categories: event.categories || event.category ? [{
          id: event.category?.id || event.category_id,
          label: {
            fr: event.category?.label?.fr || event.category_label || event.category,
            en: event.category?.label?.en || event.category_label || event.category
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
        wikidata_id: period.wikidata_id,
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

  // Création d'une période
  public async createPeriod(data: any): Promise<any> {
    try {
      const payload = {
        id: data.qid,
        wikidata_id: data.qid,
        label: { fr: data.title.fr, en: data.title.en },
        description: { fr: data.description.fr, en: data.description.en },
        start_date: data.startDate,
        end_date: data.endDate,
        parent_id: data.parentId,
        temporal_location: data.temporalLocation,
      };
      const response = await axios.post(`${API_BASE_URL}/periods`, payload);
      window.showToast('Période créée avec succès', 'success');
      return response.data;
    } catch (error: any) {
      if (error?.response?.data?.code === '23505' || (error?.response?.data?.message && error.response.data.message.includes('duplicate'))) {
        window.showToast('Une période avec ce Q-id existe déjà dans la base.', 'error');
      } else {
        window.showToast('Erreur lors de la création de la période', 'error');
      }
      throw error;
    }
  }

  // Mise à jour d'une période
  public async updatePeriod(id: string, data: any): Promise<any> {
    try {
      console.log('[DatabaseQueryService] Mise à jour de la période:', { id, data });
      const payload = {
        wikidata_id: data.qid,
        label: { fr: data.title.fr, en: data.title.en },
        description: { fr: data.description.fr, en: data.description.en },
        start_date: data.startDate,
        end_date: data.endDate,
        parent_id: data.parentId,
        temporal_location: data.temporalLocation,
        categories: data.categories
      };
      console.log('[DatabaseQueryService] Payload de mise à jour:', payload);
      const response = await axios.put(`${API_BASE_URL}/periods/${id}`, payload);
      window.showToast('Période mise à jour avec succès', 'success');
      return response.data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la mise à jour de la période:', error);
      window.showToast('Erreur lors de la mise à jour de la période', 'error');
      throw error;
    }
  }

  // Création d'un événement
  public async createEvent(data: any): Promise<any> {
    try {
      const payload = {
        id: data.qid,
        wikidata_id: data.qid,
        label: { fr: data.title.fr, en: data.title.en },
        description: { fr: data.description.fr, en: data.description.en },
        date: data.date,
      };
      const response = await axios.post(`${API_BASE_URL}/events`, payload);
      window.showToast('Événement créé avec succès', 'success');
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 409 || 
          error?.response?.data?.code === '23505' || 
          (error?.response?.data?.message && error.response.data.message.includes('duplicate'))) {
        window.showToast('Un événement avec ce Q-id existe déjà dans la base.', 'error');
      } else {
        window.showToast('Erreur lors de la création de l\'événement', 'error');
      }
      throw error;
    }
  }

  // Méthodes pour le chargement des données complètes
  public async getPeriod(periodId: string): Promise<Period> {
    try {
      console.log('[DatabaseQueryService] Récupération de la période:', periodId);
      const response = await fetch(`/api/periods/${periodId}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération de la période:', error);
      throw error;
    }
  }

  public async getEvent(eventId: string): Promise<Event> {
    try {
      console.log('[DatabaseQueryService] Récupération de l\'événement:', eventId);
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération de l\'événement:', error);
      throw error;
    }
  }

  public async getStory(storyId: number): Promise<Story> {
    try {
      console.log('[DatabaseQueryService] Récupération de la story:', storyId);
      const response = await fetch(`/api/stories/${storyId}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération de la story:', error);
      throw error;
    }
  }

  // Mise à jour d'un événement
  public async updateEvent(id: string, data: any): Promise<any> {
    try {
      console.log('[DatabaseQueryService] Mise à jour de l\'événement:', { id, data });
      const payload = {
        wikidata_id: data.qid,
        label: { fr: data.title.fr, en: data.title.en },
        description: { fr: data.description.fr, en: data.description.en },
        date: data.date,
        categories: data.categories
      };
      console.log('[DatabaseQueryService] Payload de mise à jour:', payload);
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const responseData = await response.json();
      window.showToast('Événement mis à jour avec succès', 'success');
      return responseData;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la mise à jour de l\'événement:', error);
      window.showToast('Erreur lors de la mise à jour de l\'événement', 'error');
      throw error;
    }
  }

  // Vérifier si un événement existe par son Q-id
  public async getEventById(qid: string): Promise<Event> {
    try {
      console.log(`[DatabaseQueryService] Vérification de l'existence de l'événement:`, qid);
      
      // Validation du format du Q-id
      if (!qid.match(/^Q\d+$/)) {
        throw new Error('Format de Q-id invalide');
      }

      // Récupérer tous les événements et filtrer par wikidata_id
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const events = await response.json();
      const existingEvent = events.find((event: any) => event.wikidata_id === qid || event.id === qid);

      if (!existingEvent) {
        throw new Error('Événement non trouvé');
      }

      console.log(`[DatabaseQueryService] Événement trouvé:`, existingEvent);
      return existingEvent;
    } catch (error: any) {
      // Ne log que les erreurs non-404
      if (error.message !== 'Événement non trouvé') {
        console.error(`[DatabaseQueryService] Erreur lors de la vérification de l'événement:`, {
          qid,
          message: error.message
        });
      }

      if (error.message === 'Format de Q-id invalide') {
        throw error;
      } else if (error.message === 'Événement non trouvé') {
        throw error;
      } else {
        throw new Error(`Erreur lors de la vérification de l'événement: ${error.message}`);
      }
    }
  }

  // Méthodes pour le chargement des données de liste
  public async getListPeriods(): Promise<ListPeriod[]> {
    try {
      console.log('[DatabaseQueryService] Récupération des périodes...');
      const response = await fetch('/api/periods');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      console.log('[DatabaseQueryService] Réponse brute de l\'API pour les périodes:', data);
      // Formater les données selon le type ListPeriod
      const formattedPeriods = data.map((period: any) => ({
        id: period.id,
        wikidata_id: period.wikidata_id || '',
        label: {
          fr: period.label_fr,
          en: period.label_en || period.label_fr
        },
        description: period.description_fr ? { fr: period.description_fr, en: period.description_en || period.description_fr } : { fr: '', en: '' },
        startDate: period.start_date,
        endDate: period.end_date,
        categories: period.category_label ? [{
          id: period.category_id,
          label: {
            fr: period.category_label,
            en: period.category_label
          }
        }] : [],
        createdAt: period.created_at ? new Date(period.created_at) : new Date(),
        updatedAt: period.updated_at ? new Date(period.updated_at) : new Date(),
        children: []
      }));
      return formattedPeriods;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des périodes:', error);
      throw error;
    }
  }

  public async getListEvents(): Promise<ListEvent[]> {
    try {
      console.log('[DatabaseQueryService] Récupération des événements...');
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      console.log('[DatabaseQueryService] Réponse brute de l\'API:', data);
      // Formater les données selon le type ListEvent
      const formattedEvents = data.map((event: any) => ({
        id: event.id,
        wikidata_id: event.wikidata_id || '',
        label: {
          fr: event.label.fr || event.label_fr || event.label,
          en: event.label.en || event.label_en || event.label_fr || event.label
        },
        date: event.date,
        description: event.description || { fr: event.description_fr || '', en: event.description_en || event.description_fr || '' },
        categories: event.categories || event.category ? [{
          id: event.category?.id || event.category_id,
          label: {
            fr: event.category?.label?.fr || event.category_label || event.category,
            en: event.category?.label?.en || event.category_label || event.category
          }
        }] : []
      }));
      return formattedEvents;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des événements:', error);
      throw error;
    }
  }

  public async getListStories(): Promise<ListStory[]> {
    try {
      console.log('[DatabaseQueryService] Récupération des stories...');
      const response = await fetch('/api/stories');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      console.log('[DatabaseQueryService] Réponse brute de l\'API pour les stories:', data);
      
      // Formater les données selon le type ListStory
      const formattedStories = data.map((story: any) => ({
        id: story.id,
        title: {
          fr: story.title_fr,
          en: story.title_en || story.title_fr
        },
        categories: story.categories || []
      }));
      
      return formattedStories;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des stories:', error);
      throw error;
    }
  }

  // Suppression d'un événement par son id
  public async deleteEvent(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        // Si 404, on considère comme déjà supprimé
        if (response.status === 404) {
          console.warn(`[DatabaseQueryService] L'événement ${id} était déjà supprimé.`);
          return;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      window.showToast('Événement supprimé avec succès', 'success');
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la suppression de l\'événement:', error);
      window.showToast('Erreur lors de la suppression de l\'événement', 'error');
      throw error;
    }
  }
} 
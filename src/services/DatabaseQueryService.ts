import axios from 'axios';
import type { Period, Event, Story, ListPeriod, ListEvent, ListStory, MultilingualText } from '../types/database';
import { generateUUID } from '../utils/uuid';

const API_BASE_URL = '/api';

interface Category {
  id: string;
  label: MultilingualText;
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
    try {
      const response = await axios.get(`${API_BASE_URL}/periods/${periodId}`);
      return response.data;
    } catch (error) {
      console.error(`[DatabaseQueryService] Erreur lors du chargement de la période:`, error);
      throw error;
    }
  }

  async loadChildren(periodId: string): Promise<Period[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/periods/${periodId}/children`);
      return response.data;
    } catch (error) {
      console.error(`[DatabaseQueryService] Erreur lors du chargement des enfants:`, error);
      throw error;
    }
  }

  public async getEventsByPeriod(periodId: string): Promise<Event[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/periods/${periodId}/events`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      throw new Error('Erreur lors de la récupération des événements');
    }
  }

  public async getAllEvents(): Promise<Event[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/events`);
      
      // Formater les données selon le type Event
      const formattedEvents = response.data.map((event: any) => ({
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
      
      return formattedEvents;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des événements:', error);
      throw error;
    }
  }

  public async getAllPeriods(): Promise<Period[]> {
    try {
      const response = await fetch('/api/periods');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      
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
        hasParent: period.has_parent,
        children: period.children || [],
        temporalLocation: period.temporal_location,
        categories: period.category_label ? [{
          id: period.category_id,
          label: {
            fr: period.category_label,
            en: period.category_label
          }
        }] : [],
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
      const response = await fetch('/api/stories');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      
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
      console.log('[DatabaseQueryService] Données reçues pour la création:', JSON.stringify(data, null, 2));
      
      // Validation des champs obligatoires
      if (!data.title?.fr) {
        throw new Error('Le titre en français est obligatoire');
      }
      if (!data.startDate) {
        throw new Error('La date de début est obligatoire');
      }
      if (!data.endDate) {
        throw new Error('La date de fin est obligatoire');
      }

      // Vérifier si la période existe déjà
      if (data.qid) {
        try {
          const existingPeriod = await this.getPeriodByWikidataId(data.qid);
          if (existingPeriod) {
            console.log('[DatabaseQueryService] Période existante trouvée:', existingPeriod);
            // Retourner la période existante pour permettre son déplacement
            return existingPeriod;
          }
        } catch (error: any) {
          if (error.message.includes('existe déjà')) {
            throw error;
          }
          // Si l'erreur n'est pas liée à l'existence de la période, on continue
          console.log('[DatabaseQueryService] Erreur lors de la vérification de l\'existence de la période:', error);
        }
      }

      const payload = {
        id: generateUUID(),
        wikidata_id: data.qid || null,
        label: {
          fr: data.title.fr,
          en: data.title.en || data.title.fr
        },
        description: {
          fr: data.description?.fr || null,
          en: data.description?.en || data.description?.fr || null
        },
        start_date: data.startDate,
        end_date: data.endDate,
        children: [],
        temporal_location: data.temporalLocation || null
      };

      console.log('[DatabaseQueryService] Payload de création:', JSON.stringify(payload, null, 2));
      console.log('[DatabaseQueryService] URL de la requête:', `${API_BASE_URL}/periods`);
      
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      console.log('[DatabaseQueryService] Configuration de la requête:', config);
      
      const response = await axios.post(`${API_BASE_URL}/periods`, payload, config);
      console.log('[DatabaseQueryService] Réponse du serveur:', response.data);
      
      window.showToast('Période créée avec succès', 'success');
      return response.data;
    } catch (error: any) {
      console.error('[DatabaseQueryService] Erreur lors de la création:', error);
      if (error.response) {
        console.error('[DatabaseQueryService] Détails de l\'erreur:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
          request: {
            method: error.config?.method,
            url: error.config?.url,
            data: error.config?.data,
            headers: error.config?.headers
          }
        });
        // Afficher le message d'erreur du serveur s'il existe
        if (error.response.data?.message) {
          window.showToast(error.response.data.message, 'error');
        } else {
          window.showToast('Erreur lors de la création de la période', 'error');
        }
      } else {
        window.showToast(error.message || 'Erreur lors de la création de la période', 'error');
      }
      throw error;
    }
  }

  // Mise à jour d'une période
  public async updatePeriod(periodId: string, data: any): Promise<Period> {
    try {
      // Formatage des données pour correspondre à l'API
      const payload = {
        wikidata_id: data.qid,
        label: {
          fr: data.title.fr,
          en: data.title.en
        },
        description: {
          fr: data.description.fr,
          en: data.description.en
        },
        start_date: data.startDate,
        end_date: data.endDate,
        children: data.children || [],
        temporal_location: data.location,
        categories: data.categories
      };

      console.log('[DatabaseQueryService] Payload envoyé au serveur:', payload);
      const response = await axios.put(`${API_BASE_URL}/periods/${periodId}`, payload);
      console.log('[DatabaseQueryService] Réponse du serveur:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error(`[DatabaseQueryService] Erreur lors de la mise à jour de la période:`, error);
      if (error.response) {
        console.error('[DatabaseQueryService] Détails de l\'erreur:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      throw error;
    }
  }

  async updatePeriodRelations(oldId: string, newId: string): Promise<void> {
    try {
      // Récupérer l'UUID de la période à partir de son ID Wikidata
      const oldPeriod = await this.getPeriodByWikidataId(oldId);
      const newPeriod = await this.getPeriodByWikidataId(newId);

      if (!oldPeriod || !newPeriod) {
        throw new Error('Période non trouvée');
      }

      // Mettre à jour has_parent
      await this.updateHasParent(oldPeriod.id, true);
      
      // Mettre à jour les enfants
      const children = oldPeriod.children || [];
      await this.updateChildren(newPeriod.id, children);
    } catch (error: any) {
      console.error(`[DatabaseQueryService] Erreur lors de la mise à jour des relations:`, error);
      throw error;
    }
  }

  /**
   * Récupère une période par son ID Wikidata
   */
  public async getPeriodByWikidataId(wikidataId: string): Promise<Period | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/periods/wikidata/${wikidataId}`);
      return response.data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération de la période par ID Wikidata:', error);
      throw error;
    }
  }

  // Création d'un événement
  public async createEvent(data: any): Promise<any> {
    try {
      const payload = {
        id: generateUUID(),
        wikidata_id: data.qid,
        label: { fr: data.title, en: data.title },
        description: { fr: data.description, en: data.description },
        date: data.date,
      };
      const response = await axios.post(`${API_BASE_URL}/events`, payload);
      window.showToast('Événement créé avec succès', 'success');
      return response.data;
    } catch (error: any) {
      if (error?.response?.data?.code === '23505' || (error?.response?.data?.message && error.response.data.message.includes('duplicate'))) {
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

  public async getStory(storyId: string): Promise<Story> {
    try {
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
      const payload = {
        wikidata_id: data.qid,
        label: { fr: data.title.fr, en: data.title.en },
        description: { fr: data.description.fr, en: data.description.en },
        date: data.date,
        categories: data.categories
      };
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

      return existingEvent;
    } catch (error: any) {
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
      const response = await fetch('/api/periods');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
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
        hasParent: period.has_parent || false,
        children: period.children || [],
        categories: period.category_label ? [{
          id: period.category_id,
          label: {
            fr: period.category_label,
            en: period.category_label
          }
        }] : [],
        createdAt: period.created_at ? new Date(period.created_at) : new Date(),
        updatedAt: period.updated_at ? new Date(period.updated_at) : new Date()
      }));
      return formattedPeriods;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des périodes:', error);
      throw error;
    }
  }

  public async getListEvents(): Promise<ListEvent[]> {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
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
      const response = await fetch('/api/stories');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      
      // Formater les données selon le type ListStory
      const formattedStories = data.map((story: any) => ({
        id: story.id,
        title: {
          fr: story.title_fr,
          en: story.title_en || story.title_fr
        },
        categories: story.categories || [],
        createdAt: new Date(story.created_at || Date.now()),
        updatedAt: new Date(story.updated_at || Date.now())
      }));
      
      return formattedStories;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des stories:', error);
      throw error;
    }
  }

  public async createStory(storyData: any): Promise<Story> {
    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la création de la story:', error);
      throw error;
    }
  }

  public async updateStory(storyId: string, storyData: any): Promise<Story> {
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la mise à jour de la story:', error);
      throw error;
    }
  }

  // Méthodes pour gérer les relations stories-périodes
  public async addPeriodToStory(storyId: number, periodId: string): Promise<void> {
    try {
      const response = await fetch(`/api/stories/${storyId}/periods/${periodId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de l\'ajout de la période à la story:', error);
      throw error;
    }
  }

  public async removePeriodFromStory(storyId: number, periodId: string): Promise<void> {
    try {
      const response = await fetch(`/api/stories/${storyId}/periods/${periodId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la suppression de la période de la story:', error);
      throw error;
    }
  }

  public async getStoryPeriods(storyId: number): Promise<Period[]> {
    try {
      const response = await fetch(`/api/stories/${storyId}/periods`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des périodes de la story:', error);
      throw error;
    }
  }

  // Méthodes pour gérer les relations stories-événements
  public async addEventToStory(storyId: number, eventId: string): Promise<void> {
    try {
      const response = await fetch(`/api/stories/${storyId}/events/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de l\'ajout de l\'événement à la story:', error);
      throw error;
    }
  }

  public async removeEventFromStory(storyId: number, eventId: string): Promise<void> {
    try {
      const response = await fetch(`/api/stories/${storyId}/events/${eventId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la suppression de l\'événement de la story:', error);
      throw error;
    }
  }

  public async getStoryEvents(storyId: string): Promise<Event[]> {
    try {
      const response = await fetch(`/api/stories/${storyId}/events`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la récupération des événements de la story:', error);
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

  /**
   * Met à jour les enfants d'une période
   */
  public async updateChildren(periodId: string, newChildren: string[]): Promise<any> {
    try {
      const payload = { children: newChildren };
      const response = await axios.patch(`${API_BASE_URL}/periods/${periodId}/children`, payload);
      return response.data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la mise à jour des enfants:', error);
      throw error;
    }
  }

  /**
   * Met à jour has_parent d'une période
   */
  public async updateHasParent(periodId: string, hasParent: boolean): Promise<any> {
    try {
      const payload = { has_parent: hasParent };
      const response = await axios.patch(`${API_BASE_URL}/periods/${periodId}/has_parent`, payload);
      return response.data;
    } catch (error) {
      console.error('[DatabaseQueryService] Erreur lors de la mise à jour de has_parent:', error);
      throw error;
    }
  }

  // Supprimer une période
  public async deletePeriod(periodId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/periods/${periodId}`);
      window.showToast('Période supprimée avec succès', 'success');
    } catch (error: any) {
      window.showToast('Erreur lors de la suppression de la période', 'error');
      throw error;
    }
  }
} 
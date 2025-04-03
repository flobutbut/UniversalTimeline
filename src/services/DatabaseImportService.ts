import axios from 'axios'
import type { SearchResult } from './WikidataSearchService'

export class DatabaseImportService {
  private static instance: DatabaseImportService
  private readonly API_BASE_URL = '/api/database'

  private constructor() {}

  public static getInstance(): DatabaseImportService {
    if (!DatabaseImportService.instance) {
      DatabaseImportService.instance = new DatabaseImportService()
    }
    return DatabaseImportService.instance
  }

  public async importItem(item: SearchResult): Promise<boolean> {
    try {
      if (item.type === 'period') {
        return await this.importPeriod(item)
      } else {
        return await this.importEvent(item)
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      throw new Error('Erreur lors de l\'import dans la base de données')
    }
  }

  private async importPeriod(item: SearchResult): Promise<boolean> {
    try {
      // Vérifier si la période existe déjà
      const existingResult = await axios.post(`${this.API_BASE_URL}/query`, {
        query: 'SELECT id FROM periods WHERE wikidata_id = $1',
        params: [item.id],
        database: 'periods'
      })

      if (existingResult.data.length > 0) {
        console.log('Période déjà existante:', item.label)
        return false
      }

      // Insérer la nouvelle période
      await axios.post(`${this.API_BASE_URL}/periods`, {
        id: item.id,
        label: { fr: item.label, en: item.label },
        description: item.description ? { fr: item.description, en: item.description } : undefined,
        startDate: this.parseDate(item.date),
        endDate: this.parseDate(item.date),
        categories: []
      })

      console.log('Période importée avec succès:', item.label)
      return true
    } catch (error) {
      console.error('Erreur lors de l\'import de la période:', error)
      throw error
    }
  }

  private async importEvent(item: SearchResult): Promise<boolean> {
    try {
      // Vérifier si l'événement existe déjà
      const existingResult = await axios.post(`${this.API_BASE_URL}/query`, {
        query: 'SELECT id FROM events WHERE wikidata_id = $1',
        params: [item.id],
        database: 'events'
      })

      if (existingResult.data.length > 0) {
        console.log('Événement déjà existant:', item.label)
        return false
      }

      // Insérer le nouvel événement
      await axios.post(`${this.API_BASE_URL}/events`, {
        id: item.id,
        label: { fr: item.label, en: item.label },
        description: item.description ? { fr: item.description, en: item.description } : undefined,
        date: this.parseDate(item.date),
        categories: []
      })

      console.log('Événement importé avec succès:', item.label)
      return true
    } catch (error) {
      console.error('Erreur lors de l\'import de l\'événement:', error)
      throw error
    }
  }

  private parseDate(dateString: string): Date | null {
    // TODO: Implémenter le parsing des dates selon le format Wikidata
    // Pour le moment, on retourne null
    return null
  }
} 
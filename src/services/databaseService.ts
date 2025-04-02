import { Pool } from 'pg';
import type {
  Period,
  Event,
  CreateStoryRequest,
  Category
} from '../types/database';

export class DatabaseService {
  private periodsPool: Pool;
  private eventsPool: Pool;
  private storiesPool: Pool;
  private categoriesPool: Pool;

  constructor() {
    // Connexion à la base des périodes
    this.periodsPool = new Pool({
      user: 'periods_user',
      host: 'localhost',
      database: 'periods_db',
      password: 'periods_password',
      port: 5432,
    });

    // Connexion à la base des événements
    this.eventsPool = new Pool({
      user: 'events_user',
      host: 'localhost',
      database: 'events_db',
      password: 'events_password',
      port: 5433,
    });

    // Connexion à la base des stories
    this.storiesPool = new Pool({
      user: 'stories_user',
      host: 'localhost',
      database: 'stories_db',
      password: 'stories_password',
      port: 5434,
    });

    // Connexion à la base des catégories
    this.categoriesPool = new Pool({
      user: 'categories_user',
      host: 'localhost',
      database: 'categories_db',
      password: 'categories_password',
      port: 5435,
    });
  }

  // Méthodes pour la base des catégories
  async saveCategory(category: Category): Promise<void> {
    const query = `
      INSERT INTO categories (
        id, label_fr, label_en, description_fr, description_en,
        parent_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        label_fr = EXCLUDED.label_fr,
        label_en = EXCLUDED.label_en,
        description_fr = EXCLUDED.description_fr,
        description_en = EXCLUDED.description_en,
        parent_id = EXCLUDED.parent_id,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      category.id,
      category.label.fr,
      category.label.en,
      category.description?.fr || null,
      category.description?.en || null,
      category.parentId || null
    ];

    await this.categoriesPool.query(query, values);
  }

  async getCategory(id: string): Promise<Category | null> {
    const query = `
      SELECT * FROM categories WHERE id = $1
    `;

    const result = await this.categoriesPool.query(query, [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en },
      description: row.description_fr || row.description_en ? {
        fr: row.description_fr,
        en: row.description_en
      } : undefined,
      parentId: row.parent_id
    };
  }

  async getAllCategories(): Promise<Category[]> {
    const query = `
      SELECT * FROM categories ORDER BY label_fr
    `;

    const result = await this.categoriesPool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      label: { fr: row.label_fr, en: row.label_en },
      description: row.description_fr || row.description_en ? {
        fr: row.description_fr,
        en: row.description_en
      } : undefined,
      parentId: row.parent_id
    }));
  }

  // Méthodes pour la base des périodes
  async savePeriod(period: Period): Promise<void> {
    const query = `
      INSERT INTO periods (
        id, label_fr, label_en, description_fr, description_en,
        start_date, end_date, parent_id, temporal_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        label_fr = EXCLUDED.label_fr,
        label_en = EXCLUDED.label_en,
        description_fr = EXCLUDED.description_fr,
        description_en = EXCLUDED.description_en,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        parent_id = EXCLUDED.parent_id,
        temporal_location = EXCLUDED.temporal_location,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      period.id,
      period.label.fr,
      period.label.en,
      period.description?.fr || null,
      period.description?.en || null,
      period.startDate,
      period.endDate,
      period.parentId,
      period.temporalLocation
    ];

    await this.periodsPool.query(query, values);

    // Sauvegarde des catégories
    if (period.categories.length > 0) {
      const categoryQuery = `
        INSERT INTO period_categories (period_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `;

      for (const category of period.categories) {
        await this.categoriesPool.query(categoryQuery, [period.id, category.id]);
      }
    }
  }

  // Méthodes pour la base des événements
  async saveEvent(event: Event): Promise<void> {
    const query = `
      INSERT INTO events (
        id, label_fr, label_en, description_fr, description_en,
        date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        label_fr = EXCLUDED.label_fr,
        label_en = EXCLUDED.label_en,
        description_fr = EXCLUDED.description_fr,
        description_en = EXCLUDED.description_en,
        date = EXCLUDED.date,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      event.id,
      event.label.fr,
      event.label.en,
      event.description?.fr || null,
      event.description?.en || null,
      event.date
    ];

    await this.eventsPool.query(query, values);

    // Sauvegarde des catégories
    if (event.categories.length > 0) {
      const categoryQuery = `
        INSERT INTO event_categories (event_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `;

      for (const category of event.categories) {
        await this.categoriesPool.query(categoryQuery, [event.id, category.id]);
      }
    }
  }

  // Méthodes pour la base des stories
  async saveStory(story: CreateStoryRequest): Promise<number> {
    const query = `
      INSERT INTO stories (
        title_fr, title_en, description_fr, description_en,
        author, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      story.title.fr,
      story.title.en,
      story.description?.fr || null,
      story.description?.en || null,
      story.author,
      story.isPublic || false
    ];

    const result = await this.storiesPool.query(query, values);
    const storyId = result.rows[0].id;

    // Sauvegarde des catégories
    if (story.categories.length > 0) {
      const categoryQuery = `
        INSERT INTO story_categories (story_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `;

      for (const category of story.categories) {
        await this.categoriesPool.query(categoryQuery, [storyId, category.id]);
      }
    }

    return storyId;
  }

  async addPeriodToStory(storyId: number, periodId: string): Promise<void> {
    const query = `
      INSERT INTO story_periods (story_id, period_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;

    await this.storiesPool.query(query, [storyId, periodId]);
  }

  async addEventToStory(storyId: number, eventId: string): Promise<void> {
    const query = `
      INSERT INTO story_events (story_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;

    await this.storiesPool.query(query, [storyId, eventId]);
  }

  // Méthode pour fermer toutes les connexions
  async close(): Promise<void> {
    await Promise.all([
      this.periodsPool.end(),
      this.eventsPool.end(),
      this.storiesPool.end(),
      this.categoriesPool.end()
    ]);
  }
} 
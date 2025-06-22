export interface Category {
  id: string;
  label: string;
  description?: string;
}

export class CategoryService {
  private static instance: CategoryService;
  private categories: Category[] = [];
  private loading = false;

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  // Récupérer toutes les catégories
  public async getCategories(): Promise<Category[]> {
    if (this.categories.length > 0) {
      return this.categories;
    }

    if (this.loading) {
      // Attendre que le chargement soit terminé
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.categories;
    }

    try {
      this.loading = true;
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      this.categories = data.map((cat: any) => ({
        id: cat.id,
        label: cat.label_fr || cat.label,
        description: cat.description_fr || cat.description
      }));
      
      return this.categories;
    } catch (error) {
      console.error('[CategoryService] Erreur lors de la récupération des catégories:', error);
      // Retourner les catégories par défaut en cas d'erreur
      return this.getDefaultCategories();
    } finally {
      this.loading = false;
    }
  }

  // Catégories par défaut si l'API n'est pas disponible
  private getDefaultCategories(): Category[] {
    return [
      { id: '1', label: 'Cosmologie' },
      { id: '2', label: 'Astrophysique' },
      { id: '3', label: 'Physique Théorique' },
      { id: '4', label: 'Biologie Évolutive' },
      { id: '5', label: 'Paléontologie' },
      { id: '6', label: 'Physique des Particules' },
      { id: '7', label: 'Géologie' },
      { id: '8', label: 'Chimie' },
      { id: '9', label: 'Botanique' },
      { id: '10', label: 'Histoire et Civilisations' },
      { id: '11', label: 'Anthropologie et Archéologie' },
      { id: '12', label: 'Technologie et Innovations' },
      { id: '13', label: 'Religion et Philosophie' },
      { id: '14', label: 'Art et Culture' },
      { id: '15', label: 'Économie' },
      { id: '16', label: 'Océanographie' },
      { id: '17', label: 'Microbiologie' },
      { id: '18', label: 'Écologie' }
    ];
  }

  // Vider le cache des catégories
  public clearCache(): void {
    this.categories = [];
  }
} 
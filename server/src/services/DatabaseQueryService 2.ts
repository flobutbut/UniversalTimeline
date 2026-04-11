async getRootPeriods(): Promise<Period[]> {
  const query = `
    SELECT 
      p.id,
      p.label_fr,
      p.label_en,
      p.description_fr,
      p.description_en,
      p.start_date,
      p.end_date,
      p.has_parent,
      p.children,
      p.wikidata_id,
      p.wikidata_url,
      p.image_url,
      p.color,
      p.created_at,
      p.updated_at
    FROM periods.periods p
    WHERE p.has_parent = false
    ORDER BY p.start_date ASC
  `;
  const result = await this.pool.query(query);
  return result.rows;
} 
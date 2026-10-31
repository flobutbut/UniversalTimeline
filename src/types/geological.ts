/** Public Wikidata period summaries; application entities live in database.ts. */
export interface TemporalLocation {
  startDate?: string;
  endDate?: string;
  location: string;
}

export interface Period {
  id: string;
  label: { fr: string; en: string };
  description: { fr: string; en: string };
  temporalData: TemporalLocation[];
  hasChildren: boolean;
  children: Period[];
  childrenPreloaded: boolean;
}

export interface WikidataValue {
  value: string;
  type?: string;
  datatype?: string;
  'xml:lang'?: string;
}
export interface WikidataBinding {
  [variable: string]: WikidataValue | undefined;
}

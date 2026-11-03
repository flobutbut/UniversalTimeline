import { readEntityCategories } from './entityCategories.js';
import { query, withTransaction } from '../api/database.js';
import type { EventWrite, PeriodWrite } from '../domain/writeInputs.js';
import { storedYearsBeforePresent as computeYearsBP } from '../shared/temporal.js';
import { NotFoundError } from '../domain/errors.js';
import * as catalogue from '../repositories/catalogueRepository.js';
import { replaceEntityCategories, listDetailedCategories, listCategories as readCategories } from '../repositories/categoryRepository.js';
import { deleteUnusedPeriod } from './periodDeletion.js';
import { groupCategories, mapPeriodList, mapPeriodDetail, mapEventDetail, mapCategory } from './mappers.js';

const db = { query };
export async function listPeriods() {
  return groupCategories(await catalogue.listPeriods(db), mapPeriodList);
}
export async function listEvents() {
  return groupCategories(await catalogue.listEvents(db), row => ({
    ...mapEventDetail(row), wikidata_id: row.wikidata_id, date: row.date || '', date_years_bp: row.date_years_bp,
  }));
}
export async function getPeriod(value: string, by: 'id' | 'wikidata_id' = 'id') {
  const row = await catalogue.findPeriod(db, value, by);
  if (!row) throw new NotFoundError('Période non trouvée');
  return {
    ...mapPeriodDetail(row), wikidata_id: row.wikidata_id, hasChildren: row.has_children,
    categories: (await listDetailedCategories(db, 'period', row.id)).map(mapCategory),
  };
}
export function createEvent(data: EventWrite & { id: string }) {
  return withTransaction(async client => {
    const row = await catalogue.insertEvent(client, data, computeYearsBP(data.date));
    await replaceEntityCategories(client, 'event', row.id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'event', row.id) };
  });
}
export async function updateEvent(id: string, data: EventWrite) {
  const row = await withTransaction(async client => {
    const row = await catalogue.updateEvent(client, id, data, computeYearsBP(data.date));
    if (!row) return undefined;
    await replaceEntityCategories(client, 'event', id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'event', id) };
  });
  if (!row) throw new NotFoundError('Événement non trouvé');
  return row;
}
export function createPeriod(data: PeriodWrite & { id: string }) {
  const now = Date.now();
  return withTransaction(async client => {
    const row = await catalogue.insertPeriod(client, data, computeYearsBP(data.start_date, now), computeYearsBP(data.end_date, now));
    await replaceEntityCategories(client, 'period', data.id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'period', data.id) };
  });
}
export async function updatePeriod(id: string, data: PeriodWrite) {
  const now = Date.now();
  const row = await withTransaction(async client => {
    const row = await catalogue.updatePeriod(client, id, data, computeYearsBP(data.start_date, now), computeYearsBP(data.end_date, now));
    if (!row) return undefined;
    await replaceEntityCategories(client, 'period', id, data.categories);
    return { ...row, categories: await readEntityCategories(client, 'period', id) };
  });
  if (!row) throw new NotFoundError('Période non trouvée');
  return row;
}
export const deletePeriod = (id: string) => withTransaction(client => deleteUnusedPeriod(client, id));
export async function deleteEvent(id: string) {
  const row = await withTransaction(client => catalogue.deleteEvent(client, id));
  if (!row) throw new NotFoundError('Événement non trouvé');
}

export const listCategories = () => readCategories(db);

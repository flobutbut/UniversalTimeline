import { withTransaction } from '../api/database.js';
import type { TransactionClient } from '../api/transaction.js';
import type { EventWrite, PeriodWrite } from '../domain/writeInputs.js';
import { CatalogueConversionError } from '../domain/errors.js';
import { storedYearsBeforePresent as computeYearsBP } from '../shared/temporal.js';
import * as catalogue from '../repositories/catalogueRepository.js';
import * as conversion from '../repositories/catalogueConversionRepository.js';
import { deletePeriod } from '../repositories/periodHierarchyRepository.js';
import { replaceEntityCategories } from '../repositories/categoryRepository.js';
import { readEntityCategories } from './entityCategories.js';

/**
 * A conversion replaces the catalogue record everywhere: every frise, entry point and anchor that used it
 * moves to the new record in the same transaction, then the old record is deleted. It is refused when a
 * frise of another account (invisible under RLS) or a chronological view would lose it silently.
 */
async function prepare(client: TransactionClient, kind: conversion.CatalogueKind, id: string) {
  const label = kind === 'period' ? 'cette période' : 'cet événement';
  if (!await conversion.lockEntity(client, kind, id)) {
    throw new CatalogueConversionError(404, kind === 'period' ? 'Période non trouvée' : 'Événement non trouvé');
  }
  const blockers = await conversion.readBlockers(client, kind, id);
  if (blockers.foreign_stories > 0) {
    throw new CatalogueConversionError(409, `Conversion impossible : ${label} est utilisé${kind === 'period' ? 'e' : ''} par ${blockers.foreign_stories} frise(s) d’autres comptes.`);
  }
  if (blockers.presentations > 0) {
    throw new CatalogueConversionError(409, 'Conversion impossible : cette période fait partie d’un parcours chronologique. Retirez-la du parcours avant de la convertir.');
  }
  return conversion.countMemberships(client, kind, id);
}

export function convertPeriodToEvent(periodId: string, data: EventWrite & { id: string }) {
  return withTransaction(async client => {
    const stories = await prepare(client, 'period', periodId);
    const withChildren = await conversion.countStoriesWithSubPeriods(client, periodId);
    if (withChildren > 0) {
      throw new CatalogueConversionError(409, `Conversion impossible : cette période a des sous-périodes dans ${withChildren} frise(s). Déplacez-les avant de la convertir.`);
    }
    const row = await catalogue.insertEvent(client, data, computeYearsBP(data.date));
    const provenance = await conversion.transferSource(client, 'period', periodId, row.id);
    await replaceEntityCategories(client, 'event', row.id, data.categories);
    await conversion.transferMemberships(client, 'period', periodId, row.id);
    await deletePeriod(client, periodId);
    return { ...row, ...provenance, ...(provenance.source_key ? { wikidata_id: null } : {}), categories: await readEntityCategories(client, 'event', row.id), stories };
  });
}

export function convertEventToPeriod(eventId: string, data: PeriodWrite & { id: string }) {
  const now = Date.now();
  return withTransaction(async client => {
    const stories = await prepare(client, 'event', eventId);
    const row = await catalogue.insertPeriod(client, data, computeYearsBP(data.start_date, now), computeYearsBP(data.end_date, now));
    const provenance = await conversion.transferSource(client, 'event', eventId, row.id);
    await replaceEntityCategories(client, 'period', row.id, data.categories);
    await conversion.transferMemberships(client, 'event', eventId, row.id);
    await catalogue.deleteEvent(client, eventId);
    return { ...row, ...provenance, ...(provenance.source_key ? { wikidata_id: null } : {}), categories: await readEntityCategories(client, 'period', row.id), stories };
  });
}

import express from 'express';
import { endpoint } from './handler.js';
import { parseWriteCategories } from './entityCategories.js';
import {
  InputValidationError, inputObject, parseEntityId, parseStoryId, parseQid, parseEventWrite, parsePeriodWrite,
  parseStoryWrite, parseAnchor, parseChildStories, parseAssociationOperation,
  parseSearchText, parseSearchScope, parseCsvIds, parseParentId, parseAssociationIds, parseStoryFromPeriod,
  parseUsername, parseProfileWrite, parseTermsAcceptance, parseUserId, parseFlag, parseEventImportance,
} from './inputValidation.js';
import type { Response } from 'express';
import * as catalogue from '../services/catalogueService.js';
import * as stories from '../services/storyService.js';
import { search, searchStoryTimelines } from '../services/searchService.js';
import { semanticSearch } from '../services/semanticSearch.js';
import { loadStoryTemporalBounds } from '../services/storyTemporalBounds.js';
import * as profiles from '../services/profileService.js';
import * as admin from '../services/adminService.js';

const router = express.Router();

router.get('/search/stories', endpoint('Erreur lors de la recherche de frises', async (req, res) => {
  const q = parseSearchText(req.query.q, 'q');
  res.json(q.length < 2 ? [] : await searchStoryTimelines(q));
}));

router.get('/search/by-wikidata', endpoint('Erreur lors du rapprochement des résultats.', async (req, res) => {
  const ids = parseCsvIds(req.query.ids, 'ids').map(id => { const qid = parseQid(id); if (!qid) throw new InputValidationError('ids', 'Un Q-id est requis.'); return qid; });
  const only = parseSearchScope(req.query.only);
  if (!ids.length) return res.json({ periods: [], events: [] });
  res.json(await search('', '', only, ids));
}));

router.get('/search/semantic', endpoint('La recherche par sens est indisponible.', async (req, res) => {
  const q = parseSearchText(req.query.q, 'q');
  if (q.length < 3) return res.json([]);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  res.on('close', cancel);
  try { res.json(await semanticSearch(q, controller.signal)); }
  finally { res.off('close', cancel); }
}));

router.get('/search', endpoint('Erreur lors de la recherche', async (req, res) => {
  const q = parseSearchText(req.query.q, 'q');
  if (!q) return res.json({ periods: [], events: [] });
  const category = parseSearchText(req.query.category, 'category', 200);
  const only = parseSearchScope(req.query.only);
  res.json(await search(q, category, only));
}));
router.get('/periods', endpoint('Erreur lors de la récupération des périodes', async (_req, res) => {
  res.json(await catalogue.listPeriods());
}));
// Static path: must precede /periods/:id.
router.get('/periods/story-links', endpoint('Erreur lors de la récupération des frises des périodes', async (_req, res) => {
  res.json(await stories.listStoryLinks('period'));
}));
router.get('/events', endpoint('Erreur lors de la récupération des événements', async (_req, res) => {
  res.json(await catalogue.listEvents());
}));
router.get('/events/story-links', endpoint('Erreur lors de la récupération des frises des événements', async (_req, res) => {
  res.json(await stories.listStoryLinks('event'));
}));
router.post('/events', endpoint("Erreur lors de la création de l'événement", async (req, res) => {
  const data = parseWriteCategories(parseEventWrite(req.body, true));
  const result = await catalogue.createEvent(data);
  res.status(201).json(result);
}, { conflict: 'Un événement avec cet ID existe déjà' }));
router.get('/stories', endpoint('Erreur lors de la récupération des frises', async (_req, res) => {
  res.json(await stories.listStories());
}));
// Static paths must precede /stories/:id.
router.get('/stories/temporal-bounds', endpoint('Erreur lors du calcul des bornes temporelles', async (_req, res) => {
  res.json(await loadStoryTemporalBounds());
}));
router.get('/stories/suggestions', endpoint('Erreur lors de la récupération des suggestions', async (req, res) => {
  const id = parseStoryId(req.query.story_id, 'story_id');
  const periods = parseCsvIds(req.query.period_ids, 'period_ids');
  const events = parseCsvIds(req.query.event_ids, 'event_ids');
  res.json(await stories.getSuggestions(id, periods, events));
}));
router.post('/stories', endpoint('Erreur lors de la création de la frise', async (req, res) => {
  const data = parseWriteCategories(parseStoryWrite(req.body));
  const result = await stories.createStory(data);
  res.status(201).json(result);
}));
for (const [path, kind] of [['periods', 'period'], ['events', 'event']] as const) {
  router.post(`/stories/:storyId/${path}`, endpoint('Impossible de modifier les associations de la frise.', async (req, res) => {
    const id = parseStoryId(req.params.storyId, 'storyId');
    const body = inputObject(req.body);
    const ids = parseAssociationIds(body.ids);
    const operation = parseAssociationOperation(body.operation);
    const parentId = Object.prototype.hasOwnProperty.call(body, 'parentPeriodId') ? parseParentId(body.parentPeriodId) : undefined;
    if (parentId !== undefined && (kind !== 'period' || operation === 'remove')) throw new InputValidationError('parentPeriodId', 'Le parent concerne uniquement un ajout de périodes.');
    res.json(await stories.changeAssociations(id, kind, ids, operation === 'remove', parentId));
  }));
}
// Preserve the response format of the historical single-association endpoints.
router.post('/stories/:storyId/periods/:periodId', endpoint("Erreur lors de l'ajout de la période à la frise", async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const period = parseEntityId(req.params.periodId, 'periodId');
  const result = await stories.changeSingleAssociation(id, 'period', period, false);
  res.status(201).json(result);
}));
router.post('/stories/:storyId/events/:eventId', endpoint("Erreur lors de l'ajout de l'événement à la frise", async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const event = parseEntityId(req.params.eventId, 'eventId');
  const result = await stories.changeSingleAssociation(id, 'event', event, false);
  res.status(201).json(result);
}));
router.put('/stories/:storyId/events/:eventId/importance', endpoint("Impossible de modifier l'importance de l'événement.", async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const event = parseEntityId(req.params.eventId, 'eventId');
  res.json(await stories.changeEventImportance(id, event, parseEventImportance(inputObject(req.body).importance)));
}));
router.delete('/stories/:storyId/periods/:periodId', endpoint('Erreur lors de la suppression de la période de la frise', async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const period = parseEntityId(req.params.periodId, 'periodId');
  res.json(await stories.changeSingleAssociation(id, 'period', period, true));
}));
router.delete('/stories/:storyId/events/:eventId', endpoint("Erreur lors de la suppression de l'événement de la frise", async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const event = parseEntityId(req.params.eventId, 'eventId');
  res.json(await stories.changeSingleAssociation(id, 'event', event, true));
}));
router.get('/stories/:storyId/periods', endpoint('Erreur lors de la récupération des périodes de la frise', async (req, res) => {
  res.json(await stories.listStoryPeriods(parseStoryId(req.params.storyId, 'storyId')));
}));
router.get('/stories/:storyId/events', endpoint('Erreur lors de la récupération des événements de la frise', async (req, res) => {
  res.json(await stories.listStoryEvents(parseStoryId(req.params.storyId, 'storyId')));
}));
router.get('/categories', endpoint('Erreur lors de la récupération des catégories', async (_req, res) => {
  res.json(await catalogue.listCategories());
}));
router.put('/events/:id', endpoint("Erreur lors de la mise à jour de l'événement", async (req, res) => {
  const id = parseEntityId(req.params.id);
  const data = parseWriteCategories(parseEventWrite(req.body, false));
  res.json(await catalogue.updateEvent(id, data));
}, { conflict: 'Ce Q-id ou cet identifiant d’événement est déjà utilisé.' }));
router.put('/periods/:id', endpoint('Erreur lors de la mise à jour de la période', async (req, res) => {
  const id = parseEntityId(req.params.id);
  const data = parseWriteCategories(parsePeriodWrite(req.body, false));
  res.json(await catalogue.updatePeriod(id, data));
}, { conflict: 'Ce Q-id ou cet identifiant de période est déjà utilisé.' }));
router.delete('/periods/:id', endpoint('Erreur lors de la suppression de la période', async (req, res) => {
  res.json(await catalogue.deletePeriod(parseEntityId(req.params.id)));
}, {
  foreignKey: 'Cette période est encore utilisée. Retirez ses liens avant de la supprimer.',
  busy: 'La période est occupée. Réessayez la suppression.',
}));
router.delete('/events/:id', endpoint("Erreur lors de la suppression de l'événement", async (req, res) => {
  await catalogue.deleteEvent(parseEntityId(req.params.id));
  res.status(204).send();
}));
router.put('/stories/:storyId/root-period', endpoint('Impossible de changer la racine de la frise.', async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const periodId = parseEntityId(inputObject(req.body).periodId, 'periodId');
  res.json(await stories.changeRootPeriod(id, periodId));
}));
router.post('/stories/:contextId/presentations', endpoint('Impossible de modifier le parcours chronologique.', async (req, res) => {
  const contextId = parseStoryId(req.params.contextId, 'contextId');
  const body = inputObject(req.body);
  const periodId = parseEntityId(body.periodId, 'periodId');
  const targetId = parseStoryId(body.targetStoryId, 'targetStoryId');
  if (contextId === targetId) throw new InputValidationError('targetStoryId', 'Choisissez une autre frise pour la vue de détail.');
  const operation = parseAssociationOperation(body.operation);
  await stories.changePeriodPresentation(contextId, periodId, targetId, operation === 'remove');
  res.status(204).send();
}));
router.get('/stories/:id', endpoint('Erreur lors de la récupération du détail de la frise', async (req, res) => {
  res.json(await stories.getStory(parseStoryId(req.params.id)));
}));
// One transaction: create the child frise, copy the period branch and events, anchor it. Never retried automatically.
router.post('/stories/:storyId/from-period', endpoint('Impossible de créer la frise depuis cette période.', async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const { periodId, title } = parseStoryFromPeriod(req.body);
  res.status(201).json(await stories.createFromPeriod(id, periodId, title));
}));
router.post('/stories/:parentId/child-stories', endpoint('Erreur lors du rattachement', async (req, res) => {
  const id = parseStoryId(req.params.parentId, 'parentId');
  const { ids, multiple, anchor } = parseChildStories(req.body);
  const rows = await stories.linkChildren(id, ids, anchor);
  res.json(multiple ? { ids: rows.map(row => String(row.id)) } : rows[0]);
}));
router.post('/stories/:sourceId/entry-points', endpoint('Impossible de modifier les points d’entrée.', async (req, res) => {
  const sourceId = parseStoryId(req.params.sourceId, 'sourceId');
  const { ids, anchor } = parseChildStories(req.body);
  const operation = parseAssociationOperation(inputObject(req.body).operation);
  if (operation === 'add' && !anchor) throw new InputValidationError('anchor', 'Choisissez une période ou un événement de rattachement.');
  await stories.changeEntries(sourceId, ids, anchor, operation === 'remove');
  res.status(204).send();
}));
router.delete('/stories/:parentId/child-stories/:childId', endpoint('Erreur lors du détachement', async (req, res) => {
  const id = parseStoryId(req.params.parentId, 'parentId');
  const child = parseStoryId(req.params.childId, 'childId');
  await stories.unlinkChild(id, child);
  res.status(204).send();
}));
router.post('/stories/:storyId/anchors', endpoint("Erreur lors de l'ajout de l'ancre", async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const { anchorType, anchorId } = parseAnchor(req.body);
  const result = await stories.addAnchor(id, anchorType, anchorId);
  res.status(201).json(result);
}));
router.delete('/stories/:storyId/anchors', endpoint("Erreur lors de la suppression de l'ancre", async (req, res) => {
  const id = parseStoryId(req.params.storyId, 'storyId');
  const { anchorType, anchorId } = parseAnchor(req.body);
  await stories.removeAnchor(id, anchorType, anchorId);
  res.status(204).send();
}));
router.delete('/stories/:id', endpoint('Erreur lors de la suppression de la frise', async (req, res) => {
  await stories.deleteStory(parseStoryId(req.params.id));
  res.status(204).send();
}));
router.put('/stories/:id', endpoint('Erreur lors de la mise à jour de la frise', async (req, res) => {
  const id = parseStoryId(req.params.id);
  const data = parseWriteCategories(parseStoryWrite(req.body));
  res.json(await stories.updateStory(id, data));
}));
router.post('/periods', endpoint('Erreur lors de la création de la période', async (req, res) => {
  const data = parseWriteCategories(parsePeriodWrite(req.body, true));
  const result = await catalogue.createPeriod(data);
  res.status(201).json(result);
}, { conflict: 'Ce Q-id ou cet identifiant de période est déjà utilisé.' }));
router.get('/periods/:id/children', (_req, res) => {
  res.status(410).json({ error: 'Les sous-périodes sont organisées dans chaque frise.' });
});
router.get('/periods/:id', endpoint('Erreur lors de la récupération de la période', async (req, res) => {
  res.json(await catalogue.getPeriod(parseEntityId(req.params.id)));
}));
router.patch('/periods/:id/parent', (_req, res) => {
  res.status(410).json({ error: 'Déplacez cette période dans sa frise.' });
});
router.get('/periods/wikidata/:wikidataId', endpoint('Erreur lors de la récupération de la période', async (req, res) => {
  res.json(await catalogue.getPeriod(parseQid(req.params.wikidataId, true)!, 'wikidata_id'));
}));
// Account profile: own row only. Sign-up availability is the one anonymous read.
const signedIn = (res: Response) => {
  if (res.locals.principal?.userId) return true;
  res.status(401).json({ error: 'Connexion requise.' }); return false;
};
router.get('/profile/username-availability', endpoint('Vérification du nom d’utilisateur impossible.', async (req, res) => {
  res.json({ available: await profiles.usernameAvailable(parseUsername(req.query.username)) });
}));
router.get('/profile', endpoint('Erreur lors de la lecture du profil', async (_req, res) => {
  if (signedIn(res)) res.json(await profiles.getProfile());
}));
router.put('/profile', endpoint('Erreur lors de l’enregistrement du profil', async (req, res) => {
  const data = parseProfileWrite(req.body);
  if (signedIn(res)) res.json(await profiles.saveProfile(data));
}, { conflict: 'Ce nom d’utilisateur est déjà pris.' }));
router.post('/profile/terms', endpoint('Erreur lors de l’enregistrement de votre acceptation', async (req, res) => {
  const version = parseTermsAcceptance(req.body);
  if (signedIn(res)) res.json(await profiles.acceptTerms(version));
}));
router.get('/profile/export', endpoint('Export de vos données impossible', async (_req, res) => {
  if (signedIn(res)) res.json(await profiles.exportData());
}));
// Right to erasure: frises then account, in one transaction. Never retried automatically.
router.delete('/profile', endpoint('Suppression du compte impossible', async (_req, res) => {
  if (!signedIn(res)) return;
  await profiles.deleteAccount();
  res.status(204).send();
}));
// Admin console: refused early without the verified admin role; the database checks it again.
const isAdmin = (res: Response) => {
  if (!signedIn(res)) return false;
  if (res.locals.principal.isAdmin) return true;
  res.status(403).json({ error: 'Accès réservé à l’administrateur.' }); return false;
};
router.get('/admin/dashboard', endpoint('Lecture du tableau de bord impossible', async (_req, res) => {
  if (isAdmin(res)) res.json(await admin.dashboard());
}));
router.get('/admin/users', endpoint('Lecture des utilisateurs impossible', async (_req, res) => {
  if (isAdmin(res)) res.json(await admin.listUsers());
}));
router.get('/admin/users/:id', endpoint('Lecture du compte impossible', async (req, res) => {
  const id = parseUserId(req.params.id);
  if (isAdmin(res)) res.json(await admin.userDetail(id));
}));
router.put('/admin/users/:id/role', endpoint('Changement de rôle impossible', async (req, res) => {
  const id = parseUserId(req.params.id); const enabled = parseFlag(req.body, 'admin');
  if (!isAdmin(res)) return;
  await admin.setAdmin(id, enabled);
  res.status(204).send();
}));
router.put('/admin/users/:id/suspension', endpoint('Changement de statut impossible', async (req, res) => {
  const id = parseUserId(req.params.id); const suspended = parseFlag(req.body, 'suspended');
  if (!isAdmin(res)) return;
  await admin.setSuspended(id, suspended);
  res.status(204).send();
}));
// Deletes the account and its frises in one transaction. Never retried automatically.
router.delete('/admin/users/:id', endpoint('Suppression du compte impossible', async (req, res) => {
  const id = parseUserId(req.params.id);
  if (!isAdmin(res)) return;
  await admin.deleteUser(id);
  res.status(204).send();
}));
export default router;

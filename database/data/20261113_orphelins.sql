-- Suppression des fiches orphelines (sur aucune frise, sans ancre, accès ni créateur), 13 novembre 2026.
-- Sauvegarde complète des lignes, tags et catégories : 20261113_orphelins_sauvegarde.json.
DO $do$
DECLARE n int;
  p varchar[] := ARRAY(SELECT jsonb_array_elements_text($j$["b7e57449-fe71-4400-affb-a11324f864b3", "8923819c-cc1f-4da3-8503-4a485d186b0f", "b34af765-32cd-4d01-820d-2934fc21c2aa", "33d633cb-2c04-4fbc-bd1c-256cbf3d8efa", "11177ae2-95bd-44ff-86bc-3a8b6c335a53", "e26cf03d-4760-49f4-8e2f-ccf54e4c6a47", "Q40244", "Q11537", "Q1747689", "Q11769", "Q484757", "PER_BIGBANG", "Q11768", "bfcd2499-f121-4998-aa27-f75c08a3fd24", "c1050f5c-bf19-4ec7-a078-7e7dfe8574b6", "e29900d8-67e3-4f49-8907-fa7c86d77021", "30c6d6df-f10b-4788-aa65-41c1614c9595", "fd216ffa-0552-48b2-9dbf-b1a551c8bcb8", "be213d69-ce6b-4e61-ae4f-26cae8a5b053", "755ef543-0561-492d-b391-13b06852434e", "d6b2d46b-59b8-48d6-9ab7-238229bb30a1", "9fd6e93b-c63d-4b14-ac67-10a93da43fdf", "7708353a-0544-4d6e-a43d-bbc6d3315f0e", "2e2d2c0d-e2aa-442a-91bd-a4f5a646533d"]$j$::jsonb));
  e varchar[] := ARRAY(SELECT jsonb_array_elements_text($j$["58b0e0fc-ebae-42b4-ad99-c7e0e7fa1c35", "a80f5c77-e14c-4639-ae8b-1d84d8a7f8dd", "3f4b6aca-be8a-4c47-a8e2-b1c748e9db52", "8a44cefb-cd95-43b0-9f09-910c0c4eab3e", "039912af-18cc-42c9-9065-1b980251fd28", "ecbcea89-7794-4e6e-834c-6c47b2557bee", "9f50851a-f1a7-489e-97c3-da3455d4bab6", "5804c8d0-8350-440b-914a-a822fe4ee7a4", "57b04feb-0bc1-4e9b-80b8-d1887be608fd", "70fe5e6a-e642-4827-9e8f-d20909f88e1b", "6cf7a564-f79a-4b9f-8b51-30f84a6c03aa", "22687f48-8829-4b7c-8e55-7199254163eb", "8973334d-3eb2-4c46-9dce-07a8da0a656c", "ea8037ac-c930-4b74-9227-cb2bc0f59c61", "d310f454-f158-4bbd-b372-936111b31237", "d717519c-b2cf-453f-8bf1-1d93795f42b0", "6eaab574-200e-4a74-9571-2f192c4a4380", "49d8c376-afae-422d-8d26-9da2dd534033", "f039c88b-2bf8-40da-a648-b7a17b5297cf", "6e844fb9-3d13-4732-9254-fcca3c5f6bc9", "8a63c903-4f9d-47af-8d87-26c8ccd5a369", "4c2680a8-e2c2-42c9-afe5-b96e54305c7d", "e4e7dc7c-32b7-49b9-b57a-b5161b45e7f7", "959d371f-4fb6-4026-a7e1-e5e95ae82079", "326f2f76-529b-46de-ac01-9952d503f400", "ea901b25-4e5f-4124-85ab-c9ce9e5d2591", "51e520f4-94f7-44b5-9784-fc05d7658dd2", "9956f0f4-6da3-405a-a193-b327c1370ebc", "ccbe24bd-0b70-4113-a47c-1aa88c4c6d87", "c7a06251-ddda-4b43-9fe8-e99ba38b0f93", "fecc8355-e397-464e-9cbd-5d396ae3e508", "b3d9a7a7-5cf1-45dc-abde-11441adc47f6", "88c28f47-02d6-4e35-b828-e72f07d66e98", "db009497-e904-4ae2-a5b8-3f9d6b891053", "9e8bb9f3-b40b-4b38-9b8c-deecbda7982b", "0f30f8c9-803a-4df4-b7b9-f068e78ad7d3", "ff0d9a96-16ae-483e-9665-5e91b3259660", "18ce3676-cde6-4a4e-99b3-6eed5b1d038e", "7c753f08-754f-455f-b816-df20d4b2db9f", "311fa0ef-219f-46d3-98f6-aaec5fc475d5", "dc40e5fb-aa3a-43aa-8bee-7a0eac9da6ee"]$j$::jsonb));
BEGIN
IF cardinality(p) <> 24 OR cardinality(e) <> 41 THEN RAISE EXCEPTION 'Liste inattendue'; END IF;
IF EXISTS (SELECT 1 FROM public.story_periods WHERE period_id = ANY(p) OR parent_period_id = ANY(p))
OR EXISTS (SELECT 1 FROM public.story_events WHERE event_id = ANY(e))
OR EXISTS (SELECT 1 FROM public.story_period_presentations WHERE period_id = ANY(p))
OR EXISTS (SELECT 1 FROM public.story_entry_points WHERE period_id = ANY(p) OR event_id = ANY(e))
OR EXISTS (SELECT 1 FROM public.story_anchors WHERE anchor_id = ANY(p) OR anchor_id = ANY(e))
THEN RAISE EXCEPTION 'Une fiche est de nouveau utilisée'; END IF;
DELETE FROM public.events WHERE id = ANY(e);
GET DIAGNOSTICS n = ROW_COUNT; IF n <> 41 THEN RAISE EXCEPTION 'Événements supprimés : %', n; END IF;
DELETE FROM public.periods WHERE id = ANY(p);
GET DIAGNOSTICS n = ROW_COUNT; IF n <> 24 THEN RAISE EXCEPTION 'Périodes supprimées : %', n; END IF;
END $do$;

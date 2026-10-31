--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Debian 15.12-1.pgdg120+1)
-- Dumped by pg_dump version 15.12 (Debian 15.12-1.pgdg120+1)

-- Started on 2025-06-24 22:00:45 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS wikidata_db;
--
-- TOC entry 3483 (class 1262 OID 16384)
-- Name: wikidata_db; Type: DATABASE; Schema: -; Owner: wikidata_user
--

CREATE DATABASE wikidata_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE wikidata_db OWNER TO wikidata_user;

\connect wikidata_db

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 7 (class 2615 OID 16385)
-- Name: categories; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA categories;


ALTER SCHEMA categories OWNER TO wikidata_user;

--
-- TOC entry 9 (class 2615 OID 16387)
-- Name: events; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA events;


ALTER SCHEMA events OWNER TO wikidata_user;

--
-- TOC entry 8 (class 2615 OID 16386)
-- Name: periods; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA periods;


ALTER SCHEMA periods OWNER TO wikidata_user;

--
-- TOC entry 10 (class 2615 OID 16388)
-- Name: stories; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA stories;


ALTER SCHEMA stories OWNER TO wikidata_user;

--
-- TOC entry 2 (class 3079 OID 16554)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 3484 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 257 (class 1255 OID 16550)
-- Name: maintain_period_relations(); Type: FUNCTION; Schema: periods; Owner: wikidata_user
--

CREATE FUNCTION periods.maintain_period_relations() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Mettre à jour has_parent
    UPDATE periods.periods
    SET has_parent = (children IS NOT NULL AND jsonb_array_length(children) > 0);

    -- Vérifier et corriger les références circulaires dans children
    WITH RECURSIVE cycle_check AS (
        SELECT id, children, ARRAY[id] as path
        FROM periods.periods
        WHERE children IS NOT NULL
        UNION ALL
        SELECT p.id, p.children, cc.path || p.id
        FROM periods.periods p
        JOIN cycle_check cc ON p.id = ANY(cc.children)
        WHERE NOT p.id = ANY(cc.path)
    )
    UPDATE periods.periods
    SET children = (
        SELECT jsonb_agg(child_id)
        FROM jsonb_array_elements_text(children) AS child_id
        WHERE NOT child_id = ANY(
            SELECT path[array_position(path, id):]
            FROM cycle_check
            WHERE id = periods.periods.id
        )
    )
    WHERE id IN (
        SELECT id
        FROM cycle_check
        WHERE id = ANY(path[array_position(path, id):])
    );
END;
$$;


ALTER FUNCTION periods.maintain_period_relations() OWNER TO wikidata_user;

--
-- TOC entry 241 (class 1255 OID 16549)
-- Name: maintain_period_relations(); Type: FUNCTION; Schema: public; Owner: wikidata_user
--

CREATE FUNCTION public.maintain_period_relations() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Mettre à jour has_parent
    UPDATE periods
    SET has_parent = (parent_id IS NOT NULL);

    -- Mettre à jour children
    UPDATE periods p
    SET children = (
        SELECT jsonb_agg(id)
        FROM periods
        WHERE parent_id = p.id
    );

    -- Vérifier et corriger les références circulaires
    WITH RECURSIVE cycle_check AS (
        SELECT id, parent_id, ARRAY[id] as path
        FROM periods
        WHERE parent_id IS NOT NULL
        UNION ALL
        SELECT p.id, p.parent_id, cc.path || p.id
        FROM periods p
        JOIN cycle_check cc ON p.id = cc.parent_id
        WHERE NOT p.id = ANY(cc.path)
    )
    UPDATE periods
    SET parent_id = NULL
    WHERE id IN (
        SELECT id
        FROM cycle_check
        WHERE parent_id = ANY(path)
    );
END;
$$;


ALTER FUNCTION public.maintain_period_relations() OWNER TO wikidata_user;

--
-- TOC entry 234 (class 1255 OID 16496)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: stories; Owner: wikidata_user
--

CREATE FUNCTION stories.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION stories.update_updated_at_column() OWNER TO wikidata_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 16389)
-- Name: categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.categories (
    id uuid NOT NULL,
    label_fr text NOT NULL,
    label_en text NOT NULL,
    description_fr text,
    description_en text,
    parent_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE categories.categories OWNER TO wikidata_user;

--
-- TOC entry 229 (class 1259 OID 16730)
-- Name: categories_id_mapping; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.categories_id_mapping (
    old_id character varying(255) NOT NULL,
    new_id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE categories.categories_id_mapping OWNER TO wikidata_user;

--
-- TOC entry 223 (class 1259 OID 16415)
-- Name: event_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.event_categories (
    event_id uuid NOT NULL,
    category_id uuid NOT NULL
);


ALTER TABLE categories.event_categories OWNER TO wikidata_user;

--
-- TOC entry 222 (class 1259 OID 16403)
-- Name: period_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.period_categories (
    period_id uuid NOT NULL,
    category_id uuid NOT NULL
);


ALTER TABLE categories.period_categories OWNER TO wikidata_user;

--
-- TOC entry 224 (class 1259 OID 16427)
-- Name: story_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.story_categories (
    story_id uuid NOT NULL,
    category_id uuid NOT NULL
);


ALTER TABLE categories.story_categories OWNER TO wikidata_user;

--
-- TOC entry 226 (class 1259 OID 16453)
-- Name: events; Type: TABLE; Schema: events; Owner: wikidata_user
--

CREATE TABLE events.events (
    id uuid NOT NULL,
    wikidata_id character varying(255) NOT NULL,
    label_fr text NOT NULL,
    label_en text NOT NULL,
    description_fr text,
    description_en text,
    date text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE events.events OWNER TO wikidata_user;

--
-- TOC entry 230 (class 1259 OID 16736)
-- Name: events_id_mapping; Type: TABLE; Schema: events; Owner: wikidata_user
--

CREATE TABLE events.events_id_mapping (
    old_id character varying(255) NOT NULL,
    new_id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE events.events_id_mapping OWNER TO wikidata_user;

--
-- TOC entry 225 (class 1259 OID 16437)
-- Name: periods; Type: TABLE; Schema: periods; Owner: wikidata_user
--

CREATE TABLE periods.periods (
    id uuid NOT NULL,
    wikidata_id character varying(255) NOT NULL,
    label_fr text NOT NULL,
    label_en text NOT NULL,
    description_fr text,
    description_en text,
    start_date text,
    end_date text,
    temporal_location character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    has_parent boolean DEFAULT false,
    children jsonb
);


ALTER TABLE periods.periods OWNER TO wikidata_user;

--
-- TOC entry 231 (class 1259 OID 16742)
-- Name: periods_id_mapping; Type: TABLE; Schema: periods; Owner: wikidata_user
--

CREATE TABLE periods.periods_id_mapping (
    old_id character varying(255) NOT NULL,
    new_id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE periods.periods_id_mapping OWNER TO wikidata_user;

--
-- TOC entry 233 (class 1259 OID 16813)
-- Name: stories; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title_fr text NOT NULL,
    title_en text NOT NULL,
    description_fr text,
    description_en text,
    author character varying(255) NOT NULL,
    is_public boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE stories.stories OWNER TO wikidata_user;

--
-- TOC entry 232 (class 1259 OID 16808)
-- Name: stories_id_mapping; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.stories_id_mapping (
    old_id integer NOT NULL,
    new_id uuid NOT NULL
);


ALTER TABLE stories.stories_id_mapping OWNER TO wikidata_user;

--
-- TOC entry 228 (class 1259 OID 16486)
-- Name: story_events; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.story_events (
    story_id uuid NOT NULL,
    event_id uuid NOT NULL
);


ALTER TABLE stories.story_events OWNER TO wikidata_user;

--
-- TOC entry 227 (class 1259 OID 16476)
-- Name: story_periods; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.story_periods (
    story_id uuid NOT NULL,
    period_id uuid NOT NULL
);


ALTER TABLE stories.story_periods OWNER TO wikidata_user;

--
-- TOC entry 3465 (class 0 OID 16389)
-- Dependencies: 221
-- Data for Name: categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.categories (id, label_fr, label_en, description_fr, description_en, parent_id, created_at, updated_at) FROM stdin;
d0ff5446-abcc-44fa-9001-4f0cb96f8edb	Cosmologie	Cosmology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
5a42939b-9fd2-4b2e-ab3b-a0ca7973aaee	Astrophysique	Astrophysics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
5f7bdf45-8865-4cb3-be0f-19ab15922fab	Physique Théorique	Theoretical Physics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
5599cb7b-8a28-42ff-a300-d159b5e22b78	Biologie Évolutive	Evolutionary Biology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
6f9e7cdf-9bc4-4f24-be8c-fb478a27a1df	Paléontologie	Paleontology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
462593dc-0215-4f86-967e-598fa8f35556	Physique des Particules	Particle Physics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
dd74fe2d-d04d-4a9f-9e6e-c22c2222d9ac	Géologie	Geology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
81455b8c-48c6-4221-a6e6-c5efcd772252	Chimie	Chemistry	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
78ccf8a1-d005-49fd-9111-62a414ccd72c	Botanique	Botany	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
a2092511-1ed8-4605-b505-f19e5133885c	Histoire et Civilisations	History and Civilizations	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
98babe9f-ae2e-4f57-85d0-90a6f2affd14	Anthropologie et Archéologie	Anthropology and Archaeology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
c728c25e-2f74-41ab-bb16-9974e7b6020e	Technologie et Innovations	Technology and Innovations	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
71ba5a02-d49d-4f8a-b394-5361a4e32deb	Religion et Philosophie	Religion and Philosophy	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
6dff4411-3540-4c7d-9f4b-63a146570dca	Art et Culture	Art and Culture	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
57739c26-8bbc-4d32-9708-31b889aa34f2	Économie	Economics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
fa4c9916-732e-4717-bed9-b3ac4b3124a6	Océanographie	Oceanography	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
33635a69-fe2a-4def-9746-079607f976d9	Microbiologie	Microbiology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
5234b59e-8d38-4dfb-94f9-10b82e328b14	Écologie	Ecology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-17 12:29:44.499304
\.


--
-- TOC entry 3473 (class 0 OID 16730)
-- Dependencies: 229
-- Data for Name: categories_id_mapping; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.categories_id_mapping (old_id, new_id) FROM stdin;
CAT_COSMO	82fa9ab1-e44c-46db-a3da-8144f8828681
CAT_ASTRO	9aa3dbae-c8d1-4dc1-8994-01156dac90e3
CAT_PHYS	257ed559-c492-43af-82b7-837363928d53
CAT_BIO_EVO	13574519-15bf-417d-9776-562498965b35
CAT_PALEO	b6107170-caec-424b-9ed3-7240cb421310
CAT_PART	0819b811-6885-4778-bf6b-9ccc712d4468
CAT_GEO	07169389-c18c-4b9a-ad6b-a403b6736e46
CAT_CHEM	5a192249-7e23-4802-8479-7a188956b5a5
CAT_BOT	b08b6f09-0086-4e82-8504-b946e61bcc7e
CAT_HIST	9f7ef929-eb05-48ee-a987-06a4501093dd
CAT_ANTHRO	b3ce5028-440b-484f-bcca-489fc66326e3
CAT_TECH	19ec00dc-1a91-4f41-8352-c8fba2a4edeb
CAT_PHILO	60226bb0-ccbf-4fe5-a519-c41e70404aac
CAT_ART	9b413e85-1f73-4ed4-8afb-1e61458cdec6
CAT_ECO	e881a578-47ab-4d21-9ee7-254755fc56eb
CAT_OCEAN	3103f242-32a9-4d46-83d3-771b32b695b7
CAT_MICRO	a330a702-2ab2-41e4-b989-058d8874c2f9
CAT_ECO_SYS	01995c9a-526e-461e-bc9b-fdaca79bbef1
82fa9ab1-e44c-46db-a3da-8144f8828681	d0ff5446-abcc-44fa-9001-4f0cb96f8edb
9aa3dbae-c8d1-4dc1-8994-01156dac90e3	5a42939b-9fd2-4b2e-ab3b-a0ca7973aaee
257ed559-c492-43af-82b7-837363928d53	5f7bdf45-8865-4cb3-be0f-19ab15922fab
13574519-15bf-417d-9776-562498965b35	5599cb7b-8a28-42ff-a300-d159b5e22b78
b6107170-caec-424b-9ed3-7240cb421310	6f9e7cdf-9bc4-4f24-be8c-fb478a27a1df
0819b811-6885-4778-bf6b-9ccc712d4468	462593dc-0215-4f86-967e-598fa8f35556
07169389-c18c-4b9a-ad6b-a403b6736e46	dd74fe2d-d04d-4a9f-9e6e-c22c2222d9ac
5a192249-7e23-4802-8479-7a188956b5a5	81455b8c-48c6-4221-a6e6-c5efcd772252
b08b6f09-0086-4e82-8504-b946e61bcc7e	78ccf8a1-d005-49fd-9111-62a414ccd72c
9f7ef929-eb05-48ee-a987-06a4501093dd	a2092511-1ed8-4605-b505-f19e5133885c
b3ce5028-440b-484f-bcca-489fc66326e3	98babe9f-ae2e-4f57-85d0-90a6f2affd14
19ec00dc-1a91-4f41-8352-c8fba2a4edeb	c728c25e-2f74-41ab-bb16-9974e7b6020e
60226bb0-ccbf-4fe5-a519-c41e70404aac	71ba5a02-d49d-4f8a-b394-5361a4e32deb
9b413e85-1f73-4ed4-8afb-1e61458cdec6	6dff4411-3540-4c7d-9f4b-63a146570dca
e881a578-47ab-4d21-9ee7-254755fc56eb	57739c26-8bbc-4d32-9708-31b889aa34f2
3103f242-32a9-4d46-83d3-771b32b695b7	fa4c9916-732e-4717-bed9-b3ac4b3124a6
a330a702-2ab2-41e4-b989-058d8874c2f9	33635a69-fe2a-4def-9746-079607f976d9
01995c9a-526e-461e-bc9b-fdaca79bbef1	5234b59e-8d38-4dfb-94f9-10b82e328b14
\.


--
-- TOC entry 3467 (class 0 OID 16415)
-- Dependencies: 223
-- Data for Name: event_categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.event_categories (event_id, category_id) FROM stdin;
0e0b8e4b-c3c8-457b-b257-ccbafa213fbd	5599cb7b-8a28-42ff-a300-d159b5e22b78
c133bb10-ab74-4d8a-ab95-b1679046b753	98babe9f-ae2e-4f57-85d0-90a6f2affd14
fa79d6e3-e42c-4b66-a715-bb9e7b783d40	a2092511-1ed8-4605-b505-f19e5133885c
548744b8-f4e2-423f-b614-daf5765eadec	a2092511-1ed8-4605-b505-f19e5133885c
\.


--
-- TOC entry 3466 (class 0 OID 16403)
-- Dependencies: 222
-- Data for Name: period_categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.period_categories (period_id, category_id) FROM stdin;
51128993-99a5-488a-a67a-f048ab95f9a2	a2092511-1ed8-4605-b505-f19e5133885c
\.


--
-- TOC entry 3468 (class 0 OID 16427)
-- Dependencies: 224
-- Data for Name: story_categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.story_categories (story_id, category_id) FROM stdin;
25dd84b1-758e-4aaa-afe7-6e5aa795d8c2	a2092511-1ed8-4605-b505-f19e5133885c
\.


--
-- TOC entry 3470 (class 0 OID 16453)
-- Dependencies: 226
-- Data for Name: events; Type: TABLE DATA; Schema: events; Owner: wikidata_user
--

COPY events.events (id, wikidata_id, label_fr, label_en, description_fr, description_en, date, created_at, updated_at) FROM stdin;
571e3967-2c7b-40d7-8464-28de6233cfef	Q488	bombardements atomiques d'Hiroshima et de Nagasaki	bombardements atomiques d'Hiroshima et de Nagasaki	bombardements atomiques des États-Unis sur le Japon en août 1945	1945 use of nuclear weapons against Japan in World War II	1945-08-09T00:00:00Z	2025-06-21 13:04:08.590723	2025-06-21 13:12:35.126625
fe5ce9f5-c415-485d-a3e0-a947920e0c4f	Q3343986	Formation des premières étoiles	Formation of first stars	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
3e9abd13-2fc9-4af5-80cb-be71f009997d	Q15978631	Homo sapiens	Homo sapiens	espèce humaine	species of mammal	-200000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-20 22:27:05.129441
c133bb10-ab74-4d8a-ab95-b1679046b753	Q912205	domestication du feu	domestication du feu	découverte de l'utilisation du feu et son allumage par les premiers hommes	aspect of human history	-1900000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-22 20:50:30.075714
fa79d6e3-e42c-4b66-a715-bb9e7b783d40	Q608613	chute de l'Empire romain d'Occident	chute de l'Empire romain d'Occident	causes profondes et événements qui aboutirent à l'effondrement de l'Empire romain d'Occident.	loss of central political control in the Western Roman Empire in late antiquity	0476-09-05T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-22 20:54:32.115462
548744b8-f4e2-423f-b614-daf5765eadec	Q1247524	fondation de Rome	fondation de Rome	aspects historiques de la naissance de la ville de Rome (VIIIe siècle av. J.-C.)	mythical tale	-0752-04-13T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-22 20:56:24.856536
6153d802-949b-4fcf-bbc1-e3711eeca288	Q52863547	Formation des amas globulaires	Formation of globular clusters	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
39941cd9-236a-4359-a908-833940a68865	Q428962	Formation des océans	Formation of oceans	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
f8528d3f-c748-4e64-b98f-7cd74bca4982	Q2603003	Premiers minéraux connus (zircons)	First known minerals (zircons)	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
f386d579-09d6-44a5-b0c1-9f154045a5db	Q13433688	Premières traces de vie	First traces of life	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
2db3be43-0249-4e58-9690-2a2f7d6f2ff7	Q1545904	Apparition de l'oxygène atmosphérique (Grande Oxydation)	Great Oxygenation Event	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
76b627d8-2370-49d2-ba0a-2677aa60fb27	Q1393590	Glaciation huronienne	Huronian glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
72454424-6e2d-474b-bc80-36766a8c51a5	Q1636908	Glaciation sturtienne	Sturtian glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
b6cd690f-fa31-48f5-9b0a-a75055906b19	Q46368	Extinction Crétacé-Tertiaire	Cretaceous-Tertiary extinction	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
40a7ce9a-b879-4c35-ad65-a4682b62a51a	Q7358	Apparition des premiers primates	Appearance of first primates	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
14075a6d-f4bb-4066-a39f-0f02e0af4f7b	Q12467092	Formation de l'Himalaya	Formation of Himalayas	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
206fd7ff-c34a-4e4d-8ca7-1b695d6c3ada	Q3238722	Apparition des premiers hominidés	Appearance of first hominids	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
6267e111-68ef-4b75-ae4d-6f5f67065953	Q11746	Début des glaciations quaternaires	Start of Quaternary glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
e30e5c3a-5d52-417b-bc4c-0cbfa10d2c4f	Q121557	Fin de la dernière période glaciaire	End of last glacial period	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
bf3e3503-a53b-44ab-9434-054cd7f9defb	Q8767	Invention de l'écriture	Invention of writing	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
9858bcc2-7f98-4805-9da6-9a2f3e58fcf5	Q4389	Début de l'Hégire	Beginning of Hegira	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
a58f5ebf-90b5-42f8-b3c5-213d8a9a8119	Q333656	Formation de la Lune	Formation of the Moon	\N	\N	1929-03-06 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
aff7b743-1816-4446-a1e9-4195c133d6e0	Q46253	Formation de la Pangée	Formation of Pangaea	\N	\N	1985-02-26 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
1a47a6e1-0b36-4cef-bb2a-2caa8afd9c17	Q162230	Formation de la nébuleuse solaire	Formation of solar nebula	\N	\N	2003-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
ba0f3436-42a9-4d2e-8f0e-7d4bcf9f207b	Q214851	Extinction Permien-Trias	Permian-Triassic extinction	\N	\N	1850-08-26 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
1a146c43-2253-4239-93a3-fd22667deb06	Q833611	Formation du supercontinent Columbia	Formation of Columbia supercontinent	\N	\N	1986-09-27 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
b7edd46b-d653-4209-aab9-39accc4ed332	Q7377	Apparition des premiers mammifères	Appearance of first mammals	\N	\N	-160000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
afe65c0d-b02b-46f9-819a-534ba61ad3bd	Q32919	Explosion cambrienne	Explosion cambrienne	moment d'importante diversification des espèces animales, végétales et bactériennes	Portion of the Cambrian Period during which life vastly diversified	-543000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
ed285ad5-1016-4200-8690-06903ca23b93	Q10908	amphibien	amphibien	classe d'animaux tétrapodes	class of tetrapods, whose living forms include frogs, toads, salamanders, newts and caecilians	-370000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
b30e14b8-f95f-4ef3-8fe8-cef83502fa25	Q10811	Reptiles	Reptiles	classe des animaux vertébrés (Vertebrata)	class of vertebrate animals (Vertebrata)	-318000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
8b6c62b9-d214-420c-ab7b-3a5324a7c714	Q214334	peinture pariétale	peinture pariétale	peinture exécutée durant la Préhistoire sur les parois rocheuses de grottes	paintings found on cave walls and ceilings	-38000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
f059964a-1fc7-4b32-8286-7ff19fb89964	Q9441	Siddhartha Gautama	Siddhartha Gautama	maître spirituel fondateur du bouddhisme, (623 ou 563 AEC–543 ou 483 AEC)	Indian philosopher and the founder of Buddhism (623 or 563 BCE – 543 or 483 BCE)	-0500-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
9d117809-39e5-42f6-84f2-1b67e3a22320	Q323	Big Bang	Big Bang	modèle cosmologique de l'origine de l'Univers	hypothetical begin of the Universe through expansion out of an infinitely small and infinitely dense state	-13798000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
235a3fe7-b25a-4306-acbb-d84091e1612f	Q171283	Homo	Homo	genre qui réunit Homo sapiens et les espèces apparentées	genus of mammals	-2800000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
aaada212-89c1-4c3b-bd7e-91f5d57fd4e0	Q1390	insecte	insecte	classe d'arthropodes	class of arthropods	-400000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
f4b486b8-f61f-4e08-b566-1fe09983c459	Q302	Jésus-Christ	Jésus-Christ	messie et fils unique de Dieu pour les chrétiens	central figure of Christianity (6 or 4 BC – AD 30 or 33)	-0004-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
6078e157-c394-4918-bab6-70b995c2832a	Q362	Seconde Guerre mondiale	Seconde Guerre mondiale	conflit armé à l'échelle planétaire, de septembre 1939 à septembre 1945	1939–1945 global conflict	1939-09-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
b429042a-f223-47b6-b52a-99ed7d6b3fa0	Q19088	Eukaryota	Eukaryota	ensemble des espèces ayant des cellules avec un noyau	taxonomic group whose members have a cell nucleus enclosed within a nuclear envelope	-2700000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
434b73c7-5a0a-4f96-a994-faf1da344d1a	Q525	Soleil	Soleil	étoile au centre du Système solaire, source principale de lumière et de chaleur pour ses planètes, notamment pour la Terre	star at the centre of the Solar System	1973-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
a2ed4018-4ea6-4208-b915-1b61850cbedf	Q37200	pyramide de Khéops	pyramide de Khéops	plus ancienne et plus grande des trois pyramides de la nécropole de Gizeh	oldest and largest of the three pyramids in the Giza Necropolis; one of the seven ancient wonders of the world	-2559-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
f3524352-d575-43e8-be95-fb66b51fc3f1	Q6534	Révolution française	Révolution française	période de l'histoire de France et de ses colonies, du 5 mai 1789 au 9 novembre 1799	revolution in France from 1789 to 1799	1789-05-05 00:00:00	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
f15c21c3-fe6b-4829-9785-3de48e3dfe53	Q43653	Apollo 11	Apollo 11	11e mission du programme spatial américain Apollo (premiers pas de l'homme sur la Lune)	first Moon landing and fifth crewed flight of the United States Apollo program	-3099-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
390948bf-bed0-4a4a-80c8-77d9b9384467	Q69163529	chute du Mur de Berlin	chute du Mur de Berlin	événement historique en novembre 1989 où le mur de Berlin a été démoli	historical event in November 1989 where the Berlin Wall was opened and demolished	1989-11-09T00:00:00Z	2025-06-13 20:00:56.095994	2025-06-17 12:29:44.504221
cfefa14c-0ece-4089-acdd-202a3d95b386	Q221474	découverte et exploration de l'Amérique	découverte et exploration de l'Amérique	événement historique	arrival of Christopher Columbus and crew to America	1492-10-21T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-17 12:29:44.504221
ed0b9edf-7bbf-456e-b1f5-67bd7c8bdae1	Q55811	extinction Crétacé-Paléogène	extinction Crétacé-Paléogène	événement d'extinction massive d'espèces	extinction event ending the Mesozoic Era	-66000000-01-01T00:00:00Z	2025-06-13 21:26:01.801136	2025-06-17 12:29:44.504221
a10bcdff-7a4a-46eb-a06f-161e73ec057b	Q141118	extinction Permien-Trias	extinction Permien-Trias	cas d’extinction de masse le plus grave de la chronologie de la Terre	mass extinction event at the end of the Permian Period approximately 250 million years ago	-251900000-01-01T00:00:00Z	2025-06-13 21:26:19.179711	2025-06-17 12:29:44.504221
ceea9428-7004-4ed8-8f07-0f7d0e4fd3ae	Q796140	extinction de l’Holocène	extinction de l’Holocène	phénomène d’extinction massive durant l’actuelle époque géologique de l’Holocène	massive extinction event during the current Holocene geological epoch	-10000-01-01T00:00:00Z	2025-06-13 21:26:54.609391	2025-06-17 12:29:44.504221
2f289d28-6b97-456c-95c3-41e8dcb7d50d	Q591571	grand bombardement tardif	grand bombardement tardif	\N	hypothesized event, occurring ca. 4.1–3.8 billion years ago, during which a large number of asteroids collided with the Moon, Mercury, Venus, Earth, and Mars	-4100000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-20 22:32:44.624634
5622aa02-4b97-4f1e-9820-6838b5bb8d08	Q11451	agriculture	agriculture	ensemble des activités humaines ayant pour objet la culture des terres et la production de nourriture	cultivation of plants and animals to provide useful products	-8000-01-01T00:00:00Z	2025-06-21 13:18:35.303734	2025-06-21 13:25:43.621577
17ee1c47-7335-4a9d-9b73-c262ccabccf7	Q361	Première Guerre mondiale	Première Guerre mondiale	conflit armé à l'échelle planétaire, d'août 1914 à novembre 1918	global war originating in Europe, 1914–1918	1914-07-28T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-21 13:32:22.120687
21c19e94-d0c0-4cd4-83e9-21a46058f278	Q2269	Révolution industrielle	Révolution industrielle	transition vers de nouveaux procédés de fabrication en Europe et aux États-Unis aux XVIIIe et XIXe siècles	transition to new manufacturing processes in Europe and the United States, in the 18th-19th centuries	1760-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-21 13:36:47.683003
1dd541ca-1b9d-41c8-b946-1951fc3f559c	Q93315	Cyanobacteria	Cyanobacteria	embranchement de procaryotes	phylum of prokaryotes	-2100000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-22 16:04:32.48193
0e0b8e4b-c3c8-457b-b257-ccbafa213fbd	Q152	poisson	poisson	animal vertébré aquatique	vertebrate animal that lives in water and (typically) has gills	-530000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-22 19:38:57.462913
\.


--
-- TOC entry 3474 (class 0 OID 16736)
-- Dependencies: 230
-- Data for Name: events_id_mapping; Type: TABLE DATA; Schema: events; Owner: wikidata_user
--

COPY events.events_id_mapping (old_id, new_id) FROM stdin;
e2eb854a-567f-4e73-9848-0173ae02dbef	fe5ce9f5-c415-485d-a3e0-a947920e0c4f
8ab4a688-bb4c-43a5-b0b0-c9019efb5e81	6153d802-949b-4fcf-bbc1-e3711eeca288
2ef304a1-a7e2-442c-8d87-eba822dcebe3	256a51cc-1e7c-4966-9ef7-59000d7d62db
9b3d5ddb-cf34-428f-a19d-ff4cf22ced04	39941cd9-236a-4359-a908-833940a68865
5d11acb4-cc84-46c9-89b6-a0353f3b3e43	f8528d3f-c748-4e64-b98f-7cd74bca4982
0d81e20f-9bb7-43e9-aad3-24f12bcda40a	f386d579-09d6-44a5-b0c1-9f154045a5db
8b1df1ed-c92a-44e8-a4af-d959755ea8bb	2db3be43-0249-4e58-9690-2a2f7d6f2ff7
c4210eaa-945a-40dd-a917-74e9f8c77944	76b627d8-2370-49d2-ba0a-2677aa60fb27
cb277195-f76e-4c0d-9489-b99c0c0bb26f	72454424-6e2d-474b-bc80-36766a8c51a5
6d257b2e-1df6-47fa-95bb-b840bb7cfffe	1018c768-0bcf-4bce-b535-2e845f14fe38
6fbe3a92-b12b-4c1c-98e3-0518b0d15d52	1002d18f-c314-4cc3-b523-f0a096c4bce1
d8e81a4c-ea8d-40ec-94e2-e3d58910d0a5	b6cd690f-fa31-48f5-9b0a-a75055906b19
7899b57c-7211-468a-aa6c-7c856ba4d47f	40a7ce9a-b879-4c35-ad65-a4682b62a51a
42fb9c9c-4f2a-4444-8c93-fa6c9a3aedf9	14075a6d-f4bb-4066-a39f-0f02e0af4f7b
a148e8d0-f00d-4c5b-adc6-59bf8bef75b4	206fd7ff-c34a-4e4d-8ca7-1b695d6c3ada
98170c4b-6208-466c-81d5-18909733f2dc	6267e111-68ef-4b75-ae4d-6f5f67065953
843884f0-a602-49c2-a046-398e0e94b9aa	e30e5c3a-5d52-417b-bc4c-0cbfa10d2c4f
273b58f3-0257-4d69-bdd8-ea95327ce4c4	bf3e3503-a53b-44ab-9434-054cd7f9defb
35776fd2-2c50-48aa-9031-0df8cc6d9119	548744b8-f4e2-423f-b614-daf5765eadec
16e6ae38-ea10-4765-9a10-b6e05dacb2c3	9858bcc2-7f98-4805-9da6-9a2f3e58fcf5
d64e15b4-9788-4ff6-95fd-b3d54476f062	a58f5ebf-90b5-42f8-b3c5-213d8a9a8119
442097aa-cfb5-422b-a073-8efd71623e16	aff7b743-1816-4446-a1e9-4195c133d6e0
1e6f92d2-b21a-4110-a1a4-a30d47d61c20	1a47a6e1-0b36-4cef-bb2a-2caa8afd9c17
d724eab3-4b7e-4bb0-a3e8-ff13659f7dfa	c133bb10-ab74-4d8a-ab95-b1679046b753
4d782c3e-0b7d-4b68-846a-a5ea2889717a	fa79d6e3-e42c-4b66-a715-bb9e7b783d40
cbe48037-fac5-4e98-b84b-0eb9ceda48e9	ba0f3436-42a9-4d2e-8f0e-7d4bcf9f207b
659bb0e6-cee3-4460-b791-46b3300e1e0f	1a146c43-2253-4239-93a3-fd22667deb06
3ae4a05e-c11c-4e32-8245-2730f65fe6d9	b7edd46b-d653-4209-aab9-39accc4ed332
2c86fa44-0261-4175-9efb-9d107b6e7a92	3e9abd13-2fc9-4af5-80cb-be71f009997d
14c1ff64-20f9-4032-9c1a-5bdca7ed07dd	afe65c0d-b02b-46f9-819a-534ba61ad3bd
ba134fda-143b-47c8-a9d2-2333c45db640	8c9b1331-12cc-4d00-948f-875eb5b7e396
c9fa6c2c-74e8-45bf-9623-0b05f47b4e2b	ed285ad5-1016-4200-8690-06903ca23b93
fb99f36e-af62-4a2e-bf84-eaa2c4336660	b30e14b8-f95f-4ef3-8fe8-cef83502fa25
4c48ad09-25f2-4153-8105-a896484e83eb	f059964a-1fc7-4b32-8286-7ff19fb89964
0ebe48fb-c575-4d4c-8564-63d830580e2c	1dd541ca-1b9d-41c8-b946-1951fc3f559c
06c0fdbd-3474-45ac-ab66-9b1014eb4f1d	9d117809-39e5-42f6-84f2-1b67e3a22320
35394450-903d-45b9-ab23-1105192ae8f3	0e0b8e4b-c3c8-457b-b257-ccbafa213fbd
c48a17d4-7420-4eec-881d-4c13cdac4e74	235a3fe7-b25a-4306-acbb-d84091e1612f
b4fc5140-1f50-4994-a275-8663af45fcf9	aaada212-89c1-4c3b-bd7e-91f5d57fd4e0
a75732a3-bd74-4fcb-9f67-4a551f6c775f	f4b486b8-f61f-4e08-b566-1fe09983c459
7123d4b8-9925-4d3b-9e96-2533ae9984c0	6078e157-c394-4918-bab6-70b995c2832a
07ae20c1-58a6-4be2-8e13-a3e18a20e50c	17ee1c47-7335-4a9d-9b73-c262ccabccf7
d94948ea-0f90-4094-a12c-ab5fdb6e9ba5	b429042a-f223-47b6-b52a-99ed7d6b3fa0
97ac8660-14fe-4f91-b109-2dafaa0f4d6e	434b73c7-5a0a-4f96-a994-faf1da344d1a
48e7b67c-648a-48fe-8348-058ad5f0ee33	a2ed4018-4ea6-4208-b915-1b61850cbedf
9f3f9958-1b16-4500-8e19-3c70b8109a48	8b6c62b9-d214-420c-ab7b-3a5324a7c714
8e1f84d1-be99-48a1-b800-7513ecffea71	f3524352-d575-43e8-be95-fb66b51fc3f1
efbf5a99-b672-45ea-821d-54eb86485975	2f289d28-6b97-456c-95c3-41e8dcb7d50d
3fd1d524-26e6-45f7-b47f-1654c62c3a9d	21c19e94-d0c0-4cd4-83e9-21a46058f278
2561db63-93df-466d-8611-d903dbb3800f	f15c21c3-fe6b-4829-9785-3de48e3dfe53
8de76a57-cd88-4da2-9793-55fb7ce50d20	390948bf-bed0-4a4a-80c8-77d9b9384467
06269074-93a7-4298-91b0-af41284e7fac	cfefa14c-0ece-4089-acdd-202a3d95b386
1911aaaa-651a-467c-8f2d-2fced6347940	ed0b9edf-7bbf-456e-b1f5-67bd7c8bdae1
453a8c08-1175-4eaa-ae60-4800cda01117	a10bcdff-7a4a-46eb-a06f-161e73ec057b
bdb47f6e-d223-4a1b-b36c-45a6ae2d4843	ceea9428-7004-4ed8-8f07-0f7d0e4fd3ae
\.


--
-- TOC entry 3469 (class 0 OID 16437)
-- Dependencies: 225
-- Data for Name: periods; Type: TABLE DATA; Schema: periods; Owner: wikidata_user
--

COPY periods.periods (id, wikidata_id, label_fr, label_en, description_fr, description_en, start_date, end_date, temporal_location, created_at, updated_at, has_parent, children) FROM stdin;
a5ea069b-f379-44c1-be0c-7bff13cf7a62	Q58326	Deuxième République	Deuxième République	régime politique en vigueur en France de 1848 à 1852	government of France between 1848-1852	1848-02-24T00:00:00Z	1852-01-01T00:00:00Z	Globale	2025-06-21 12:16:42.326441	2025-06-23 20:59:37.614961	t	{}
de094c0d-ceb9-43ca-936e-5d479c620c28	Q8676	guerre de Sécession	American Civil War	guerre civile américaine qui a opposé les États du Sud esclavagistes aux États du Nord abolitionnistes (1861–1865)	1861–1865 civil war in the United States between the North and the South over the enslavement of African-Americans	1861-04-12T00:00:00Z	1865-04-09T00:00:00Z	Northern United States, Southern United States	2025-06-18 12:37:26.951871	2025-06-18 14:41:33.647725	f	["d35877ad-4529-4715-842a-4d2a85be1701", "56b8a948-741d-4b56-9eb9-e149bd40f328"]
bb1a2790-1202-4dec-b857-5b0cba36308f	Q210611	Mésoprotérozoïque	Mésoprotérozoïque	deuxième ère du Protérozoïque	second era of the Proterozoic Eon	-1600000000-01-01T00:00:00Z	-1000000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 14:30:47.345019	t	\N
30bbf351-118e-4cfb-bffe-d337cdfde557	Q71084	Premier Empire français	Premier Empire français	premier des deux empires français établis au profit de la dynastie des Bonaparte, de 1804 à 1814	empire of Napoleon I of France, from 1804 to 1815	1804-05-18T00:00:00Z	1815-01-01T00:00:00Z	Globale	2025-06-21 12:19:08.820479	2025-06-23 20:59:48.813904	t	{}
13ba43ef-bc53-448d-91f9-a44f9c99bf6e	Q898941	Ère de la Grande Unification	Grand Unification Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:21:22.698854	t	\N
44317eda-3ec7-4dae-bd6b-533bb3edfacd	Q780457	Assemblée nationale législative de 1791	Legislative Assembly	assemblée monocamérale en France de 1791 à 1792	former legislature of France	1791-10-01T00:00:00Z	1792-09-21T00:00:00Z	Globale	2025-06-24 21:17:46.865626	2025-06-24 21:17:51.615801	t	{}
5c965ea4-b691-46fb-8261-26c3fb956d12	Q212685	Moyen Âge central	High Middle Ages	Période historique, qui s'étend du XIe au XIIIe siècles	period in European history from 1000-1250 CE	1000-01-01T00:00:00Z	1300-01-01T00:00:00Z	Europe	2025-06-18 14:47:46.84546	2025-06-18 15:15:56.121819	t	\N
488b5b94-a511-47f1-980a-a2037a0bdaf1	Q200790	guerre d'Algérie	Algerian War	guerre d'indépendance de l'Algérie, de 1954 à 1962	war between France and the Algerian independence movement from 1954 to 1962	1954-11-01T00:00:00Z	1962-09-09T00:00:00Z	Globale	2025-06-24 21:29:36.68937	2025-06-24 21:36:00.178378	f	[]
a5d79bee-9dce-4d3b-b710-ee2161d79875	Q172932	Ère de Planck	Planck Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:35:38.279944	t	\N
e7cfaa8f-35ff-4489-86b4-feff6974eaf9	Q175211	royaume de Germanie	Kingdom of Germany	entité géopolitique d'Europe centrale entre 911 et 1806	10th-century kingdom of Germany	0843-01-01T00:00:00Z	1806-01-01T00:00:00Z	Globale	2025-06-24 21:40:17.240058	2025-06-24 21:40:17.255907	t	{}
638721a7-3073-4f55-b3e8-4012032f7892	Q25445	Holocène	Holocene	deuxième et actuelle époque géologique du Quaternaire, depuis 12 000 ans avant le présent	second and current epoch of the Quaternary Period	-9700-01-01T00:00:00Z	TODAY	Globale	2025-06-17 22:00:25.769216	2025-06-18 15:33:25.217331	t	\N
6b9ff312-4704-4461-907a-f212d74ffb06	Q323	Big Bang	Big Bang	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:35:40.011167	f	["9d54becf-436a-4d4d-9add-2561352fc32c", "23128602-addc-476e-87b7-9bb701460764", "13ba43ef-bc53-448d-91f9-a44f9c99bf6e", "1127bcaa-dab4-44a2-9669-129c6dfd7359", "9628a1cc-da8b-4e73-8b30-ad4c7f2a6535", "a5d79bee-9dce-4d3b-b710-ee2161d79875", "410f24ee-1fa8-416a-aa3e-6beff4b4dd4a"]
33f7c32b-9416-41da-8f49-a75dabb3ffa0	Q507402	Cryogénien	Cryogenian	deuxième période du Néoprotérozoïque	second period of the Neoproterozoic Era	-720000000-01-01T00:00:00Z	-635000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-18 15:34:17.876194	t	[]
bfbd0f1e-61a2-4d93-aab5-ca061bb89c14	Q83222	Mésozoïque	Mesozoic	seconde ère géologique du Phanérozoïque, anciennement appelé Ère secondaire (−252,2 à −66,0 Ma)	second erathem and era of the Phanerozoic Eonothem and Eon	-251902000-01-01T00:00:00Z	-66000000-01-01T00:00:00Z	Globale	2025-06-18 15:27:59.785102	2025-06-18 15:35:04.298189	t	["ac7d3cfc-1ce0-4221-a5b6-20e07ca271d0", "f0b75a9b-199e-4a19-9266-c3f8a2d6d601", "cac5a456-f6fa-4a7b-b947-db067e5b3ffe"]
ebb042b4-4c4b-4746-842f-a56217a1c5a8	Q102416	Cénozoïque	Cenozoic	troisième et actuelle ère géologique du Phanérozoïque, −66,0 Ma au présent	third and current era of the Phanerozoic Eon	\N	TODAY	\N	2025-06-13 12:42:13.948686	2025-06-18 15:38:44.171737	t	["bde9c481-64aa-4252-b67a-d6cf8b0bb5ab", "3c6bad13-4aa8-4844-8cf7-0f985617d6c2", "543d1edc-1c6a-4a56-8afc-41e50a9863a1"]
2f4f1e89-6fd3-43a9-ab61-646d9f0e3b73	Q2277	Empire romain	Roman Empire	nom donné à la domination romaine antique entre 27 av. J.-C. et 395 ap. J.-C.	period of ancient Rome following the Republic	-0026-01-01T00:00:00Z	0395-01-01T00:00:00Z	\N	2025-06-13 12:42:13.948686	2025-06-20 22:06:43.994722	f	[]
9518ad48-ff6c-4a93-9c60-47d2d5424bcb	Q3778613	guerre caroline	Caroline War	deuxième phase de la guerre de Cent Ans (1369-1389)	second part of the Hundred Years' War, named after Charles V of France, who resumed the war nine years after the Treaty of Brétigny (signed 1360)	1369-01-01T00:00:00Z	1389-01-01T00:00:00Z	Globale	2025-06-24 21:45:33.599471	2025-06-24 21:45:33.616319	t	{}
c6e468ed-84f9-41db-a77d-7a746a266f03	Q3778618	guerre lancastrienne	Lancastrian War	phase finale de la guerre de Cent Ans (1415-1453)	final phase of the Anglo-French Hundred Years' War	1415-01-01T00:00:00Z	1453-01-01T00:00:00Z	Globale	2025-06-24 21:45:50.528697	2025-06-24 21:45:50.543872	t	{}
11a06329-ae6e-40c2-8ab1-7aa42cb1b9d1	Q70802	Troisième République française	Troisième République française	régime politique en vigueur en France de 1870 à 1940	nation of France from 1870 to 1940	1870-09-04T00:00:00Z	1940-07-10T00:00:00Z	\N	2025-06-21 11:59:35.233712	2025-06-23 20:57:29.030823	t	[]
ed1a6563-8cbe-47dc-9136-755c0e736655	Q219825	Convention nationale	Convention nationale	régime politique français qui gouverne la France du 21 septembre 1792 au 26 octobre 1795	single-chamber assembly in France from 21 September 1792 to 26 October 1795	1792-09-20T00:00:00Z	1795-10-26T00:00:00Z	Globale	2025-06-21 12:39:18.338319	2025-06-23 20:58:25.300063	t	{}
8b20b18f-ea13-438e-83b0-b0400f7b6f9f	Q1205962	première guerre civile de Castille	Castilian Civil War	guerre civile au XIVe siècle	14th-century war of succession in the Kingdom of Castile	1351-01-01T00:00:00Z	1369-01-01T00:00:00Z	Globale	2025-06-24 21:46:10.561612	2025-06-24 21:46:10.576413	t	{}
5fe76243-4127-4a41-a0bb-568bc67d6a59	Q362	Seconde Guerre mondiale	Seconde Guerre mondiale	conflit armé à l'échelle planétaire, de septembre 1939 à septembre 1945	1939–1945 global conflict	1939-09-01T00:00:00Z	1945-09-02T00:00:00Z	Globale	2025-06-13 20:20:10.887893	2025-06-17 12:29:44.506868	f	\N
0d7a4ac4-0af2-46cf-aa13-cac6c16d4f62	Q361	Première Guerre mondiale	Première Guerre mondiale	conflit armé à l'échelle planétaire, d'août 1914 à novembre 1918	global war originating in Europe, 1914–1918	1914-07-28T00:00:00Z	1918-11-11T00:00:00Z	Globale	2025-06-13 20:22:37.317685	2025-06-17 12:29:44.506868	f	\N
c6470a58-a216-4058-ab85-aa015e992518	Q550172	guerre de Succession de Bretagne	War of the Breton Succession	conflit annexe de la guerre de Cent Ans	conflict between the Counts of Blois and the Montforts of Brittany	1341-01-01T00:00:00Z	1365-04-20T00:00:00Z	Globale	2025-06-24 21:46:30.90589	2025-06-24 21:46:30.922627	t	{}
7c8aa77f-9634-4a2d-a921-9ad2b98bd106	Q5264903	Croisade d'Henri le Despenser	Despenser's Crusade	\N	14th-century military campaign	1382-12-01T00:00:00Z	1383-09-01T00:00:00Z	Globale	2025-06-24 21:48:04.585257	2025-06-24 21:48:04.606541	t	{}
6e8efc7d-4e32-4554-92d3-ecf11f91fcbd	Q392213	siège d'Orléans	Siege of Orléans	bataille de la guerre de Cent Ans	siege in 1428-29	1428-10-30T00:00:00Z	1429-05-26T00:00:00Z	Globale	2025-06-24 21:48:23.75988	2025-06-24 21:48:23.776539	t	{}
9d54becf-436a-4d4d-9add-2561352fc32c	Q901651	Ère de Réionisation	Reionization Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:17:14.565109	t	\N
30f68b7c-2488-4780-8995-a198219be947	Q58202	Monarchie de Juillet	July Monarchy	régime politique en France, de 1830 à 1848	kingdom governing France, 1830–1848	1830-01-01T00:00:00Z	1848-01-01T00:00:00Z	\N	2025-06-21 12:17:26.766334	2025-06-23 20:59:44.381213	t	[]
f6740ba3-5dd4-4f72-8953-486fdcee34ca	Q62100	Ordovicien	Ordovician	seconde période géologique du Paléozoïque, de 485,4 à 443,4 Ma avant le présent	second period of the Paleozoic Era	-486850000-01-01T00:00:00Z	-443100000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 14:38:03.119852	t	[]
b338e87b-957c-4edf-939b-304b0edce6eb	Q899383	Ère Hadronique	Hadronic Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 21:46:56.283063	t	["b338e87b-957c-4edf-939b-304b0edce6eb"]
56b8a948-741d-4b56-9eb9-e149bd40f328	Q749397	théâtre oriental de la guerre de Sécession	Eastern Theater of the American Civil War	\N	War	1861-01-01T00:00:00Z	1865-01-01T00:00:00Z	GLOBAL	2025-06-18 14:12:51.253398	2025-06-18 14:41:33.674606	t	\N
ab08b8ff-172e-4aa7-a77d-bf6115ee390f	Q1463941	États généraux de 1789	Estates-General of 1789	états généraux du royaume de France convoqués le 24 janvier 1789 par Louis XVI	general assembly representing the French estates of the realm: the clergy (First Estate), the nobility (Second Estate), and the commoners (Third Estate). Summoned by King Louis XVI	1789-01-24T00:00:00Z	1789-06-20T00:00:00Z	Globale	2025-06-24 21:21:33.544564	2025-06-24 21:21:59.949789	t	{}
6b2c57c6-ee49-4f73-8f65-07f3d928c1b4	Q75507	Paléozoïque	Paleozoic	première ère géologique du Phanérozoïque, anciennement appelée « ère primaire » (de -541 à -252,2 millions d’années)	first erathem and era of the Phanerozoic eonothem and eon	-538800000-01-01T00:00:00Z	-251902000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-18 15:38:36.640768	t	["072f28ae-1880-4f0e-b8a6-65e227de7f14", "f5579aa8-b960-4a0d-ad4b-32f9469f55f6", "83ce5831-8d90-49f6-8afe-f0b49cf829ac", "f6740ba3-5dd4-4f72-8953-486fdcee34ca", "593173c4-243b-4b50-a60e-0083eb29bb65"]
bc36f7d6-31f3-4f34-a781-b691e9c08b52	Q101313	Phanérozoïque	Phanerozoic	actuel éon de l'échelle des temps géologiques, les 541 derniers millions d'années	fourth and current eonothem and eon of the geological timescale	-538800000-01-01T00:00:00Z	TODAY	Globale	2025-06-16 20:46:19.776579	2025-06-18 15:38:44.153158	t	["bfbd0f1e-61a2-4d93-aab5-ca061bb89c14", "6b2c57c6-ee49-4f73-8f65-07f3d928c1b4", "ebb042b4-4c4b-4746-842f-a56217a1c5a8"]
3f96076c-df4e-4d26-80dc-8f7e2d789abc	Q202763	haut Moyen Âge	Early Middle Ages	période historique du Ve au Xe siècle après J.-C.	period of European history lasting from the 5th century to the 10th century	0500-01-01T00:00:00Z	0900-01-01T00:00:00Z	Europe	2025-06-18 14:47:46.84605	2025-06-18 15:15:54.526546	t	\N
13d41a10-6472-4f35-a2ec-774428d715ce	Q183	Allemagne	Germany	pays d'Europe centrale	country in Central Europe	1949-05-23T00:00:00Z	TODAY	Globale	2025-06-24 21:35:56.500497	2025-06-24 21:40:17.247548	f	["eb1f42f3-f475-491d-9610-959dfd5f43ea", "e7cfaa8f-35ff-4489-86b4-feff6974eaf9"]
31600dba-a3d2-4c47-8dde-f726ca458cfd	Q1236209	Ère des Âges Sombres	Dark Ages Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:17:55.176933	t	\N
66eb27de-46f7-4c61-9a17-63edeadbb3c9	Q544	Système solaire	Solar System	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 12:29:44.506868	f	\N
ac7d3cfc-1ce0-4221-a5b6-20e07ca271d0	Q47158	Trias	Triassic	première période géologique du Mésozoïque, 252,2 à 201,3 Ma avant le présent	first system and  period of the Mesozoic erathem and era	-251902000-01-01T00:00:00Z	-201400000-01-01T00:00:00Z	Globale	2025-06-18 15:29:08.000713	2025-06-18 15:29:08.030135	t	{}
072f28ae-1880-4f0e-b8a6-65e227de7f14	Q79064	Cambrien	Cambrian	première période géologique du Paléozoïque, de 541 à 485,4 Ma avant le présent	first period of the Paleozoic Era	-538800000-01-01T00:00:00Z	-486850000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 14:37:42.248083	t	[]
f0b75a9b-199e-4a19-9266-c3f8a2d6d601	Q45805	Jurassique	Jurassic	seconde période géologique du Mésozoïque, 201,3 à 145,0 Ma avant le présent	second period of the Mesozoic Era	-201400000-01-01T00:00:00Z	-145000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-18 15:29:40.742506	t	[]
689ff2ee-81dc-4517-8321-214bf8fa117a	Q5383	Trias	Triassic	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 14:34:54.18986	t	\N
543d1edc-1c6a-4a56-8afc-41e50a9863a1	Q23018	Paléogène	Paleogene	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-18 15:31:59.379729	t	\N
bde9c481-64aa-4252-b67a-d6cf8b0bb5ab	Q3982	Néogène	Neogene	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 14:34:08.086211	t	\N
15f18d51-ff68-49ea-b9b4-30245201bc99	Q191935	Néoprotérozoïque	Neoproterozoic	troisième et dernière ère du Protérozoïque	third and final era of the Proterozoic Eon	-1000000000-01-01T00:00:00Z	-538800000-01-01T00:00:00Z	\N	2025-06-17 11:06:44.840836	2025-06-18 15:34:17.863786	t	["33f7c32b-9416-41da-8f49-a75dabb3ffa0"]
5b8c5a4a-eb08-4438-b3a1-2482d67d0894	Q617333	guerre franco-espagnole	Franco-Spanish War	guerre de 1635-1659	1635–1659 war	1635-05-19T00:00:00Z	1659-11-07T00:00:00Z	Globale	2025-06-24 21:41:31.79073	2025-06-24 21:42:31.503184	f	["72f7a3d5-677c-43c9-a7fc-17657c9f828c"]
37382861-6955-4001-8791-2df2121b122c	Q2259304	guerre édouardienne	Edwardian War	phase initiale de la guerre de Cent Ans (1337-1360)	first part of the Hundred Years' War	1337-01-01T00:00:00Z	1360-01-01T00:00:00Z	Globale	2025-06-24 21:45:15.45328	2025-06-24 21:45:15.46614	t	{}
f5579aa8-b960-4a0d-ad4b-32f9469f55f6	Q5426	Silurien	Silurian	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 14:37:51.515376	t	\N
0c36b1ff-8ce6-4106-b2b5-43fc70e55f66	Q193738	Paléoprotérozoïque	Paleoproterozoic	première ère du Protérozoïque	first era of the Proterozoic Eon	-2500000000-01-01T00:00:00Z	-1600000000-01-01T00:00:00Z	\N	2025-06-13 12:42:13.948686	2025-06-20 22:16:08.871459	t	[]
83ce5831-8d90-49f6-8afe-f0b49cf829ac	Q65955	Dévonien	Devonian	quatrième période géologique du Paléozoïque, 419,2 à 359 Ma avant le présent	fourth period of the Paleozoic Era	-419200000-01-01T00:00:00Z	-358900000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 14:37:58.146607	t	[]
23128602-addc-476e-87b7-9bb701460764	Q899426	Ère de la Recombinaison	Recombination Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:21:19.904784	t	\N
1127bcaa-dab4-44a2-9669-129c6dfd7359	Q899367	Ère Électrofaible	Electroweak Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:21:26.268338	t	\N
9628a1cc-da8b-4e73-8b30-ad4c7f2a6535	Q899379	Ère Leptonique	Leptonic Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:35:36.404278	t	\N
410f24ee-1fa8-416a-aa3e-6beff4b4dd4a	Q217416	Ère de la Nucléosynthèse Primordiale	Primordial Nucleosynthesis Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-20 22:35:40.028849	t	\N
d65ff286-8742-437f-99c6-d7c1c24dddc6	Q8740	guerre du Viêt Nam	guerre du Viêt Nam	conflit de 1955 à 1975 en Asie du Sud-Est, opposant le Nord Viêt Nam au Sud Viêt Nam aidé par l’intervention militaire massive des États-Unis	armed conflict in Vietnam, Laos, and Cambodia between North Vietnam and South Vietnam, from 1955 to 1975	1955-11-01T00:00:00Z	1975-04-30T00:00:00Z	Globale	2025-06-21 13:06:18.7942	2025-06-21 13:06:18.7942	f	{}
51128993-99a5-488a-a67a-f048ab95f9a2	Q8683	guerre froide	Cold War	conflit idéologique du XXe siècle	1947–1991 tension between the Soviet Union and the United States and their respective allies	1945-01-01T00:00:00Z	1991-12-25T00:00:00Z	\N	2025-06-13 20:16:05.284393	2025-06-22 19:58:00.235746	f	[]
a6f8de8c-f393-4ff5-b595-4d0095dda182	Q69829	Quatrième République	Quatrième République	quatrième Constitution républicaine et régime politique de la France de 1946 à 1958	government of France between 1946 and 1958	1946-01-01T00:00:00Z	1958-01-01T00:00:00Z	Globale	2025-06-21 12:04:03.414566	2025-06-23 20:57:33.857927	t	{}
a77792d9-ca74-4196-a3ef-3ee8fda5b0e2	Q877619	Consulat	Consulat	régime politique en France, du 9 novembre 1799 au 18 mai 1804	former government of France	1799-11-09T00:00:00Z	1804-05-18T00:00:00Z	Globale	2025-06-21 12:32:39.045682	2025-06-23 20:58:22.908449	t	{}
d35877ad-4529-4715-842a-4d2a85be1701	Q543165	bataille de fort Sumter	Battle of Fort Sumter	Bataille qui a déclenché la guerre de secession	bombardment of Fort Sumter, immediate cause and first battle of the American Civil War	1861-04-12T00:00:00Z	1861-04-14T00:00:00Z	Fort Sumter	2025-06-18 14:12:51.253791	2025-06-18 14:41:29.462344	t	\N
089fb41b-dc41-437c-90c1-12ae02d5be1b	Q219817	Directoire	Directoire	régime politique français en place durant la Première République de 1795 à 1799	five-member executive committee of Revolutionary France (1795-1799)	1795-10-26T00:00:00Z	1799-11-09T00:00:00Z	Globale	2025-06-21 12:38:23.843971	2025-06-23 20:59:33.673824	t	{}
2098d046-6883-4b5d-8885-8ce396f57501	Q207162	Restauration	Bourbon Restoration in France	période de l'histoire de France, de 1814-1815 à 1830	period of French history, 1814–1830	1814-01-01T00:00:00Z	1830-01-01T00:00:00Z	\N	2025-06-21 12:17:55.750309	2025-06-23 20:59:35.541109	t	[]
813a5135-c9b4-4e79-9f2c-1170735c8686	Q76402	Permien	Permian	sixième et dernière période géologique du Paléozoïque, 298,9 à 252,2 Ma avant le présent	sixth and final system and period of the Paleozoic erathem and era	-298900000-01-01T00:00:00Z	-251902000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 13:09:58.145994	t	[]
da47065e-eb99-4bdd-8957-76caf2769e5b	Q731470	Éoarchéen	Éoarchéen	première ère de l'Archéen	first era of the Archean Eon	-4031000000-01-01T00:00:00Z	-3600000000-01-01T00:00:00Z	Globale	2025-06-16 20:48:13.274011	2025-06-17 12:47:42.163577	t	\N
41d63da2-2416-430e-a378-d2c77f552d51	Q212976	Moyen Âge tardif	Late Middle Ages	période historique	period of European history generally comprising the 14th and 15th centuries	1301-01-01T00:00:00Z	1492-01-01T00:00:00Z	Europe	2025-06-18 14:47:46.846643	2025-06-18 15:15:57.982756	t	\N
b9c1efc8-d16f-49a4-94f4-7024451c54ff	Q104460	Hadéen	Hadean	premier éon de l'échelle des temps géologiques, de 4 560 Ma d'années à 4 000 Ma avant le présent	first eon of the geological timescale, beginning with the formation of the Earth about 4.567 billion years ago	-4567300000-01-01T00:00:00Z	-4031000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 12:47:20.767998	t	[]
31e6cd5f-490c-4ae0-96da-29869adb9c07	Q738167	Paléoarchéen	Paléoarchéen	deuxième ère de l'Archéen	second era of the Archean Eon	-3600000000-01-01T00:00:00Z	-3200000000-01-01T00:00:00Z	Globale	2025-06-16 20:48:57.828864	2025-06-17 12:47:43.540535	t	\N
6161cbe5-c1c6-4cbb-9428-ff5a9628654f	Q142	France	France	pays d'Europe de l'Ouest	country in Western Europe and other continents (through its overseas territories in America, Africa and Oceania)	0843-08-01T00:00:00Z	TODAY	Globale	2025-06-23 20:57:17.733746	2025-06-24 21:23:14.919485	f	["11a06329-ae6e-40c2-8ab1-7aa42cb1b9d1", "a6f8de8c-f393-4ff5-b595-4d0095dda182", "a8afaeda-70e9-4553-8661-a11840b4f0e8", "a77792d9-ca74-4196-a3ef-3ee8fda5b0e2", "ed1a6563-8cbe-47dc-9136-755c0e736655", "089fb41b-dc41-437c-90c1-12ae02d5be1b", "2098d046-6883-4b5d-8885-8ce396f57501", "a5ea069b-f379-44c1-be0c-7bff13cf7a62", "30f68b7c-2488-4780-8995-a198219be947", "30bbf351-118e-4cfb-bffe-d337cdfde557", "44317eda-3ec7-4dae-bd6b-533bb3edfacd", "ab08b8ff-172e-4aa7-a77d-bf6115ee390f", "62780556-6b99-4f50-9bb3-f139dc8a240e"]
8a274cd2-fc80-405e-9c61-0f8b984bc977	Q607992	Mésoarchéen	Mésoarchéen	troisième ère de l'Archéen	third era of the Archean Eon	-3200000000-01-01T00:00:00Z	-2800000000-01-01T00:00:00Z	Globale	2025-06-16 20:52:29.576507	2025-06-17 12:47:44.878224	t	\N
b90d3dfc-0f1a-4043-a2f3-8f87c695f825	Q104168	Archéen	Archean	second éon de l'échelle des temps géologiques	second eon of the geologic timescale, spanning from around 4.031 to 2.5 billion years ago	-4031000000-01-01T00:00:00Z	-2500000000-01-01T00:00:00Z	Globale	2025-06-16 20:45:18.405834	2025-06-17 12:47:50.481042	t	["da47065e-eb99-4bdd-8957-76caf2769e5b", "31e6cd5f-490c-4ae0-96da-29869adb9c07", "8a274cd2-fc80-405e-9c61-0f8b984bc977", "e2ea1fd7-b102-402f-a5c3-397bdef778d7"]
e2ea1fd7-b102-402f-a5c3-397bdef778d7	Q645135	Néoarchéen	Néoarchéen	Quatrième et dernière ère de l'Archéen	fourth and final era of the Archean Eon	-2800000000-01-01T00:00:00Z	-2500000000-01-01T00:00:00Z	Globale	2025-06-16 20:53:15.143929	2025-06-17 12:47:50.500321	t	\N
62780556-6b99-4f50-9bb3-f139dc8a240e	Q6534	Révolution française	French Revolution	période de l'histoire de France et de ses colonies, du 5 mai 1789 au 9 novembre 1799	revolution in France from 1789 to 1799	1789-07-14T00:00:00Z	1799-11-09T00:00:00Z	Globale	2025-06-24 21:23:12.499938	2025-06-24 21:23:14.927048	t	{}
cac5a456-f6fa-4a7b-b947-db067e5b3ffe	Q44626	Crétacé	Cretaceous	troisième période géologique du Mésozoïque, 145,0 à 66,0 Ma avant le présent	third and final period of the Mesozoic Era	-145000000-01-01T00:00:00Z	-66000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-18 15:30:12.054365	t	[]
eb1f42f3-f475-491d-9610-959dfd5f43ea	Q12548	Saint-Empire romain germanique	Holy Roman Empire	regroupement politique de terres d’Europe occidentale et centrale, de 962 à 1806	multi-ethnic complex of territories in Western and Central Europe (800/962–1806)	0800-12-29T00:00:00Z	1806-01-01T00:00:00Z	Globale	2025-06-24 21:38:47.469227	2025-06-24 21:38:47.485362	t	{}
72f7a3d5-677c-43c9-a7fc-17657c9f828c	Q124650205	siège d'Alexandrie	Siege of Alessandria (1657)	19 juillet au 18 août 1657 en Italie	19 July - 18 August 1657	1657-07-19T00:00:00Z	1657-08-18T00:00:00Z	Globale	2025-06-24 21:42:31.49385	2025-06-24 21:42:31.515234	t	{}
3c6bad13-4aa8-4844-8cf7-0f985617d6c2	Q26185	Quaternaire	Quaternary	troisième et actuelle période géologique du Cénozoïque, -2,58 Ma au présent	third and current period of the Cenozoic Era	-2580000-01-01T00:00:00Z	TODAY	\N	2025-06-13 12:42:13.948686	2025-06-18 15:33:25.207713	t	["638721a7-3073-4f55-b3e8-4012032f7892"]
980a3976-17e6-418a-ae56-360057e54cb7	Q104162	Protérozoïque	Proterozoic	troisième et dernier éon du Précambrien	third eon of the geological timescale, last eon of the Precambrian Supereon	-2500000000-01-01T00:00:00Z	-538800000-01-01T00:00:00Z	Globale	2025-06-16 20:45:43.681521	2025-06-18 15:34:17.839214	t	["0c36b1ff-8ce6-4106-b2b5-43fc70e55f66", "bb1a2790-1202-4dec-b857-5b0cba36308f", "15f18d51-ff68-49ea-b9b4-30245201bc99"]
00e7b0d1-2de5-4b93-b7c2-85e4483ccef3	Q2	Terre	Earth	troisième planète à partir du Soleil dans le système solaire	third planet from the Sun in the Solar System	-4540000000-01-01T00:00:00Z	TODAY	Globale	2025-06-13 12:42:13.948686	2025-06-18 15:38:44.129731	f	["b90d3dfc-0f1a-4043-a2f3-8f87c695f825", "b9c1efc8-d16f-49a4-94f4-7024451c54ff", "980a3976-17e6-418a-ae56-360057e54cb7", "bc36f7d6-31f3-4f34-a781-b691e9c08b52"]
90a29c8d-0aab-4c4c-abf1-2822cbf7b0e8	Q12554	Moyen Âge	Middle Ages	période de l'histoire de l'Europe, du début du Ve siècle à la fin du XVe siècle	period of European history from the 5th to the late 15th-century	0476-01-01T00:00:00Z	1453-01-01T00:00:00Z	\N	2025-06-18 08:27:36.619974	2025-06-20 21:02:51.135336	f	["3f96076c-df4e-4d26-80dc-8f7e2d789abc", "5c965ea4-b691-46fb-8261-26c3fb956d12", "41d63da2-2416-430e-a378-d2c77f552d51"]
593173c4-243b-4b50-a60e-0083eb29bb65	Q133738	Carbonifère	Carboniferous	cinquième période géologique du Paléozoïque, 359 à 298,9 Ma avant le présent	fifth period of the Paleozoic Era	-358900000-01-01T00:00:00Z	-298900000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 14:38:16.604565	t	[]
a8afaeda-70e9-4553-8661-a11840b4f0e8	Q200686	Cinquième République française	Cinquième République française	régime politique en vigueur en France depuis 1958	current system of government of France (1958–present)	1958-10-04T00:00:00Z	TODAY	Globale	2025-06-21 12:10:27.549714	2025-06-23 20:57:40.621833	t	{}
d78eb3ac-5675-4ced-b107-bbe474332719	Q3310304	Deuxième guerre d'indépendance de l'Écosse	Second War of Scottish Independence	1332–1357 war between Scotland and England	1332–1357 war between Scotland and England	1332-01-01T00:00:00Z	1357-01-01T00:00:00Z	Globale	2025-06-24 21:47:47.962267	2025-06-24 21:47:47.980971	t	{}
805838b6-5a1b-4773-9205-aba30f306a1d	Q12551	guerre de Cent Ans	Hundred Years' War	série de conflits opposant la France et l'Angleterre de 1337 à 1453	series of conflicts and wars between England and France between 1337 and 1453	1337-06-01T00:00:00Z	1453-10-18T00:00:00Z	Globale	2025-06-24 21:44:08.759469	2025-06-24 21:48:43.615872	f	["37382861-6955-4001-8791-2df2121b122c", "9518ad48-ff6c-4a93-9c60-47d2d5424bcb", "c6e468ed-84f9-41db-a77d-7a746a266f03", "8b20b18f-ea13-438e-83b0-b0400f7b6f9f", "c6470a58-a216-4058-ab85-aa015e992518", "d78eb3ac-5675-4ced-b107-bbe474332719", "7c8aa77f-9634-4a2d-a921-9ad2b98bd106", "6e8efc7d-4e32-4554-92d3-ecf11f91fcbd", "14440c7f-fc98-4a78-9ffc-a17c26df1dba"]
14440c7f-fc98-4a78-9ffc-a17c26df1dba	Q2664602	guerre des Deux Pierre	War of the Two Peters	\N	(1356-1369) Medieval warlike confrontation between the Castilian and Aragonese crowns	1356-01-01T00:00:00Z	1369-01-01T00:00:00Z	Globale	2025-06-24 21:48:43.607978	2025-06-24 21:48:43.623589	t	{}
6d56bb04-2f7a-4754-9aab-aa68808fe85b	Q11761	âge du bronze	Bronze Age	période de la Protohistoire et de l'Histoire caractérisée par l'existence de la métallurgie du bronze	prehistoric period and age studied in archaeology, part of the Holocene Epoch	-3099-01-01T00:00:00Z	-1199-01-01T00:00:00Z	Globale	2025-06-24 21:57:15.454505	2025-06-24 21:57:15.463455	f	{}
\.


--
-- TOC entry 3475 (class 0 OID 16742)
-- Dependencies: 231
-- Data for Name: periods_id_mapping; Type: TABLE DATA; Schema: periods; Owner: wikidata_user
--

COPY periods.periods_id_mapping (old_id, new_id) FROM stdin;
00f287bf-7f22-4329-bee6-2c638b53dcb6	a5d79bee-9dce-4d3b-b710-ee2161d79875
f9b53242-13be-44d1-8b79-af4cdf7ef417	13ba43ef-bc53-448d-91f9-a44f9c99bf6e
fa190502-7017-482b-9cc6-060455168a36	33f7c32b-9416-41da-8f49-a75dabb3ffa0
3940254f-219e-4ab1-a78e-af887818f6f2	2f4f1e89-6fd3-43a9-ab61-646d9f0e3b73
ad702fe2-4f1b-4fb0-ad1d-b2e2b1cfd913	ebb042b4-4c4b-4746-842f-a56217a1c5a8
4eb5c84b-710a-441b-91aa-271499c0fdd8	5fe76243-4127-4a41-a0bb-568bc67d6a59
c92adaa0-22d1-4362-b286-844b998ee2d6	0d7a4ac4-0af2-46cf-aa13-cac6c16d4f62
9378b1c4-3439-48dc-bacb-44e52700a323	6b9ff312-4704-4461-907a-f212d74ffb06
da1781ff-396b-41cd-9bfc-1351ef70b894	bb1a2790-1202-4dec-b857-5b0cba36308f
eada541d-d265-413d-8cd0-6f27866cf332	bc36f7d6-31f3-4f34-a781-b691e9c08b52
219086f0-c7d9-4a9b-a7ef-b19e8d409d4b	15f18d51-ff68-49ea-b9b4-30245201bc99
784cf18a-1680-48b4-917f-59fc2754dec4	51128993-99a5-488a-a67a-f048ab95f9a2
e2cf5d86-6fab-4e1a-ba2a-81e79c1965b9	f0b75a9b-199e-4a19-9266-c3f8a2d6d601
c77d2645-7f0e-4a60-8908-bab49409bc35	072f28ae-1880-4f0e-b8a6-65e227de7f14
139b60a5-61f3-4c67-9c0c-0c120bc6a3a4	6b2c57c6-ee49-4f73-8f65-07f3d928c1b4
b59f15ad-f201-401d-abb8-78069d4e2402	f6740ba3-5dd4-4f72-8953-486fdcee34ca
14715b17-e088-4e63-b654-dbf9d4106246	bde9c481-64aa-4252-b67a-d6cf8b0bb5ab
16b49d75-1c65-4062-bd78-3df0780ca25a	f5faf214-c327-49d3-8138-f69c18125b1b
3c199503-b4f0-4324-bf7f-0e1d529bd78f	66eb27de-46f7-4c61-9a17-63edeadbb3c9
ac860e24-ad83-433e-b8ce-7af45d4ede91	f5579aa8-b960-4a0d-ad4b-32f9469f55f6
d8e04901-5db5-47d5-9ef5-efc4e5a2d0b1	1127bcaa-dab4-44a2-9669-129c6dfd7359
59142153-8c02-45f6-a22e-5cc90732b9a4	543d1edc-1c6a-4a56-8afc-41e50a9863a1
d50932f9-58c5-4858-8ea8-26b57cecc1ac	410f24ee-1fa8-416a-aa3e-6beff4b4dd4a
5488f877-89ce-4d91-b86a-be5b189e5068	689ff2ee-81dc-4517-8321-214bf8fa117a
c32781f2-abf5-4339-b045-d3e19592f226	31600dba-a3d2-4c47-8dde-f726ca458cfd
4d43ab7d-5e24-4a73-bf2d-cb486844452b	b338e87b-957c-4edf-939b-304b0edce6eb
c660debd-49d0-43a5-9f2a-9c80c6a54199	83ce5831-8d90-49f6-8afe-f0b49cf829ac
c70a4a90-d387-40f8-a027-8a0dd08bdec4	0c36b1ff-8ce6-4106-b2b5-43fc70e55f66
01b65785-ca0f-4690-abba-b551bf5f0d01	23128602-addc-476e-87b7-9bb701460764
54fb5b75-0183-427d-9a4f-b336773a3bb8	9628a1cc-da8b-4e73-8b30-ad4c7f2a6535
31665427-83ad-43e7-a375-0f2ac511a7db	9d54becf-436a-4d4d-9add-2561352fc32c
a0d99b4b-446c-476b-a1ae-9489071dab25	593173c4-243b-4b50-a60e-0083eb29bb65
68581393-b39f-4850-8add-d54c04633c18	813a5135-c9b4-4e79-9f2c-1170735c8686
177832d7-dfa1-45f2-a131-291397b224d8	980a3976-17e6-418a-ae56-360057e54cb7
090a7405-9bab-4906-826c-f3d8fdf63da9	cac5a456-f6fa-4a7b-b947-db067e5b3ffe
bf04d944-6364-4b23-81e7-5583bd442b03	00e7b0d1-2de5-4b93-b7c2-85e4483ccef3
910577eb-fb19-420a-b933-37f2f454d6fd	8a274cd2-fc80-405e-9c61-0f8b984bc977
7f9e774c-9d65-4770-b3b9-ca8dc664c781	3c6bad13-4aa8-4844-8cf7-0f985617d6c2
2105e47b-34b7-441b-8fff-cd9448f179fd	31e6cd5f-490c-4ae0-96da-29869adb9c07
4f609e7f-668b-421f-b8da-10cc5d33c326	da47065e-eb99-4bdd-8957-76caf2769e5b
47745144-cc81-446e-b320-6896c6955056	e2ea1fd7-b102-402f-a5c3-397bdef778d7
ea181732-9fb3-4bc4-9141-58e9961218b9	b90d3dfc-0f1a-4043-a2f3-8f87c695f825
900a61ce-9474-4a99-a498-eb9454ff32ad	b9c1efc8-d16f-49a4-94f4-7024451c54ff
\.


--
-- TOC entry 3477 (class 0 OID 16813)
-- Dependencies: 233
-- Data for Name: stories; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.stories (id, title_fr, title_en, description_fr, description_en, author, is_public, created_at, updated_at) FROM stdin;
19e7f8d5-7f25-4ca8-80a1-50501744344b	Univers moderne	Univers moderne	\N	\N	moi	t	2025-06-13 13:09:17.972568	2025-06-13 13:09:17.972568
14871e50-f1c6-4355-bcd6-1984ed9c7c81	Histoire de la vie sur terre	Histoire de la vie sur terre	\N	\N	moi	t	2025-06-13 21:27:15.42556	2025-06-13 21:27:15.42556
ec5a2349-8977-4038-9e59-b8dc67dfd7f3	big bang	big bang	\N	\N	moi	t	2025-06-13 21:31:01.428956	2025-06-13 21:31:01.428956
fc457204-d29a-4f70-8a1e-9783d1264fa0	Guerres modernes	Modernes was	\N	\N	moi	t	2025-06-13 21:31:53.541612	2025-06-13 21:31:53.541612
a30ccba5-3342-4c69-a96d-a47dc184ddc1	Régimes politiques en france	Political Regimes in France	Différents régimes politiques en France, depuis la Révolution jusqu'à nos jours.	Different political regimes in France, from the Revolution to the present day.	Moi	t	2025-06-21 12:26:59.773467	2025-06-21 12:26:59.773467
d63287a0-570c-4ea4-a3c9-00af244b163f	Egypte antique	Egypte antique	\N	\N	moi	t	2025-06-21 12:53:14.275708	2025-06-21 12:53:14.275708
25dd84b1-758e-4aaa-afe7-6e5aa795d8c2	Empire Romain	Empire Romain	\N	\N	moi	f	2025-06-21 12:44:53.535847	2025-06-22 19:58:53.276573
\.


--
-- TOC entry 3476 (class 0 OID 16808)
-- Dependencies: 232
-- Data for Name: stories_id_mapping; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.stories_id_mapping (old_id, new_id) FROM stdin;
1	7362fc98-ccf6-4f2e-8372-59837a2d2da3
2	758a2e75-9605-4032-8ba5-1834019e9c56
3	b52ddca9-a959-4a24-8bd7-cdd3570b8aee
4	baf2c2bc-0854-4619-af99-ebcf2e951f55
\.


--
-- TOC entry 3472 (class 0 OID 16486)
-- Dependencies: 228
-- Data for Name: story_events; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.story_events (story_id, event_id) FROM stdin;
fc457204-d29a-4f70-8a1e-9783d1264fa0	21c19e94-d0c0-4cd4-83e9-21a46058f278
14871e50-f1c6-4355-bcd6-1984ed9c7c81	1dd541ca-1b9d-41c8-b946-1951fc3f559c
ec5a2349-8977-4038-9e59-b8dc67dfd7f3	9d117809-39e5-42f6-84f2-1b67e3a22320
25dd84b1-758e-4aaa-afe7-6e5aa795d8c2	f4b486b8-f61f-4e08-b566-1fe09983c459
25dd84b1-758e-4aaa-afe7-6e5aa795d8c2	548744b8-f4e2-423f-b614-daf5765eadec
fc457204-d29a-4f70-8a1e-9783d1264fa0	571e3967-2c7b-40d7-8464-28de6233cfef
14871e50-f1c6-4355-bcd6-1984ed9c7c81	2f289d28-6b97-456c-95c3-41e8dcb7d50d
19e7f8d5-7f25-4ca8-80a1-50501744344b	434b73c7-5a0a-4f96-a994-faf1da344d1a
19e7f8d5-7f25-4ca8-80a1-50501744344b	b429042a-f223-47b6-b52a-99ed7d6b3fa0
19e7f8d5-7f25-4ca8-80a1-50501744344b	f15c21c3-fe6b-4829-9785-3de48e3dfe53
19e7f8d5-7f25-4ca8-80a1-50501744344b	9d117809-39e5-42f6-84f2-1b67e3a22320
19e7f8d5-7f25-4ca8-80a1-50501744344b	206fd7ff-c34a-4e4d-8ca7-1b695d6c3ada
19e7f8d5-7f25-4ca8-80a1-50501744344b	c133bb10-ab74-4d8a-ab95-b1679046b753
14871e50-f1c6-4355-bcd6-1984ed9c7c81	c133bb10-ab74-4d8a-ab95-b1679046b753
25dd84b1-758e-4aaa-afe7-6e5aa795d8c2	fa79d6e3-e42c-4b66-a715-bb9e7b783d40
\.


--
-- TOC entry 3471 (class 0 OID 16476)
-- Dependencies: 227
-- Data for Name: story_periods; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.story_periods (story_id, period_id) FROM stdin;
fc457204-d29a-4f70-8a1e-9783d1264fa0	0d7a4ac4-0af2-46cf-aa13-cac6c16d4f62
fc457204-d29a-4f70-8a1e-9783d1264fa0	5fe76243-4127-4a41-a0bb-568bc67d6a59
14871e50-f1c6-4355-bcd6-1984ed9c7c81	00e7b0d1-2de5-4b93-b7c2-85e4483ccef3
ec5a2349-8977-4038-9e59-b8dc67dfd7f3	9628a1cc-da8b-4e73-8b30-ad4c7f2a6535
ec5a2349-8977-4038-9e59-b8dc67dfd7f3	9d54becf-436a-4d4d-9add-2561352fc32c
ec5a2349-8977-4038-9e59-b8dc67dfd7f3	13ba43ef-bc53-448d-91f9-a44f9c99bf6e
ec5a2349-8977-4038-9e59-b8dc67dfd7f3	1127bcaa-dab4-44a2-9669-129c6dfd7359
ec5a2349-8977-4038-9e59-b8dc67dfd7f3	410f24ee-1fa8-416a-aa3e-6beff4b4dd4a
a30ccba5-3342-4c69-a96d-a47dc184ddc1	089fb41b-dc41-437c-90c1-12ae02d5be1b
a30ccba5-3342-4c69-a96d-a47dc184ddc1	a6f8de8c-f393-4ff5-b595-4d0095dda182
a30ccba5-3342-4c69-a96d-a47dc184ddc1	a8afaeda-70e9-4553-8661-a11840b4f0e8
a30ccba5-3342-4c69-a96d-a47dc184ddc1	11a06329-ae6e-40c2-8ab1-7aa42cb1b9d1
a30ccba5-3342-4c69-a96d-a47dc184ddc1	a5ea069b-f379-44c1-be0c-7bff13cf7a62
a30ccba5-3342-4c69-a96d-a47dc184ddc1	30f68b7c-2488-4780-8995-a198219be947
a30ccba5-3342-4c69-a96d-a47dc184ddc1	2098d046-6883-4b5d-8885-8ce396f57501
a30ccba5-3342-4c69-a96d-a47dc184ddc1	30bbf351-118e-4cfb-bffe-d337cdfde557
25dd84b1-758e-4aaa-afe7-6e5aa795d8c2	2f4f1e89-6fd3-43a9-ab61-646d9f0e3b73
19e7f8d5-7f25-4ca8-80a1-50501744344b	00e7b0d1-2de5-4b93-b7c2-85e4483ccef3
\.


--
-- TOC entry 3306 (class 2606 OID 16735)
-- Name: categories_id_mapping categories_id_mapping_pkey; Type: CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.categories_id_mapping
    ADD CONSTRAINT categories_id_mapping_pkey PRIMARY KEY (old_id);


--
-- TOC entry 3281 (class 2606 OID 16754)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3308 (class 2606 OID 16741)
-- Name: events_id_mapping events_id_mapping_pkey; Type: CONSTRAINT; Schema: events; Owner: wikidata_user
--

ALTER TABLE ONLY events.events_id_mapping
    ADD CONSTRAINT events_id_mapping_pkey PRIMARY KEY (old_id);


--
-- TOC entry 3294 (class 2606 OID 16750)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: events; Owner: wikidata_user
--

ALTER TABLE ONLY events.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 3296 (class 2606 OID 16463)
-- Name: events events_wikidata_id_key; Type: CONSTRAINT; Schema: events; Owner: wikidata_user
--

ALTER TABLE ONLY events.events
    ADD CONSTRAINT events_wikidata_id_key UNIQUE (wikidata_id);


--
-- TOC entry 3310 (class 2606 OID 16747)
-- Name: periods_id_mapping periods_id_mapping_pkey; Type: CONSTRAINT; Schema: periods; Owner: wikidata_user
--

ALTER TABLE ONLY periods.periods_id_mapping
    ADD CONSTRAINT periods_id_mapping_pkey PRIMARY KEY (old_id);


--
-- TOC entry 3290 (class 2606 OID 16752)
-- Name: periods periods_pkey; Type: CONSTRAINT; Schema: periods; Owner: wikidata_user
--

ALTER TABLE ONLY periods.periods
    ADD CONSTRAINT periods_pkey PRIMARY KEY (id);


--
-- TOC entry 3292 (class 2606 OID 16447)
-- Name: periods periods_wikidata_id_key; Type: CONSTRAINT; Schema: periods; Owner: wikidata_user
--

ALTER TABLE ONLY periods.periods
    ADD CONSTRAINT periods_wikidata_id_key UNIQUE (wikidata_id);


--
-- TOC entry 3312 (class 2606 OID 16812)
-- Name: stories_id_mapping stories_id_mapping_pkey; Type: CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.stories_id_mapping
    ADD CONSTRAINT stories_id_mapping_pkey PRIMARY KEY (old_id);


--
-- TOC entry 3314 (class 2606 OID 16823)
-- Name: stories stories_new_pkey; Type: CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.stories
    ADD CONSTRAINT stories_new_pkey PRIMARY KEY (id);


--
-- TOC entry 3304 (class 2606 OID 16825)
-- Name: story_events story_events_story_event_unique; Type: CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.story_events
    ADD CONSTRAINT story_events_story_event_unique UNIQUE (story_id, event_id);


--
-- TOC entry 3301 (class 2606 OID 16827)
-- Name: story_periods story_periods_story_period_unique; Type: CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.story_periods
    ADD CONSTRAINT story_periods_story_period_unique UNIQUE (story_id, period_id);


--
-- TOC entry 3282 (class 1259 OID 16755)
-- Name: idx_categories_parent_id; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_categories_parent_id ON categories.categories USING btree (parent_id);


--
-- TOC entry 3284 (class 1259 OID 16768)
-- Name: idx_event_categories; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_event_categories ON categories.event_categories USING btree (event_id, category_id);


--
-- TOC entry 3283 (class 1259 OID 16769)
-- Name: idx_period_categories; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_period_categories ON categories.period_categories USING btree (period_id, category_id);


--
-- TOC entry 3285 (class 1259 OID 16770)
-- Name: idx_story_categories; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_story_categories ON categories.story_categories USING btree (story_id, category_id);


--
-- TOC entry 3297 (class 1259 OID 16516)
-- Name: idx_events_date; Type: INDEX; Schema: events; Owner: wikidata_user
--

CREATE INDEX idx_events_date ON events.events USING btree (date);


--
-- TOC entry 3298 (class 1259 OID 16511)
-- Name: idx_events_wikidata_id; Type: INDEX; Schema: events; Owner: wikidata_user
--

CREATE INDEX idx_events_wikidata_id ON events.events USING btree (wikidata_id);


--
-- TOC entry 3286 (class 1259 OID 16553)
-- Name: idx_periods_children; Type: INDEX; Schema: periods; Owner: wikidata_user
--

CREATE INDEX idx_periods_children ON periods.periods USING gin (children);


--
-- TOC entry 3287 (class 1259 OID 16537)
-- Name: idx_periods_dates; Type: INDEX; Schema: periods; Owner: wikidata_user
--

CREATE INDEX idx_periods_dates ON periods.periods USING btree (start_date, end_date);


--
-- TOC entry 3288 (class 1259 OID 16510)
-- Name: idx_periods_wikidata_id; Type: INDEX; Schema: periods; Owner: wikidata_user
--

CREATE INDEX idx_periods_wikidata_id ON periods.periods USING btree (wikidata_id);


--
-- TOC entry 3302 (class 1259 OID 16771)
-- Name: idx_story_events; Type: INDEX; Schema: stories; Owner: wikidata_user
--

CREATE INDEX idx_story_events ON stories.story_events USING btree (story_id, event_id);


--
-- TOC entry 3299 (class 1259 OID 16772)
-- Name: idx_story_periods; Type: INDEX; Schema: stories; Owner: wikidata_user
--

CREATE INDEX idx_story_periods ON stories.story_periods USING btree (story_id, period_id);


--
-- TOC entry 3320 (class 2620 OID 16497)
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: categories; Owner: wikidata_user
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories.categories FOR EACH ROW EXECUTE FUNCTION stories.update_updated_at_column();


--
-- TOC entry 3322 (class 2620 OID 16499)
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: events; Owner: wikidata_user
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events.events FOR EACH ROW EXECUTE FUNCTION stories.update_updated_at_column();


--
-- TOC entry 3321 (class 2620 OID 16498)
-- Name: periods update_periods_updated_at; Type: TRIGGER; Schema: periods; Owner: wikidata_user
--

CREATE TRIGGER update_periods_updated_at BEFORE UPDATE ON periods.periods FOR EACH ROW EXECUTE FUNCTION stories.update_updated_at_column();


--
-- TOC entry 3315 (class 2606 OID 16773)
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories.categories(id);


--
-- TOC entry 3318 (class 2606 OID 16783)
-- Name: event_categories event_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.event_categories
    ADD CONSTRAINT event_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories.categories(id);


--
-- TOC entry 3319 (class 2606 OID 16778)
-- Name: event_categories event_categories_event_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.event_categories
    ADD CONSTRAINT event_categories_event_id_fkey FOREIGN KEY (event_id) REFERENCES events.events(id);


--
-- TOC entry 3316 (class 2606 OID 16793)
-- Name: period_categories period_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.period_categories
    ADD CONSTRAINT period_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories.categories(id);


--
-- TOC entry 3317 (class 2606 OID 16788)
-- Name: period_categories period_categories_period_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.period_categories
    ADD CONSTRAINT period_categories_period_id_fkey FOREIGN KEY (period_id) REFERENCES periods.periods(id);


-- Completed on 2025-06-24 22:00:45 UTC

--
-- PostgreSQL database dump complete
--


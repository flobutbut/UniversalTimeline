--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Debian 15.12-1.pgdg120+1)
-- Dumped by pg_dump version 15.12 (Debian 15.12-1.pgdg120+1)

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
-- Name: categories; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA categories;


ALTER SCHEMA categories OWNER TO wikidata_user;

--
-- Name: events; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA events;


ALTER SCHEMA events OWNER TO wikidata_user;

--
-- Name: periods; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA periods;


ALTER SCHEMA periods OWNER TO wikidata_user;

--
-- Name: stories; Type: SCHEMA; Schema: -; Owner: wikidata_user
--

CREATE SCHEMA stories;


ALTER SCHEMA stories OWNER TO wikidata_user;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
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
-- Name: categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.categories (
    id character varying(255) NOT NULL,
    label_fr text NOT NULL,
    label_en text NOT NULL,
    description_fr text,
    description_en text,
    parent_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE categories.categories OWNER TO wikidata_user;

--
-- Name: event_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.event_categories (
    event_id uuid NOT NULL,
    category_id uuid NOT NULL
);


ALTER TABLE categories.event_categories OWNER TO wikidata_user;

--
-- Name: period_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.period_categories (
    period_id uuid NOT NULL,
    category_id uuid NOT NULL
);


ALTER TABLE categories.period_categories OWNER TO wikidata_user;

--
-- Name: story_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.story_categories (
    story_id uuid NOT NULL,
    category_id uuid NOT NULL
);


ALTER TABLE categories.story_categories OWNER TO wikidata_user;

--
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
-- Name: stories; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.stories (
    id integer NOT NULL,
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
-- Name: stories_id_seq; Type: SEQUENCE; Schema: stories; Owner: wikidata_user
--

CREATE SEQUENCE stories.stories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE stories.stories_id_seq OWNER TO wikidata_user;

--
-- Name: stories_id_seq; Type: SEQUENCE OWNED BY; Schema: stories; Owner: wikidata_user
--

ALTER SEQUENCE stories.stories_id_seq OWNED BY stories.stories.id;


--
-- Name: story_events; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.story_events (
    story_id uuid NOT NULL,
    event_id uuid NOT NULL
);


ALTER TABLE stories.story_events OWNER TO wikidata_user;

--
-- Name: story_periods; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.story_periods (
    story_id uuid NOT NULL,
    period_id uuid NOT NULL
);


ALTER TABLE stories.story_periods OWNER TO wikidata_user;

--
-- Name: stories id; Type: DEFAULT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.stories ALTER COLUMN id SET DEFAULT nextval('stories.stories_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.categories (id, label_fr, label_en, description_fr, description_en, parent_id, created_at, updated_at) FROM stdin;
CAT_COSMO	Cosmologie	Cosmology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_ASTRO	Astrophysique	Astrophysics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_PHYS	Physique Théorique	Theoretical Physics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_BIO_EVO	Biologie Évolutive	Evolutionary Biology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_PALEO	Paléontologie	Paleontology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_PART	Physique des Particules	Particle Physics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_GEO	Géologie	Geology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_CHEM	Chimie	Chemistry	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_BOT	Botanique	Botany	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_HIST	Histoire et Civilisations	History and Civilizations	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_ANTHRO	Anthropologie et Archéologie	Anthropology and Archaeology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_TECH	Technologie et Innovations	Technology and Innovations	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_PHILO	Religion et Philosophie	Religion and Philosophy	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_ART	Art et Culture	Art and Culture	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_ECO	Économie	Economics	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_OCEAN	Océanographie	Oceanography	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_MICRO	Microbiologie	Microbiology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
CAT_ECO_SYS	Écologie	Ecology	\N	\N	\N	2025-06-13 12:42:13.945221	2025-06-13 12:42:13.945221
\.


--
-- Data for Name: event_categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.event_categories (event_id, category_id) FROM stdin;
\.


--
-- Data for Name: period_categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.period_categories (period_id, category_id) FROM stdin;
\.


--
-- Data for Name: story_categories; Type: TABLE DATA; Schema: categories; Owner: wikidata_user
--

COPY categories.story_categories (story_id, category_id) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: events; Owner: wikidata_user
--

COPY events.events (id, wikidata_id, label_fr, label_en, description_fr, description_en, date, created_at, updated_at) FROM stdin;
e2eb854a-567f-4e73-9848-0173ae02dbef	Q3343986	Formation des premières étoiles	Formation of first stars	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
8ab4a688-bb4c-43a5-b0b0-c9019efb5e81	Q52863547	Formation des amas globulaires	Formation of globular clusters	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
2ef304a1-a7e2-442c-8d87-eba822dcebe3	Q1235542	Formation de la Terre	Formation of Earth	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
9b3d5ddb-cf34-428f-a19d-ff4cf22ced04	Q428962	Formation des océans	Formation of oceans	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
5d11acb4-cc84-46c9-89b6-a0353f3b3e43	Q2603003	Premiers minéraux connus (zircons)	First known minerals (zircons)	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
0d81e20f-9bb7-43e9-aad3-24f12bcda40a	Q13433688	Premières traces de vie	First traces of life	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
8b1df1ed-c92a-44e8-a4af-d959755ea8bb	Q1545904	Apparition de l'oxygène atmosphérique (Grande Oxydation)	Great Oxygenation Event	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
c4210eaa-945a-40dd-a917-74e9f8c77944	Q1393590	Glaciation huronienne	Huronian glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
cb277195-f76e-4c0d-9489-b99c0c0bb26f	Q1636908	Glaciation sturtienne	Sturtian glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
6d257b2e-1df6-47fa-95bb-b840bb7cfffe	Q463516	Faune d'Édiacara	Ediacaran biota	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
6fbe3a92-b12b-4c1c-98e3-0518b0d15d52	Q1136609	Colonisation des terres par les plantes	Land plant colonization	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
d8e81a4c-ea8d-40ec-94e2-e3d58910d0a5	Q46368	Extinction Crétacé-Tertiaire	Cretaceous-Tertiary extinction	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
7899b57c-7211-468a-aa6c-7c856ba4d47f	Q7358	Apparition des premiers primates	Appearance of first primates	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
42fb9c9c-4f2a-4444-8c93-fa6c9a3aedf9	Q12467092	Formation de l'Himalaya	Formation of Himalayas	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
a148e8d0-f00d-4c5b-adc6-59bf8bef75b4	Q3238722	Apparition des premiers hominidés	Appearance of first hominids	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
98170c4b-6208-466c-81d5-18909733f2dc	Q11746	Début des glaciations quaternaires	Start of Quaternary glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
843884f0-a602-49c2-a046-398e0e94b9aa	Q121557	Fin de la dernière période glaciaire	End of last glacial period	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
273b58f3-0257-4d69-bdd8-ea95327ce4c4	Q8767	Invention de l'écriture	Invention of writing	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
35776fd2-2c50-48aa-9031-0df8cc6d9119	Q4940	Fondation de Rome	Foundation of Rome	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
16e6ae38-ea10-4765-9a10-b6e05dacb2c3	Q4389	Début de l'Hégire	Beginning of Hegira	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
d64e15b4-9788-4ff6-95fd-b3d54476f062	Q333656	Formation de la Lune	Formation of the Moon	\N	\N	1929-03-06 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:50.099011
442097aa-cfb5-422b-a073-8efd71623e16	Q46253	Formation de la Pangée	Formation of Pangaea	\N	\N	1985-02-26 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:50.460181
1e6f92d2-b21a-4110-a1a4-a30d47d61c20	Q162230	Formation de la nébuleuse solaire	Formation of solar nebula	\N	\N	2003-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:56.781418
d724eab3-4b7e-4bb0-a3e8-ff13659f7dfa	Q3098972	Première utilisation contrôlée du feu	First controlled use of fire	\N	\N	1850-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:57.607732
4d782c3e-0b7d-4b68-846a-a5ea2889717a	Q132605	Chute de l'Empire romain d'Occident	Fall of Western Roman Empire	\N	\N	1936-12-22 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:57.733163
cbe48037-fac5-4e98-b84b-0eb9ceda48e9	Q214851	Extinction Permien-Trias	Permian-Triassic extinction	\N	\N	1850-08-26 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:44:00.321137
659bb0e6-cee3-4460-b791-46b3300e1e0f	Q833611	Formation du supercontinent Columbia	Formation of Columbia supercontinent	\N	\N	1986-09-27 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:44:01.088456
3ae4a05e-c11c-4e32-8245-2730f65fe6d9	Q7377	Apparition des premiers mammifères	Appearance of first mammals	\N	\N	-160000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 12:52:31.908952
2c86fa44-0261-4175-9efb-9d107b6e7a92	Q15978631	Apparition d'Homo sapiens	Appearance of Homo sapiens	\N	\N	-200000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 12:52:32.936063
14c1ff64-20f9-4032-9c1a-5bdca7ed07dd	Q32919	Explosion cambrienne	Explosion cambrienne	moment d'importante diversification des espèces animales, végétales et bactériennes	Portion of the Cambrian Period during which life vastly diversified	-543000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:00:04.084404
ba134fda-143b-47c8-a9d2-2333c45db640	Q11451	agriculture	agriculture	ensemble des activités humaines ayant pour objet la culture des terres et la production de nourriture	cultivation of plants and animals to provide useful products	-8000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 12:57:15.292865
c9fa6c2c-74e8-45bf-9623-0b05f47b4e2b	Q10908	amphibien	amphibien	classe d'animaux tétrapodes	class of tetrapods, whose living forms include frogs, toads, salamanders, newts and caecilians	-370000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:01:06.608967
fb99f36e-af62-4a2e-bf84-eaa2c4336660	Q10811	Reptiles	Reptiles	classe des animaux vertébrés (Vertebrata)	class of vertebrate animals (Vertebrata)	-318000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:22:16.433307
4c48ad09-25f2-4153-8105-a896484e83eb	Q9441	Siddhartha Gautama	Siddhartha Gautama	maître spirituel fondateur du bouddhisme, (623 ou 563 AEC–543 ou 483 AEC)	Indian philosopher and the founder of Buddhism (623 or 563 BCE – 543 or 483 BCE)	-0500-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:12:53.327994
0ebe48fb-c575-4d4c-8564-63d830580e2c	Q93315	Cyanobacteria	Cyanobacteria	embranchement de procaryotes	phylum of prokaryotes	-2100000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:13:35.774626
06c0fdbd-3474-45ac-ab66-9b1014eb4f1d	Q323	Big Bang	Big Bang	modèle cosmologique de l'origine de l'Univers	hypothetical begin of the Universe through expansion out of an infinitely small and infinitely dense state	-13798000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:21:46.681393
35394450-903d-45b9-ab23-1105192ae8f3	Q152	poisson	poisson	animal vertébré aquatique	vertebrate animal that lives in water and (typically) has gills	-530000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:23:10.79785
c48a17d4-7420-4eec-881d-4c13cdac4e74	Q171283	Homo	Homo	genre qui réunit Homo sapiens et les espèces apparentées	genus of mammals	-2800000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:24:28.529489
b4fc5140-1f50-4994-a275-8663af45fcf9	Q1390	insecte	insecte	classe d'arthropodes	class of arthropods	-400000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:26:57.952818
a75732a3-bd74-4fcb-9f67-4a551f6c775f	Q302	Jésus-Christ	Jésus-Christ	messie et fils unique de Dieu pour les chrétiens	central figure of Christianity (6 or 4 BC – AD 30 or 33)	-0004-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:30:43.322937
7123d4b8-9925-4d3b-9e96-2533ae9984c0	Q362	Seconde Guerre mondiale	Seconde Guerre mondiale	conflit armé à l'échelle planétaire, de septembre 1939 à septembre 1945	1939–1945 global conflict	1939-09-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:40:32.348851
07ae20c1-58a6-4be2-8e13-a3e18a20e50c	Q361	Première Guerre mondiale	Première Guerre mondiale	conflit armé à l'échelle planétaire, d'août 1914 à novembre 1918	global war originating in Europe, 1914–1918	1914-07-28 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:43:04.880784
d94948ea-0f90-4094-a12c-ab5fdb6e9ba5	Q19088	Eukaryota	Eukaryota	ensemble des espèces ayant des cellules avec un noyau	taxonomic group whose members have a cell nucleus enclosed within a nuclear envelope	-2700000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 20:35:17.79465
97ac8660-14fe-4f91-b109-2dafaa0f4d6e	Q525	Soleil	Soleil	étoile au centre du Système solaire, source principale de lumière et de chaleur pour ses planètes, notamment pour la Terre	star at the centre of the Solar System	1973-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 20:57:01.808577
48e7b67c-648a-48fe-8348-058ad5f0ee33	Q37200	pyramide de Khéops	pyramide de Khéops	plus ancienne et plus grande des trois pyramides de la nécropole de Gizeh	oldest and largest of the three pyramids in the Giza Necropolis; one of the seven ancient wonders of the world	-2559-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 21:23:52.024679
9f3f9958-1b16-4500-8e19-3c70b8109a48	Q214334	peinture pariétale	peinture pariétale	peinture exécutée durant la Préhistoire sur les parois rocheuses de grottes	paintings found on cave walls and ceilings	-38000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:14:09.103315
8e1f84d1-be99-48a1-b800-7513ecffea71	Q6534	Révolution française	Révolution française	période de l'histoire de France et de ses colonies, du 5 mai 1789 au 9 novembre 1799	revolution in France from 1789 to 1799	1789-05-05 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:23:52.3814
efbf5a99-b672-45ea-821d-54eb86485975	Q591571	grand bombardement tardif	grand bombardement tardif		hypothesized event, occurring ca. 4.1–3.8 billion years ago, during which a large number of asteroids collided with the Moon, Mercury, Venus, Earth, and Mars	Date inconnue	2025-06-13 12:42:13.952374	2025-06-13 19:34:44.030947
3fd1d524-26e6-45f7-b47f-1654c62c3a9d	Q2269	Révolution industrielle	Révolution industrielle	transition vers de nouveaux procédés de fabrication en Europe et aux États-Unis aux XVIIIe et XIXe siècles	transition to new manufacturing processes in Europe and the United States, in the 18th-19th centuries	1760-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:39:34.794889
2561db63-93df-466d-8611-d903dbb3800f	Q43653	Apollo 11	Apollo 11	11e mission du programme spatial américain Apollo (premiers pas de l'homme sur la Lune)	first Moon landing and fifth crewed flight of the United States Apollo program	-3099-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:49:48.340655
8de76a57-cd88-4da2-9793-55fb7ce50d20	Q69163529	chute du Mur de Berlin	chute du Mur de Berlin	événement historique en novembre 1989 où le mur de Berlin a été démoli	historical event in November 1989 where the Berlin Wall was opened and demolished	1989-11-09T00:00:00Z	2025-06-13 20:00:56.095994	2025-06-13 20:00:56.095994
06269074-93a7-4298-91b0-af41284e7fac	Q221474	découverte et exploration de l'Amérique	découverte et exploration de l'Amérique	événement historique	arrival of Christopher Columbus and crew to America	1492-10-21T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 21:22:54.477719
1911aaaa-651a-467c-8f2d-2fced6347940	Q55811	extinction Crétacé-Paléogène	extinction Crétacé-Paléogène	événement d'extinction massive d'espèces	extinction event ending the Mesozoic Era	-66000000-01-01T00:00:00Z	2025-06-13 21:26:01.801136	2025-06-13 21:26:01.801136
453a8c08-1175-4eaa-ae60-4800cda01117	Q141118	extinction Permien-Trias	extinction Permien-Trias	cas d’extinction de masse le plus grave de la chronologie de la Terre	mass extinction event at the end of the Permian Period approximately 250 million years ago	-251900000-01-01T00:00:00Z	2025-06-13 21:26:19.179711	2025-06-13 21:26:19.179711
bdb47f6e-d223-4a1b-b36c-45a6ae2d4843	Q796140	extinction de l’Holocène	extinction de l’Holocène	phénomène d’extinction massive durant l’actuelle époque géologique de l’Holocène	massive extinction event during the current Holocene geological epoch	-10000-01-01T00:00:00Z	2025-06-13 21:26:54.609391	2025-06-13 21:26:54.609391
\.


--
-- Data for Name: periods; Type: TABLE DATA; Schema: periods; Owner: wikidata_user
--

COPY periods.periods (id, wikidata_id, label_fr, label_en, description_fr, description_en, start_date, end_date, temporal_location, created_at, updated_at, has_parent, children) FROM stdin;
00f287bf-7f22-4329-bee6-2c638b53dcb6	Q172932	Ère de Planck	Planck Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
f9b53242-13be-44d1-8b79-af4cdf7ef417	Q898941	Ère de la Grande Unification	Grand Unification Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
fa190502-7017-482b-9cc6-060455168a36	Q507402	Cryogénien	Cryogenian	deuxième période du Néoprotérozoïque	second period of the Neoproterozoic Era	-720000000-01-01T00:00:00Z	-635000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:56:36.255965	f	[]
3940254f-219e-4ab1-a78e-af887818f6f2	Q2277	Empire romain	Empire romain	nom donné à la domination romaine antique entre 27 av. J.-C. et 395 ap. J.-C.	period of ancient Rome following the Republic	-0026-01-01T00:00:00Z	0395-01-01T00:00:00Z		2025-06-13 12:42:13.948686	2025-06-17 11:04:47.982492	f	[]
ad702fe2-4f1b-4fb0-ad1d-b2e2b1cfd913	Q102416	Cénozoïque	Cenozoic	troisième et actuelle ère géologique du Phanérozoïque, −66,0 Ma au présent	third and current era of the Phanerozoic Eon	\N	TODAY	\N	2025-06-13 12:42:13.948686	2025-06-17 11:22:55.197657	f	\N
4eb5c84b-710a-441b-91aa-271499c0fdd8	Q362	Seconde Guerre mondiale	Seconde Guerre mondiale	conflit armé à l'échelle planétaire, de septembre 1939 à septembre 1945	1939–1945 global conflict	1939-09-01T00:00:00Z	1945-09-02T00:00:00Z	Globale	2025-06-13 20:20:10.887893	2025-06-16 20:42:52.150919	f	\N
c92adaa0-22d1-4362-b286-844b998ee2d6	Q361	Première Guerre mondiale	Première Guerre mondiale	conflit armé à l'échelle planétaire, d'août 1914 à novembre 1918	global war originating in Europe, 1914–1918	1914-07-28T00:00:00Z	1918-11-11T00:00:00Z	Globale	2025-06-13 20:22:37.317685	2025-06-16 20:42:52.150919	f	\N
9378b1c4-3439-48dc-bacb-44e52700a323	Q323	Big Bang	Big Bang	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:43:13.247329	f	\N
da1781ff-396b-41cd-9bfc-1351ef70b894	Q210611	Mésoprotérozoïque	Mésoprotérozoïque	deuxième ère du Protérozoïque	second era of the Proterozoic Eon	-1600000000-01-01T00:00:00Z	-1000000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:22:45.897681	f	\N
eada541d-d265-413d-8cd0-6f27866cf332	Q101313	Phanérozoïque	Phanerozoic	actuel éon de l'échelle des temps géologiques, les 541 derniers millions d'années	fourth and current eonothem and eon of the geological timescale	-538800000-01-01T00:00:00Z	TODAY	Globale	2025-06-16 20:46:19.776579	2025-06-17 11:22:45.897681	f	[]
219086f0-c7d9-4a9b-a7ef-b19e8d409d4b	Q191935	Néoprotérozoïque	Neoproterozoic	troisième et dernière ère du Protérozoïque	third and final era of the Proterozoic Eon	-1000000000-01-01T00:00:00Z	-538800000-01-01T00:00:00Z	\N	2025-06-17 11:06:44.840836	2025-06-17 11:22:55.197657	f	\N
784cf18a-1680-48b4-917f-59fc2754dec4	Q8683	guerre froide	Cold War	conflit idéologique du XXe siècle	1947–1991 tension between the Soviet Union and the United States and their respective allies	1945-01-01T00:00:00Z	1991-12-25T00:00:00Z	Globale	2025-06-13 20:16:05.284393	2025-06-17 11:31:56.151082	f	[]
e2cf5d86-6fab-4e1a-ba2a-81e79c1965b9	Q45805	Jurassique	Jurassic	seconde période géologique du Mésozoïque, 201,3 à 145,0 Ma avant le présent	second period of the Mesozoic Era	-201400000-01-01T00:00:00Z	-145000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:32:04.38819	f	[]
c77d2645-7f0e-4a60-8908-bab49409bc35	Q79064	Cambrien	Cambrian	première période géologique du Paléozoïque, de 541 à 485,4 Ma avant le présent	first period of the Paleozoic Era	-538800000-01-01T00:00:00Z	-486850000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:56:43.448879	f	[]
139b60a5-61f3-4c67-9c0c-0c120bc6a3a4	Q75507	Paléozoïque	Paleozoic	première ère géologique du Phanérozoïque, anciennement appelée « ère primaire » (de -541 à -252,2 millions d’années)	first erathem and era of the Phanerozoic eonothem and eon	-538800000-01-01T00:00:00Z	-251902000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:51:35.061801	f	[]
b59f15ad-f201-401d-abb8-78069d4e2402	Q62100	Ordovicien	Ordovician	seconde période géologique du Paléozoïque, de 485,4 à 443,4 Ma avant le présent	second period of the Paleozoic Era	-486850000-01-01T00:00:00Z	-443100000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:57:35.221657	f	[]
14715b17-e088-4e63-b654-dbf9d4106246	Q3982	Néogène	Neogene	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 11:04:48.004336	f	\N
16b49d75-1c65-4062-bd78-3df0780ca25a	Q5390	Mésozoïque	Mesozoic	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 08:58:22.132961	f	\N
3c199503-b4f0-4324-bf7f-0e1d529bd78f	Q544	Système solaire	Solar System	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
ac860e24-ad83-433e-b8ce-7af45d4ede91	Q5426	Silurien	Silurian	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
d8e04901-5db5-47d5-9ef5-efc4e5a2d0b1	Q899367	Ère Électrofaible	Electroweak Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
59142153-8c02-45f6-a22e-5cc90732b9a4	Q23018	Paléogène	Paleogene	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
d50932f9-58c5-4858-8ea8-26b57cecc1ac	Q217416	Ère de la Nucléosynthèse Primordiale	Primordial Nucleosynthesis Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
5488f877-89ce-4d91-b86a-be5b189e5068	Q5383	Trias	Triassic	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
c32781f2-abf5-4339-b045-d3e19592f226	Q1236209	Ère des Âges Sombres	Dark Ages Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
4d43ab7d-5e24-4a73-bf2d-cb486844452b	Q899383	Ère Hadronique	Hadronic Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
c660debd-49d0-43a5-9f2a-9c80c6a54199	Q65955	Dévonien	Devonian	quatrième période géologique du Paléozoïque, 419,2 à 359 Ma avant le présent	fourth period of the Paleozoic Era	-419200000-01-01T00:00:00Z	-358900000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:46:34.449183	f	[]
c70a4a90-d387-40f8-a027-8a0dd08bdec4	Q193738	Paléoprotérozoïque	Paleoproterozoic	première ère du Protérozoïque	first era of the Proterozoic Eon	-2500000000-01-01T00:00:00Z	-1600000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:22:45.897681	f	[]
01b65785-ca0f-4690-abba-b551bf5f0d01	Q899426	Ère de la Recombinaison	Recombination Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
54fb5b75-0183-427d-9a4f-b336773a3bb8	Q899379	Ère Leptonique	Leptonic Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
31665427-83ad-43e7-a375-0f2ac511a7db	Q901651	Ère de Réionisation	Reionization Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
a0d99b4b-446c-476b-a1ae-9489071dab25	Q133738	Carbonifère	Carboniferous	cinquième période géologique du Paléozoïque, 359 à 298,9 Ma avant le présent	fifth period of the Paleozoic Era	-358900000-01-01T00:00:00Z	-298900000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:48:03.946679	f	[]
68581393-b39f-4850-8add-d54c04633c18	Q76402	Permien	Permien	sixième et dernière période géologique du Paléozoïque, 298,9 à 252,2 Ma avant le présent	sixth and final system and period of the Paleozoic erathem and era	-298900000-01-01T00:00:00Z	-251902000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:25:07.90985	f	[]
177832d7-dfa1-45f2-a131-291397b224d8	Q104162	Protérozoïque	Proterozoic	troisième et dernier éon du Précambrien	third eon of the geological timescale, last eon of the Precambrian Supereon	-2500000000-01-01T00:00:00Z	-538800000-01-01T00:00:00Z	Globale	2025-06-16 20:45:43.681521	2025-06-17 10:37:00.084015	f	[]
090a7405-9bab-4906-826c-f3d8fdf63da9	Q44626	Crétacé	Crétacé	troisième période géologique du Mésozoïque, 145,0 à 66,0 Ma avant le présent	third and final period of the Mesozoic Era	-145000000-01-01T00:00:00Z	-66000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
bf04d944-6364-4b23-81e7-5583bd442b03	Q2	Terre	Earth	troisième planète à partir du Soleil dans le système solaire	third planet from the Sun in the Solar System	-4540000000-01-01T00:00:00Z	TODAY	\N	2025-06-13 12:42:13.948686	2025-06-17 12:01:05.339958	f	\N
910577eb-fb19-420a-b933-37f2f454d6fd	Q607992	Mésoarchéen	Mésoarchéen	troisième ère de l'Archéen	third era of the Archean Eon	-3200000000-01-01T00:00:00Z	-2800000000-01-01T00:00:00Z	Globale	2025-06-16 20:52:29.576507	2025-06-17 12:01:05.339958	f	\N
7f9e774c-9d65-4770-b3b9-ca8dc664c781	Q26185	Quaternaire	Quaternary	troisième et actuelle période géologique du Cénozoïque, -2,58 Ma au présent	third and current period of the Cenozoic Era	-2580000-01-01T00:00:00Z	TODAY	Globale	2025-06-13 12:42:13.948686	2025-06-17 12:01:05.339958	f	[]
2105e47b-34b7-441b-8fff-cd9448f179fd	Q738167	Paléoarchéen	Paléoarchéen	deuxième ère de l'Archéen	second era of the Archean Eon	-3600000000-01-01T00:00:00Z	-3200000000-01-01T00:00:00Z	Globale	2025-06-16 20:48:57.828864	2025-06-17 12:01:05.339958	f	\N
4f609e7f-668b-421f-b8da-10cc5d33c326	Q731470	Éoarchéen	Éoarchéen	première ère de l'Archéen	first era of the Archean Eon	-4031000000-01-01T00:00:00Z	-3600000000-01-01T00:00:00Z	Globale	2025-06-16 20:48:13.274011	2025-06-17 12:01:05.339958	f	\N
47745144-cc81-446e-b320-6896c6955056	Q645135	Néoarchéen	Néoarchéen	Quatrième et dernière ère de l'Archéen	fourth and final era of the Archean Eon	-2800000000-01-01T00:00:00Z	-2500000000-01-01T00:00:00Z	Globale	2025-06-16 20:53:15.143929	2025-06-17 12:01:05.339958	f	\N
ea181732-9fb3-4bc4-9141-58e9961218b9	Q104168	Archéen	Archean	second éon de l'échelle des temps géologiques	second eon of the geologic timescale, spanning from around 4.031 to 2.5 billion years ago	-4031000000-01-01T00:00:00Z	-2500000000-01-01T00:00:00Z	Globale	2025-06-16 20:45:18.405834	2025-06-17 12:01:05.339958	f	\N
900a61ce-9474-4a99-a498-eb9454ff32ad	Q104460	Hadéen	Hadean	premier éon de l'échelle des temps géologiques, de 4 560 Ma d'années à 4 000 Ma avant le présent	first eon of the geological timescale, beginning with the formation of the Earth about 4.567 billion years ago	-4567300000-01-01T00:00:00Z	-4031000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 12:01:05.339958	f	[]
\.


--
-- Data for Name: stories; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.stories (id, title_fr, title_en, description_fr, description_en, author, is_public, created_at, updated_at) FROM stdin;
1	Univers moderne	Univers moderne	\N	\N	moi	t	2025-06-13 13:09:17.972568	2025-06-13 13:09:17.972568
2	Histoire de la vie sur terre	Histoire de la vie sur terre	\N	\N	moi	t	2025-06-13 21:27:15.42556	2025-06-13 21:27:15.42556
3	big bang	big bang	\N	\N	moi	t	2025-06-13 21:31:01.428956	2025-06-13 21:31:01.428956
4	Guerres modernes	Modernes was	\N	\N	moi	t	2025-06-13 21:31:53.541612	2025-06-13 21:31:53.541612
\.


--
-- Data for Name: story_events; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.story_events (story_id, event_id) FROM stdin;
36e59384-f927-4d66-bea1-cbe584bbebf6	9886da3c-60d5-4e02-a2c8-1d6a126d14d5
1211410d-f87c-40f0-b8d5-5511654a7077	d02d63a8-4a6c-4aee-9391-550a6d67afef
aae8e964-072c-481b-9612-9ec08496fc07	572b389f-5e27-4c02-8048-4cb5d836326e
0a3ae34f-7446-4493-8f49-2ed3d63cb34a	3cda8a17-a69a-4f5d-9723-0eab351235c0
d28fea87-39f4-420e-be71-dcdc7e8e8cc9	9881e36c-a94a-4dab-bea3-8cb16ddadad4
28826470-5919-48e4-a3c9-1575a1559824	9cff4e21-4f31-4ca2-92a1-72ba2ad091bd
dd1f48d1-c40a-4d60-988e-8c6180402cbb	ccea20c4-9dfb-4015-b9e8-947604d23be4
d6c3e395-4dce-4c47-b2d4-6f047a919978	6f77fd12-fe02-43d0-8657-8ec06d4846ba
5a0d455c-86af-4449-b8e9-511d771b5e0d	049df248-f944-455b-a8d3-bb3b95364dc3
bfad8807-1c98-4e1d-ab70-6759c64ec857	f3a936ca-bd14-4086-b1b5-17c6af9c784d
3d1741e7-187f-4212-ba23-3ff5a87c5d3d	8b7e3d6a-736d-44e5-a1bd-bb662bed3ccf
6403f412-bdca-4163-b309-74452d6ad6a1	5fae4c21-8d6c-457d-9942-e25c7c3689cc
22a86758-3526-4f48-8359-6ddcefc39e7c	52c11ded-11d2-41fa-8fc1-f3b794605abe
f3642ebf-26b7-45ac-81ae-48ee1125cfe1	31b67a08-9050-4c84-8086-fb0df7b7bcb6
e8bea120-59f3-4d41-bfdd-0f3bd0d6906a	f4958c3a-2af1-42e2-8b85-1c665a3aed44
904c079c-86c8-4ce5-8fbb-f3ca1ad670bc	3877d1ac-89cd-4a81-9bf7-200fbce3b6ac
fe704895-ae1f-4199-b87f-ccedda99570e	650cb672-72cc-4a4e-bbc6-893db0636bc5
e041b338-c0d5-4dd5-851b-4b646b1bd62c	f4f35175-edf8-4cc5-8be7-5c8802fcf7bd
90bc530f-12ca-4a0a-8763-c1450a18d958	52c85de8-571b-4050-8836-42f846650386
178c328d-7148-478a-9e10-3d71e066c79e	752bfa5b-3f3e-4d96-a87a-13afd8bd23b5
0b38560d-dd8b-414f-9944-6cfac4dc8b8a	84141b77-0108-43f1-8be2-8add56d4de1a
\.


--
-- Data for Name: story_periods; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.story_periods (story_id, period_id) FROM stdin;
e8539726-1417-4f1c-9069-81ccbf29adc1	70b41430-4762-401b-b1a1-9cc08045a9a4
7b0f4d28-64a2-48ce-861f-52e1d904d2a9	1886abbe-b1a7-40f3-ae69-b0c930f1eaa0
2516896e-e671-4e0b-91f3-3e9133a6dfc7	5d11b03a-a009-4611-901d-faf437b338db
e0aaf239-e375-4d86-800f-7c47262e9d49	b547cf18-e9bc-46f6-adce-7bd71e46e6ad
aff41775-5d18-442d-8608-5f78ed6e9876	d0a5953a-0b23-4955-8435-4f383cd53413
9cdfe396-bedf-48e4-ba30-a0d228953e22	45b3f7ea-b58f-450a-b6a0-c60f71838108
6e07e49f-eaf3-44d2-ad46-239fa852ef75	22ba7468-8ba5-4073-a793-338a9b884076
3861ede4-3c2e-439f-8844-743a57d390d4	d70d26a3-1a73-4e5a-ad6a-999755859edd
f3aa7fee-097e-42ac-9d1c-c80ff1b0f53d	0ff3c209-8267-4124-b7cd-e6b5b94527a6
a48d2c10-8180-441b-a07b-c32d21329f28	59dd3001-e2c3-4adf-a388-9a3d11e74919
f388bd7f-8fe0-4861-9daa-f128404c2b4c	80192726-4580-4195-bd14-6d51fb9b64e9
8d4b0279-493b-4526-8869-424224ccef4d	38c6dab0-1d72-488a-93f7-9d23ec780e8b
d2445cc0-0ca4-4bbb-b612-ecd4c2beed49	71f8c506-48e7-416c-981d-63b768c6330f
0162e937-d1c5-49cc-9152-ca5e141f06e3	32e960d7-fa01-4d3e-89ca-490849a45882
931a3710-f77a-49b2-9591-10defdf7435e	1b5822a2-4cc5-40ed-8238-e3a8cf3bcdc7
98883e2c-cca4-4cc7-9543-c000b7c3c743	31f0f7ce-c6b9-4804-9429-887542d8ca90
\.


--
-- Name: stories_id_seq; Type: SEQUENCE SET; Schema: stories; Owner: wikidata_user
--

SELECT pg_catalog.setval('stories.stories_id_seq', 4, true);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: events; Owner: wikidata_user
--

ALTER TABLE ONLY events.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_wikidata_id_key; Type: CONSTRAINT; Schema: events; Owner: wikidata_user
--

ALTER TABLE ONLY events.events
    ADD CONSTRAINT events_wikidata_id_key UNIQUE (wikidata_id);


--
-- Name: periods periods_pkey; Type: CONSTRAINT; Schema: periods; Owner: wikidata_user
--

ALTER TABLE ONLY periods.periods
    ADD CONSTRAINT periods_pkey PRIMARY KEY (id);


--
-- Name: periods periods_wikidata_id_key; Type: CONSTRAINT; Schema: periods; Owner: wikidata_user
--

ALTER TABLE ONLY periods.periods
    ADD CONSTRAINT periods_wikidata_id_key UNIQUE (wikidata_id);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_categories_parent_id ON categories.categories USING btree (parent_id);


--
-- Name: idx_event_categories; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_event_categories ON categories.event_categories USING btree (event_id, category_id);


--
-- Name: idx_period_categories; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_period_categories ON categories.period_categories USING btree (period_id, category_id);


--
-- Name: idx_story_categories; Type: INDEX; Schema: categories; Owner: wikidata_user
--

CREATE INDEX idx_story_categories ON categories.story_categories USING btree (story_id, category_id);


--
-- Name: idx_events_date; Type: INDEX; Schema: events; Owner: wikidata_user
--

CREATE INDEX idx_events_date ON events.events USING btree (date);


--
-- Name: idx_events_wikidata_id; Type: INDEX; Schema: events; Owner: wikidata_user
--

CREATE INDEX idx_events_wikidata_id ON events.events USING btree (wikidata_id);


--
-- Name: idx_periods_children; Type: INDEX; Schema: periods; Owner: wikidata_user
--

CREATE INDEX idx_periods_children ON periods.periods USING gin (children);


--
-- Name: idx_periods_dates; Type: INDEX; Schema: periods; Owner: wikidata_user
--

CREATE INDEX idx_periods_dates ON periods.periods USING btree (start_date, end_date);


--
-- Name: idx_periods_wikidata_id; Type: INDEX; Schema: periods; Owner: wikidata_user
--

CREATE INDEX idx_periods_wikidata_id ON periods.periods USING btree (wikidata_id);


--
-- Name: idx_story_events; Type: INDEX; Schema: stories; Owner: wikidata_user
--

CREATE INDEX idx_story_events ON stories.story_events USING btree (story_id, event_id);


--
-- Name: idx_story_periods; Type: INDEX; Schema: stories; Owner: wikidata_user
--

CREATE INDEX idx_story_periods ON stories.story_periods USING btree (story_id, period_id);


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: categories; Owner: wikidata_user
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories.categories FOR EACH ROW EXECUTE FUNCTION stories.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: events; Owner: wikidata_user
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events.events FOR EACH ROW EXECUTE FUNCTION stories.update_updated_at_column();


--
-- Name: periods update_periods_updated_at; Type: TRIGGER; Schema: periods; Owner: wikidata_user
--

CREATE TRIGGER update_periods_updated_at BEFORE UPDATE ON periods.periods FOR EACH ROW EXECUTE FUNCTION stories.update_updated_at_column();


--
-- Name: stories update_stories_updated_at; Type: TRIGGER; Schema: stories; Owner: wikidata_user
--

CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories.stories FOR EACH ROW EXECUTE FUNCTION stories.update_updated_at_column();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories.categories(id);


--
-- PostgreSQL database dump complete
--


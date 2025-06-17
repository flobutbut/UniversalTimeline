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
    event_id character varying(255) NOT NULL,
    category_id character varying(255) NOT NULL
);


ALTER TABLE categories.event_categories OWNER TO wikidata_user;

--
-- Name: period_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.period_categories (
    period_id character varying(255) NOT NULL,
    category_id character varying(255) NOT NULL
);


ALTER TABLE categories.period_categories OWNER TO wikidata_user;

--
-- Name: story_categories; Type: TABLE; Schema: categories; Owner: wikidata_user
--

CREATE TABLE categories.story_categories (
    story_id integer NOT NULL,
    category_id character varying(255) NOT NULL
);


ALTER TABLE categories.story_categories OWNER TO wikidata_user;

--
-- Name: events; Type: TABLE; Schema: events; Owner: wikidata_user
--

CREATE TABLE events.events (
    id character varying(255) NOT NULL,
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
    id character varying(255) NOT NULL,
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
    story_id integer NOT NULL,
    event_id character varying(255) NOT NULL
);


ALTER TABLE stories.story_events OWNER TO wikidata_user;

--
-- Name: story_periods; Type: TABLE; Schema: stories; Owner: wikidata_user
--

CREATE TABLE stories.story_periods (
    story_id integer NOT NULL,
    period_id character varying(255) NOT NULL
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
EVT_FIRST_STARS	Q3343986	Formation des premières étoiles	Formation of first stars	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_GLOB_CLUSTERS	Q52863547	Formation des amas globulaires	Formation of globular clusters	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_EARTH_FORM	Q1235542	Formation de la Terre	Formation of Earth	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_OCEAN_FORM	Q428962	Formation des océans	Formation of oceans	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_FIRST_MIN	Q2603003	Premiers minéraux connus (zircons)	First known minerals (zircons)	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_FIRST_LIFE	Q13433688	Premières traces de vie	First traces of life	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_GOE	Q1545904	Apparition de l'oxygène atmosphérique (Grande Oxydation)	Great Oxygenation Event	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_HURON_GLAC	Q1393590	Glaciation huronienne	Huronian glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_STURT_GLAC	Q1636908	Glaciation sturtienne	Sturtian glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_EDIACARA	Q463516	Faune d'Édiacara	Ediacaran biota	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_LAND_PLANTS	Q1136609	Colonisation des terres par les plantes	Land plant colonization	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_KT_EXT	Q46368	Extinction Crétacé-Tertiaire	Cretaceous-Tertiary extinction	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_PRIMATES	Q7358	Apparition des premiers primates	Appearance of first primates	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_HIMALAYA	Q12467092	Formation de l'Himalaya	Formation of Himalayas	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_HOMINIDS	Q3238722	Apparition des premiers hominidés	Appearance of first hominids	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_QUAT_GLAC	Q11746	Début des glaciations quaternaires	Start of Quaternary glaciation	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_LAST_GLAC	Q121557	Fin de la dernière période glaciaire	End of last glacial period	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_WRITING	Q8767	Invention de l'écriture	Invention of writing	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_ROME	Q4940	Fondation de Rome	Foundation of Rome	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_HEGIRA	Q4389	Début de l'Hégire	Beginning of Hegira	\N	\N	\N	2025-06-13 12:42:13.952374	2025-06-13 12:42:13.952374
EVT_MOON_FORM	Q333656	Formation de la Lune	Formation of the Moon	\N	\N	1929-03-06 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:50.099011
EVT_PANGAEA	Q46253	Formation de la Pangée	Formation of Pangaea	\N	\N	1985-02-26 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:50.460181
EVT_SOLAR_NEB	Q162230	Formation de la nébuleuse solaire	Formation of solar nebula	\N	\N	2003-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:56.781418
EVT_FIRE_USE	Q3098972	Première utilisation contrôlée du feu	First controlled use of fire	\N	\N	1850-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:57.607732
EVT_ROME_FALL	Q132605	Chute de l'Empire romain d'Occident	Fall of Western Roman Empire	\N	\N	1936-12-22 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:43:57.733163
EVT_PT_EXT	Q214851	Extinction Permien-Trias	Permian-Triassic extinction	\N	\N	1850-08-26 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:44:00.321137
EVT_COLUMBIA	Q833611	Formation du supercontinent Columbia	Formation of Columbia supercontinent	\N	\N	1986-09-27 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 12:44:01.088456
EVT_MAMMALS	Q7377	Apparition des premiers mammifères	Appearance of first mammals	\N	\N	-160000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 12:52:31.908952
EVT_SAPIENS	Q15978631	Apparition d'Homo sapiens	Appearance of Homo sapiens	\N	\N	-200000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 12:52:32.936063
EVT_CAMBRIAN	Q32919	Explosion cambrienne	Explosion cambrienne	moment d'importante diversification des espèces animales, végétales et bactériennes	Portion of the Cambrian Period during which life vastly diversified	-543000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:00:04.084404
EVT_AGRICULTURE	Q11451	agriculture	agriculture	ensemble des activités humaines ayant pour objet la culture des terres et la production de nourriture	cultivation of plants and animals to provide useful products	-8000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 12:57:15.292865
EVT_AMPHIBIANS	Q10908	amphibien	amphibien	classe d'animaux tétrapodes	class of tetrapods, whose living forms include frogs, toads, salamanders, newts and caecilians	-370000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:01:06.608967
EVT_DINOSAURS	Q10811	Reptiles	Reptiles	classe des animaux vertébrés (Vertebrata)	class of vertebrate animals (Vertebrata)	-318000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:22:16.433307
EVT_BUDDHA	Q9441	Siddhartha Gautama	Siddhartha Gautama	maître spirituel fondateur du bouddhisme, (623 ou 563 AEC–543 ou 483 AEC)	Indian philosopher and the founder of Buddhism (623 or 563 BCE – 543 or 483 BCE)	-0500-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:12:53.327994
EVT_CYANOBACT	Q93315	Cyanobacteria	Cyanobacteria	embranchement de procaryotes	phylum of prokaryotes	-2100000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:13:35.774626
EVT_BIGBANG	Q323	Big Bang	Big Bang	modèle cosmologique de l'origine de l'Univers	hypothetical begin of the Universe through expansion out of an infinitely small and infinitely dense state	-13798000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:21:46.681393
EVT_FIRST_FISH	Q152	poisson	poisson	animal vertébré aquatique	vertebrate animal that lives in water and (typically) has gills	-530000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:23:10.79785
EVT_HOMO	Q171283	Homo	Homo	genre qui réunit Homo sapiens et les espèces apparentées	genus of mammals	-2800000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:24:28.529489
EVT_INSECTS	Q1390	insecte	insecte	classe d'arthropodes	class of arthropods	-400000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:26:57.952818
EVT_JESUS	Q302	Jésus-Christ	Jésus-Christ	messie et fils unique de Dieu pour les chrétiens	central figure of Christianity (6 or 4 BC – AD 30 or 33)	-0004-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:30:43.322937
EVT_WW2	Q362	Seconde Guerre mondiale	Seconde Guerre mondiale	conflit armé à l'échelle planétaire, de septembre 1939 à septembre 1945	1939–1945 global conflict	1939-09-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:40:32.348851
EVT_WW1	Q361	Première Guerre mondiale	Première Guerre mondiale	conflit armé à l'échelle planétaire, d'août 1914 à novembre 1918	global war originating in Europe, 1914–1918	1914-07-28 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:43:04.880784
EVT_EUKAR	Q19088	Eukaryota	Eukaryota	ensemble des espèces ayant des cellules avec un noyau	taxonomic group whose members have a cell nucleus enclosed within a nuclear envelope	-2700000000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 20:35:17.79465
EVT_SUN_FORM	Q525	Soleil	Soleil	étoile au centre du Système solaire, source principale de lumière et de chaleur pour ses planètes, notamment pour la Terre	star at the centre of the Solar System	1973-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 20:57:01.808577
EVT_PYRAMIDS	Q37200	pyramide de Khéops	pyramide de Khéops	plus ancienne et plus grande des trois pyramides de la nécropole de Gizeh	oldest and largest of the three pyramids in the Giza Necropolis; one of the seven ancient wonders of the world	-2559-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 21:23:52.024679
EVT_CAVE_ART	Q214334	peinture pariétale	peinture pariétale	peinture exécutée durant la Préhistoire sur les parois rocheuses de grottes	paintings found on cave walls and ceilings	-38000-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 13:14:09.103315
EVT_FR_REV	Q6534	Révolution française	Révolution française	période de l'histoire de France et de ses colonies, du 5 mai 1789 au 9 novembre 1799	revolution in France from 1789 to 1799	1789-05-05 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:23:52.3814
EVT_LHB_END	Q591571	grand bombardement tardif	grand bombardement tardif		hypothesized event, occurring ca. 4.1–3.8 billion years ago, during which a large number of asteroids collided with the Moon, Mercury, Venus, Earth, and Mars	Date inconnue	2025-06-13 12:42:13.952374	2025-06-13 19:34:44.030947
EVT_IND_REV	Q2269	Révolution industrielle	Révolution industrielle	transition vers de nouveaux procédés de fabrication en Europe et aux États-Unis aux XVIIIe et XIXe siècles	transition to new manufacturing processes in Europe and the United States, in the 18th-19th centuries	1760-01-01 00:00:00	2025-06-13 12:42:13.952374	2025-06-13 19:39:34.794889
EVT_MOON_LAND	Q43653	Apollo 11	Apollo 11	11e mission du programme spatial américain Apollo (premiers pas de l'homme sur la Lune)	first Moon landing and fifth crewed flight of the United States Apollo program	-3099-01-01T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 19:49:48.340655
Q69163529	Q69163529	chute du Mur de Berlin	chute du Mur de Berlin	événement historique en novembre 1989 où le mur de Berlin a été démoli	historical event in November 1989 where the Berlin Wall was opened and demolished	1989-11-09T00:00:00Z	2025-06-13 20:00:56.095994	2025-06-13 20:00:56.095994
EVT_AMERICA	Q221474	découverte et exploration de l'Amérique	découverte et exploration de l'Amérique	événement historique	arrival of Christopher Columbus and crew to America	1492-10-21T00:00:00Z	2025-06-13 12:42:13.952374	2025-06-13 21:22:54.477719
Q55811	Q55811	extinction Crétacé-Paléogène	extinction Crétacé-Paléogène	événement d'extinction massive d'espèces	extinction event ending the Mesozoic Era	-66000000-01-01T00:00:00Z	2025-06-13 21:26:01.801136	2025-06-13 21:26:01.801136
Q141118	Q141118	extinction Permien-Trias	extinction Permien-Trias	cas d’extinction de masse le plus grave de la chronologie de la Terre	mass extinction event at the end of the Permian Period approximately 250 million years ago	-251900000-01-01T00:00:00Z	2025-06-13 21:26:19.179711	2025-06-13 21:26:19.179711
Q796140	Q796140	extinction de l’Holocène	extinction de l’Holocène	phénomène d’extinction massive durant l’actuelle époque géologique de l’Holocène	massive extinction event during the current Holocene geological epoch	-10000-01-01T00:00:00Z	2025-06-13 21:26:54.609391	2025-06-13 21:26:54.609391
\.


--
-- Data for Name: periods; Type: TABLE DATA; Schema: periods; Owner: wikidata_user
--

COPY periods.periods (id, wikidata_id, label_fr, label_en, description_fr, description_en, start_date, end_date, temporal_location, created_at, updated_at, has_parent, children) FROM stdin;
PER_PLANCK	Q172932	Ère de Planck	Planck Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_GUT	Q898941	Ère de la Grande Unification	Grand Unification Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_CRYOGENIAN	Q507402	Cryogénien	Cryogenian	deuxième période du Néoprotérozoïque	second period of the Neoproterozoic Era	-720000000-01-01T00:00:00Z	-635000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:56:36.255965	f	[]
PER_EARTH	Q2277	Empire romain	Empire romain	nom donné à la domination romaine antique entre 27 av. J.-C. et 395 ap. J.-C.	period of ancient Rome following the Republic	-0026-01-01T00:00:00Z	0395-01-01T00:00:00Z		2025-06-13 12:42:13.948686	2025-06-17 11:04:47.982492	f	[]
PER_CENOZOIC	Q102416	Cénozoïque	Cenozoic	troisième et actuelle ère géologique du Phanérozoïque, −66,0 Ma au présent	third and current era of the Phanerozoic Eon	\N	TODAY	\N	2025-06-13 12:42:13.948686	2025-06-17 11:22:55.197657	f	\N
Q362	Q362	Seconde Guerre mondiale	Seconde Guerre mondiale	conflit armé à l'échelle planétaire, de septembre 1939 à septembre 1945	1939–1945 global conflict	1939-09-01T00:00:00Z	1945-09-02T00:00:00Z	Globale	2025-06-13 20:20:10.887893	2025-06-16 20:42:52.150919	f	\N
Q361	Q361	Première Guerre mondiale	Première Guerre mondiale	conflit armé à l'échelle planétaire, d'août 1914 à novembre 1918	global war originating in Europe, 1914–1918	1914-07-28T00:00:00Z	1918-11-11T00:00:00Z	Globale	2025-06-13 20:22:37.317685	2025-06-16 20:42:52.150919	f	\N
PER_BIGBANG	Q323	Big Bang	Big Bang	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:43:13.247329	f	\N
PER_MESOPROTEROZOIC	Q210611	Mésoprotérozoïque	Mésoprotérozoïque	deuxième ère du Protérozoïque	second era of the Proterozoic Eon	-1600000000-01-01T00:00:00Z	-1000000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:22:45.897681	f	\N
Q101313	Q101313	Phanérozoïque	Phanerozoic	actuel éon de l'échelle des temps géologiques, les 541 derniers millions d'années	fourth and current eonothem and eon of the geological timescale	-538800000-01-01T00:00:00Z	TODAY	Globale	2025-06-16 20:46:19.776579	2025-06-17 11:22:45.897681	f	[]
Q191935	Q191935	Néoprotérozoïque	Neoproterozoic	troisième et dernière ère du Protérozoïque	third and final era of the Proterozoic Eon	-1000000000-01-01T00:00:00Z	-538800000-01-01T00:00:00Z	\N	2025-06-17 11:06:44.840836	2025-06-17 11:22:55.197657	f	\N
Q8683	Q8683	guerre froide	Cold War	conflit idéologique du XXe siècle	1947–1991 tension between the Soviet Union and the United States and their respective allies	1945-01-01T00:00:00Z	1991-12-25T00:00:00Z	Globale	2025-06-13 20:16:05.284393	2025-06-17 11:31:56.151082	f	[]
PER_JURASSIC	Q45805	Jurassique	Jurassic	seconde période géologique du Mésozoïque, 201,3 à 145,0 Ma avant le présent	second period of the Mesozoic Era	-201400000-01-01T00:00:00Z	-145000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:32:04.38819	f	[]
Q607992	Q607992	Mésoarchéen	Mésoarchéen	troisième ère de l'Archéen	third era of the Archean Eon	-3200000000-01-01T00:00:00Z	-2800000000-01-01T00:00:00Z	Globale	2025-06-16 20:52:29.576507	2025-06-17 11:47:37.156474	t	\N
PER_HADEAN	Q104460	Hadéen	Hadean	premier éon de l'échelle des temps géologiques, de 4 560 Ma d'années à 4 000 Ma avant le présent	first eon of the geological timescale, beginning with the formation of the Earth about 4.567 billion years ago	-4567300000-01-01T00:00:00Z	-4031000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:46:49.358356	t	[]
PER_MILKYWAY	Q2	Terre	Earth	troisième planète à partir du Soleil dans le système solaire	third planet from the Sun in the Solar System	-4540000000-01-01T00:00:00Z	TODAY	\N	2025-06-13 12:42:13.948686	2025-06-17 11:48:53.238553	f	["Q104168", "PER_HADEAN", "PER_QUATERNARY"]
PER_CAMBRIAN	Q79064	Cambrien	Cambrian	première période géologique du Paléozoïque, de 541 à 485,4 Ma avant le présent	first period of the Paleozoic Era	-538800000-01-01T00:00:00Z	-486850000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:56:43.448879	f	[]
PER_PALEOZOIC	Q75507	Paléozoïque	Paleozoic	première ère géologique du Phanérozoïque, anciennement appelée « ère primaire » (de -541 à -252,2 millions d’années)	first erathem and era of the Phanerozoic eonothem and eon	-538800000-01-01T00:00:00Z	-251902000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:51:35.061801	f	[]
PER_ORDOVICIAN	Q62100	Ordovicien	Ordovician	seconde période géologique du Paléozoïque, de 485,4 à 443,4 Ma avant le présent	second period of the Paleozoic Era	-486850000-01-01T00:00:00Z	-443100000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:57:35.221657	f	[]
PER_NEOGENE	Q3982	Néogène	Neogene	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 11:04:48.004336	f	\N
PER_MESOZOIC	Q5390	Mésozoïque	Mesozoic	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-17 08:58:22.132961	f	\N
PER_SOLAR_SYS	Q544	Système solaire	Solar System	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_SILURIAN	Q5426	Silurien	Silurian	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_ELECTROWEAK	Q899367	Ère Électrofaible	Electroweak Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_PALEOGENE	Q23018	Paléogène	Paleogene	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_NUCLEOSYN	Q217416	Ère de la Nucléosynthèse Primordiale	Primordial Nucleosynthesis Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_TRIASSIC	Q5383	Trias	Triassic	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_DARK_AGES	Q1236209	Ère des Âges Sombres	Dark Ages Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_HADRON	Q899383	Ère Hadronique	Hadronic Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_DEVONIAN	Q65955	Dévonien	Devonian	quatrième période géologique du Paléozoïque, 419,2 à 359 Ma avant le présent	fourth period of the Paleozoic Era	-419200000-01-01T00:00:00Z	-358900000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:46:34.449183	f	[]
PER_PALEOPROTEROZOIC	Q193738	Paléoprotérozoïque	Paleoproterozoic	première ère du Protérozoïque	first era of the Proterozoic Eon	-2500000000-01-01T00:00:00Z	-1600000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:22:45.897681	f	[]
PER_RECOMB	Q899426	Ère de la Recombinaison	Recombination Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
Q731470	Q731470	Éoarchéen	Éoarchéen	première ère de l'Archéen	first era of the Archean Eon	-4031000000-01-01T00:00:00Z	-3600000000-01-01T00:00:00Z	Globale	2025-06-16 20:48:13.274011	2025-06-17 11:47:39.110352	t	\N
Q645135	Q645135	Néoarchéen	Néoarchéen	Quatrième et dernière ère de l'Archéen	fourth and final era of the Archean Eon	-2800000000-01-01T00:00:00Z	-2500000000-01-01T00:00:00Z	Globale	2025-06-16 20:53:15.143929	2025-06-17 11:47:40.5221	t	\N
Q104168	Q104168	Archéen	Archean	second éon de l'échelle des temps géologiques	second eon of the geologic timescale, spanning from around 4.031 to 2.5 billion years ago	-4031000000-01-01T00:00:00Z	-2500000000-01-01T00:00:00Z	Globale	2025-06-16 20:45:18.405834	2025-06-17 11:47:42.394259	t	["Q607992", "Q731470", "Q645135", "Q738167"]
PER_LEPTON	Q899379	Ère Leptonique	Leptonic Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_REION	Q901651	Ère de Réionisation	Reionization Era	\N	\N	\N	\N	\N	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
PER_QUATERNARY	Q26185	Quaternaire	Quaternary	troisième et actuelle période géologique du Cénozoïque, -2,58 Ma au présent	third and current period of the Cenozoic Era	-2580000-01-01T00:00:00Z	TODAY	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:49:13.523011	t	[]
Q738167	Q738167	Paléoarchéen	Paléoarchéen	deuxième ère de l'Archéen	second era of the Archean Eon	-3600000000-01-01T00:00:00Z	-3200000000-01-01T00:00:00Z	Globale	2025-06-16 20:48:57.828864	2025-06-17 11:47:42.401804	t	\N
PER_CARBONIFEROUS	Q133738	Carbonifère	Carboniferous	cinquième période géologique du Paléozoïque, 359 à 298,9 Ma avant le présent	fifth period of the Paleozoic Era	-358900000-01-01T00:00:00Z	-298900000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 11:48:03.946679	f	[]
PER_PERMIAN	Q76402	Permien	Permien	sixième et dernière période géologique du Paléozoïque, 298,9 à 252,2 Ma avant le présent	sixth and final system and period of the Paleozoic erathem and era	-298900000-01-01T00:00:00Z	-251902000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-17 10:25:07.90985	f	[]
Q104162	Q104162	Protérozoïque	Proterozoic	troisième et dernier éon du Précambrien	third eon of the geological timescale, last eon of the Precambrian Supereon	-2500000000-01-01T00:00:00Z	-538800000-01-01T00:00:00Z	Globale	2025-06-16 20:45:43.681521	2025-06-17 10:37:00.084015	f	[]
PER_CRETACEOUS	Q44626	Crétacé	Crétacé	troisième période géologique du Mésozoïque, 145,0 à 66,0 Ma avant le présent	third and final period of the Mesozoic Era	-145000000-01-01T00:00:00Z	-66000000-01-01T00:00:00Z	Globale	2025-06-13 12:42:13.948686	2025-06-16 20:42:52.150919	f	\N
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
1	EVT_BIGBANG
1	EVT_CAMBRIAN
2	EVT_CAMBRIAN
2	EVT_CYANOBACT
2	EVT_EARTH_FORM
2	EVT_EUKAR
2	EVT_FIRST_FISH
2	EVT_HOMINIDS
2	EVT_HOMO
2	EVT_KT_EXT
2	EVT_LHB_END
2	EVT_MAMMALS
2	EVT_PANGAEA
2	EVT_PT_EXT
2	EVT_STURT_GLAC
2	EVT_WRITING
2	Q141118
2	Q55811
2	Q796140
3	EVT_BIGBANG
2	EVT_AGRICULTURE
\.


--
-- Data for Name: story_periods; Type: TABLE DATA; Schema: stories; Owner: wikidata_user
--

COPY stories.story_periods (story_id, period_id) FROM stdin;
1	PER_MILKYWAY
2	PER_JURASSIC
2	PER_CRETACEOUS
2	PER_CENOZOIC
2	PER_CRYOGENIAN
2	PER_CAMBRIAN
2	PER_QUATERNARY
4	Q8683
4	Q362
4	Q361
3	PER_BIGBANG
3	PER_LEPTON
3	PER_ELECTROWEAK
3	PER_PLANCK
3	PER_NUCLEOSYN
3	PER_REION
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
-- Name: event_categories event_categories_pkey; Type: CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.event_categories
    ADD CONSTRAINT event_categories_pkey PRIMARY KEY (event_id, category_id);


--
-- Name: period_categories period_categories_pkey; Type: CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.period_categories
    ADD CONSTRAINT period_categories_pkey PRIMARY KEY (period_id, category_id);


--
-- Name: story_categories story_categories_pkey; Type: CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.story_categories
    ADD CONSTRAINT story_categories_pkey PRIMARY KEY (story_id, category_id);


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
-- Name: story_events story_events_pkey; Type: CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.story_events
    ADD CONSTRAINT story_events_pkey PRIMARY KEY (story_id, event_id);


--
-- Name: story_periods story_periods_pkey; Type: CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.story_periods
    ADD CONSTRAINT story_periods_pkey PRIMARY KEY (story_id, period_id);


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
-- Name: event_categories event_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.event_categories
    ADD CONSTRAINT event_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories.categories(id);


--
-- Name: period_categories period_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.period_categories
    ADD CONSTRAINT period_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories.categories(id);


--
-- Name: story_categories story_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: categories; Owner: wikidata_user
--

ALTER TABLE ONLY categories.story_categories
    ADD CONSTRAINT story_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories.categories(id);


--
-- Name: story_events story_events_story_id_fkey; Type: FK CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.story_events
    ADD CONSTRAINT story_events_story_id_fkey FOREIGN KEY (story_id) REFERENCES stories.stories(id);


--
-- Name: story_periods story_periods_story_id_fkey; Type: FK CONSTRAINT; Schema: stories; Owner: wikidata_user
--

ALTER TABLE ONLY stories.story_periods
    ADD CONSTRAINT story_periods_story_id_fkey FOREIGN KEY (story_id) REFERENCES stories.stories(id);


--
-- PostgreSQL database dump complete
--


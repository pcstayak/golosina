-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.recording_comments (
  id bigint NOT NULL DEFAULT nextval('recording_comments_id_seq'::regclass),
  recording_id text NOT NULL UNIQUE,
  session_id text,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recording_comments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shared_lessons (
  session_id text NOT NULL,
  set_name text NOT NULL,
  set_description text,
  recording_count smallint,
  files jsonb,
  created_at timestamp without time zone,
  CONSTRAINT shared_lessons_pkey PRIMARY KEY (session_id)
);
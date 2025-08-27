

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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."recording_comments" (
    "id" bigint NOT NULL,
    "recording_id" "text" NOT NULL,
    "session_id" "text",
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recording_comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."recording_comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."recording_comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."recording_comments_id_seq" OWNED BY "public"."recording_comments"."id";



CREATE TABLE IF NOT EXISTS "public"."shared_lessons" (
    "session_id" "text" NOT NULL,
    "set_name" "text" NOT NULL,
    "set_description" "text",
    "recording_count" smallint,
    "files" "jsonb",
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."shared_lessons" OWNER TO "postgres";


ALTER TABLE ONLY "public"."recording_comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."recording_comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."recording_comments"
    ADD CONSTRAINT "recording_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recording_comments"
    ADD CONSTRAINT "recording_comments_recording_id_key" UNIQUE ("recording_id");



ALTER TABLE ONLY "public"."shared_lessons"
    ADD CONSTRAINT "shared_lessons_pkey" PRIMARY KEY ("session_id");



CREATE POLICY "Allow public inserts" ON "public"."shared_lessons" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public reads" ON "public"."shared_lessons" FOR SELECT USING (true);



ALTER TABLE "public"."recording_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_lessons" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."recording_comments" TO "anon";
GRANT ALL ON TABLE "public"."recording_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."recording_comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recording_comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recording_comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recording_comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."shared_lessons" TO "anon";
GRANT ALL ON TABLE "public"."shared_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_lessons" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;

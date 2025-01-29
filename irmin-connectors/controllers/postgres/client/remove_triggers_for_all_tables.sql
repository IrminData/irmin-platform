-- 1. Drop all triggers in public schema that match our naming pattern "<tablename>_notify"
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT event_object_table AS table_name,
               trigger_name
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE '%_notify'
    LOOP
        RAISE NOTICE 'Dropping trigger % on table %', r.trigger_name, r.table_name;
        EXECUTE format('DROP TRIGGER %I ON %I', r.trigger_name, r.table_name);
    END LOOP;
END;
$$;

-- 2. Drop the function that was attached to those triggers
DROP FUNCTION IF EXISTS notify_table_change() CASCADE;

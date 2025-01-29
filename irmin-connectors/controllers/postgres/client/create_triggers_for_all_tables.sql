-- 1. Define the function (in PL/pgSQL)
CREATE OR REPLACE FUNCTION notify_table_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    payload JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        payload := jsonb_build_object(
            'operation', 'DELETE',
            'table', TG_TABLE_NAME,
            'id', OLD.id
        );
    ELSIF TG_OP = 'INSERT' THEN
        payload := jsonb_build_object(
            'operation', 'INSERT',
            'table', TG_TABLE_NAME,
            'id', NEW.id
        );
    ELSE
        -- Assume UPDATE
        payload := jsonb_build_object(
            'operation', 'UPDATE',
            'table', TG_TABLE_NAME,
            'id', NEW.id
        );
    END IF;

    PERFORM pg_notify('data_change', payload::text);

    RETURN NEW;
END;
$$;

-- 2. Create triggers for all tables in the public schema (in PL/pgSQL)
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I_notify
             AFTER INSERT OR UPDATE OR DELETE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION notify_table_change()',
            t.tablename,
            t.tablename
        );
    END LOOP;
END;
$$;

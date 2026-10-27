CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.fran7_ai_rate_limits (
    bucket_key text PRIMARY KEY,
    minute_window_start timestamptz NOT NULL,
    minute_count integer NOT NULL DEFAULT 0,
    hour_window_start timestamptz NOT NULL,
    hour_count integer NOT NULL DEFAULT 0,
    day_window_start date NOT NULL,
    day_count integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fran7_ai_rate_limits_updated_at_idx
    ON private.fran7_ai_rate_limits (updated_at);

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.fran7_ai_rate_limits FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fran7_check_ai_rate_limit(p_client_hash text)
RETURNS TABLE(is_allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET timezone = 'UTC'
AS $$
DECLARE
    v_now timestamptz := clock_timestamp();
    v_minute_start timestamptz;
    v_hour_start timestamptz;
    v_day_start date;
    v_client_key text;
    v_client_minute_start timestamptz;
    v_client_minute_count integer;
    v_client_hour_start timestamptz;
    v_client_hour_count integer;
    v_global_day_start date;
    v_global_day_count integer;
    v_retry_after integer := 0;
BEGIN
    IF p_client_hash IS NULL OR p_client_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid client rate-limit key';
    END IF;

    v_minute_start := date_trunc('minute', v_now);
    v_hour_start := date_trunc('hour', v_now);
    v_day_start := (v_now AT TIME ZONE 'UTC')::date;
    v_client_key := 'ip:' || p_client_hash;

    INSERT INTO private.fran7_ai_rate_limits (
        bucket_key,
        minute_window_start,
        hour_window_start,
        day_window_start
    )
    VALUES ('global', v_minute_start, v_hour_start, v_day_start)
    ON CONFLICT (bucket_key) DO NOTHING;

    SELECT day_window_start, day_count
    INTO v_global_day_start, v_global_day_count
    FROM private.fran7_ai_rate_limits
    WHERE bucket_key = 'global'
    FOR UPDATE;

    IF v_global_day_start = v_day_start AND v_global_day_count >= 500 THEN
        v_retry_after := CEIL(
            EXTRACT(EPOCH FROM ((v_day_start + 1)::timestamp AT TIME ZONE 'UTC' - v_now))::numeric
        )::integer;
        RETURN QUERY SELECT false, v_retry_after;
        RETURN;
    END IF;

    INSERT INTO private.fran7_ai_rate_limits (
        bucket_key,
        minute_window_start,
        hour_window_start,
        day_window_start
    )
    VALUES (v_client_key, v_minute_start, v_hour_start, v_day_start)
    ON CONFLICT (bucket_key) DO NOTHING;

    SELECT minute_window_start, minute_count, hour_window_start, hour_count
    INTO v_client_minute_start, v_client_minute_count, v_client_hour_start, v_client_hour_count
    FROM private.fran7_ai_rate_limits
    WHERE bucket_key = v_client_key
    FOR UPDATE;

    IF v_client_minute_start = v_minute_start AND v_client_minute_count >= 5 THEN
        v_retry_after := GREATEST(
            v_retry_after,
            CEIL(EXTRACT(EPOCH FROM (v_minute_start + INTERVAL '1 minute' - v_now))::numeric)::integer
        );
    END IF;

    IF v_client_hour_start = v_hour_start AND v_client_hour_count >= 30 THEN
        v_retry_after := GREATEST(
            v_retry_after,
            CEIL(EXTRACT(EPOCH FROM (v_hour_start + INTERVAL '1 hour' - v_now))::numeric)::integer
        );
    END IF;

    IF v_retry_after > 0 THEN
        RETURN QUERY SELECT false, v_retry_after;
        RETURN;
    END IF;

    UPDATE private.fran7_ai_rate_limits
    SET
        minute_count = CASE
            WHEN minute_window_start = v_minute_start THEN minute_count + 1
            ELSE 1
        END,
        minute_window_start = v_minute_start,
        hour_count = CASE
            WHEN hour_window_start = v_hour_start THEN hour_count + 1
            ELSE 1
        END,
        hour_window_start = v_hour_start,
        day_count = CASE
            WHEN day_window_start = v_day_start THEN day_count + 1
            ELSE 1
        END,
        day_window_start = v_day_start,
        updated_at = v_now
    WHERE bucket_key IN (v_client_key, 'global');

    IF v_global_day_count % 50 = 49 THEN
        DELETE FROM private.fran7_ai_rate_limits
        WHERE bucket_key <> 'global'
            AND updated_at < v_now - INTERVAL '2 days';
    END IF;

    RETURN QUERY SELECT true, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.fran7_check_ai_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fran7_check_ai_rate_limit(text) TO service_role;

-- Schedule the scheduled-call-trigger edge function to run every 5 minutes.
-- Apply AFTER the function is deployed.
--
-- Required: vault.create_secret('<service-role-key>', 'service_role_key') run once.

select cron.schedule(
  'scheduled-call-trigger',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := 'https://otamjpxbfesbxzyeoaec.supabase.co/functions/v1/scheduled-call-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  $$
);

-- To remove: select cron.unschedule('scheduled-call-trigger');
-- To inspect: select * from cron.job where jobname = 'scheduled-call-trigger';
-- Recent runs: select * from cron.job_run_details order by start_time desc limit 10;

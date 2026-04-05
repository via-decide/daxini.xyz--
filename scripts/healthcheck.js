#!/usr/bin/env node

async function runHealthcheck() {
  const baseUrl = process.env.HEALTHCHECK_URL || 'http://127.0.0.1:3000';
  const target = new URL('/', baseUrl);

  try {
    const response = await fetch(target);
    if (response.status === 200) {
      console.log('SITE_HEALTH_OK');
      process.exit(0);
    }

    console.error(`SITE_HEALTH_FAIL status=${response.status}`);
    process.exit(1);
  } catch (error) {
    console.error(`SITE_HEALTH_FAIL fetch_error target=${target}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

runHealthcheck();

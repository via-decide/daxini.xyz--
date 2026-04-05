#!/usr/bin/env node

async function runHealthcheck() {
  const target = process.env.HEALTHCHECK_URL || 'http://127.0.0.1:3000/';

  try {
    const response = await fetch(target);
    if (response.status === 200) {
      console.log(`OK: ${target} returned 200`);
      process.exit(0);
    }

    console.error(`FAIL: ${target} returned ${response.status}`);
    process.exit(1);
  } catch (error) {
    console.error(`FAIL: unable to fetch ${target}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

runHealthcheck();

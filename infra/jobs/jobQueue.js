const queue = [];

export function addJob(job) {
  queue.push(job);
}

export async function runJobs() {
  while (queue.length > 0) {
    const job = queue.shift();

    console.log('Running job:', job);
    await job.run();
  }
}

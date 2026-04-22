export function backupState() {
  const backup = {
    timestamp: Date.now(),
    storage: { ...localStorage }
  };

  const json = JSON.stringify(backup);

  downloadBackup(json);
}

function downloadBackup(data) {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = 'daxini-backup.json';
  a.click();
}

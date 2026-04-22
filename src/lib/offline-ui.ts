export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatProgress(receivedBytes: number, totalBytes: number | null) {
  if (!totalBytes || totalBytes <= 0) return `${formatBytes(receivedBytes)} téléchargés`;
  const percent = Math.max(0, Math.min(100, Math.round((receivedBytes / totalBytes) * 100)));
  return `${percent}% • ${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)}`;
}
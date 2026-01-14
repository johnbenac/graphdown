export function isRecordFileBytes(path: string, bytes: Uint8Array): boolean {
  const lower = path.toLowerCase();
  if (!lower.endsWith('.md')) {
    return false;
  }
  if (bytes.length < 4) {
    return false;
  }
  if (bytes[0] !== 45 || bytes[1] !== 45 || bytes[2] !== 45) {
    return false;
  }
  const next = bytes[3];
  if (next === 10) return true; // \n
  if (next === 13 && bytes.length >= 5 && bytes[4] === 10) return true; // \r\n
  if (next === 13) return true; // bare \r
  return false;
}

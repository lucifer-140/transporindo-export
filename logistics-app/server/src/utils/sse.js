const clients = new Set();

export function addClient(raw) {
  clients.add(raw);
  return () => clients.delete(raw);
}

export function broadcast(keys) {
  const msg = `event: invalidate\ndata: ${JSON.stringify(keys)}\n\n`;
  for (const raw of clients) {
    try { raw.write(msg); } catch { clients.delete(raw); }
  }
}

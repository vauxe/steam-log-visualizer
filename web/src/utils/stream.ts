export async function readLinesFromFile(
  file: File,
  onLine: (line: string) => Promise<void> | void
) {
  const stream = (file as any).stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let { value, done } = await reader.read();
  let buf = value ? decoder.decode(value, { stream: true }) : '';
  while (true) {
    const nl = buf.indexOf('\n');
    if (nl === -1) {
      const res = await reader.read();
      done = res.done;
      value = res.value;
      if (done) {
        if (buf.length) await onLine(buf.replace(/\r$/, ''));
        break;
      }
      buf += decoder.decode(value, { stream: true });
      continue;
    }
    const line = buf.slice(0, nl).replace(/\r$/, '');
    await onLine(line);
    buf = buf.slice(nl + 1);
  }
}

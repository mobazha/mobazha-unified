/** Extract skill run id from agent_product_import_ingest tool/API payloads. */
export function extractProductImportRunId(result: unknown): string | null {
  if (result == null) return null;
  if (typeof result === 'string') {
    try {
      return extractProductImportRunId(JSON.parse(result));
    } catch {
      return null;
    }
  }
  if (typeof result !== 'object') return null;

  const record = result as Record<string, unknown>;
  if ('error' in record) return null;

  const data = record.data;
  if (data && typeof data === 'object') {
    const fromData = readSkillRunId(data as Record<string, unknown>);
    if (fromData) return fromData;
  }

  return readSkillRunId(record);
}

function readSkillRunId(value: Record<string, unknown>): string | null {
  const skillRun = value.skillRun;
  if (!skillRun || typeof skillRun !== 'object') return null;
  const id = (skillRun as Record<string, unknown>).id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

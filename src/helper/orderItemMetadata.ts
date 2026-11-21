import { decode } from "he";

export interface FormattedMetadataPair {
  name: string;
  value: string;
}

const DECORATIVE_SYMBOLS = /[\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF]/g;

const INTERNAL_METADATA_KEYS = new Set([
  "id",
  "item_id",
  "line_item_id",
  "order_id",
  "parent_id",
  "product_id",
  "variation_id",
  "quantity",
  "qty",
  "subtotal",
  "subtotal_tax",
  "total",
  "total_tax",
  "tax",
  "tax_class",
  "line_total",
  "line_tax",
  "line_subtotal",
  "line_subtotal_tax",
  "parent_name",
  "slug",
  "type",
  "status",
  "date",
  "date_created",
  "date_modified",
  "created_at",
  "updated_at",
  "permalink",
  "link",
  "image",
  "sku",
  "wcpa_empty_label",
]);

const INTERNAL_KEY_PREFIXES = [
  "_",
  "wp_",
  "wc_",
  "woocommerce_",
  "internal_",
  "system_",
];

const LABEL_FIELDS = [
  "display_key",
  "displayKey",
  "display_label",
  "displayLabel",
  "label",
  "attribute",
  "name",
];

const VALUE_FIELDS = [
  "display_value",
  "displayValue",
  "display",
  "value",
  "option",
  "selected",
  "answer",
];

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeMetadataText(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = typeof value === "string" ? value : String(value);

  text = decode(text);
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(DECORATIVE_SYMBOLS, " ");

  return normalizeWhitespace(text);
}

export function humanizeMetadataKey(value: unknown): string {
  let label = sanitizeMetadataText(value);

  label = label.replace(
    /^(?:attribute_|pa_|variation_|custom_)+/i,
    ""
  );
  label = label.replace(/[._\-/]+/g, " ");
  label = label.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  label = normalizeWhitespace(label);

  if (!label) return "";

  return label
    .split(" ")
    .map((word) =>
      word === word.toLowerCase()
        ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
        : word
    )
    .join(" ");
}

export function isInternalMetadataKey(value: unknown): boolean {
  const key = sanitizeMetadataText(value);
  if (!key) return true;

  const normalized = key.toLowerCase().replace(/[\s.-]+/g, "_");

  if (INTERNAL_METADATA_KEYS.has(normalized)) return true;
  if (INTERNAL_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  return /(^|_)id$/.test(normalized);
}

function getFirstDefined(record: Record<string, any>, fields: string[]) {
  for (const field of fields) {
    const candidate = record[field];

    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "string" && !candidate.trim()) continue;

    return candidate;
  }

  return undefined;
}

function isMetadataEntry(record: Record<string, any>) {
  if ("key" in record || "display_key" in record || "displayKey" in record) {
    return true;
  }

  return (
    LABEL_FIELDS.some((field) => field in record) &&
    VALUE_FIELDS.some((field) => field in record)
  );
}

export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return sanitizeMetadataText(value);

  if (typeof value === "number" || typeof value === "boolean") {
    return sanitizeMetadataText(String(value));
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatMetadataValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (isRecord(value)) {
    const preferred = getFirstDefined(value, VALUE_FIELDS);
    const label = getFirstDefined(value, LABEL_FIELDS);

    if (preferred !== undefined) {
      const formatted = formatMetadataValue(preferred);
      if (!formatted) return "";

      const cleanLabel = sanitizeMetadataText(label);
      return cleanLabel ? `${cleanLabel}: ${formatted}` : formatted;
    }

    return Object.entries(value)
      .filter(([key]) => !isInternalMetadataKey(key))
      .map(([key, nested]) => {
        const formatted = formatMetadataValue(nested);
        if (!formatted) return "";

        const cleanLabel = humanizeMetadataKey(key);
        return cleanLabel ? `${cleanLabel}: ${formatted}` : formatted;
      })
      .filter(Boolean)
      .join("; ");
  }

  return "";
}

export function metadataPairKey(pair: FormattedMetadataPair) {
  return `${pair.name.toLowerCase()}|${pair.value}`;
}

export interface MetadataUnit {
  index: number;
  pairs: FormattedMetadataPair[];
}

export interface WcpaMetadataGrouping {
  shared: FormattedMetadataPair[];
  units: MetadataUnit[];
}

export interface WcpaOrderMetaExtract {
  value: unknown;
  metaIds: number[];
}

interface WcpaFieldEntry {
  index: number;
  label: string;
  value: string;
  identity: string;
  rawValue: unknown;
  type: string;
  sectionKey: string;
  formId: string;
}

interface WcpaSection {
  key: string;
  formId: string;
  entries: WcpaFieldEntry[];
}

const WCPA_ORDER_META_KEY = "_wcpa_order_meta_data";
const WCPA_EMPTY_LABEL = "wcpa_empty_label";
const WCPA_SKIP_TYPES = new Set(["content", "separator", "header", "hidden"]);
const WCPA_OPTION_TYPES = new Set([
  "select",
  "radio-group",
  "checkbox-group",
  "multi-select",
  "checkbox",
]);

function isWcpaEmptyLabel(value: unknown) {
  return sanitizeMetadataText(value).toLowerCase() === WCPA_EMPTY_LABEL;
}

function parseJsonValue(value: unknown): unknown {
  let current = value;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (typeof current !== "string") return current;

    const trimmed = current.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return current;

    try {
      current = JSON.parse(trimmed);
    } catch {
      return current;
    }
  }

  return current;
}

function getWcpaSectionFields(node: Record<string, any>) {
  const rawFields = node?.fields;
  const rows = Array.isArray(rawFields)
    ? rawFields
    : isRecord(rawFields)
      ? Object.values(rawFields)
      : [];

  const fields: Record<string, any>[] = [];

  for (const row of rows) {
    const items = Array.isArray(row) ? row : [row];
    for (const field of items) {
      if (isRecord(field)) fields.push(field);
    }
  }

  return fields;
}

function getWcpaSectionFormId(node: Record<string, any>) {
  return sanitizeMetadataText(node?.extra?.form_id ?? node?.extra?.formId);
}

function collectWcpaRawSections(value: unknown) {
  const sections: { key: string; formId: string; fields: Record<string, any>[] }[] =
    [];

  if (isRecord(value)) {
    const values = Object.values(value);
    const hasSections = values.some(
      (section) =>
        isRecord(section) && ("fields" in section || "extra" in section)
    );

    if (!hasSections) {
      sections.push({ key: "", formId: "", fields: [value] });
    } else {
      for (const [key, section] of Object.entries(value)) {
        if (!isRecord(section)) continue;
        sections.push({
          key,
          formId: getWcpaSectionFormId(section),
          fields: getWcpaSectionFields(section),
        });
      }
    }
  } else if (Array.isArray(value)) {
    const hasSections = value.some(
      (section) =>
        isRecord(section) && ("fields" in section || "extra" in section)
    );

    if (!hasSections) {
      sections.push({
        key: "",
        formId: "",
        fields: value.filter(isRecord),
      });
    } else {
      value.forEach((section, index) => {
        if (!isRecord(section)) return;
        sections.push({
          key: String(index),
          formId: getWcpaSectionFormId(section),
          fields: getWcpaSectionFields(section),
        });
      });
    }
  }

  return sections;
}

function formatWcpaItem(item: unknown, type: string): string {
  if (isRecord(item)) {
    const label = sanitizeMetadataText(item.label);
    const value = sanitizeMetadataText(item.value);

    if (item.i === "other") {
      return label && value ? `${label}: ${value}` : value || label;
    }

    if (value && !WCPA_OPTION_TYPES.has(type)) {
      return label ? `${label}: ${value}` : value;
    }

    return label || value;
  }

  return sanitizeMetadataText(item);
}

function formatWcpaFieldValue(field: Record<string, any>): string {
  const value = field?.value;

  if (value === false || value === null || value === undefined) return "";
  if (value === true) return "Yes";

  const type = sanitizeMetadataText(field?.type).toLowerCase();

  if (Array.isArray(value)) {
    return value
      .map((item) => formatWcpaItem(item, type))
      .filter(Boolean)
      .join(", ");
  }

  if (isRecord(value)) {
    if ("start" in value || "end" in value) {
      return [value.start, value.end]
        .map((part) => sanitizeMetadataText(part))
        .filter(Boolean)
        .join(" to ");
    }

    return Object.values(value)
      .map((item) => formatWcpaItem(item, type))
      .filter(Boolean)
      .join(", ");
  }

  return formatMetadataValue(value);
}

function toWcpaFieldEntry(
  field: Record<string, any>,
  sectionKey: string,
  formId: string
): WcpaFieldEntry | null {
  const type = sanitizeMetadataText(field?.type).toLowerCase();
  if (type && WCPA_SKIP_TYPES.has(type)) return null;
  if (sanitizeMetadataText(field?.clStatus).toLowerCase() === "hidden") {
    return null;
  }

  const rawLabel = field?.label ?? field?.display_label ?? field?.name;
  if (isWcpaEmptyLabel(rawLabel) || isWcpaEmptyLabel(field?.name)) return null;

  const value = formatWcpaFieldValue(field);

  const labelText = sanitizeMetadataText(rawLabel);
  const label = labelText || humanizeMetadataKey(field?.name);
  if (!label) return null;

  const identity =
    sanitizeMetadataText(field?.elementId) ||
    sanitizeMetadataText(field?.name) ||
    label.toLowerCase();

  return {
    index: 0,
    label,
    value,
    identity,
    rawValue: field?.value,
    type,
    sectionKey,
    formId,
  };
}

function entryToPair(entry: WcpaFieldEntry): FormattedMetadataPair {
  return { name: entry.label, value: entry.value };
}

function dedupePairs(pairs: FormattedMetadataPair[]) {
  const seen = new Set<string>();
  const result: FormattedMetadataPair[] = [];

  for (const pair of pairs) {
    if (!pair.name || !pair.value) continue;

    const key = metadataPairKey(pair);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(pair);
  }

  return result;
}

function labelSignature(entries: WcpaFieldEntry[]) {
  return entries
    .map((entry) => entry.label.toLowerCase())
    .sort()
    .join("|");
}

function sameLabelSignature(sections: WcpaSection[]) {
  if (!sections.length || sections.some((section) => !section.entries.length)) {
    return false;
  }

  const signature = labelSignature(sections[0].entries);
  return Boolean(signature) &&
    sections.every((section) => labelSignature(section.entries) === signature);
}

function buildUnits(entryLists: WcpaFieldEntry[][]): MetadataUnit[] {
  return entryLists
    .map((entries, index) => ({
      index: index + 1,
      pairs: dedupePairs(
        [...entries]
          .sort((a, b) => a.index - b.index)
          .map(entryToPair)
      ),
    }))
    .filter((unit) => unit.pairs.length > 0);
}

function hasSameIdentitySignature(sections: WcpaSection[]) {
  const signature = (section: WcpaSection) =>
    section.entries
      .map((entry) => entry.identity.toLowerCase())
      .sort()
      .join("|");

  const first = sections[0] ? signature(sections[0]) : "";
  return Boolean(first) &&
    sections.every((section) => signature(section) === first);
}

function findSectionUnits(
  sections: WcpaSection[],
  quantity: number
): WcpaMetadataGrouping | null {
  const byForm = new Map<string, WcpaSection[]>();

  for (const section of sections) {
    if (!section.formId) continue;
    const list = byForm.get(section.formId) ?? [];
    list.push(section);
    byForm.set(section.formId, list);
  }

  const candidates = Array.from(byForm.values()).filter(
    (list) => list.length === quantity && sameLabelSignature(list)
  );

  if (candidates.length > 1) return null;

  const unitSections = candidates[0];
  if (unitSections) {
    const unitKeys = new Set(unitSections.map((section) => section.key));
    const sharedSections = sections.filter(
      (section) => !unitKeys.has(section.key)
    );

    return {
      shared: dedupePairs(
        sharedSections.flatMap((section) =>
          section.entries.map(entryToPair)
        )
      ),
      units: buildUnits(unitSections.map((section) => section.entries)),
    };
  }

  if (
    sections.length === quantity &&
    sameLabelSignature(sections) &&
    hasSameIdentitySignature(sections)
  ) {
    return {
      shared: [],
      units: buildUnits(sections.map((section) => section.entries)),
    };
  }

  return null;
}

function getPerUnitArrayValues(
  list: WcpaFieldEntry[],
  quantity: number
): string[] | null {
  if (list.length !== 1) return null;

  const entry = list[0];
  if (WCPA_OPTION_TYPES.has(entry.type)) return null;
  if (entry.type === "date" || entry.type === "datetime-local") return null;
  if (!Array.isArray(entry.rawValue) || entry.rawValue.length !== quantity) {
    return null;
  }
  if (entry.rawValue.some((item) => item !== null && typeof item === "object")) {
    return null;
  }

  const values = entry.rawValue.map((item) =>
    sanitizeMetadataText(item)
  );

  return values;
}

function findOccurrenceUnits(
  entries: WcpaFieldEntry[],
  quantity: number
): WcpaMetadataGrouping | null {
  const byIdentity = new Map<string, WcpaFieldEntry[]>();

  for (const entry of entries) {
    const key = entry.identity || entry.label.toLowerCase();
    const list = byIdentity.get(key) ?? [];
    list.push(entry);
    byIdentity.set(key, list);
  }

  const unitEntries: WcpaFieldEntry[][] = Array.from(
    { length: quantity },
    () => []
  );
  const shared: WcpaFieldEntry[] = [];
  let hasUnits = false;

  for (const list of Array.from(byIdentity.values())) {
    const perUnitValues = getPerUnitArrayValues(list, quantity);

    if (perUnitValues) {
      hasUnits = true;
      perUnitValues.forEach((value, index) => {
        unitEntries[index].push({ ...list[0], value });
      });
      continue;
    }

    if (list.length === 1) {
      shared.push(list[0]);
      continue;
    }

    if (list.length === quantity) {
      hasUnits = true;
      list.forEach((entry, index) => unitEntries[index].push(entry));
      continue;
    }

    return null;
  }

  if (!hasUnits) return null;

  return {
    shared: dedupePairs(shared.map(entryToPair)),
    units: buildUnits(unitEntries),
  };
}

export function extractWcpaOrderMeta(
  metaData: unknown
): WcpaOrderMetaExtract | null {
  if (!Array.isArray(metaData)) return null;

  const entry = metaData.find(
    (item) =>
      isRecord(item) &&
      sanitizeMetadataText(item.key).toLowerCase() === WCPA_ORDER_META_KEY
  );
  if (!entry) return null;

  const value = parseJsonValue((entry as Record<string, any>).value);
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !value.trim()) return null;

  const metaIds: number[] = [];

  for (const section of collectWcpaRawSections(value)) {
    for (const field of section.fields) {
      const id = Number(field?.meta_id);
      if (Number.isFinite(id) && id > 0) metaIds.push(id);
    }
  }

  return { value, metaIds };
}

export function groupWcpaMetadata(
  value: unknown,
  quantity: number
): WcpaMetadataGrouping {
  let order = 0;

  const sections: WcpaSection[] = collectWcpaRawSections(value)
    .map((section) => ({
      key: section.key,
      formId: section.formId,
      entries: section.fields
        .map((field) =>
          toWcpaFieldEntry(field, section.key, section.formId)
        )
        .filter((entry): entry is WcpaFieldEntry => entry !== null)
        .map((entry) => ({ ...entry, index: order++ })),
    }))
    .filter((section) => section.entries.length > 0);

  const allEntries = sections.flatMap((section) => section.entries);
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));

  if (!allEntries.length) return { shared: [], units: [] };

  const flat = (): WcpaMetadataGrouping => ({
    shared: dedupePairs(allEntries.map(entryToPair)),
    units: [],
  });

  if (qty <= 1) return flat();

  return findSectionUnits(sections, qty) ??
    findOccurrenceUnits(allEntries, qty) ??
    flat();
}

export function normalizeMetadataPairs(source: unknown): FormattedMetadataPair[] {
  const pairs: FormattedMetadataPair[] = [];
  const seen = new Set<string>();

  function pushPair(labelSource: unknown, keySource: unknown, valueSource: unknown) {
    const rawKey = sanitizeMetadataText(keySource);
    if (rawKey && isInternalMetadataKey(rawKey)) return;

    const value = formatMetadataValue(valueSource);
    if (!value) return;

    const providedLabel = sanitizeMetadataText(labelSource);
    const name = providedLabel || humanizeMetadataKey(rawKey);
    if (!name) return;

    const pair = { name, value };
    const key = metadataPairKey(pair);

    if (seen.has(key)) return;

    seen.add(key);
    pairs.push(pair);
  }

  function visit(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item));
      return;
    }

    if (!isRecord(node)) return;

    if (isMetadataEntry(node)) {
      const label = getFirstDefined(node, LABEL_FIELDS);
      const rawKey =
        node.key ??
        node.slug ??
        node.display_key ??
        node.displayKey;
      const value = getFirstDefined(node, VALUE_FIELDS);

      pushPair(label, rawKey, value);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      pushPair(undefined, key, value);
    }
  }

  visit(source);

  return pairs;
}

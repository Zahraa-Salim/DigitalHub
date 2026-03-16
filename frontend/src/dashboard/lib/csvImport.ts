export type DbColumn = {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "number" | "boolean" | "date" | "json";
  hint?: string;
};

export type ImportableTable = {
  key: string;
  label: string;
  group: string;
  columns: DbColumn[];
};

export const IMPORTABLE_TABLES: ImportableTable[] = [
  {
    key: "users",
    label: "Users",
    group: "People & Profiles",
    columns: [
      { key: "email", label: "Email", required: true, type: "text" },
      { key: "full_name", label: "Full Name", required: true, type: "text" },
      { key: "role", label: "Role", required: false, type: "text", hint: "student / instructor / manager / admin" },
      { key: "phone", label: "Phone", required: false, type: "text" },
      { key: "avatar_url", label: "Avatar URL", required: false, type: "text" },
    ],
  },
  {
    key: "student_profiles",
    label: "Student Profiles",
    group: "People & Profiles",
    columns: [
      { key: "user_id", label: "User ID", required: true, type: "number" },
      { key: "bio", label: "Bio", required: false, type: "text" },
      { key: "linkedin_url", label: "LinkedIn URL", required: false, type: "text" },
      { key: "github_url", label: "GitHub URL", required: false, type: "text" },
      { key: "portfolio_url", label: "Portfolio URL", required: false, type: "text" },
      { key: "expertise", label: "Expertise", required: false, type: "text" },
      { key: "skills", label: "Skills", required: false, type: "text" },
    ],
  },
  {
    key: "instructor_profiles",
    label: "Instructor Profiles",
    group: "People & Profiles",
    columns: [
      { key: "user_id", label: "User ID", required: true, type: "number" },
      { key: "bio", label: "Bio", required: false, type: "text" },
      { key: "expertise", label: "Expertise", required: false, type: "text" },
      { key: "skills", label: "Skills", required: false, type: "text" },
      { key: "linkedin_url", label: "LinkedIn URL", required: false, type: "text" },
      { key: "github_url", label: "GitHub URL", required: false, type: "text" },
      { key: "sort_order", label: "Sort Order", required: false, type: "number" },
    ],
  },
  {
    key: "programs",
    label: "Programs",
    group: "Programs & Cohorts",
    columns: [
      { key: "title", label: "Title", required: true, type: "text" },
      { key: "slug", label: "Slug", required: true, type: "text", hint: "URL-friendly, e.g. web-development" },
      { key: "description", label: "Description", required: false, type: "text" },
      { key: "summary", label: "Summary", required: false, type: "text" },
      { key: "image_url", label: "Image URL", required: false, type: "text" },
      { key: "featured", label: "Featured", required: false, type: "boolean", hint: "true or false" },
      { key: "featured_rank", label: "Featured Rank", required: false, type: "number" },
      { key: "meta_title", label: "Meta Title", required: false, type: "text" },
      { key: "meta_description", label: "Meta Description", required: false, type: "text" },
    ],
  },
  {
    key: "cohorts",
    label: "Cohorts",
    group: "Programs & Cohorts",
    columns: [
      { key: "program_id", label: "Program ID", required: true, type: "number" },
      { key: "name", label: "Name", required: true, type: "text" },
      { key: "status", label: "Status", required: false, type: "text", hint: "open / running / completed / coming_soon / cancelled" },
      { key: "capacity", label: "Capacity", required: false, type: "number" },
      { key: "start_date", label: "Start Date", required: false, type: "date", hint: "YYYY-MM-DD" },
      { key: "end_date", label: "End Date", required: false, type: "date", hint: "YYYY-MM-DD" },
      { key: "enrollment_open_at", label: "Enrollment Opens At", required: false, type: "date" },
      { key: "enrollment_close_at", label: "Enrollment Closes At", required: false, type: "date" },
    ],
  },
  {
    key: "applicants",
    label: "Applicants",
    group: "Applications",
    columns: [
      { key: "email", label: "Email", required: true, type: "text" },
      { key: "full_name", label: "Full Name", required: true, type: "text" },
      { key: "phone", label: "Phone", required: false, type: "text" },
    ],
  },
  {
    key: "applications",
    label: "Applications",
    group: "Applications",
    columns: [
      { key: "applicant_id", label: "Applicant ID", required: true, type: "number" },
      { key: "program_id", label: "Program ID", required: true, type: "number" },
      { key: "cohort_id", label: "Cohort ID", required: false, type: "number" },
      { key: "stage", label: "Stage", required: false, type: "text", hint: "applied / reviewing / accepted / rejected / ..." },
      { key: "review_message", label: "Review Message", required: false, type: "text" },
    ],
  },
  {
    key: "events",
    label: "Events",
    group: "Events & Announcements",
    columns: [
      { key: "title", label: "Title", required: true, type: "text" },
      { key: "slug", label: "Slug", required: true, type: "text" },
      { key: "description", label: "Description", required: false, type: "text" },
      { key: "location", label: "Location", required: false, type: "text" },
      { key: "starts_at", label: "Starts At", required: true, type: "date", hint: "ISO datetime e.g. 2025-06-01T10:00:00" },
      { key: "ends_at", label: "Ends At", required: false, type: "date" },
      { key: "capacity", label: "Capacity", required: false, type: "number" },
    ],
  },
  {
    key: "announcements",
    label: "Announcements",
    group: "Events & Announcements",
    columns: [
      { key: "title", label: "Title", required: true, type: "text" },
      { key: "body", label: "Body", required: false, type: "text" },
      { key: "published_at", label: "Published At", required: false, type: "date" },
      { key: "cta_label", label: "CTA Label", required: false, type: "text" },
      { key: "cta_url", label: "CTA URL", required: false, type: "text" },
    ],
  },
  {
    key: "media_assets",
    label: "Media Assets",
    group: "CMS",
    columns: [
      { key: "file_name", label: "File Name", required: true, type: "text" },
      { key: "public_url", label: "Public URL", required: true, type: "text" },
      { key: "mime_type", label: "MIME Type", required: false, type: "text" },
      { key: "size_bytes", label: "Size (bytes)", required: false, type: "number" },
      { key: "tags", label: "Tags", required: false, type: "json", hint: "[\"tag1\",\"tag2\"]" },
    ],
  },
];

type ParsedGrid = string[][];

function parseCSVGrid(text: string): ParsedGrid {
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      currentRow.push(currentValue.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const grid = parseCSVGrid(text);
  if (grid.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = grid[0].map((header) => header.trim()).filter((header) => header.length > 0);
  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  const rows = grid.slice(1).map((line) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = line[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

const normalize = (value: string) => value.toLowerCase().replace(/[\s\-_]+/g, "");

export function detectAutoMapping(csvHeaders: string[], dbColumns: DbColumn[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  csvHeaders.forEach((csvHeader) => {
    const normalizedCsv = normalize(csvHeader);
    const match = dbColumns.find((column) => {
      const normalizedKey = normalize(column.key);
      const normalizedLabel = normalize(column.label);
      return normalizedKey === normalizedCsv || normalizedLabel === normalizedCsv;
    });

    if (match) {
      mapping[csvHeader] = match.key;
    }
  });

  return mapping;
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  dbColumns: DbColumn[],
): Record<string, unknown>[] {
  const dbColumnsByKey = new Map(dbColumns.map((column) => [column.key, column]));

  return rows.map((row) => {
    const result: Record<string, unknown> = {};

    Object.entries(mapping).forEach(([csvColumn, dbColumn]) => {
      if (!dbColumn) return;

      const rawValue = row[csvColumn] ?? "";
      const definition = dbColumnsByKey.get(dbColumn);

      if (!definition) {
        result[dbColumn] = rawValue;
        return;
      }

      if (definition.type === "number") {
        const parsed = Number(rawValue);
        result[dbColumn] = rawValue === "" ? null : (Number.isFinite(parsed) ? parsed : null);
        return;
      }

      if (definition.type === "boolean") {
        const normalizedValue = rawValue.trim().toLowerCase();
        result[dbColumn] = normalizedValue === "true" || normalizedValue === "1" || normalizedValue === "yes";
        return;
      }

      if (definition.type === "date") {
        result[dbColumn] = rawValue === "" ? null : rawValue;
        return;
      }

      if (definition.type === "json") {
        try {
          result[dbColumn] = rawValue === "" ? null : JSON.parse(rawValue);
        } catch {
          result[dbColumn] = rawValue === "" ? null : rawValue;
        }
        return;
      }

      result[dbColumn] = rawValue === "" ? null : rawValue;
    });

    return result;
  });
}

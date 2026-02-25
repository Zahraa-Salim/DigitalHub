// File Summary: server/src/services/forms.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import {
  createForm,
  findFormByKey,
  getCohortFormConfigById,
  getFormById,
  listCohortFormOptions,
  listFormFields,
  replaceFormFields,
  updateCohortFormConfig,
  updateForm,
} from "../repositories/forms.repo.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildUpdateQuery } from "../utils/sql.js";

const GENERAL_FORM_KEY = "general_application_form";

const DEFAULT_GENERAL_FIELDS = [
  {
    name: "full_name",
    label: "Full Name",
    type: "text",
    required: true,
    placeholder: "Enter your full name",
    sort_order: 0,
    is_enabled: true,
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
    required: true,
    placeholder: "you@example.com",
    sort_order: 1,
    is_enabled: true,
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "phone",
    required: true,
    placeholder: "+1 555 000 0000",
    sort_order: 2,
    is_enabled: true,
  },
  {
    name: "date_of_birth",
    label: "Date of Birth",
    type: "date",
    required: true,
    placeholder: "",
    sort_order: 3,
    is_enabled: true,
  },
  {
    name: "education_level",
    label: "Education",
    type: "select",
    required: true,
    options: ["High School", "Diploma", "Bachelor's", "Master's", "PhD", "Other"],
    placeholder: "Select your education level",
    sort_order: 4,
    is_enabled: true,
  },
  {
    name: "city",
    label: "City",
    type: "text",
    required: false,
    placeholder: "Your current city",
    sort_order: 5,
    is_enabled: true,
  },
  {
    name: "country",
    label: "Country",
    type: "text",
    required: false,
    placeholder: "Your country",
    sort_order: 6,
    is_enabled: true,
  },
  {
    name: "address",
    label: "Address",
    type: "textarea",
    required: false,
    placeholder: "Street, city, country",
    sort_order: 7,
    is_enabled: true,
  },
  {
    name: "linkedin_url",
    label: "LinkedIn Profile",
    type: "text",
    required: false,
    placeholder: "https://linkedin.com/in/username",
    sort_order: 8,
    is_enabled: true,
  },
  {
    name: "github_url",
    label: "GitHub Profile",
    type: "text",
    required: false,
    placeholder: "https://github.com/username",
    sort_order: 9,
    is_enabled: true,
  },
  {
    name: "portfolio_url",
    label: "Portfolio URL",
    type: "text",
    required: false,
    placeholder: "https://your-portfolio.com",
    sort_order: 10,
    is_enabled: true,
  },
  {
    name: "motivation",
    label: "Why do you want to join this cohort?",
    type: "textarea",
    required: true,
    placeholder: "Tell us about your goals.",
    sort_order: 11,
    is_enabled: true,
  },
  {
    name: "experience_summary",
    label: "Experience Summary",
    type: "textarea",
    required: false,
    placeholder: "Share your relevant experience.",
    sort_order: 12,
    is_enabled: true,
  },
];

const LEGACY_DEFAULT_FIELD_NAMES = new Set(["full_name", "email", "phone", "motivation"]);
const RECOMMENDED_DEFAULT_FIELD_NAMES = new Set(DEFAULT_GENERAL_FIELDS.map((field) => field.name));

function cloneFields(fields) {
  return fields.map((field, index) => ({
    ...field,
    sort_order: field.sort_order ?? index,
  }));
}

function toSafeFieldName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function normalizeField(field, index) {
  const label = String(field.label ?? "").trim();
  const fallbackName = label ? toSafeFieldName(label) : `field_${index + 1}`;
  const name = toSafeFieldName(field.name) || fallbackName;

  if (!label) {
    throw new AppError(400, "VALIDATION_ERROR", `Field ${index + 1} must include a label.`);
  }

  if (!name) {
    throw new AppError(400, "VALIDATION_ERROR", `Field ${index + 1} must include a valid name.`);
  }

  return {
    name,
    label,
    type: field.type,
    required: Boolean(field.required),
    options: field.options ?? null,
    placeholder: field.placeholder ?? null,
    min_length: field.min_length ?? null,
    max_length: field.max_length ?? null,
    sort_order: field.sort_order ?? index,
    is_enabled: field.is_enabled ?? true,
  };
}

function normalizeFields(fieldsInput) {
  const rawFields = Array.isArray(fieldsInput) ? fieldsInput : [];
  if (!rawFields.length) {
    throw new AppError(400, "VALIDATION_ERROR", "At least one form field is required.");
  }

  const seenNames = new Set();
  return rawFields.map((field, index) => {
    const normalized = normalizeField(field, index);
    if (seenNames.has(normalized.name)) {
      throw new AppError(400, "VALIDATION_ERROR", `Duplicate field name '${normalized.name}' in form.`);
    }
    seenNames.add(normalized.name);
    return normalized;
  });
}

function toFormDto(formRow, fieldsRows) {
  return {
    id: formRow.id,
    key: formRow.key,
    title: formRow.title,
    description: formRow.description,
    is_active: formRow.is_active,
    updated_at: formRow.updated_at,
    fields: fieldsRows,
  };
}

function shouldUpgradeLegacyDefault(fieldsRows) {
  if (!Array.isArray(fieldsRows) || fieldsRows.length === 0) {
    return true;
  }

  const fieldNames = fieldsRows.map((field) => toSafeFieldName(field.name));
  const uniqueNames = new Set(fieldNames);
  const recommendedNames = Array.from(RECOMMENDED_DEFAULT_FIELD_NAMES);

  // Keep existing form when the full recommended template is already applied.
  if (
    uniqueNames.size === RECOMMENDED_DEFAULT_FIELD_NAMES.size &&
    recommendedNames.every((name) => uniqueNames.has(name))
  ) {
    return false;
  }

  // Upgrade only if the form still matches the old minimal legacy defaults.
  return uniqueNames.size <= LEGACY_DEFAULT_FIELD_NAMES.size && Array.from(uniqueNames).every((name) => LEGACY_DEFAULT_FIELD_NAMES.has(name));
}

async function ensureGeneralForm(client) {
  let formResult = await findFormByKey(GENERAL_FORM_KEY, client);
  let formRow;

  if (!formResult.rowCount) {
    const created = await createForm(
      {
        key: GENERAL_FORM_KEY,
        title: "General Application Form",
        description: "Default application form used across cohorts.",
        is_active: true,
        created_by: null,
      },
      client,
    );
    formRow = created.rows[0];
    await replaceFormFields(formRow.id, cloneFields(DEFAULT_GENERAL_FIELDS), client);
  } else {
    formRow = formResult.rows[0];
    const fieldsResult = await listFormFields(formRow.id, client);
    if (!fieldsResult.rowCount || shouldUpgradeLegacyDefault(fieldsResult.rows)) {
      await replaceFormFields(formRow.id, cloneFields(DEFAULT_GENERAL_FIELDS), client);
    }
  }

  const fields = await listFormFields(formRow.id, client);
  return toFormDto(formRow, fields.rows);
}

async function upsertFormByKey({ key, title, description, is_active, fields, created_by }, client) {
  const existing = await findFormByKey(key, client);
  let formRow;

  if (!existing.rowCount) {
    const created = await createForm(
      {
        key,
        title,
        description,
        is_active,
        created_by,
      },
      client,
    );
    formRow = created.rows[0];
  } else {
    const formId = existing.rows[0].id;
    const metaPayload = {
      title,
      description,
      is_active,
    };
    const { setClause, values } = buildUpdateQuery(metaPayload, ["title", "description", "is_active"], 1);
    const updated = await updateForm(formId, setClause, values, client);
    formRow = updated.rows[0];
  }

  const normalizedFields = normalizeFields(fields);
  const fieldsResult = await replaceFormFields(formRow.id, normalizedFields, client);
  return toFormDto(formRow, fieldsResult.rows);
}

async function buildCohortFormResponse(cohortId, client, cachedGeneralForm = null) {
  const generalForm = cachedGeneralForm ?? (await ensureGeneralForm(client));
  const cohortResult = await getCohortFormConfigById(cohortId, client);

  if (!cohortResult.rowCount) {
    throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
  }

  const cohort = cohortResult.rows[0];
  let customForm = null;

  if (cohort.application_form_id) {
    const customFormResult = await getFormById(cohort.application_form_id, client);
    if (customFormResult.rowCount) {
      const fieldsResult = await listFormFields(customFormResult.rows[0].id, client);
      customForm = toFormDto(customFormResult.rows[0], fieldsResult.rows);
    }
  }

  const resolvedForm = cohort.use_general_form || !customForm ? generalForm : customForm;

  return {
    cohort,
    general_form: generalForm,
    custom_form: customForm,
    suggested_custom_form: customForm
      ? customForm
      : {
          ...generalForm,
          id: null,
          key: `cohort_${cohort.id}_application_form`,
          title: `${cohort.name} Application Form`,
        },
    resolved_form: resolvedForm,
  };
}

export async function listFormCohortsService() {
  const result = await listCohortFormOptions();
  return result.rows;
}

export async function getGeneralFormService() {
  return withTransaction(async (client) => ensureGeneralForm(client));
}

export async function saveGeneralFormService(adminId, payload) {
  return withTransaction(async (client) => {
    await ensureGeneralForm(client);

    const form = await upsertFormByKey(
      {
        key: GENERAL_FORM_KEY,
        title: payload.title?.trim() || "General Application Form",
        description: payload.description?.trim() || "Default application form used across cohorts.",
        is_active: payload.is_active ?? true,
        fields: payload.fields,
        created_by: adminId,
      },
      client,
    );

    await logAdminAction(
      {
        actorUserId: adminId,
        action: "update form",
        entityType: "forms",
        entityId: form.id,
        message: "General application form was updated.",
        metadata: { key: GENERAL_FORM_KEY, field_count: form.fields.length },
        title: "General Form Updated",
        body: "General application form configuration was saved.",
      },
      client,
    );

    return form;
  });
}

export async function getCohortFormService(cohortId) {
  return withTransaction(async (client) => buildCohortFormResponse(cohortId, client));
}

export async function saveCohortFormService(cohortId, adminId, payload) {
  return withTransaction(async (client) => {
    const generalForm = await ensureGeneralForm(client);
    const cohortResult = await getCohortFormConfigById(cohortId, client);

    if (!cohortResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const cohort = cohortResult.rows[0];

    if (payload.mode === "general") {
      const updateResult = await updateCohortFormConfig(cohortId, true, null, client);
      if (!updateResult.rowCount) {
        throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
      }

      await logAdminAction(
        {
          actorUserId: adminId,
          action: "update cohort form",
          entityType: "cohorts",
          entityId: cohortId,
          message: `Cohort ${cohortId} now uses the general application form.`,
          metadata: { mode: "general", form_id: generalForm.id },
          title: "Cohort Form Updated",
          body: `Cohort ${cohort.name} switched to the general application form.`,
        },
        client,
      );

      return buildCohortFormResponse(cohortId, client, generalForm);
    }

    const customFormKey = `cohort_${cohortId}_application_form`;
    const customInput = payload.form ?? {};
    const customFields = Array.isArray(customInput.fields) && customInput.fields.length
      ? customInput.fields
      : cloneFields(generalForm.fields);

    const customForm = await upsertFormByKey(
      {
        key: customFormKey,
        title: customInput.title?.trim() || `${cohort.name} Application Form`,
        description:
          customInput.description?.trim() || `Custom application form for cohort ${cohort.name}.`,
        is_active: customInput.is_active ?? true,
        fields: customFields,
        created_by: adminId,
      },
      client,
    );

    const updateResult = await updateCohortFormConfig(cohortId, false, customForm.id, client);
    if (!updateResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    await logAdminAction(
      {
        actorUserId: adminId,
        action: "update cohort form",
        entityType: "cohorts",
        entityId: cohortId,
        message: `Cohort ${cohortId} now uses a custom application form.`,
        metadata: { mode: "custom", form_id: customForm.id },
        title: "Cohort Form Updated",
        body: `Custom application form saved for cohort ${cohort.name}.`,
      },
      client,
    );

    return buildCohortFormResponse(cohortId, client, generalForm);
  });
}

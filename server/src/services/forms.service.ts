// File Summary: server/src/services/forms.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import {
  createForm,
  createFormField,
  deleteFormField,
  findFormByKey,
  getFormFieldById,
  getCohortFormConfigById,
  getFormById,
  listForms,
  listCohortFormOptions,
  listFormFields,
  listPublishedProgramOptions,
  reorderFormFields,
  renameFormKey,
  replaceFormFields,
  updateFormField,
  updateCohortFormConfig,
  updateForm,
} from "../repositories/forms.repo.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildUpdateQuery } from "../utils/sql.js";

const GENERAL_FORM_KEY = "cohort_application";
const LEGACY_GENERAL_FORM_KEY = "general_application_form";
const PROGRAM_APPLICATION_FORM_KEY = "program_application";

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

const DEFAULT_PROGRAM_APPLICATION_FIELDS = [
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
    required: false,
    placeholder: "+1 555 000 0000",
    sort_order: 2,
    is_enabled: true,
  },
  {
    name: "program_id",
    label: "Program",
    type: "select",
    required: true,
    options: [],
    placeholder: "Select a program",
    sort_order: 3,
    is_enabled: true,
  },
  {
    name: "why_join",
    label: "Why do you want to join?",
    type: "textarea",
    required: true,
    placeholder: "Tell us your goals.",
    sort_order: 4,
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

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value.choices)) {
    return value.choices;
  }

  if (Array.isArray(value.options)) {
    return value.options;
  }

  return [];
}

function hasProgramOptions(value) {
  return asArray(value).length > 0;
}

function toProgramOptionsRows(rows) {
  return rows.map((row) => ({
    label: row.title,
    value: String(row.id),
  }));
}

async function hydrateProgramFieldOptions(formId, fieldsRows, client) {
  const requiresProgramOptions = fieldsRows.some(
    (field) => field.name === "program_id" && field.type === "select" && !hasProgramOptions(field.options),
  );

  if (!requiresProgramOptions) {
    return fieldsRows;
  }

  const programsResult = await listPublishedProgramOptions(client);
  const options = toProgramOptionsRows(programsResult.rows);
  const nextFields = fieldsRows.map((field) => {
    if (field.name !== "program_id" || field.type !== "select") {
      return field;
    }

    return {
      ...field,
      options,
    };
  });

  await replaceFormFields(formId, nextFields, client);
  return nextFields;
}

function toFormAndFieldsPayload(formRow, fieldsRows) {
  return {
    form: {
      id: formRow.id,
      key: formRow.key,
      title: formRow.title,
      description: formRow.description,
      is_active: formRow.is_active,
      updated_at: formRow.updated_at,
    },
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
  // Serialize general-form bootstrap/upgrade to avoid concurrent replace collisions.
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [GENERAL_FORM_KEY]);

  let formResult = await findFormByKey(GENERAL_FORM_KEY, client);
  let formRow;

  if (!formResult.rowCount) {
    const legacyResult = await findFormByKey(LEGACY_GENERAL_FORM_KEY, client);
    if (legacyResult.rowCount) {
      await renameFormKey(legacyResult.rows[0].id, GENERAL_FORM_KEY, client);
      formResult = await findFormByKey(GENERAL_FORM_KEY, client);
    }
  }

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

async function ensureProgramApplicationForm(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [PROGRAM_APPLICATION_FORM_KEY]);

  let formResult = await findFormByKey(PROGRAM_APPLICATION_FORM_KEY, client);
  let formRow;

  if (!formResult.rowCount) {
    const created = await createForm(
      {
        key: PROGRAM_APPLICATION_FORM_KEY,
        title: "Program Application Form",
        description: "Default application form used for program-level applications.",
        is_active: true,
        created_by: null,
      },
      client,
    );
    formRow = created.rows[0];
    await replaceFormFields(formRow.id, cloneFields(DEFAULT_PROGRAM_APPLICATION_FIELDS), client);
  } else {
    formRow = formResult.rows[0];
    const fieldsResult = await listFormFields(formRow.id, client);
    if (!fieldsResult.rowCount) {
      await replaceFormFields(formRow.id, cloneFields(DEFAULT_PROGRAM_APPLICATION_FIELDS), client);
    }
  }

  const fieldsResult = await listFormFields(formRow.id, client);
  const hydratedFields = await hydrateProgramFieldOptions(formRow.id, fieldsResult.rows, client);

  return {
    form: formRow,
    fields: hydratedFields,
  };
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
          key: `cohort_application_cohort_${cohort.id}`,
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
          action: ADMIN_ACTIONS.COHORT_FORM_ASSIGNED,
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

    const customFormKey = `cohort_application_cohort_${cohortId}`;
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
        action: ADMIN_ACTIONS.COHORT_FORM_ASSIGNED,
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

export async function getCohortApplicationFormService() {
  return withTransaction(async (client) => ensureGeneralForm(client));
}

export async function getProgramApplicationFormService() {
  return withTransaction(async (client) => {
    const { form, fields } = await ensureProgramApplicationForm(client);
    return toFormAndFieldsPayload(form, fields);
  });
}

export async function patchProgramApplicationFormService(adminId, payload) {
  return withTransaction(async (client) => {
    const { form } = await ensureProgramApplicationForm(client);
    const { setClause, values } = buildUpdateQuery(payload, ["title", "description", "is_active"], 1);
    const updated = await updateForm(form.id, setClause, values, client);
    const fieldsResult = await listFormFields(form.id, client);
    const hydratedFields = await hydrateProgramFieldOptions(form.id, fieldsResult.rows, client);
    const response = toFormAndFieldsPayload(updated.rows[0], hydratedFields);

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_UPDATED,
        entityType: "forms",
        entityId: form.id,
        message: "Program application form metadata was updated.",
        metadata: { key: PROGRAM_APPLICATION_FORM_KEY, updated_fields: Object.keys(payload) },
        title: "Program Application Form Updated",
        body: "Program application form settings were updated.",
      },
      client,
    );

    return response;
  });
}

export async function patchProgramApplicationFormFieldsService(adminId, fields) {
  return withTransaction(async (client) => {
    const { form } = await ensureProgramApplicationForm(client);
    const normalized = normalizeFields(fields);
    await replaceFormFields(form.id, normalized, client);
    const freshFormResult = await getFormById(form.id, client);
    const fieldsResult = await listFormFields(form.id, client);
    const hydratedFields = await hydrateProgramFieldOptions(form.id, fieldsResult.rows, client);
    const response = toFormAndFieldsPayload(freshFormResult.rows[0], hydratedFields);

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_FIELDS_UPDATED,
        entityType: "forms",
        entityId: form.id,
        message: "Program application form fields were updated.",
        metadata: { key: PROGRAM_APPLICATION_FORM_KEY, field_count: hydratedFields.length },
        title: "Program Application Fields Updated",
        body: "Program application form fields were saved.",
      },
      client,
    );

    return response;
  });
}

export async function assignCohortFormService(cohortId, adminId, mode) {
  return saveCohortFormService(cohortId, adminId, { mode });
}

export async function patchFormByIdService(formId, adminId, payload) {
  return withTransaction(async (client) => {
    const formResult = await getFormById(formId, client);
    if (!formResult.rowCount) {
      throw new AppError(404, "FORM_NOT_FOUND", "Form not found.");
    }

    const allowedMeta = ["title", "description", "is_active"];
    const hasMetaUpdate = allowedMeta.some((field) => payload[field] !== undefined);
    let nextForm = formResult.rows[0];

    if (hasMetaUpdate) {
      const { setClause, values } = buildUpdateQuery(payload, allowedMeta, 1);
      const updated = await updateForm(formId, setClause, values, client);
      nextForm = updated.rows[0];
    }

    if (Array.isArray(payload.fields) && payload.fields.length) {
      await replaceFormFields(formId, normalizeFields(payload.fields), client);
    }

    const fieldsResult = await listFormFields(formId, client);
    const formDto = toFormDto(nextForm, fieldsResult.rows);

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_UPDATED,
        entityType: "forms",
        entityId: formId,
        message: `Form ${formId} was updated.`,
        metadata: {
          updated_fields: Object.keys(payload),
          field_count: formDto.fields.length,
        },
        title: "Form Updated",
        body: `Form #${formId} configuration was updated.`,
      },
      client,
    );

    return formDto;
  });
}

export async function patchFormFieldsService(formId, fields, adminId) {
  return withTransaction(async (client) => {
    const formResult = await getFormById(formId, client);
    if (!formResult.rowCount) {
      throw new AppError(404, "FORM_NOT_FOUND", "Form not found.");
    }

    const normalized = normalizeFields(fields);
    const fieldsResult = await replaceFormFields(formId, normalized, client);
    const formDto = toFormDto(formResult.rows[0], fieldsResult.rows);

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_FIELDS_UPDATED,
        entityType: "forms",
        entityId: formId,
        message: `Form ${formId} fields were updated.`,
        metadata: { field_count: formDto.fields.length },
        title: "Form Fields Updated",
        body: `Fields for form #${formId} were updated.`,
      },
      client,
    );

    return formDto;
  });
}

export async function listFormsService(scope = "all") {
  const normalizedScope = scope === "general" || scope === "cohort" ? scope : "all";
  const result = await listForms(normalizedScope);
  return result.rows;
}

export async function getFormByIdWithFieldsService(formId) {
  const [formResult, fieldsResult] = await Promise.all([getFormById(formId), listFormFields(formId)]);
  if (!formResult.rowCount) {
    throw new AppError(404, "FORM_NOT_FOUND", "Form not found.");
  }
  return toFormDto(formResult.rows[0], fieldsResult.rows);
}

export async function createFormService(adminId, payload) {
  return withTransaction(async (client) => {
    const created = await createForm(
      {
        key: payload.key,
        title: payload.title ?? null,
        description: payload.description ?? null,
        is_active: payload.is_active ?? true,
        created_by: adminId,
      },
      client,
    );

    const form = created.rows[0];
    if (Array.isArray(payload.fields) && payload.fields.length) {
      await replaceFormFields(form.id, normalizeFields(payload.fields), client);
    }
    const fieldsResult = await listFormFields(form.id, client);
    const dto = toFormDto(form, fieldsResult.rows);

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_UPDATED,
        entityType: "forms",
        entityId: form.id,
        message: `Form ${form.id} was created.`,
        metadata: { key: form.key, field_count: dto.fields.length },
        title: "Form Created",
        body: `Form '${form.key}' was created.`,
      },
      client,
    );

    return dto;
  });
}

export async function createFormFieldService(formId, adminId, payload) {
  return withTransaction(async (client) => {
    const formResult = await getFormById(formId, client);
    if (!formResult.rowCount) {
      throw new AppError(404, "FORM_NOT_FOUND", "Form not found.");
    }

    const normalized = normalizeField(payload, 0);
    const created = await createFormField(formId, normalized, client);
    const field = created.rows[0];

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_FIELDS_UPDATED,
        entityType: "forms",
        entityId: formId,
        message: `Field ${field.id} was added to form ${formId}.`,
        metadata: { field_id: field.id, field_name: field.name },
        title: "Form Field Added",
        body: `A field was added to form #${formId}.`,
      },
      client,
    );

    return field;
  });
}

function normalizeFormFieldPatchPayload(payload) {
  const next = { ...payload };
  if (next.name !== undefined) {
    const safeName = toSafeFieldName(next.name);
    if (!safeName) {
      throw new AppError(400, "VALIDATION_ERROR", "Field name is invalid.");
    }
    next.name = safeName;
  }
  return next;
}

export async function patchFormFieldByIdService(fieldId, adminId, payload) {
  return withTransaction(async (client) => {
    const fieldResult = await getFormFieldById(fieldId, client);
    if (!fieldResult.rowCount) {
      throw new AppError(404, "FORM_FIELD_NOT_FOUND", "Form field not found.");
    }

    const normalizedPayload = normalizeFormFieldPatchPayload(payload);
    const { setClause, values } = buildUpdateQuery(
      normalizedPayload,
      ["name", "label", "type", "required", "options", "placeholder", "min_length", "max_length", "sort_order", "is_enabled"],
      1,
    );
    const updated = await updateFormField(fieldId, setClause, values, client);
    const field = updated.rows[0];

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_FIELDS_UPDATED,
        entityType: "forms",
        entityId: field.form_id,
        message: `Field ${field.id} on form ${field.form_id} was updated.`,
        metadata: { field_id: field.id, updated_fields: Object.keys(normalizedPayload) },
        title: "Form Field Updated",
        body: `A field on form #${field.form_id} was updated.`,
      },
      client,
    );

    return field;
  });
}

export async function deleteFormFieldByIdService(fieldId, adminId) {
  return withTransaction(async (client) => {
    const deleted = await deleteFormField(fieldId, client);
    if (!deleted.rowCount) {
      throw new AppError(404, "FORM_FIELD_NOT_FOUND", "Form field not found.");
    }

    const row = deleted.rows[0];
    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_FIELDS_UPDATED,
        entityType: "forms",
        entityId: row.form_id,
        message: `Field ${fieldId} was deleted from form ${row.form_id}.`,
        metadata: { field_id: fieldId, deleted: true },
        title: "Form Field Deleted",
        body: `A field was deleted from form #${row.form_id}.`,
      },
      client,
    );

    return row;
  });
}

export async function reorderFormFieldsService(formId, orderedFieldIds, adminId) {
  return withTransaction(async (client) => {
    const formResult = await getFormById(formId, client);
    if (!formResult.rowCount) {
      throw new AppError(404, "FORM_NOT_FOUND", "Form not found.");
    }

    const existingFieldsResult = await listFormFields(formId, client);
    const existingIds = existingFieldsResult.rows.map((row) => Number(row.id));
    const requestedIds = orderedFieldIds.map((id) => Number(id));
    if (existingIds.length !== requestedIds.length) {
      throw new AppError(400, "VALIDATION_ERROR", "orderedFieldIds must include all form fields.");
    }

    const existingSet = new Set(existingIds);
    for (const id of requestedIds) {
      if (!existingSet.has(id)) {
        throw new AppError(400, "VALIDATION_ERROR", "orderedFieldIds contains unknown field ids.");
      }
    }

    await reorderFormFields(formId, requestedIds, client);
    const fieldsResult = await listFormFields(formId, client);

    await logAdminAction(
      {
        actorUserId: adminId,
        action: ADMIN_ACTIONS.FORM_FIELDS_UPDATED,
        entityType: "forms",
        entityId: formId,
        message: `Fields for form ${formId} were reordered.`,
        metadata: { ordered_field_ids: requestedIds },
        title: "Form Fields Reordered",
        body: `Fields for form #${formId} were reordered.`,
      },
      client,
    );

    return fieldsResult.rows;
  });
}

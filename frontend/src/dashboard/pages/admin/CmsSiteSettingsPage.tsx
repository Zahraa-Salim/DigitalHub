// File: frontend/src/dashboard/pages/admin/CmsSiteSettingsPage.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { useEffect, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ApiError, api } from "../../utils/api";

type SiteSettingsRow = {
  id: number;
  site_name: string | null;
  default_event_location: string | null;
  contact_info: Record<string, unknown> | null;
  social_links: Record<string, unknown> | null;
};

type SiteSettingsForm = {
  siteName: string;
  defaultEventLocation: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  mapEmbedUrl: string;
  mapLocation: string;
  contactFormTitle: string;
  contactFormSubtitle: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  website: string;
};

const initialForm: SiteSettingsForm = {
  siteName: "",
  defaultEventLocation: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  mapEmbedUrl: "",
  mapLocation: "",
  contactFormTitle: "",
  contactFormSubtitle: "",
  facebook: "",
  linkedin: "",
  instagram: "",
  website: "",
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

export function CmsSiteSettingsPage() {
  const [form, setForm] = useState<SiteSettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rawContactInfo, setRawContactInfo] = useState<Record<string, unknown>>({});
  const [rawSocialLinks, setRawSocialLinks] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const settings = await api<SiteSettingsRow>("/cms/site-settings");
        if (!active) return;

        const contactInfo = isObjectRecord(settings.contact_info) ? settings.contact_info : {};
        const socialLinks = isObjectRecord(settings.social_links) ? settings.social_links : {};
        setRawContactInfo(contactInfo);
        setRawSocialLinks(socialLinks);

        setForm({
          siteName: asText(settings.site_name),
          defaultEventLocation: asText(settings.default_event_location),
          contactEmail: asText(contactInfo.email),
          contactPhone: asText(contactInfo.phone),
          contactAddress: asText(contactInfo.address),
          mapEmbedUrl: asText(contactInfo.map_embed_url ?? contactInfo.mapEmbedUrl),
          mapLocation: asText(contactInfo.map_location ?? contactInfo.mapLocation),
          contactFormTitle: asText(contactInfo.contact_form_title ?? contactInfo.contactFormTitle),
          contactFormSubtitle: asText(contactInfo.contact_form_subtitle ?? contactInfo.contactFormSubtitle),
          facebook: asText(socialLinks.facebook),
          linkedin: asText(socialLinks.linkedin),
          instagram: asText(socialLinks.instagram),
          website: asText(socialLinks.website),
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message || "Failed to load site settings." : "Failed to load site settings.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const nextContactInfo: Record<string, unknown> = {
        ...rawContactInfo,
        email: form.contactEmail.trim(),
        phone: form.contactPhone.trim(),
        address: form.contactAddress.trim(),
        map_embed_url: form.mapEmbedUrl.trim(),
        map_location: form.mapLocation.trim(),
        contact_form_title: form.contactFormTitle.trim(),
        contact_form_subtitle: form.contactFormSubtitle.trim(),
      };
      [
        "primary_cta_label",
        "primary_cta_url",
        "hire_cta_label",
        "hire_cta_url",
        "header_logo_url",
        "nav_home_label",
        "nav_programs_label",
        "nav_about_label",
        "nav_participants_label",
        "nav_contact_label",
        "primaryCtaLabel",
        "primaryCtaUrl",
        "hireCtaLabel",
        "hireCtaUrl",
        "headerLogoUrl",
        "navHomeLabel",
        "navProgramsLabel",
        "navAboutLabel",
        "navParticipantsLabel",
        "navContactLabel",
      ].forEach((key) => {
        delete nextContactInfo[key];
      });

      const nextSocialLinks: Record<string, unknown> = {
        ...rawSocialLinks,
        facebook: form.facebook.trim(),
        linkedin: form.linkedin.trim(),
        instagram: form.instagram.trim(),
        website: form.website.trim(),
      };

      const updated = await api<SiteSettingsRow>("/cms/site-settings", {
        method: "PATCH",
        body: JSON.stringify({
          site_name: form.siteName.trim(),
          default_event_location: form.defaultEventLocation.trim(),
          contact_info: nextContactInfo,
          social_links: nextSocialLinks,
        }),
      });

      const updatedContactInfo = isObjectRecord(updated.contact_info) ? updated.contact_info : {};
      const updatedSocialLinks = isObjectRecord(updated.social_links) ? updated.social_links : {};
      setRawContactInfo(updatedContactInfo);
      setRawSocialLinks(updatedSocialLinks);
      setSuccess("Site settings saved successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message || "Failed to save site settings." : "Failed to save site settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Site Settings"
      subtitle="Define global website defaults used across contact surfaces and shared integrations."
      actions={
        <button className="btn btn--primary" type="button" onClick={() => void saveSettings()} disabled={loading || saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      }
    >
      <Card className="card--compact-row">
        <p className="info-text">Contact defaults and social links are managed here. Navbar and Footer are now managed in CMS Pages.</p>
        <Badge tone="default">{loading ? "Loading..." : "Live CMS"}</Badge>
      </Card>
      <div className="two-col-grid">
        <Card>
          <h3 className="section-title">General</h3>
          <div className="form-stack">
            <label className="field">
              <span className="field__label">Site Name</span>
              <input
                className="field__control"
                value={form.siteName}
                onChange={(event) => setForm((prev) => ({ ...prev, siteName: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Default Event Location (Used for Contact Map)</span>
              <input
                className="field__control"
                value={form.defaultEventLocation}
                onChange={(event) => setForm((prev) => ({ ...prev, defaultEventLocation: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Contact Email</span>
              <input
                className="field__control"
                value={form.contactEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Contact Phone</span>
              <input
                className="field__control"
                value={form.contactPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Contact Address</span>
              <textarea
                className="field__control"
                rows={3}
                value={form.contactAddress}
                onChange={(event) => setForm((prev) => ({ ...prev, contactAddress: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Map Embed URL (Optional)</span>
              <input
                className="field__control"
                value={form.mapEmbedUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, mapEmbedUrl: event.target.value }))}
                placeholder="https://www.google.com/maps/embed?..."
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Map Location Query (Fallback)</span>
              <input
                className="field__control"
                value={form.mapLocation}
                onChange={(event) => setForm((prev) => ({ ...prev, mapLocation: event.target.value }))}
                placeholder="City, address, or place name"
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Contact Form Title</span>
              <input
                className="field__control"
                value={form.contactFormTitle}
                onChange={(event) => setForm((prev) => ({ ...prev, contactFormTitle: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Contact Form Subtitle</span>
              <textarea
                className="field__control"
                rows={3}
                value={form.contactFormSubtitle}
                onChange={(event) => setForm((prev) => ({ ...prev, contactFormSubtitle: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3 className="section-title">Social Links</h3>
          <div className="form-stack">
            <label className="field">
              <span className="field__label">Facebook</span>
              <input
                className="field__control"
                value={form.facebook}
                onChange={(event) => setForm((prev) => ({ ...prev, facebook: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">LinkedIn</span>
              <input
                className="field__control"
                value={form.linkedin}
                onChange={(event) => setForm((prev) => ({ ...prev, linkedin: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Instagram</span>
              <input
                className="field__control"
                value={form.instagram}
                onChange={(event) => setForm((prev) => ({ ...prev, instagram: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
            <label className="field">
              <span className="field__label">Website URL</span>
              <input
                className="field__control"
                value={form.website}
                onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                disabled={loading || saving}
              />
            </label>
          </div>
        </Card>
      </div>

      <Card className="card--compact-row">
        <div>
          {error ? <p className="field__error">{error}</p> : null}
          {success ? <p className="info-text">{success}</p> : null}
          {loading ? <p className="info-text">Loading site settings...</p> : null}
        </div>
        <button className="btn btn--secondary" type="button" onClick={() => void saveSettings()} disabled={loading || saving}>
          {saving ? "Saving..." : "Save again"}
        </button>
      </Card>
    </PageShell>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { CmsMediaPickerModal, type CmsMediaAsset } from "../../components/CmsMediaPickerModal";
import { PageShell } from "../../components/PageShell";
import { ApiError, api, apiList } from "../../utils/api";
import { formatDateTime } from "../../utils/format";

type JsonObject = Record<string, unknown>;

type CmsPageRow = {
  id: number;
  key: string;
  title: string | null;
  content: JsonObject | null;
  is_published: boolean;
  updated_at: string;
};

type CmsPageEditor = {
  id: number;
  key: string;
  title: string;
  isPublished: boolean;
  contentText: string;
};

type PageKind =
  | "home"
  | "about"
  | "privacy"
  | "terms"
  | "contact"
  | "faq"
  | "apply"
  | "events"
  | "event_details"
  | "cohort_details"
  | "not_found"
  | "navbar"
  | "footer"
  | "hire_talent"
  | "people"
  | "marketing"
  | "generic";
type FieldType = "text" | "textarea" | "number" | "checkbox" | "lines";
type StructuredField = { path: string; label: string; type: FieldType; placeholder?: string; aliases?: string[] };
type RepeaterConfig = {
  path: string;
  label: string;
  itemLabel: string;
  defaultItem: JsonObject;
  fields: StructuredField[];
};
type PageConfig = { fields: StructuredField[]; repeaters?: RepeaterConfig[]; note?: string };
type PageMeta = { title: string; websiteLocation: string };

const PAGE_KIND_ALIASES: Record<PageKind, string[]> = {
  home: ["home"],
  about: ["about", "about_us"],
  privacy: ["privacy", "privacy_policy"],
  terms: [
    "terms",
    "terms_of_use",
    "terms_and_conditions",
    "terms_conditions",
    "terms_of_service",
    "terms-service",
    "terms-and-conditions",
    "legal_terms",
  ],
  contact: ["contact", "contact_us", "get_in_touch", "reach_us"],
  faq: ["faq", "faqs", "questions", "help_center", "support_faq"],
  apply: ["apply", "application", "join", "join_us"],
  events: ["events"],
  event_details: ["event_details", "events_slug", "event_detail"],
  cohort_details: ["cohort_details", "cohorts_id", "cohort_detail"],
  not_found: ["not_found", "404", "error_page"],
  navbar: ["navbar", "header", "navigation", "nav"],
  footer: ["footer"],
  hire_talent: ["hire_talent", "hire-talent", "recruiter_toolkit", "recruiters"],
  people: ["team", "team_members", "our_team", "instructors", "participants"],
  marketing: ["programs"],
  generic: [],
};

const PAGE_CONFIG: Record<PageKind, PageConfig> = {
  home: {
    note: "Homepage section content is managed in CMS > Home Sections. Use this tab for route-level metadata and notes.",
    fields: [
      { path: "page_title", label: "Page Title", type: "text", aliases: ["title", "hero_title", "heroTitle"] },
      {
        path: "page_description",
        label: "Page Description",
        type: "textarea",
        aliases: ["description", "hero_subtitle", "heroSubtitle", "text"],
      },
    ],
  },
  about: {
    fields: [
      { path: "hero_tag", label: "Hero Tag", type: "text", aliases: ["heroTag", "tagline", "tag_line"] },
      {
        path: "hero_title_primary",
        label: "Hero Title Primary",
        type: "text",
        aliases: ["heroTitlePrimary", "hero_title", "heroTitle", "title"],
      },
      {
        path: "hero_title_highlight",
        label: "Hero Title Highlight",
        type: "text",
        aliases: ["heroTitleHighlight", "hero_highlight", "heroHighlight"],
      },
      {
        path: "hero_subtitle",
        label: "Hero Description",
        type: "textarea",
        aliases: ["heroSubtitle", "subtitle", "description", "text"],
      },
      {
        path: "hero_image_url",
        label: "Hero Image URL",
        type: "text",
        aliases: ["heroImageUrl", "image_url", "imageUrl"],
      },
      {
        path: "hero_pills",
        label: "Hero Pills (one per line)",
        type: "lines",
        aliases: ["heroPills", "pills"],
      },
      { path: "primary_cta_text", label: "Primary CTA Text", type: "text", aliases: ["primaryCtaText", "cta_text", "ctaText"] },
      { path: "primary_cta_link", label: "Primary CTA Link", type: "text", aliases: ["primaryCtaLink", "cta_link", "ctaLink"] },
      { path: "secondary_cta_text", label: "Secondary CTA Text", type: "text", aliases: ["secondaryCtaText"] },
      { path: "secondary_cta_link", label: "Secondary CTA Link", type: "text", aliases: ["secondaryCtaLink"] },
      { path: "focus_eyebrow", label: "Capabilities Eyebrow", type: "text", aliases: ["focusEyebrow"] },
      { path: "focus_title", label: "Capabilities Title", type: "text", aliases: ["focusTitle"] },
      { path: "focus_description", label: "Capabilities Description", type: "textarea", aliases: ["focusDescription"] },
      { path: "mission_eyebrow", label: "Mission Eyebrow", type: "text", aliases: ["missionEyebrow"] },
      { path: "mission_title", label: "Mission Title", type: "text", aliases: ["missionTitle"] },
      { path: "mission_description", label: "Mission Description", type: "textarea", aliases: ["missionDescription"] },
      { path: "outcomes_eyebrow", label: "Outcomes Eyebrow", type: "text", aliases: ["outcomesEyebrow"] },
      { path: "outcomes_title", label: "Outcomes Title", type: "text", aliases: ["outcomesTitle"] },
      { path: "outcomes_description", label: "Outcomes Description", type: "textarea", aliases: ["outcomesDescription"] },
      { path: "programs_eyebrow", label: "Programs Eyebrow", type: "text", aliases: ["programsEyebrow"] },
      { path: "programs_title", label: "Programs Title", type: "text", aliases: ["programsTitle"] },
      { path: "programs_description", label: "Programs Description", type: "textarea", aliases: ["programsDescription"] },
      { path: "program_names_limit", label: "Program Names Card Limit", type: "number", aliases: ["programNamesLimit"] },
      { path: "alumni_eyebrow", label: "Alumni Eyebrow", type: "text", aliases: ["alumniEyebrow"] },
      { path: "alumni_title", label: "Alumni Title", type: "text", aliases: ["alumniTitle"] },
      { path: "alumni_description", label: "Alumni Description", type: "textarea", aliases: ["alumniDescription"] },
      { path: "partners_eyebrow", label: "Partners Eyebrow", type: "text", aliases: ["partnersEyebrow"] },
      { path: "partners_title", label: "Partners Title", type: "text", aliases: ["partnersTitle"] },
      { path: "partners_description", label: "Partners Description", type: "textarea", aliases: ["partnersDescription"] },
      { path: "faq_eyebrow", label: "Mission FAQ Eyebrow", type: "text", aliases: ["faqEyebrow"] },
      { path: "faq_title", label: "Mission FAQ Title", type: "text", aliases: ["faqTitle"] },
      { path: "faq_description", label: "Mission FAQ Description", type: "textarea", aliases: ["faqDescription"] },
      { path: "journey_eyebrow", label: "Journey Eyebrow", type: "text", aliases: ["journeyEyebrow"] },
      { path: "journey_title", label: "Journey Title", type: "text", aliases: ["journeyTitle"] },
      { path: "journey_description", label: "Journey Description", type: "textarea", aliases: ["journeyDescription"] },
    ],
    repeaters: [
      {
        path: "metric_cards",
        label: "Metric Cards",
        itemLabel: "Metric Card",
        defaultItem: { metric_key: "", label: "", description: "", prefix: "", suffix: "+", value_override: "" },
        fields: [
          {
            path: "metric_key",
            label: "Metric Key (programs | cohorts_made | open_cohorts | participants | team_number)",
            type: "text",
          },
          { path: "label", label: "Card Label", type: "text" },
          { path: "description", label: "Card Description", type: "textarea" },
          { path: "prefix", label: "Number Prefix", type: "text", placeholder: "" },
          { path: "suffix", label: "Number Suffix", type: "text", placeholder: "+" },
          { path: "value_override", label: "Value Override (optional number)", type: "text", placeholder: "e.g. 12" },
        ],
      },
      {
        path: "outcome_kpi_cards",
        label: "Outcome KPI Cards",
        itemLabel: "Outcome KPI Card",
        defaultItem: { metric_key: "", label: "", description: "", prefix: "", suffix: "+", value_override: "" },
        fields: [
          {
            path: "metric_key",
            label: "Metric Key (cohorts_made | participants | team_number | programs)",
            type: "text",
          },
          { path: "label", label: "Card Label", type: "text" },
          { path: "description", label: "Card Description", type: "textarea" },
          { path: "prefix", label: "Number Prefix", type: "text", placeholder: "" },
          { path: "suffix", label: "Number Suffix", type: "text", placeholder: "+" },
          { path: "value_override", label: "Value Override (optional number)", type: "text", placeholder: "e.g. 95" },
        ],
      },
      {
        path: "focus_cards",
        label: "Capabilities Cards",
        itemLabel: "Capability Card",
        defaultItem: { title: "", description: "" },
        fields: [
          { path: "title", label: "Title", type: "text" },
          { path: "description", label: "Description", type: "textarea" },
        ],
      },
      {
        path: "mission_cards",
        label: "Mission Cards",
        itemLabel: "Mission Card",
        defaultItem: { title: "", description: "" },
        fields: [
          { path: "title", label: "Title", type: "text" },
          { path: "description", label: "Description", type: "textarea" },
        ],
      },
      {
        path: "alumni_story_cards",
        label: "Alumni Success Story Cards",
        itemLabel: "Alumni Story",
        defaultItem: { name: "", role: "", company: "", quote: "", outcome: "" },
        fields: [
          { path: "name", label: "Alumni Name", type: "text" },
          { path: "role", label: "Role", type: "text" },
          { path: "company", label: "Company", type: "text" },
          { path: "quote", label: "Quote", type: "textarea" },
          { path: "outcome", label: "Outcome", type: "textarea" },
        ],
      },
      {
        path: "partner_logo_cards",
        label: "Partner Company Cards",
        itemLabel: "Partner",
        defaultItem: { name: "", logo_url: "", link: "" },
        fields: [
          { path: "name", label: "Company Name", type: "text" },
          { path: "logo_url", label: "Logo URL", type: "text" },
          { path: "link", label: "Company Link", type: "text" },
        ],
      },
      {
        path: "mission_faq_items",
        label: "Mission FAQ Items",
        itemLabel: "FAQ Item",
        defaultItem: { question: "", answer: "" },
        fields: [
          { path: "question", label: "Question", type: "text" },
          { path: "answer", label: "Answer", type: "textarea" },
        ],
      },
      {
        path: "journey_cards",
        label: "Journey Cards",
        itemLabel: "Journey Card",
        defaultItem: { step: "", title: "", description: "" },
        fields: [
          { path: "step", label: "Step Label", type: "text", placeholder: "Step 01" },
          { path: "title", label: "Title", type: "text" },
          { path: "description", label: "Description", type: "textarea" },
        ],
      },
    ],
  },
  privacy: {
    fields: [
      { path: "title", label: "Page Title", type: "text", aliases: ["heading"] },
      { path: "text", label: "Policy Text", type: "textarea", aliases: ["content", "body", "description"] },
      { path: "effective_date", label: "Effective Date", type: "text", aliases: ["effectiveDate"] },
      { path: "contact_email", label: "Contact Email", type: "text", aliases: ["contactEmail"] },
      { path: "last_updated_label", label: "Last Updated Label", type: "text", aliases: ["lastUpdatedLabel"] },
    ],
  },
  terms: {
    fields: [
      { path: "title", label: "Page Title", type: "text", aliases: ["heading"] },
      { path: "text", label: "Terms Text", type: "textarea", aliases: ["content", "body", "description"] },
      { path: "effective_date", label: "Effective Date", type: "text", aliases: ["effectiveDate"] },
      { path: "contact_email", label: "Contact Email", type: "text", aliases: ["contactEmail"] },
      { path: "last_updated_label", label: "Last Updated Label", type: "text", aliases: ["lastUpdatedLabel"] },
    ],
  },
  contact: {
    fields: [
      { path: "hero_title", label: "Hero Title", type: "text", aliases: ["heroTitle", "title", "heading"] },
      {
        path: "hero_subtitle",
        label: "Hero Subtitle",
        type: "textarea",
        aliases: ["heroSubtitle", "subtitle", "description", "text"],
      },
      { path: "email", label: "Email", type: "text", aliases: ["contact_email", "contactEmail"] },
      { path: "phone", label: "Phone", type: "text", aliases: ["contact_phone", "contactPhone"] },
      { path: "whatsapp", label: "WhatsApp", type: "text", aliases: ["whatsapp_number", "whatsappNumber"] },
      { path: "address", label: "Address", type: "textarea", aliases: ["location", "office_address", "officeAddress"] },
      { path: "address_title", label: "Address Card Title", type: "text", aliases: ["addressTitle"] },
      { path: "phone_title", label: "Phone Card Title", type: "text", aliases: ["phoneTitle"] },
      { path: "email_title", label: "Email Card Title", type: "text", aliases: ["emailTitle"] },
      { path: "map_embed_url", label: "Map Embed URL", type: "text", aliases: ["mapEmbedUrl", "map_url"] },
      { path: "map_title", label: "Map Iframe Title", type: "text", aliases: ["mapTitle"] },
      { path: "form_title", label: "Form Title", type: "text", aliases: ["contact_form_title", "formTitle"] },
      { path: "form_subtitle", label: "Form Subtitle", type: "textarea", aliases: ["contact_form_subtitle", "formSubtitle"] },
      {
        path: "submit_button_text",
        label: "Submit Button Text",
        type: "text",
        aliases: ["submitButtonText", "button_text", "buttonText"],
      },
    ],
  },
  faq: {
    fields: [
      { path: "title", label: "Page Title", type: "text", aliases: ["heading", "hero_title", "heroTitle"] },
      {
        path: "description",
        label: "Description",
        type: "textarea",
        aliases: ["text", "subtitle", "hero_subtitle", "heroSubtitle"],
      },
      {
        path: "search_placeholder",
        label: "Search Placeholder",
        type: "text",
        aliases: ["searchPlaceholder"],
      },
      { path: "empty_state_text", label: "Empty State Text", type: "text", aliases: ["emptyStateText"] },
    ],
    repeaters: [
      {
        path: "items",
        label: "FAQ Items",
        itemLabel: "FAQ",
        defaultItem: { question: "", answer: "" },
        fields: [
          { path: "question", label: "Question", type: "text", aliases: ["title"] },
          { path: "answer", label: "Answer", type: "textarea", aliases: ["description", "text"] },
        ],
      },
    ],
  },
  apply: {
    fields: [
      {
        path: "hero_title",
        label: "Program Apply Title",
        type: "text",
        aliases: ["heroTitle", "title", "heading", "program_hero_title", "programHeroTitle"],
      },
      {
        path: "hero_subtitle",
        label: "Program Apply Description",
        type: "textarea",
        aliases: ["heroSubtitle", "subtitle", "description", "text", "program_hero_subtitle", "programHeroSubtitle"],
      },
      { path: "cohort_hero_title", label: "Cohort Apply Title", type: "text", aliases: ["cohortHeroTitle"] },
      { path: "cohort_hero_subtitle", label: "Cohort Apply Description", type: "textarea", aliases: ["cohortHeroSubtitle"] },
    ],
  },
  events: {
    fields: [
      { path: "subtitle", label: "Section Label", type: "text", aliases: ["sub_title"] },
      { path: "hero_title", label: "Hero Title", type: "text", aliases: ["heroTitle", "title", "heading"] },
      {
        path: "hero_subtitle",
        label: "Hero Subtitle",
        type: "textarea",
        aliases: ["heroSubtitle", "subtitle", "description", "text", "body"],
      },
      { path: "results_summary_template", label: "Results Summary Template", type: "text", aliases: ["resultsSummaryTemplate"] },
      { path: "sort_label", label: "Sort Label", type: "text", aliases: ["sortLabel"] },
      { path: "sort_default_label", label: "Default Sort Option", type: "text", aliases: ["sortDefaultLabel"] },
      { path: "sort_date_desc_label", label: "Latest Date Sort Option", type: "text", aliases: ["sortDateDescLabel"] },
      { path: "sort_title_asc_label", label: "Title A-Z Sort Option", type: "text", aliases: ["sortTitleAscLabel"] },
      { path: "sort_title_desc_label", label: "Title Z-A Sort Option", type: "text", aliases: ["sortTitleDescLabel"] },
      { path: "sort_status_label", label: "Status Sort Option", type: "text", aliases: ["sortStatusLabel"] },
      { path: "filter_all_label", label: "All Filter Label", type: "text", aliases: ["filterAllLabel"] },
      { path: "filter_upcoming_label", label: "Upcoming Filter Label", type: "text", aliases: ["filterUpcomingLabel"] },
      { path: "filter_completed_label", label: "Completed Filter Label", type: "text", aliases: ["filterCompletedLabel"] },
      { path: "view_details_text", label: "View Details CTA", type: "text", aliases: ["viewDetailsText"] },
      { path: "location_fallback", label: "Location Fallback", type: "text", aliases: ["locationFallback"] },
      { path: "photos_suffix", label: "Photos Suffix", type: "text", aliases: ["photosSuffix"] },
      { path: "empty_state_text", label: "Empty State Text", type: "text", aliases: ["emptyStateText"] },
      { path: "error_text", label: "Load Error Text", type: "text", aliases: ["errorText"] },
      { path: "close_label", label: "Close Modal Label", type: "text", aliases: ["closeLabel"] },
      { path: "previous_image_label", label: "Previous Image Label", type: "text", aliases: ["previousImageLabel"] },
      { path: "next_image_label", label: "Next Image Label", type: "text", aliases: ["nextImageLabel"] },
      { path: "start_label", label: "Start Meta Label", type: "text", aliases: ["startLabel"] },
      { path: "end_label", label: "End Meta Label", type: "text", aliases: ["endLabel"] },
      { path: "location_label", label: "Location Meta Label", type: "text", aliases: ["locationLabel"] },
      { path: "status_label", label: "Status Meta Label", type: "text", aliases: ["statusLabel"] },
      { path: "event_post_title", label: "Event Post Title", type: "text", aliases: ["eventPostTitle"] },
      { path: "fallback_post_text", label: "Fallback Post Text", type: "textarea", aliases: ["fallbackPostText"] },
      { path: "not_available_text", label: "Not Available Text", type: "text", aliases: ["notAvailableText"] },
    ],
  },
  event_details: {
    fields: [
      { path: "breadcrumb_title", label: "Breadcrumb Title", type: "text", aliases: ["hero_title", "heroTitle", "title"] },
      { path: "breadcrumb_subtitle", label: "Breadcrumb Subtitle", type: "text", aliases: ["hero_subtitle", "heroSubtitle", "subtitle"] },
      { path: "error_not_found_text", label: "Missing Event Error Text", type: "text" },
      { path: "error_load_text", label: "Load Error Text", type: "text" },
      { path: "back_to_events_text", label: "Back to Events CTA", type: "text" },
      { path: "all_events_text", label: "All Events CTA", type: "text" },
      { path: "previous_image_label", label: "Previous Image ARIA Label", type: "text", aliases: ["previousImageLabel"] },
      { path: "next_image_label", label: "Next Image ARIA Label", type: "text", aliases: ["nextImageLabel"] },
      { path: "completed_event_label", label: "Completed Event Label", type: "text" },
      { path: "upcoming_event_label", label: "Upcoming Event Label", type: "text" },
      { path: "status_completed_label", label: "Status Completed Label", type: "text" },
      { path: "status_upcoming_label", label: "Status Upcoming Label", type: "text" },
      { path: "start_label", label: "Start Label", type: "text", aliases: ["startLabel"] },
      { path: "end_label", label: "End Label", type: "text", aliases: ["endLabel"] },
      { path: "location_label", label: "Location Label", type: "text", aliases: ["locationLabel"] },
      { path: "location_fallback", label: "Location Fallback", type: "text", aliases: ["locationFallback"] },
      { path: "event_post_title", label: "Event Post Title", type: "text", aliases: ["eventPostTitle"] },
      { path: "event_post_fallback_text", label: "Event Post Fallback Text", type: "textarea", aliases: ["eventPostFallbackText"] },
    ],
  },
  cohort_details: {
    fields: [
      { path: "breadcrumb_title", label: "Breadcrumb Title", type: "text", aliases: ["hero_title", "heroTitle", "title"] },
      { path: "breadcrumb_subtitle", label: "Breadcrumb Subtitle", type: "text", aliases: ["hero_subtitle", "heroSubtitle", "subtitle"] },
      { path: "error_not_found_text", label: "Missing Cohort Error Text", type: "text" },
      { path: "error_load_text", label: "Load Error Text", type: "text" },
      { path: "back_to_programs_text", label: "Back to Programs CTA", type: "text" },
      { path: "mentors_title", label: "Mentors Section Title", type: "text" },
      { path: "mentors_empty_text", label: "Mentors Empty Text", type: "text" },
      { path: "participants_title", label: "Participants Section Title", type: "text" },
      { path: "participants_empty_text", label: "Participants Empty Text", type: "text" },
      { path: "sidebar_title", label: "Sidebar Title", type: "text" },
      { path: "status_label", label: "Sidebar Status Label", type: "text" },
      { path: "program_label", label: "Sidebar Program Label", type: "text" },
      { path: "start_date_label", label: "Sidebar Start Date Label", type: "text" },
      { path: "end_date_label", label: "Sidebar End Date Label", type: "text" },
      { path: "attendance_days_label", label: "Sidebar Attendance Days Label", type: "text" },
      { path: "attendance_time_label", label: "Sidebar Attendance Time Label", type: "text" },
      { path: "hero_starts_label", label: "Hero Starts Label", type: "text" },
      { path: "hero_duration_label", label: "Hero Duration Label", type: "text" },
      { path: "hero_level_label", label: "Hero Level Label", type: "text" },
      { path: "hero_level_value", label: "Hero Level Value", type: "text" },
      { path: "meta_start_label", label: "Meta Start Label", type: "text" },
      { path: "meta_end_label", label: "Meta End Label", type: "text" },
      { path: "meta_attendance_label", label: "Meta Attendance Label", type: "text" },
      { path: "cta_apply_now_text", label: "Apply Now CTA Text", type: "text" },
      { path: "cta_apply_future_text", label: "Future Program CTA Text", type: "text" },
    ],
  },
  not_found: {
    fields: [
      { path: "title", label: "Error Title", type: "text" },
      { path: "subtitle", label: "Error Subtitle", type: "text" },
      { path: "button_text", label: "Back Home Button Text", type: "text" },
    ],
  },
  navbar: {
    fields: [
      { path: "logo_url", label: "Header Logo URL", type: "text", aliases: ["logoUrl", "header_logo_url", "headerLogoUrl"] },
      { path: "primary_cta_label", label: "Primary CTA Label", type: "text", aliases: ["primaryCtaLabel"] },
      { path: "primary_cta_link", label: "Primary CTA Link", type: "text", aliases: ["primaryCtaLink"] },
      { path: "secondary_cta_label", label: "Secondary CTA Label", type: "text", aliases: ["secondaryCtaLabel"] },
      { path: "secondary_cta_link", label: "Secondary CTA Link", type: "text", aliases: ["secondaryCtaLink"] },
    ],
    repeaters: [
      {
        path: "links",
        label: "Navbar Links",
        itemLabel: "Nav Link",
        defaultItem: { label: "", url: "", children: [] },
        fields: [
          { path: "label", label: "Label", type: "text" },
          { path: "url", label: "URL", type: "text", placeholder: "/programs" },
          {
            path: "children",
            label: "Child Links (Label | URL per line)",
            type: "lines",
            placeholder: "Mission | /about-us",
          },
        ],
      },
    ],
  },
  footer: {
    fields: [
      { path: "brand_title", label: "Brand Title", type: "text", aliases: ["brandTitle"] },
      { path: "brand_text", label: "Brand Description", type: "textarea", aliases: ["brandText"] },
      { path: "brand_address", label: "Brand Address", type: "text", aliases: ["brandAddress"] },
      { path: "brand_phone", label: "Brand Phone", type: "text", aliases: ["brandPhone"] },
      { path: "brand_logo_url", label: "Brand Logo URL", type: "text", aliases: ["brandLogoUrl"] },
      { path: "get_in_touch_title", label: "Get In Touch Title", type: "text", aliases: ["getInTouchTitle"] },
      { path: "get_in_touch_text", label: "Get In Touch Text", type: "textarea", aliases: ["getInTouchText"] },
      { path: "terms_label", label: "Terms Link Label", type: "text", aliases: ["termsLabel"] },
      { path: "privacy_label", label: "Privacy Link Label", type: "text", aliases: ["privacyLabel"] },
      { path: "copyright_text", label: "Copyright Text (Year or Phrase)", type: "text", aliases: ["copyrightText"] },
      { path: "useful_links_title", label: "Useful Links Title", type: "text", aliases: ["usefulLinksTitle"] },
      { path: "company_links_title", label: "Company Links Title", type: "text", aliases: ["companyLinksTitle"] },
    ],
    repeaters: [
      {
        path: "useful_links",
        label: "Useful Links",
        itemLabel: "Useful Link",
        defaultItem: { label: "", url: "" },
        fields: [
          { path: "label", label: "Label", type: "text" },
          { path: "url", label: "URL", type: "text", placeholder: "/contact" },
        ],
      },
      {
        path: "company_links",
        label: "Company Links",
        itemLabel: "Company Link",
        defaultItem: { label: "", url: "" },
        fields: [
          { path: "label", label: "Label", type: "text" },
          { path: "url", label: "URL", type: "text", placeholder: "/events" },
        ],
      },
      {
        path: "social_links",
        label: "Social Links",
        itemLabel: "Social Link",
        defaultItem: { name: "", url: "" },
        fields: [
          { path: "name", label: "Name", type: "text", placeholder: "facebook" },
          { path: "url", label: "URL", type: "text", placeholder: "https://facebook.com/your-page" },
        ],
      },
    ],
  },
  hire_talent: {
    note: "Candidate cards are now managed here. Use experience values junior, mid, senior and location type values remote, hybrid, on_site.",
    fields: [
      { path: "subtitle", label: "Section Label", type: "text", aliases: ["sub_title"] },
      { path: "hero_title", label: "Hero Title", type: "text", aliases: ["heroTitle", "title", "heading"] },
      {
        path: "hero_subtitle",
        label: "Hero Subtitle",
        type: "textarea",
        aliases: ["heroSubtitle", "subtitle", "description", "text", "body"],
      },
      { path: "assistant_title", label: "Assistant Panel Title", type: "text", aliases: ["assistantTitle"] },
      { path: "assistant_status", label: "Assistant Status Badge", type: "text", aliases: ["assistantStatus"] },
      { path: "quick_skills_label", label: "Quick Skills Label", type: "text", aliases: ["quickSkillsLabel"] },
      { path: "experience_label", label: "Experience Filter Label", type: "text", aliases: ["experienceLabel"] },
      { path: "location_type_label", label: "Location Filter Label", type: "text", aliases: ["locationTypeLabel"] },
      { path: "all_label", label: "All Option Label", type: "text", aliases: ["allLabel"] },
      { path: "junior_label", label: "Junior Option Label", type: "text", aliases: ["juniorLabel"] },
      { path: "mid_label", label: "Mid Option Label", type: "text", aliases: ["midLabel"] },
      { path: "senior_label", label: "Senior Option Label", type: "text", aliases: ["seniorLabel"] },
      { path: "remote_label", label: "Remote Option Label", type: "text", aliases: ["remoteLabel"] },
      { path: "hybrid_label", label: "Hybrid Option Label", type: "text", aliases: ["hybridLabel"] },
      { path: "on_site_label", label: "On-site Option Label", type: "text", aliases: ["onSiteLabel"] },
      { path: "composer_placeholder", label: "Message Placeholder", type: "textarea", aliases: ["composerPlaceholder"] },
      { path: "find_match_button_text", label: "Find Match Button Text", type: "text", aliases: ["findMatchButtonText"] },
      { path: "results_title", label: "Results Panel Title", type: "text", aliases: ["resultsTitle"] },
      { path: "results_summary_template", label: "Results Summary Template", type: "text", aliases: ["resultsSummaryTemplate"] },
      { path: "availability_label", label: "Availability Label", type: "text", aliases: ["availabilityLabel"] },
      { path: "location_label", label: "Location Label", type: "text", aliases: ["locationLabel"] },
      { path: "view_profile_text", label: "View Profile CTA", type: "text", aliases: ["viewProfileText"] },
      { path: "view_cv_text", label: "View CV CTA", type: "text", aliases: ["viewCvText"] },
      { path: "download_cv_text", label: "Download CV CTA", type: "text", aliases: ["downloadCvText"] },
      { path: "shortlist_text", label: "Shortlist CTA", type: "text", aliases: ["shortlistText"] },
      { path: "shortlisted_text", label: "Shortlisted CTA", type: "text", aliases: ["shortlistedText"] },
      { path: "modal_match_title", label: "Modal Match Section Title", type: "text", aliases: ["modalMatchTitle"] },
      { path: "modal_skills_title", label: "Modal Skills Title", type: "text", aliases: ["modalSkillsTitle"] },
      { path: "modal_cohorts_title", label: "Modal Cohorts Title", type: "text", aliases: ["modalCohortsTitle"] },
      { path: "contact_candidate_text", label: "Contact Candidate CTA", type: "text", aliases: ["contactCandidateText"] },
      { path: "linkedin_text", label: "LinkedIn CTA", type: "text", aliases: ["linkedinText"] },
      { path: "portfolio_text", label: "Portfolio CTA", type: "text", aliases: ["portfolioText"] },
      { path: "default_assistant_message", label: "Default Assistant Message", type: "textarea", aliases: ["defaultAssistantMessage"] },
      { path: "no_match_feedback_text", label: "No Match Feedback Text", type: "textarea", aliases: ["noMatchFeedbackText"] },
      { path: "top_match_feedback_template", label: "Top Match Feedback Template", type: "textarea", aliases: ["topMatchFeedbackTemplate"] },
    ],
    repeaters: [
      {
        path: "candidates",
        label: "Candidate Pool",
        itemLabel: "Candidate",
        defaultItem: {
          name: "",
          headline: "",
          experienceLevel: "junior",
          locationType: "remote",
          location: "",
          availability: "",
          cohorts: [],
          skills: [],
          summary: "",
          matchNotes: [],
          avatar: "",
          cvUrl: "",
          portfolioUrl: "",
          linkedinUrl: "",
          email: "",
        },
        fields: [
          { path: "name", label: "Name", type: "text" },
          { path: "headline", label: "Headline", type: "text" },
          {
            path: "experienceLevel",
            label: "Experience Level",
            type: "text",
            placeholder: "junior, mid, or senior",
          },
          {
            path: "locationType",
            label: "Location Type",
            type: "text",
            placeholder: "remote, hybrid, or on_site",
          },
          { path: "location", label: "Location", type: "text" },
          { path: "availability", label: "Availability", type: "text" },
          { path: "avatar", label: "Avatar Image URL", type: "text" },
          { path: "cvUrl", label: "CV URL", type: "text" },
          { path: "portfolioUrl", label: "Portfolio URL", type: "text" },
          { path: "linkedinUrl", label: "LinkedIn URL", type: "text" },
          { path: "email", label: "Email", type: "text" },
          { path: "summary", label: "Summary", type: "textarea" },
          { path: "skills", label: "Skills (one per line)", type: "lines" },
          { path: "cohorts", label: "Cohorts (one per line)", type: "lines" },
          { path: "matchNotes", label: "Match Notes (one per line)", type: "lines" },
        ],
      },
    ],
  },
  people: {
    fields: [
      { path: "hero_title", label: "Hero Title", type: "text", aliases: ["heroTitle", "title", "heading"] },
      { path: "hero_subtitle", label: "Hero Subtitle", type: "textarea", aliases: ["heroSubtitle", "subtitle", "description", "text"] },
      { path: "primary_filter_title", label: "Primary Filter Title", type: "text", aliases: ["primaryFilterTitle"] },
      { path: "secondary_filter_title", label: "Programs Filter Title", type: "text", aliases: ["secondaryFilterTitle"] },
      { path: "loading_profiles_text", label: "Loading Profiles Text", type: "text", aliases: ["loadingProfilesText"] },
      { path: "showing_results_template", label: "Showing Results Template", type: "text", aliases: ["showingResultsTemplate"] },
      { path: "sort_label", label: "Sort Label", type: "text", aliases: ["sortLabel"] },
      { path: "sort_default_label", label: "Default Sort Label", type: "text", aliases: ["sortDefaultLabel"] },
      { path: "sort_availability_label", label: "Availability Sort Label", type: "text", aliases: ["sortAvailabilityLabel"] },
      { path: "sort_name_asc_label", label: "Name A-Z Sort Label", type: "text", aliases: ["sortNameAscLabel"] },
      { path: "sort_name_desc_label", label: "Name Z-A Sort Label", type: "text", aliases: ["sortNameDescLabel"] },
      { path: "empty_state_text", label: "Empty State Text", type: "text", aliases: ["emptyStateText"] },
      { path: "profile_loading_text", label: "Profile Loading Text", type: "text", aliases: ["profileLoadingText"] },
      { path: "profile_error_text", label: "Profile Error Text", type: "text", aliases: ["profileErrorText"] },
      { path: "about_title", label: "About Section Title", type: "text", aliases: ["aboutTitle"] },
      { path: "skills_title", label: "Skills Section Title", type: "text", aliases: ["skillsTitle"] },
      { path: "projects_title", label: "Projects Section Title", type: "text", aliases: ["projectsTitle"] },
      { path: "repo_text", label: "Repo Link Text", type: "text", aliases: ["repoText"] },
      { path: "demo_text", label: "Demo Link Text", type: "text", aliases: ["demoText"] },
      { path: "experience_title", label: "Experience Section Title", type: "text", aliases: ["experienceTitle"] },
      { path: "education_title", label: "Education Section Title", type: "text", aliases: ["educationTitle"] },
      { path: "certifications_title", label: "Certifications Section Title", type: "text", aliases: ["certificationsTitle"] },
      { path: "programs_title", label: "Programs Section Title", type: "text", aliases: ["programsTitle", "cohorts_title", "cohortsTitle"] },
      { path: "links_title", label: "Links Section Title", type: "text", aliases: ["linksTitle"] },
      { path: "location_title", label: "Location Section Title", type: "text", aliases: ["locationTitle"] },
      { path: "email_title", label: "Email Section Title", type: "text", aliases: ["emailTitle"] },
      { path: "phone_title", label: "Phone Section Title", type: "text", aliases: ["phoneTitle"] },
      { path: "cv_title", label: "CV Section Title", type: "text", aliases: ["cvTitle"] },
      { path: "cv_missing_text", label: "Missing CV Text", type: "text", aliases: ["cvMissingText"] },
      { path: "cv_updated_label", label: "CV Updated Label", type: "text", aliases: ["cvUpdatedLabel"] },
      { path: "view_cv_text", label: "View CV CTA", type: "text", aliases: ["viewCvText"] },
      { path: "download_cv_text", label: "Download CV CTA", type: "text", aliases: ["downloadCvText"] },
      { path: "contact_cta_text", label: "Contact CTA Text", type: "text", aliases: ["contactCtaText"] },
      { path: "close_profile_label", label: "Close Profile Label", type: "text", aliases: ["closeProfileLabel"] },
      { path: "close_modal_label", label: "Close Modal Label", type: "text", aliases: ["closeModalLabel"] },
    ],
  },
  marketing: {
    fields: [
      { path: "subtitle", label: "Section Label", type: "text", aliases: ["sub_title"] },
      { path: "hero_title", label: "Hero Title", type: "text", aliases: ["heroTitle", "title", "heading"] },
      {
        path: "hero_subtitle",
        label: "Hero Subtitle",
        type: "textarea",
        aliases: ["heroSubtitle", "subtitle", "description", "text", "body"],
      },
    ],
  },
  generic: {
    fields: [],
    note: "No structured fields are configured for this page key yet. Use Advanced JSON mode.",
  },
};

const PAGE_META: Record<PageKind, PageMeta> = {
  home: { title: "Home Page", websiteLocation: "Website > Home" },
  about: { title: "About & Mission Page", websiteLocation: "Website > About / Mission" },
  privacy: { title: "Privacy Policy Page", websiteLocation: "Website > Footer > Privacy Policy" },
  terms: { title: "Terms Page", websiteLocation: "Website > Footer > Terms & Conditions" },
  contact: { title: "Contact Page", websiteLocation: "Website > Contact" },
  faq: { title: "FAQ Page", websiteLocation: "Website > FAQ" },
  apply: { title: "Apply Page", websiteLocation: "Website > Apply" },
  events: { title: "Events Page", websiteLocation: "Website > Events" },
  event_details: { title: "Event Details Page", websiteLocation: "Website > Events > Event Details" },
  cohort_details: { title: "Cohort Details Page", websiteLocation: "Website > Programs > Cohort Details" },
  not_found: { title: "404 Page", websiteLocation: "Website > Not Found" },
  navbar: { title: "Navbar", websiteLocation: "Website > Header / Navbar" },
  footer: { title: "Footer", websiteLocation: "Website > Footer" },
  hire_talent: { title: "Hire Talent Page", websiteLocation: "Website > Hire Talent" },
  people: { title: "People Directory Page", websiteLocation: "Website > Team or Participants" },
  marketing: { title: "Marketing Page", websiteLocation: "Website > CMS-backed page route" },
  generic: { title: "Custom Page", websiteLocation: "Website route mapped by this key" },
};

const MEDIA_FIELD_PATTERN = /(image|icon|logo|avatar|photo|thumbnail|banner|background)/i;

const toJsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);
const isRecord = (value: unknown): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizeKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
const toCamelSegment = (segment: string) => segment.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const toCamelPath = (path: string) => path.split(".").map(toCamelSegment).join(".");
const toPathList = (path: string | string[]) => (Array.isArray(path) ? path : [path]);
const uniquePaths = (paths: string[]) => [...new Set(paths.map((entry) => String(entry || "").trim()).filter(Boolean))];
const resolveReadPaths = (path: string, aliases: string[] = []) =>
  uniquePaths([path, toCamelPath(path), ...aliases, ...aliases.map(toCamelPath)]);
const parseLineArray = (raw: string) => raw.split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
const toLineArrayText = (values: string[]) => values.join("\n");

const parseJsonObject = (text: string) => {
  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) return { value: null as JsonObject | null, error: "Content JSON must be an object." };
    return { value: parsed, error: "" };
  } catch {
    return { value: null as JsonObject | null, error: "Content must be valid JSON." };
  }
};

const resolvePageKind = (pageKey: string): PageKind => {
  const normalized = normalizeKey(pageKey);
  const entries = Object.entries(PAGE_KIND_ALIASES) as Array<[PageKind, string[]]>;
  for (const [kind, aliases] of entries) {
    if (kind === "generic") continue;
    if (aliases.includes(normalized)) return kind;
  }
  return "generic";
};

const getAtPath = (obj: JsonObject, path: string): unknown => {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
};

const getAtAnyPath = (obj: JsonObject, path: string | string[]): unknown => {
  for (const candidate of toPathList(path)) {
    const value = getAtPath(obj, candidate);
    if (value !== undefined) return value;
  }
  return undefined;
};

const setAtPath = (obj: JsonObject, path: string, value: unknown) => {
  const keys = path.split(".");
  let cursor: JsonObject = obj;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const isLast = i === keys.length - 1;
    if (isLast) {
      cursor[key] = value;
      return;
    }
    if (!isRecord(cursor[key])) cursor[key] = {};
    cursor = cursor[key] as JsonObject;
  }
};

const readString = (obj: JsonObject, path: string | string[], fallback = "") => {
  const value = getAtAnyPath(obj, path);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const isMediaField = (field: StructuredField) => {
  if (field.type !== "text") return false;
  const path = `${field.path} ${(field.aliases ?? []).join(" ")}`.toLowerCase();
  const label = field.label.toLowerCase();
  return MEDIA_FIELD_PATTERN.test(path) || MEDIA_FIELD_PATTERN.test(label);
};

const formatCurrentValue = (value: string) => {
  const trimmed = String(value || "").trim();
  return trimmed || "Empty";
};

const readNumber = (obj: JsonObject, path: string | string[], fallback = 0) => {
  const value = getAtAnyPath(obj, path);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const readBoolean = (obj: JsonObject, path: string | string[], fallback = false) => {
  const value = getAtAnyPath(obj, path);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
};

const readStringArray = (obj: JsonObject, path: string | string[]) => {
  const value = getAtAnyPath(obj, path);
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) =>
      typeof entry === "string" ? entry.trim() : typeof entry === "number" || typeof entry === "boolean" ? String(entry) : "",
    )
    .filter(Boolean);
};

const readRecordArray = (obj: JsonObject, path: string) => {
  const value = getAtPath(obj, path);
  if (!Array.isArray(value)) return [] as JsonObject[];
  return value.filter((entry): entry is JsonObject => isRecord(entry));
};

const buildEditor = (row: CmsPageRow): CmsPageEditor => ({
  id: row.id,
  key: row.key,
  title: String(row.title ?? ""),
  isPublished: Boolean(row.is_published),
  contentText: toJsonText(row.content),
});

export function CmsPagesPage() {
  const [rows, setRows] = useState<CmsPageRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editor, setEditor] = useState<CmsPageEditor | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mediaTargetPath, setMediaTargetPath] = useState<string | null>(null);

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);
  const orderedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aKind = resolvePageKind(a.key);
        const bKind = resolvePageKind(b.key);
        const aGeneric = aKind === "generic" ? 1 : 0;
        const bGeneric = bKind === "generic" ? 1 : 0;
        if (aGeneric !== bGeneric) return aGeneric - bGeneric;
        return String(a.title || a.key).localeCompare(String(b.title || b.key));
      }),
    [rows],
  );
  const pageKind = useMemo(() => resolvePageKind(editor?.key ?? ""), [editor?.key]);
  const pageConfig = PAGE_CONFIG[pageKind];
  const pageMeta = PAGE_META[pageKind];
  const parsedContent = useMemo(
    () => (editor ? parseJsonObject(editor.contentText) : { value: null as JsonObject | null, error: "" }),
    [editor],
  );

  const loadPages = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiList<CmsPageRow>("/cms/pages?page=1&limit=200&sortBy=updated_at&order=desc");
      setRows(result.data);
      const nextSelectedId = selectedId && result.data.some((row) => row.id === selectedId)
        ? selectedId
        : result.data[0]?.id ?? null;
      setSelectedId(nextSelectedId);
      const nextSelected = result.data.find((row) => row.id === nextSelectedId);
      setEditor(nextSelected ? buildEditor(nextSelected) : null);
      setJsonMode(nextSelected ? resolvePageKind(nextSelected.key) === "generic" : false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message || "Failed to load pages." : "Failed to load pages.");
      setRows([]);
      setSelectedId(null);
      setEditor(null);
      setJsonMode(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (row: CmsPageRow) => {
    setSelectedId(row.id);
    setEditor(buildEditor(row));
    setJsonMode(resolvePageKind(row.key) === "generic");
    setSuccess("");
    setError("");
  };

  const updateContent = (mutator: (draft: JsonObject) => void) => {
    setEditor((prev) => {
      if (!prev) return prev;
      const parsed = parseJsonObject(prev.contentText);
      const draft = parsed.value ? (JSON.parse(JSON.stringify(parsed.value)) as JsonObject) : {};
      mutator(draft);
      return { ...prev, contentText: toJsonText(draft) };
    });
  };

  const setContentValue = (path: string, value: unknown) => updateContent((draft) => setAtPath(draft, path, value));
  const addArrayItem = (path: string, item: JsonObject) =>
    updateContent((draft) => setAtPath(draft, path, [...readRecordArray(draft, path), item]));
  const updateArrayItem = (path: string, index: number, updater: (item: JsonObject) => void) =>
    updateContent((draft) => {
      const items = readRecordArray(draft, path);
      if (!items[index]) return;
      const next = { ...items[index] };
      updater(next);
      items[index] = next;
      setAtPath(draft, path, items);
    });
  const removeArrayItem = (path: string, index: number) =>
    updateContent((draft) => {
      const items = readRecordArray(draft, path);
      if (!items[index]) return;
      items.splice(index, 1);
      setAtPath(draft, path, items);
    });
  const handleMediaPick = (asset: CmsMediaAsset) => {
    if (!mediaTargetPath) return;
    setContentValue(mediaTargetPath, asset.public_url);
    setMediaTargetPath(null);
  };

  const savePage = async () => {
    if (!editor) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const parsed = JSON.parse(editor.contentText) as Record<string, unknown>;
      await api<CmsPageRow>(`/cms/pages/${editor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editor.title.trim() || null,
          is_published: editor.isPublished,
          content: parsed,
        }),
      });
      setSuccess("Page saved successfully.");
      await loadPages();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Content must be valid JSON.");
      } else {
        setError(err instanceof ApiError ? err.message || "Failed to save page." : "Failed to save page.");
      }
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: StructuredField, content: JsonObject, keyPrefix = "root") => {
    const readPaths = resolveReadPaths(field.path, field.aliases ?? []);
    const key = `${keyPrefix}:${field.path}`;
    if (field.type === "checkbox") {
      const current = readBoolean(content, readPaths, false);
      return (
        <label key={key} className="toggle-wrap">
          <input type="checkbox" checked={current} onChange={(event) => setContentValue(field.path, event.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    }
    if (field.type === "textarea") {
      const current = readString(content, readPaths);
      return (
        <label key={key} className="field">
          <span className="field__label">{field.label}</span>
          <textarea className="textarea-control" value={current} onChange={(event) => setContentValue(field.path, event.target.value)} placeholder={field.placeholder} />
          <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
        </label>
      );
    }
    if (field.type === "number") {
      const current = readNumber(content, readPaths, 0);
      return (
        <label key={key} className="field">
          <span className="field__label">{field.label}</span>
          <input className="field__control" type="number" value={current} onChange={(event) => setContentValue(field.path, Number(event.target.value || 0))} placeholder={field.placeholder} />
          <span className="field__hint">Current value: {String(current)}</span>
        </label>
      );
    }
    if (field.type === "lines") {
      const current = toLineArrayText(readStringArray(content, readPaths));
      return (
        <label key={key} className="field">
          <span className="field__label">{field.label}</span>
          <textarea className="textarea-control" value={current} onChange={(event) => setContentValue(field.path, parseLineArray(event.target.value))} placeholder={field.placeholder} />
          <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
        </label>
      );
    }
    const current = readString(content, readPaths);
    const mediaField = isMediaField(field);
    return (
      <label key={key} className="field">
        <span className="field__label">{field.label}</span>
        <div className="cms-field-inline">
          <input className="field__control" value={current} onChange={(event) => setContentValue(field.path, event.target.value)} placeholder={field.placeholder} />
          {mediaField ? (
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setMediaTargetPath(field.path)}>
              Media Library
            </button>
          ) : null}
        </div>
        <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
      </label>
    );
  };

  const renderStructuredEditor = () => {
    if (!editor) return null;
    if (parsedContent.error) {
      return (
        <div className="form-stack">
          <p className="field__error">{parsedContent.error}</p>
          <div className="cms-home-editor__actions-row">
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setJsonMode(true)}>
              Open JSON Editor
            </button>
            <button
              className="btn btn--secondary btn--sm"
              type="button"
              onClick={() => setEditor((prev) => (prev ? { ...prev, contentText: toJsonText({}) } : prev))}
            >
              Reset Content
            </button>
          </div>
        </div>
      );
    }
    if (pageKind === "generic") return <p className="info-text info-text--small">{pageConfig.note}</p>;
    const content = parsedContent.value ?? {};
    return (
      <div className="form-stack">
        {pageConfig.note ? <p className="info-text info-text--small">{pageConfig.note}</p> : null}
        <div className="cms-home-editor__grid">{pageConfig.fields.map((field) => renderField(field, content))}</div>
        {pageConfig.repeaters?.map((repeater) => {
          const items = readRecordArray(content, repeater.path);
          return (
            <div key={repeater.path} className="cms-home-editor__group">
              <div className="cms-home-editor__group-head">
                <p className="info-text">{repeater.label}</p>
                <button
                  className="btn btn--secondary btn--sm"
                  type="button"
                  onClick={() => addArrayItem(repeater.path, repeater.defaultItem)}
                >
                  Add {repeater.itemLabel}
                </button>
              </div>
              {items.length === 0 ? (
                <p className="info-text info-text--small">No items configured yet.</p>
              ) : (
                <div className="cms-home-editor__array">
                  {items.map((_item, index) => (
                    <div key={`${repeater.path}-${index}`} className="cms-home-editor__array-item">
                      <div className="cms-home-editor__array-head">
                        <strong>
                          {repeater.itemLabel} {index + 1}
                        </strong>
                        <button
                          className="btn btn--secondary btn--sm"
                          type="button"
                          onClick={() => removeArrayItem(repeater.path, index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="cms-home-editor__grid">
                        {repeater.fields.map((field) => {
                          const itemPath = `${repeater.path}.${index}.${field.path}`;
                          const itemAliases = (field.aliases ?? []).map(
                            (aliasPath) => `${repeater.path}.${index}.${aliasPath}`,
                          );
                          const readPaths = resolveReadPaths(itemPath, itemAliases);

                          if (field.type === "checkbox") {
                            return (
                              <label key={`${itemPath}:checkbox`} className="toggle-wrap">
                                <input
                                  type="checkbox"
                                  checked={readBoolean(content, readPaths, false)}
                                  onChange={(event) =>
                                    updateArrayItem(repeater.path, index, (target) =>
                                      setAtPath(target, field.path, event.target.checked),
                                    )
                                  }
                                />
                                <span>{field.label}</span>
                              </label>
                            );
                          }

                          if (field.type === "textarea") {
                            return (
                              <label key={`${itemPath}:textarea`} className="field">
                                <span className="field__label">{field.label}</span>
                                <textarea
                                  className="textarea-control"
                                  value={readString(content, readPaths)}
                                  onChange={(event) =>
                                    updateArrayItem(repeater.path, index, (target) =>
                                      setAtPath(target, field.path, event.target.value),
                                    )
                                  }
                                  placeholder={field.placeholder}
                                />
                              </label>
                            );
                          }

                          if (field.type === "number") {
                            return (
                              <label key={`${itemPath}:number`} className="field">
                                <span className="field__label">{field.label}</span>
                                <input
                                  className="field__control"
                                  type="number"
                                  value={readNumber(content, readPaths, 0)}
                                  onChange={(event) =>
                                    updateArrayItem(repeater.path, index, (target) =>
                                      setAtPath(target, field.path, Number(event.target.value || 0)),
                                    )
                                  }
                                  placeholder={field.placeholder}
                                />
                              </label>
                            );
                          }

                          if (field.type === "lines") {
                            return (
                              <label key={`${itemPath}:lines`} className="field">
                                <span className="field__label">{field.label}</span>
                                <textarea
                                  className="textarea-control"
                                  value={toLineArrayText(readStringArray(content, readPaths))}
                                  onChange={(event) =>
                                    updateArrayItem(repeater.path, index, (target) =>
                                      setAtPath(target, field.path, parseLineArray(event.target.value)),
                                    )
                                  }
                                  placeholder={field.placeholder}
                                />
                              </label>
                            );
                          }

                          const current = readString(content, readPaths);
                          const mediaField = isMediaField(field);
                          return (
                            <label key={`${itemPath}:text`} className="field">
                              <span className="field__label">{field.label}</span>
                              <div className="cms-field-inline">
                                <input
                                  className="field__control"
                                  value={current}
                                  onChange={(event) =>
                                    updateArrayItem(repeater.path, index, (target) =>
                                      setAtPath(target, field.path, event.target.value),
                                    )
                                  }
                                  placeholder={field.placeholder}
                                />
                                {mediaField ? (
                                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => setMediaTargetPath(itemPath)}>
                                    Media Library
                                  </button>
                                ) : null}
                              </div>
                              <span className="field__hint">Current value: {formatCurrentValue(current)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageShell
      title="Pages"
      subtitle="Manage CMS-backed website pages with page tabs, structured fields, and advanced JSON when needed."
      actions={
        <div className="cms-page-actions">
          <button className="btn btn--secondary" type="button" onClick={() => void loadPages()} disabled={loading || saving}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn btn--primary" type="button" onClick={savePage} disabled={!editor || saving || loading}>
            {saving ? "Saving..." : "Save Page"}
          </button>
        </div>
      }
    >
      <Card className="cms-page-shell">
        <div className="cms-page-tabs" role="tablist" aria-label="CMS pages">
          {orderedRows.map((row) => {
            const isActive = selectedId === row.id;
            return (
              <button
                key={row.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`cms-page-tab ${isActive ? "is-active" : ""}`}
                onClick={() => handleSelect(row)}
              >
                <span className="cms-page-tab__title">{row.title || row.key}</span>
                <span className="cms-page-tab__meta">{row.key}</span>
                <span className={`cms-page-tab__status ${row.is_published ? "is-published" : "is-draft"}`}>
                  {row.is_published ? "Published" : "Draft"}
                </span>
              </button>
            );
          })}
        </div>

        {!editor ? (
          <div className="empty-state">
            <p className="empty-state__title">No page selected</p>
            <p className="empty-state__description">{loading ? "Loading pages..." : "Select a page tab to edit."}</p>
          </div>
        ) : (
          <div className="cms-page-layout">
            <div className="cms-page-header-card">
              <div>
                <p className="cms-page-header-card__eyebrow">{pageMeta.websiteLocation}</p>
                <h3 className="section-title">{pageMeta.title}</h3>
                <p className="info-text info-text--small">
                  Editing <strong>{selectedRow?.title || selectedRow?.key}</strong> and its published copy.
                </p>
              </div>
              <div className="cms-page-header-card__badges">
                <Badge tone={editor.isPublished ? "published" : "draft"}>{editor.isPublished ? "Published" : "Draft"}</Badge>
                <Badge tone="default">{`Updated ${selectedRow ? formatDateTime(selectedRow.updated_at) : "-"}`}</Badge>
              </div>
            </div>

            <div className="cms-page-editor-grid">
              <Card className="cms-page-editor-card">
                <div className="form-stack">
                  <div className="cms-editor-note">
                    <p className="info-text"><strong>{editor.key}</strong></p>
                    <p className="info-text info-text--small">Use Media Library on image fields, then save the page.</p>
                  </div>
                  <div className="cms-page-meta-grid">
                    <label className="field">
                      <span className="field__label">Title</span>
                      <input
                        className="field__control"
                        value={editor.title}
                        onChange={(event) => setEditor((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                        disabled={saving}
                      />
                    </label>
                    <label className="toggle-wrap">
                      <input
                        type="checkbox"
                        checked={editor.isPublished}
                        onChange={(event) => setEditor((prev) => (prev ? { ...prev, isPublished: event.target.checked } : prev))}
                        disabled={saving}
                      />
                      <span>{editor.isPublished ? "Published" : "Draft"}</span>
                    </label>
                  </div>
                  <div className="cms-home-editor__mode">
                    <button type="button" className={`cms-home-editor__mode-btn ${!jsonMode ? "is-active" : ""}`} onClick={() => setJsonMode(false)}>
                      Structured Fields
                    </button>
                    <button type="button" className={`cms-home-editor__mode-btn ${jsonMode ? "is-active" : ""}`} onClick={() => setJsonMode(true)}>
                      Advanced JSON
                    </button>
                  </div>
                  {!jsonMode ? (
                    renderStructuredEditor()
                  ) : (
                    <>
                      <label className="field">
                        <span className="field__label">Content (JSON)</span>
                        <textarea
                          className="textarea-control textarea-control--tall"
                          value={editor.contentText}
                          onChange={(event) => setEditor((prev) => (prev ? { ...prev, contentText: event.target.value } : prev))}
                          disabled={saving}
                        />
                      </label>
                      <p className="info-text info-text--small">Use a valid JSON object shape for page content.</p>
                    </>
                  )}
                  {error ? <p className="field__error">{error}</p> : null}
                  {success ? <p className="field__success">{success}</p> : null}
                </div>
              </Card>
            </div>
          </div>
        )}
      </Card>
      <CmsMediaPickerModal
        isOpen={Boolean(mediaTargetPath)}
        selectedUrl={mediaTargetPath && parsedContent.value ? readString(parsedContent.value, mediaTargetPath) : undefined}
        onClose={() => setMediaTargetPath(null)}
        onSelect={handleMediaPick}
      />
    </PageShell>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import ContactForm from "@/forms/ContactForm";
import InjectableSvg from "@/hooks/InjectableSvg";
import Link from "@/components/common/Link";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";
import { API_BASE_URL } from "@/lib/publicApi";

const EXACT_LOCATION_QUERY = "Siblin Training Centre, JC9J+8W9, Sebline";

type ContactInfo = {
  address: string;
  phone: string;
  email: string;
  mapEmbedUrl: string;
  mapLocationQuery: string;
  contactFormTitle: string;
  contactFormSubtitle: string;
};

type PublicHomeResponse = {
  success?: boolean;
  data?: {
    site_settings?: {
      contact_info?: Record<string, unknown>;
      default_event_location?: string | null;
    };
  };
};

const DEFAULTS: ContactInfo = {
  address: "Siblin Training Centre\nJC9J+8W9, Sebline",
  phone: "+961 70639085",
  email: "info@digitalhub.com",
  mapEmbedUrl: "",
  mapLocationQuery: EXACT_LOCATION_QUERY,
  contactFormTitle: "Send Us Message",
  contactFormSubtitle: "Your email address will not be published. Required fields are marked *",
};

const ContactArea: React.FC = () => {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  const contactPage = useCmsPage("contact");
  const contactContent = contactPage?.content ?? null;
  const addressTitle = getCmsString(contactContent, ["address_title", "addressTitle"], "Address");
  const phoneTitle = getCmsString(contactContent, ["phone_title", "phoneTitle"], "Phone");
  const emailTitle = getCmsString(contactContent, ["email_title", "emailTitle"], "E-mail Address");
  const mapTitle = getCmsString(contactContent, ["map_title", "mapTitle"], "Digital Hub location");

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/home`, {
          cache: "no-store",
          credentials: "omit",
        });

        if (!res.ok) {
          return;
        }

        const payload = (await res.json()) as PublicHomeResponse;
        const raw = payload?.data?.site_settings?.contact_info || {};
        const defaultEventLocation = String(payload?.data?.site_settings?.default_event_location || "").trim();

        const cmsAddress = getCmsString(contactContent, ["address", "office_address", "officeAddress"], "");
        const cmsPhone = getCmsString(contactContent, ["phone", "contact_phone", "contactPhone"], "");
        const cmsEmail = getCmsString(contactContent, ["email", "contact_email", "contactEmail"], "");
        const cmsMapEmbedUrl = getCmsString(
          contactContent,
          ["map_embed_url", "mapEmbedUrl", "map_url"],
          "",
        );
        const cmsMapLocation = getCmsString(
          contactContent,
          ["map_location", "mapLocation"],
          "",
        );
        const cmsFormTitle = getCmsString(
          contactContent,
          ["form_title", "contact_form_title", "formTitle"],
          "",
        );
        const cmsFormSubtitle = getCmsString(
          contactContent,
          ["form_subtitle", "contact_form_subtitle", "formSubtitle"],
          "",
        );

        const fallbackLocation =
          String(
            raw.mapLocationQuery ??
              raw.map_location_query ??
              raw.mapLocation ??
              raw.map_location ??
              defaultEventLocation ??
              cmsMapLocation ??
              "",
          ) || DEFAULTS.mapLocationQuery;

        const normalized: ContactInfo = {
          address: cmsAddress || String(raw.address ?? DEFAULTS.address),
          phone: cmsPhone || String(raw.phone ?? DEFAULTS.phone),
          email: cmsEmail || String(raw.email ?? DEFAULTS.email),
          mapEmbedUrl: cmsMapEmbedUrl || String(raw.mapEmbedUrl ?? raw.map_embed_url ?? DEFAULTS.mapEmbedUrl),
          mapLocationQuery: fallbackLocation,
          contactFormTitle: cmsFormTitle || String(raw.contactFormTitle ?? raw.contact_form_title ?? DEFAULTS.contactFormTitle),
          contactFormSubtitle:
            cmsFormSubtitle || String(raw.contactFormSubtitle ?? raw.contact_form_subtitle ?? DEFAULTS.contactFormSubtitle),
        };

        setContactInfo(normalized);
      } catch {
        // Keep default contact info when request fails.
      }
    };

    fetchContactInfo();
  }, [contactContent]);

  const info = contactInfo ?? DEFAULTS;
  const addressLines = (info.address || DEFAULTS.address).split("\n");
  const locationQuery = String(info.mapLocationQuery || "").trim() || DEFAULTS.mapLocationQuery;
  const fallbackPinnedMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&z=15&output=embed`;
  const dbMapUrl = (info.mapEmbedUrl || "").trim();
  const useDbMapUrl = dbMapUrl.length > 0;
  const mapSrc = useDbMapUrl ? dbMapUrl : fallbackPinnedMapUrl;

  return (
    <section className="contact-area section-py-120">
      <div className="container">
        <div className="row">
          <div className="col-lg-4">
            <div className="contact-info-wrap">
              <ul className="list-wrap">
                <li>
                  <div className="icon">
                    <InjectableSvg src="assets/img/icons/map.svg" alt="img" className="injectable" />
                  </div>
                  <div className="content">
                    <h4 className="title">{addressTitle}</h4>
                    <p>
                      {addressLines.map((line, idx) => (
                        <span key={idx}>
                          {line}
                          {idx !== addressLines.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  </div>
                </li>
                <li>
                  <div className="icon">
                    <InjectableSvg src="assets/img/icons/contact_phone.svg" alt="img" className="injectable" />
                  </div>
                  <div className="content">
                    <h4 className="title">{phoneTitle}</h4>
                    <Link to={`tel:${info.phone || DEFAULTS.phone}`}>{info.phone || DEFAULTS.phone}</Link>
                  </div>
                </li>
                <li>
                  <div className="icon">
                    <InjectableSvg src="assets/img/icons/emial.svg" alt="img" className="injectable" />
                  </div>
                  <div className="content">
                    <h4 className="title">{emailTitle}</h4>
                    <Link to={`mailto:${info.email || DEFAULTS.email}`}>{info.email || DEFAULTS.email}</Link>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="contact-form-wrap">
              <h4 className="title">{info.contactFormTitle || DEFAULTS.contactFormTitle}</h4>
              <p>{info.contactFormSubtitle || DEFAULTS.contactFormSubtitle}</p>
              <ContactForm />
            </div>
          </div>
        </div>
        <div className="contact-map contact-map--compact">
          <iframe
            src={mapSrc}
            style={{ border: "0" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={mapTitle}
          ></iframe>
        </div>
      </div>
    </section>
  );
};

export default ContactArea;

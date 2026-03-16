// File: frontend/src/components/homes/home-one/Announcements.tsx
// Purpose: Renders the announcements UI block for the frontend.

"use client";

import { AnnouncementCard, resolveAnnouncementCardProps } from "@/components/common/AnnouncementCard";
import { getCmsNumber, getCmsString } from "@/lib/cmsContent";
import { listPublicAnnouncements, type PublicAnnouncement } from "@/lib/publicApi";
import { useEffect, useMemo, useState } from "react";

type AnnouncementsProps = {
  content?: Record<string, unknown> | null;
};

const Announcements = ({ content }: AnnouncementsProps) => {
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  const sectionSubtitle = getCmsString(content, ["subtitle", "sub_title"], "Latest Updates");
  const sectionTitle = getCmsString(content, ["title", "heading"], "What Is Happening At The Digital Hub");
  const cardsLimit = Math.trunc(getCmsNumber(content, ["limit", "card_limit", "items_limit"], 6, 1, 24));

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const rows = await listPublicAnnouncements({
          page: 1,
          limit: 200,
          sortBy: "publish_at",
          order: "desc",
        });
        if (!active) return;
        setItems(Array.isArray(rows) ? rows.filter((row) => Boolean(row?.title)) : []);
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => items.slice(0, cardsLimit), [cardsLimit, items]);

  if (loading || !cards.length) return null;

  return (
    <section className="home-announcements section-py-80">
      <div className="container">
        <div className="home-announcements__heading" data-aos="fade-up">
          <span className="sub-title">{sectionSubtitle}</span>
          <h2 className="title">{sectionTitle}</h2>
        </div>

        <div className="home-announcements__list">
          {cards.map((item, index) => (
            <div
              key={item.id}
              data-aos="fade-up"
              data-aos-delay={80 + index * 60}
            >
              <AnnouncementCard {...resolveAnnouncementCardProps(item)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Announcements;

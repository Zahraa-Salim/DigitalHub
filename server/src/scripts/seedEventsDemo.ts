// File Summary: server/src/scripts/seedEventsDemo.ts
// Layer: scripts
// Purpose: Seeds/upserts demo public events with gallery images and post content.
// Notes: Run with: npm run seed:events
// @ts-nocheck
import dotenv from "dotenv";
import { pool } from "../db/index.js";

dotenv.config();

const demoEvents = [
  {
    slug: "digital-hub-demo-day-2025",
    title: "Digital Hub Demo Day 2025",
    description: "A showcase of participant projects and hiring conversations with partners.",
    post_body:
      "Demo Day 2025 brought together mentors, hiring partners, and families. Participants presented capstone projects in web, UI/UX, and automation tracks. The event closed with networking sessions and interview scheduling.",
    location: "Beirut Innovation Hall",
    starts_at: "2025-11-02T14:00:00.000Z",
    ends_at: "2025-11-02T18:30:00.000Z",
    is_published: true,
    is_done: true,
    done_at: "2025-11-02T18:30:00.000Z",
    completion_image_urls: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "uiux-graduation-showcase-2025",
    title: "UI/UX Graduation Showcase",
    description: "Final exhibition of UI/UX cohort portfolios and design case studies.",
    post_body:
      "Graduates presented product redesigns, accessibility audits, and user research findings. Reviewers highlighted strong storytelling and practical prototypes. Portfolio feedback booths ran in parallel with the stage presentations.",
    location: "The Digital Hub - Main Auditorium",
    starts_at: "2025-08-20T13:00:00.000Z",
    ends_at: "2025-08-20T17:00:00.000Z",
    is_published: true,
    is_done: true,
    done_at: "2025-08-20T17:00:00.000Z",
    completion_image_urls: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "tech-careers-open-day-2026",
    title: "Tech Careers Open Day 2026",
    description: "Meet mentors and explore upcoming cohort opportunities in 2026.",
    post_body:
      "Visitors can attend track introductions, alumni talks, and CV clinics. The event includes short orientation sessions for applicants and parents.",
    location: "UNRWA Digital Hub",
    starts_at: "2026-04-12T10:00:00.000Z",
    ends_at: "2026-04-12T14:00:00.000Z",
    is_published: true,
    is_done: false,
    done_at: null,
    completion_image_urls: [],
  },
  {
    slug: "summer-cohort-kickoff-2026",
    title: "Summer Cohort Kickoff",
    description: "Orientation event for accepted summer cohort participants.",
    post_body:
      "Kickoff includes onboarding, mentor introductions, and project-team formation. Attendance is open to accepted applicants and invited guests.",
    location: "UNRWA Youth Center",
    starts_at: "2026-06-05T09:30:00.000Z",
    ends_at: "2026-06-05T13:00:00.000Z",
    is_published: true,
    is_done: false,
    done_at: null,
    completion_image_urls: [],
  },
];

async function ensureEventsColumns() {
  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS completion_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS post_body TEXT;
    UPDATE events SET completion_image_urls = '[]'::jsonb WHERE completion_image_urls IS NULL;
  `);
}

async function upsertEvent(entry: (typeof demoEvents)[number]) {
  const existing = await pool.query(
    `
      SELECT id
      FROM events
      WHERE slug = $1
      LIMIT 1
    `,
    [entry.slug],
  );

  if (existing.rowCount) {
    const id = Number(existing.rows[0].id);
    await pool.query(
      `
        UPDATE events
        SET
          title = $2,
          description = $3,
          post_body = $4,
          location = $5,
          starts_at = $6,
          ends_at = $7,
          is_published = $8,
          is_done = $9,
          done_at = $10,
          completion_image_urls = $11::jsonb,
          deleted_at = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        entry.title,
        entry.description,
        entry.post_body,
        entry.location,
        entry.starts_at,
        entry.ends_at,
        entry.is_published,
        entry.is_done,
        entry.done_at,
        JSON.stringify(entry.completion_image_urls ?? []),
      ],
    );
    return { mode: "updated", id };
  }

  const inserted = await pool.query(
    `
      INSERT INTO events (
        slug,
        title,
        description,
        post_body,
        location,
        starts_at,
        ends_at,
        is_published,
        is_done,
        done_at,
        completion_image_urls,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NULL, NOW(), NOW()
      )
      RETURNING id
    `,
    [
      entry.slug,
      entry.title,
      entry.description,
      entry.post_body,
      entry.location,
      entry.starts_at,
      entry.ends_at,
      entry.is_published,
      entry.is_done,
      entry.done_at,
      JSON.stringify(entry.completion_image_urls ?? []),
    ],
  );

  return { mode: "inserted", id: Number(inserted.rows[0].id) };
}

async function seedEventsDemo() {
  await ensureEventsColumns();
  for (const event of demoEvents) {
    const result = await upsertEvent(event);
    console.log(`[${result.mode}] event #${result.id} -> ${event.slug}`);
  }
  console.log(`Seed completed. Total processed: ${demoEvents.length}`);
}

seedEventsDemo()
  .catch((error) => {
    console.error("Failed to seed demo events:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });


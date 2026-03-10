// File: server/src/repositories/cms.repo.ts
// Purpose: Runs the database queries used for CMS.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

// @ts-nocheck

import { pool } from "../db/index.js";
// Handles 'getSiteSettings' workflow for this module.
export async function getSiteSettings(db = pool) {
    return db.query(`
      SELECT id, site_name, default_event_location, contact_info, social_links, updated_by, updated_at
      FROM site_settings
      WHERE id = 1
    `);
}
// Handles 'ensureSiteSettingsRow' workflow for this module.
export async function ensureSiteSettingsRow(adminId, db = pool) {
    return db.query(`
      INSERT INTO site_settings (id, site_name, default_event_location, contact_info, social_links, updated_by, updated_at)
      VALUES (1, 'Digital Hub', 'Digital Hub', '{}'::jsonb, '{}'::jsonb, $1, NOW())
      ON CONFLICT (id) DO NOTHING
    `, [adminId]);
}
// Handles 'updateSiteSettings' workflow for this module.
export async function updateSiteSettings(setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE site_settings
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [...values, adminId]);
}
// Handles 'countPages' workflow for this module.
export async function countPages(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM pages ${whereClause}`, params);
}
// Handles 'ensureDefaultPages' workflow for this module.
export async function ensureDefaultPages(db = pool) {
    return db.query(`
      INSERT INTO pages (key, title, content, is_published, updated_at)
      VALUES
        (
          'about',
          'About Digital Hub',
          jsonb_build_object(
            'hero_tag', 'About Digital Hub',
            'hero_title_primary', 'Practical Learning For',
            'hero_title_highlight', 'Real Career Progress',
            'hero_subtitle', 'Digital Hub helps learners move from foundations to delivery through project-driven programs, mentor feedback, and clear execution standards.',
            'hero_image_url', '/assets/img/others/inner_about_img.png',
            'hero_pills', jsonb_build_array(
              'Industry-aligned programs',
              'Mentor-supported learning',
              'Project-first outcomes'
            ),
            'primary_cta_text', 'Apply Now',
            'primary_cta_link', '/apply',
            'secondary_cta_text', 'Browse Programs',
            'secondary_cta_link', '/programs',
            'focus_eyebrow', 'What We Deliver',
            'focus_title', 'How The Learning Experience Works',
            'focus_description', 'Our delivery model combines technical depth, structured mentorship, and measurable outcomes so learners can build strong momentum.',
            'mission_eyebrow', 'Mission',
            'mission_title', 'What We Stand For',
            'mission_description', 'Digital Hub is designed to close the gap between learning and employability through practical, high-accountability training.',
            'outcomes_eyebrow', 'How We Measure Outcomes',
            'outcomes_title', 'Mission Impact KPIs',
            'outcomes_description', 'These KPI cards are tied to live platform entities: cohorts, participants, team members, and programs.',
            'programs_eyebrow', 'Program Portfolio',
            'programs_title', 'Program Names',
            'programs_description', 'Programs currently available across Digital Hub tracks.',
            'program_names_limit', 12,
            'alumni_eyebrow', 'Alumni Success Stories',
            'alumni_title', 'Real Outcomes From Recent Graduates',
            'alumni_description', 'Examples of graduates moving into delivery roles, freelance work, and product teams.',
            'partners_eyebrow', 'Partner Companies',
            'partners_title', 'Organizations Collaborating With Digital Hub',
            'partners_description', 'A sample of hiring and project partners connected to learner outcomes.',
            'faq_eyebrow', 'Mission FAQ',
            'faq_title', 'Program Impact Questions',
            'faq_description', 'Answers to common questions about outcomes, employability, and measurable impact.',
            'journey_eyebrow', 'Mission In Action',
            'journey_title', 'From Learning To Delivery',
            'journey_description', 'Participants move through a clear journey that turns learning into demonstrable execution.',
            'metric_cards', jsonb_build_array(
              jsonb_build_object(
                'metric_key', 'team_number',
                'label', 'Team Members',
                'description', 'Instructors and managers supporting delivery and coaching.',
                'suffix', '+'
              ),
              jsonb_build_object(
                'metric_key', 'programs',
                'label', 'Programs',
                'description', 'Active and upcoming tracks aligned with market needs.',
                'suffix', '+'
              ),
              jsonb_build_object(
                'metric_key', 'cohorts_made',
                'label', 'Cohorts Created',
                'description', 'Cohorts launched across completed, running, open, and planned cycles.',
                'suffix', '+'
              ),
              jsonb_build_object(
                'metric_key', 'participants',
                'label', 'Participants',
                'description', 'Participants currently tracked in the system.',
                'suffix', '+'
              )
            ),
            'outcome_kpi_cards', jsonb_build_array(
              jsonb_build_object(
                'metric_key', 'cohorts_made',
                'label', 'Cohorts Made',
                'description', 'Total cohorts created and managed in the platform.',
                'suffix', '+'
              ),
              jsonb_build_object(
                'metric_key', 'participants',
                'label', 'Participants',
                'description', 'Current participant count across active records.',
                'suffix', '+'
              ),
              jsonb_build_object(
                'metric_key', 'team_number',
                'label', 'Team Number',
                'description', 'Combined instructors and management team supporting delivery.',
                'suffix', '+'
              ),
              jsonb_build_object(
                'metric_key', 'programs',
                'label', 'Programs',
                'description', 'Program names are loaded below directly from the database.',
                'suffix', '+'
              )
            ),
            'focus_cards', jsonb_build_array(
              jsonb_build_object(
                'title', 'Applied Learning',
                'description', 'Learners build real deliverables, not just exercises, throughout each program.'
              ),
              jsonb_build_object(
                'title', 'Mentor Feedback Loops',
                'description', 'Regular review cycles keep learners aligned with quality standards and deadlines.'
              ),
              jsonb_build_object(
                'title', 'Career Readiness',
                'description', 'Training includes portfolio direction, communication practice, and execution habits.'
              )
            ),
            'mission_cards', jsonb_build_array(
              jsonb_build_object(
                'title', 'Access To Practical Skills',
                'description', 'We help learners gain hands-on digital capabilities through guided, structured delivery.'
              ),
              jsonb_build_object(
                'title', 'Clarity And Accountability',
                'description', 'Clear milestones and progress tracking help learners stay focused and move forward.'
              ),
              jsonb_build_object(
                'title', 'Community And Growth',
                'description', 'Learners grow inside a support system of mentors, peers, and outcomes-focused coaching.'
              )
            ),
            'alumni_story_cards', jsonb_build_array(
              jsonb_build_object(
                'name', 'Nour Salameh',
                'role', 'Frontend Developer',
                'company', 'Cedar Tech',
                'quote', 'The project cycle taught me how to deliver features under real deadlines.',
                'outcome', 'Hired as a junior frontend developer after completing capstone delivery.'
              ),
              jsonb_build_object(
                'name', 'Hadi Nasser',
                'role', 'Data Analyst',
                'company', 'Insight Labs',
                'quote', 'Mentor feedback on dashboards changed how I present data to stakeholders.',
                'outcome', 'Moved from intern to full-time analyst role within three months.'
              ),
              jsonb_build_object(
                'name', 'Rana Farah',
                'role', 'Product Associate',
                'company', 'Launchbase',
                'quote', 'The product workflow modules made roadmap planning and prioritization practical.',
                'outcome', 'Transitioned from marketing coordination into product operations.'
              )
            ),
            'partner_logo_cards', jsonb_build_array(
              jsonb_build_object('name', 'Cedar Tech', 'logo_url', '/assets/img/brand/brand01.png', 'link', 'https://example.com/cedar-tech'),
              jsonb_build_object('name', 'Insight Labs', 'logo_url', '/assets/img/brand/brand02.png', 'link', 'https://example.com/insight-labs'),
              jsonb_build_object('name', 'Launchbase', 'logo_url', '/assets/img/brand/brand03.png', 'link', 'https://example.com/launchbase'),
              jsonb_build_object('name', 'Beirut Digital Factory', 'logo_url', '/assets/img/brand/brand04.png', 'link', 'https://example.com/bdf'),
              jsonb_build_object('name', 'Nexa Systems', 'logo_url', '/assets/img/brand/brand05.png', 'link', 'https://example.com/nexa')
            ),
            'mission_faq_items', jsonb_build_array(
              jsonb_build_object(
                'question', 'How are mission outcomes measured?',
                'answer', 'We track operational KPIs such as cohorts created, participant activity, and team-supported delivery capacity.'
              ),
              jsonb_build_object(
                'question', 'Are these KPI cards static?',
                'answer', 'No. The KPI cards map to live data keys and can also be overridden when needed for campaigns.'
              ),
              jsonb_build_object(
                'question', 'Where do program names come from?',
                'answer', 'Program names are loaded directly from the programs table via public API endpoints.'
              ),
              jsonb_build_object(
                'question', 'What defines an alumni success story?',
                'answer', 'Stories are outcome-focused: role transition, hiring progress, or tangible project delivery results.'
              )
            ),
            'journey_cards', jsonb_build_array(
              jsonb_build_object(
                'step', 'Step 01',
                'title', 'Foundations',
                'description', 'Learners build strong fundamentals with practical labs and guided assignments.'
              ),
              jsonb_build_object(
                'step', 'Step 02',
                'title', 'Project Execution',
                'description', 'Participants work on scoped projects that mirror professional delivery expectations.'
              ),
              jsonb_build_object(
                'step', 'Step 03',
                'title', 'Career Positioning',
                'description', 'Final outputs are refined for hiring readiness, portfolio quality, and interviews.'
              )
            )
          ),
          TRUE,
          NOW()
        ),
        (
          'contact',
          'Contact Us',
          jsonb_build_object(
            'hero_title', 'Get in Touch',
            'hero_subtitle', 'Questions, partnership requests, or visit planning. Reach out and our team will reply shortly.'
          ),
          TRUE,
          NOW()
        ),
        (
          'privacy',
          'Privacy Policy',
          jsonb_build_object(
            'title', 'Privacy Policy',
            'text', 'This is a demo privacy policy. Replace with your official policy.'
          ),
          TRUE,
          NOW()
        ),
        (
          'terms',
          'Terms & Conditions',
          jsonb_build_object(
            'title', 'Terms & Conditions',
            'text', 'This is a demo terms page. Replace with your official terms.'
          ),
          TRUE,
          NOW()
        ),
        (
          'faq',
          'Frequently Asked Questions',
          jsonb_build_object(
            'title', 'Frequently Asked Questions',
            'description', 'Find quick answers about programs, admissions, and communication.'
          ),
          TRUE,
          NOW()
        ),
        (
          'team',
          'Team',
          jsonb_build_object(
            'hero_title', 'Team Members',
            'hero_subtitle', 'Meet the admin and instructor teams behind The Digital Hub.'
          ),
          TRUE,
          NOW()
        ),
        (
          'programs',
          'Programs',
          jsonb_build_object(
            'hero_title', 'All Programs',
            'hero_subtitle', 'Browse open and upcoming programs delivered through The Digital Hub.'
          ),
          TRUE,
          NOW()
        ),
        (
          'events',
          'Events',
          jsonb_build_object(
            'hero_title', 'Events',
            'hero_subtitle', 'Community moments, open days, and career conversations hosted by The Digital Hub.'
          ),
          TRUE,
          NOW()
        ),
        (
          'participants',
          'Participants',
          jsonb_build_object(
            'hero_title', 'Participants',
            'hero_subtitle', 'Explore public participant profiles and discover emerging talent.'
          ),
          TRUE,
          NOW()
        ),
        (
          'apply',
          'Apply',
          jsonb_build_object(
            'hero_title', 'Apply to a Program',
            'hero_subtitle', 'Fill in your details and submit your general program application.',
            'cohort_hero_title', 'Apply to a Cohort',
            'cohort_hero_subtitle', 'Fill in your details and submit your cohort application.'
          ),
          TRUE,
          NOW()
        ),
        (
          'hire_talent',
          'Hire Talent',
          jsonb_build_object(
            'hero_title', 'Hire Talent With Match Assistant',
            'hero_subtitle', 'Describe your role, refine filters, and shortlist the strongest candidates with clear matching reasons.',
            'subtitle', 'Recruiter Toolkit',
            'candidates', jsonb_build_array(
              jsonb_build_object(
                'name', 'Lina Haddad',
                'headline', 'Frontend Developer',
                'experienceLevel', 'mid',
                'locationType', 'remote',
                'location', 'Beirut, Lebanon',
                'availability', 'Immediate',
                'cohorts', jsonb_build_array('Full Stack - Spring 2026'),
                'skills', jsonb_build_array('React', 'TypeScript', 'UI/UX'),
                'summary', 'Builds accessible interfaces and converts product requirements into clean React code.',
                'matchNotes', jsonb_build_array('Strong React and TypeScript foundation', 'Good UX collaboration experience'),
                'avatar', '/assets/img/instructor/instructor01.png',
                'cvUrl', '/assets/docs/demo-cv.pdf',
                'portfolioUrl', '#',
                'linkedinUrl', '#',
                'email', 'lina.haddad@example.com'
              ),
              jsonb_build_object(
                'name', 'Ziad Farah',
                'headline', 'Full Stack Engineer',
                'experienceLevel', 'senior',
                'locationType', 'hybrid',
                'location', 'Tripoli, Lebanon',
                'availability', '2 weeks',
                'cohorts', jsonb_build_array('Backend Engineering - Winter 2025'),
                'skills', jsonb_build_array('Node.js', 'PostgreSQL', 'TypeScript'),
                'summary', 'Designs APIs, optimizes SQL queries, and mentors junior engineers.',
                'matchNotes', jsonb_build_array('Strong backend architecture', 'Reliable with production database workloads'),
                'avatar', '/assets/img/instructor/instructor02.png',
                'cvUrl', '/assets/docs/demo-cv.pdf',
                'portfolioUrl', '#',
                'linkedinUrl', '#',
                'email', 'ziad.farah@example.com'
              ),
              jsonb_build_object(
                'name', 'Maya Saade',
                'headline', 'Product Designer',
                'experienceLevel', 'mid',
                'locationType', 'on_site',
                'location', 'Saida, Lebanon',
                'availability', 'Immediate',
                'cohorts', jsonb_build_array('UI/UX Design - Fall 2025'),
                'skills', jsonb_build_array('UI/UX', 'React'),
                'summary', 'Creates design systems, prototypes quickly, and supports handoff with dev-ready specs.',
                'matchNotes', jsonb_build_array('Strong visual system thinking', 'Can support front-end implementation'),
                'avatar', '/assets/img/instructor/instructor03.png',
                'cvUrl', '/assets/docs/demo-cv.pdf',
                'portfolioUrl', '#',
                'linkedinUrl', '#',
                'email', 'maya.saade@example.com'
              ),
              jsonb_build_object(
                'name', 'Karim Nassar',
                'headline', 'Data Analyst',
                'experienceLevel', 'junior',
                'locationType', 'remote',
                'location', 'Byblos, Lebanon',
                'availability', '1 month',
                'cohorts', jsonb_build_array('Data & BI - Spring 2026'),
                'skills', jsonb_build_array('Data Analysis', 'PostgreSQL'),
                'summary', 'Transforms raw data into dashboards and insight reports for business teams.',
                'matchNotes', jsonb_build_array('Good analytical workflow', 'Comfortable with SQL reporting'),
                'avatar', '/assets/img/instructor/instructor04.png',
                'cvUrl', '/assets/docs/demo-cv.pdf',
                'portfolioUrl', '#',
                'linkedinUrl', '#',
                'email', 'karim.nassar@example.com'
              )
            )
          ),
          TRUE,
          NOW()
        ),
        (
          'home',
          'Home',
          jsonb_build_object(
            'page_title', 'Home',
            'page_description', 'Edit homepage sections from CMS > Home Sections.'
          ),
          TRUE,
          NOW()
        ),
        (
          'instructors',
          'Instructors',
          jsonb_build_object(
            'hero_title', 'Instructors',
            'hero_subtitle', 'Meet the instructors and mentors behind The Digital Hub programs.'
          ),
          TRUE,
          NOW()
        ),
        (
          'cohort_details',
          'Cohort Details',
          jsonb_build_object(
            'breadcrumb_title', 'Cohort Details',
            'breadcrumb_subtitle', 'Programs',
            'error_not_found_text', 'Cohort not found.',
            'error_load_text', 'Unable to load cohort details right now.',
            'back_to_programs_text', 'Back to Programs',
            'mentors_title', 'Mentors',
            'mentors_empty_text', 'No mentors are assigned to this cohort yet.',
            'participants_title', 'Participants',
            'participants_empty_text', 'No public participants are listed for this cohort yet.',
            'sidebar_title', 'Program Information',
            'status_label', 'Status',
            'program_label', 'Program',
            'start_date_label', 'Start Date',
            'end_date_label', 'End Date',
            'attendance_days_label', 'Attendance Days',
            'attendance_time_label', 'Attendance Time',
            'hero_starts_label', 'Starts',
            'hero_duration_label', 'Duration',
            'hero_level_label', 'Level',
            'hero_level_value', 'Professional',
            'meta_start_label', 'Start',
            'meta_end_label', 'End',
            'meta_attendance_label', 'Attendance',
            'cta_apply_now_text', 'Apply Now',
            'cta_apply_future_text', 'Apply for Future Programs'
          ),
          TRUE,
          NOW()
        ),
        (
          'event_details',
          'Event Details',
          jsonb_build_object(
            'breadcrumb_title', 'Event Details',
            'breadcrumb_subtitle', 'Events',
            'error_not_found_text', 'Event not found.',
            'error_load_text', 'Unable to load this event right now.',
            'back_to_events_text', 'Back to Events',
            'all_events_text', 'All Events',
            'previous_image_label', 'Previous image',
            'next_image_label', 'Next image',
            'completed_event_label', 'Completed Event',
            'upcoming_event_label', 'Upcoming Event',
            'status_completed_label', 'Completed',
            'status_upcoming_label', 'Upcoming',
            'start_label', 'Start',
            'end_label', 'End',
            'location_label', 'Location',
            'location_fallback', 'The Digital Hub',
            'event_post_title', 'Event Post',
            'event_post_fallback_text', 'Details for this event will be published soon.'
          ),
          TRUE,
          NOW()
        ),
        (
          'not_found',
          'Not Found',
          jsonb_build_object(
            'title', 'ERROR PAGE!',
            'subtitle', 'Sorry! This Page is Not Available!',
            'button_text', 'Go To Home Page'
          ),
          TRUE,
          NOW()
        ),
        (
          'navbar',
          'Navbar',
          jsonb_build_object(
            'logo_url', '/assets/img/logo/digitalhub.png',
            'primary_cta_label', 'Apply Now',
            'primary_cta_link', '/apply',
            'secondary_cta_label', 'Hire Talent',
            'secondary_cta_link', '/hire-talent',
            'links', jsonb_build_array(
              jsonb_build_object('label', 'Home', 'url', '/'),
              jsonb_build_object('label', 'Programs', 'url', '/programs'),
              jsonb_build_object(
                'label', 'About',
                'url', '/about-us',
                'children', jsonb_build_array(
                  jsonb_build_object('label', 'Mission', 'url', '/about-us'),
                  jsonb_build_object('label', 'Team', 'url', '/team'),
                  jsonb_build_object('label', 'Events', 'url', '/events')
                )
              ),
              jsonb_build_object('label', 'Participants', 'url', '/participants'),
              jsonb_build_object('label', 'Contact', 'url', '/contact')
            )
          ),
          TRUE,
          NOW()
        ),
        (
          'footer',
          'Footer',
          jsonb_build_object(
            'brand_title', 'The Digital Hub',
            'brand_text', 'The Digital Hub is a modern learning platform focused on technology, programming, and digital skills.',
            'brand_address', 'Downtown, Beirut',
            'brand_phone', '+961 70639085',
            'brand_logo_url', '/assets/img/logo/logoD.png',
            'get_in_touch_title', 'Get In Touch',
            'get_in_touch_text', 'Stay connected with The Digital Hub and follow us for the latest updates, events, and learning opportunities.',
            'terms_label', 'Terms of Use',
            'privacy_label', 'Privacy Policy',
            'copyright_text', '2026',
            'useful_links_title', 'Useful Links',
            'company_links_title', 'Our Company',
            'useful_links', jsonb_build_array(
              jsonb_build_object('label', 'Home', 'url', '/#header-fixed-height'),
              jsonb_build_object('label', 'Contact', 'url', '/contact'),
              jsonb_build_object('label', 'About', 'url', '/about-us')
            ),
            'company_links', jsonb_build_array(
              jsonb_build_object('label', 'Events', 'url', '/events'),
              jsonb_build_object('label', 'Programs', 'url', '/programs')
            ),
            'social_links', jsonb_build_array(
              jsonb_build_object('name', 'facebook', 'url', '#'),
              jsonb_build_object('name', 'linkedin', 'url', '#'),
              jsonb_build_object('name', 'instagram', 'url', '#')
            )
          ),
          TRUE,
          NOW()
        )
      ON CONFLICT (key) DO NOTHING
    `);
}
// Handles 'listPages' workflow for this module.
export async function listPages(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, key, title, content, is_published, updated_by, updated_at
      FROM pages
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'updatePage' workflow for this module.
export async function updatePage(id, setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE pages
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = $${values.length + 2}
      RETURNING *
    `, [...values, adminId, id]);
}
// Handles 'countHomeSections' workflow for this module.
export async function countHomeSections(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM home_sections ${whereClause}`, params);
}
// Handles 'ensureDefaultHomeSections' workflow for this module.
export async function ensureDefaultHomeSections(db = pool) {
    return db.query(`
      WITH legacy_team_row AS (
        SELECT id
        FROM home_sections
        WHERE key IN ('instructors', 'featured_students')
        ORDER BY
          CASE key
            WHEN 'instructors' THEN 0
            ELSE 1
          END,
          sort_order ASC,
          id ASC
        LIMIT 1
      )
      UPDATE home_sections hs
      SET
        key = 'team',
        title = COALESCE(NULLIF(hs.title, ''), 'Team'),
        updated_at = NOW()
      FROM legacy_team_row
      WHERE hs.id = legacy_team_row.id
        AND NOT EXISTS (
          SELECT 1
          FROM home_sections
          WHERE key = 'team'
        );

      INSERT INTO home_sections (key, title, is_enabled, sort_order, content, updated_at)
      VALUES
        (
          'announcements',
          'Announcements',
          TRUE,
          2,
          jsonb_build_object(
            'subtitle', 'Latest Updates',
            'title', 'What Is Happening At The Digital Hub',
            'description', 'Track important updates across upcoming events, cohort announcements, and new opportunities published by the team.',
            'limit', 3,
            'cta_text', 'View All Updates',
            'cta_link', '/events'
          ),
          NOW()
        ),
        (
          'team',
          'Team',
          TRUE,
          4,
          jsonb_build_object(
            'subtitle', 'Meet The Digital Hub Team',
            'title', 'Our Core Team of Managers and Team',
            'description', 'Meet the people behind Digital Hub programs, mentorship, and delivery. Our team supports learners from training to career readiness.',
            'cta_text', 'Meet The Full Team',
            'cta_link', '/team',
            'limit', 6,
            'source_mode', 'profiles'
          ),
          NOW()
        ),
        (
          'about',
          'About',
          TRUE,
          2,
          jsonb_build_object(
            'subtitle', 'About The Digital Hub',
            'title', 'Empowering Youth with Practical Digital Skills',
            'description', 'The Digital Hub helps youth build practical digital skills through guided training, mentorship, and real projects that connect learning to work.',
            'bullet_points', jsonb_build_array(
              'Job-ready web and digital training',
              'Hands-on projects with mentor support',
              'Career preparation for real opportunities'
            ),
            'cta_text', 'Learn More About Us',
            'cta_link', '/about-us'
          ),
          NOW()
        ),
        (
          'features',
          'Features',
          TRUE,
          6,
          jsonb_build_object(
            'subtitle', 'How We Start Journey',
            'title', 'Start your Learning Journey Today!',
            'description', 'Groove''s intuitive shared inbox makes team members work together to organize and prioritize.',
            'items', jsonb_build_array(
              jsonb_build_object('title', 'Learn with Experts', 'description', 'Curate and share content to reach your goals.'),
              jsonb_build_object('title', 'Learn Anything', 'description', 'Choose practical tracks aligned with job market demand.'),
              jsonb_build_object('title', 'Get Online Certificate', 'description', 'Build your portfolio and validate your learning outcomes.'),
              jsonb_build_object('title', 'Career Skills', 'description', 'Practice teamwork, communication, and delivery discipline.')
            )
          ),
          NOW()
        ),
        (
          'apply_cta',
          'Apply CTA',
          TRUE,
          7,
          jsonb_build_object(
            'left', jsonb_build_object(
              'title', 'Become a Mentor',
              'description', 'To take a trivial example, which of us undertakes physical exercise yes is this happen here.',
              'button_text', 'Apply Now',
              'button_link', '/apply?program=Full%20Stack%20Development'
            ),
            'right', jsonb_build_object(
              'title', 'Become a Participant',
              'description', 'Join millions of people from around the world learning together. Online learning',
              'button_text', 'Apply Now',
              'button_link', '/apply?program=UI%2FUX%20Design'
            )
          ),
          NOW()
        )
      ON CONFLICT (key) DO NOTHING
    `);
}
// Handles 'listHomeSections' workflow for this module.
export async function listHomeSections(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, key, title, is_enabled, sort_order, content, updated_by, updated_at
      FROM home_sections
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'updateHomeSection' workflow for this module.
export async function updateHomeSection(id, setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE home_sections
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = $${values.length + 2}
      RETURNING *
    `, [...values, adminId, id]);
}
// Handles 'countMediaAssets' workflow for this module.
export async function countMediaAssets(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM media_assets ${whereClause}`, params);
}
// Handles 'listMediaAssets' workflow for this module.
export async function listMediaAssets(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT
        id,
        file_name,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        public_url,
        alt_text,
        tags,
        created_by,
        created_at,
        updated_at
      FROM media_assets
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'createMediaAsset' workflow for this module.
export async function createMediaAsset(input, db = pool) {
    return db.query(`
      INSERT INTO media_assets (
        file_name,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        public_url,
        alt_text,
        tags,
        created_by,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW())
      RETURNING
        id,
        file_name,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        public_url,
        alt_text,
        tags,
        created_by,
        created_at,
        updated_at
    `, [
        input.file_name,
        input.original_name,
        input.mime_type,
        input.size_bytes,
        input.storage_path,
        input.public_url,
        input.alt_text ?? null,
        JSON.stringify(Array.isArray(input.tags) ? input.tags : []),
        input.created_by ?? null,
    ]);
}
// Handles 'countThemeTokens' workflow for this module.
export async function countThemeTokens(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM theme_tokens ${whereClause}`, params);
}
// Handles 'listThemeTokens' workflow for this module.
export async function listThemeTokens(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, key, purpose, value, scope, updated_by, updated_at
      FROM theme_tokens
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'createThemeToken' workflow for this module.
export async function createThemeToken(key, purpose, value, scope, adminId, db = pool) {
    return db.query(`
      INSERT INTO theme_tokens (key, purpose, value, scope, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [key, purpose, value, scope, adminId]);
}
// Handles 'updateThemeToken' workflow for this module.
export async function updateThemeToken(id, setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE theme_tokens
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = $${values.length + 2}
      RETURNING *
    `, [...values, adminId, id]);
}


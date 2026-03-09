// File: frontend/src/components/homes/home-one/FeaturedParticipants.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
import PeopleDirectory from "@/components/inner-pages/people/PeopleDirectory";

type FeaturedParticipantsProps = {
  content?: Record<string, unknown> | null;
};

const FeaturedParticipants = ({ content }: FeaturedParticipantsProps) => {
  return <PeopleDirectory mode="participants" variant="featured-home" content={content} />;
};

export default FeaturedParticipants;

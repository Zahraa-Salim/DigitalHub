// File: frontend/src/components/homes/home-one/FeaturedParticipants.tsx
// Purpose: Renders the featured participants UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

import PeopleDirectory from "@/components/inner-pages/people/PeopleDirectory";

type FeaturedParticipantsProps = {
  content?: Record<string, unknown> | null;
};

const FeaturedParticipants = ({ content }: FeaturedParticipantsProps) => {
  return <PeopleDirectory mode="participants" variant="featured-home" content={content} />;
};

export default FeaturedParticipants;


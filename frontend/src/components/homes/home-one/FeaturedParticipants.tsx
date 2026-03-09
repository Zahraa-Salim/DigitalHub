import PeopleDirectory from "@/components/inner-pages/people/PeopleDirectory";

type FeaturedParticipantsProps = {
  content?: Record<string, unknown> | null;
};

const FeaturedParticipants = ({ content }: FeaturedParticipantsProps) => {
  return <PeopleDirectory mode="participants" variant="featured-home" content={content} />;
};

export default FeaturedParticipants;

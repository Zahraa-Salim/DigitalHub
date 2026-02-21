// File: src/data/home/homeContentData.ts
// Purpose: Static/mock dataset consumed by UI components and/or state layers.
// If you change this file: Changing field names, shapes, or values can break filters, mapping logic, or any consumer expecting the current schema.
import { StaticImageData } from "@/components/common/Image";

import icon_1 from "@/assets/img/icons/features_icon01.svg";
import icon_2 from "@/assets/img/icons/features_icon02.svg";
import icon_3 from "@/assets/img/icons/features_icon03.svg";
import icon_4 from "@/assets/img/icons/features_icon04.svg";
import homefFeature_1 from "@/assets/img/icons/h4_features_icon01.svg";
import homefFeature_2 from "@/assets/img/icons/h4_features_icon02.svg";
import homefFeature_3 from "@/assets/img/icons/h4_features_icon03.svg";

import blog_1 from "@/assets/img/blog/blog_post01.jpg";
import blog_2 from "@/assets/img/blog/blog_post02.jpg";
import blog_3 from "@/assets/img/blog/blog_post03.jpg";
import blog_4 from "@/assets/img/blog/blog_post04.jpg";
import blog_5 from "@/assets/img/blog/h4_blog_post01.jpg";
import blog_6 from "@/assets/img/blog/h4_blog_post02.jpg";
import blog_7 from "@/assets/img/blog/h4_blog_post03.jpg";
import blog_8 from "@/assets/img/blog/h5_blog_post01.jpg";
import blog_9 from "@/assets/img/blog/h5_blog_post02.jpg";
import blog_10 from "@/assets/img/blog/h5_blog_post03.jpg";
import blog_11 from "@/assets/img/blog/h6_blog_post01.jpg";
import blog_12 from "@/assets/img/blog/h6_blog_post02.jpg";
import blog_13 from "@/assets/img/blog/h6_blog_post03.jpg";
import blog_14 from "@/assets/img/blog/h8_blog_post01.jpg";
import blog_15 from "@/assets/img/blog/h8_blog_post02.jpg";
import blog_16 from "@/assets/img/blog/h8_blog_post03.jpg";

import testi_avatar1 from "@/assets/img/instructor/h2_instructor01.png";
import testi_avatar2 from "@/assets/img/instructor/h2_instructor02.png";
import testi_avatar3 from "@/assets/img/instructor/h2_instructor03.png";
import testi_avatar4 from "@/assets/img/instructor/h2_instructor04.png";
import testi_avatar5 from "@/assets/img/instructor/h2_instructor05.png";
import testi_avatar6 from "@/assets/img/others/testi_author01.png";
import testi_avatar7 from "@/assets/img/others/testi_author02.png";
import testi_avatar8 from "@/assets/img/others/testi_author03.png";

type FeatureItem = {
  id: number;
  page: string;
  icon?: StaticImageData;
  icon_2?: string;
  icon_3?: string;
  title: string;
  desc: string;
};

const feature_data: FeatureItem[] = [
  {
    id: 1,
    page: "home_1",
    icon: icon_1,
    title: "Learn with Experts",
    desc: "Curate anding area share Pluralsight content to reach your",
  },
  {
    id: 2,
    page: "home_1",
    icon: icon_2,
    title: "Learn Anything",
    desc: "Curate anding area share Pluralsight content to reach your",
  },
  {
    id: 3,
    page: "home_1",
    icon: icon_3,
    title: "Get Online Certificate",
    desc: "Curate anding area share Pluralsight content to reach your",
  },
  {
    id: 4,
    page: "home_1",
    icon: icon_4,
    title: "E-mail Marketing",
    desc: "Curate anding area share Pluralsight content to reach your",
  },
  {
    id: 1,
    page: "home_2",
    icon_2: "/assets/img/icons/h2_features_icon01.svg",
    title: "Expert Tutors",
    desc: "when an unknown printer took a galley offe type and scrambled makes.",
  },
  {
    id: 2,
    page: "home_2",
    icon_2: "/assets/img/icons/h2_features_icon02.svg",
    title: "Effective Courses",
    desc: "when an unknown printer took a galley offe type and scrambled makes.",
  },
  {
    id: 3,
    page: "home_2",
    icon_2: "/assets/img/icons/h2_features_icon03.svg",
    title: "Earn Certificate",
    desc: "when an unknown printer took a galley offe type and scrambled makes.",
  },
  {
    id: 1,
    page: "home_3",
    icon_2: "assets/img/icons/h3_features_icon01.svg",
    title: "Scholarship Facility",
    desc: "Eestuidar University we prepare you to launch your.",
  },
  {
    id: 2,
    page: "home_3",
    icon_2: "assets/img/icons/h3_features_icon02.svg",
    title: "Learn From Experts",
    desc: "Eestuidar University we prepare you to launch your.",
  },
  {
    id: 3,
    page: "home_3",
    icon_2: "assets/img/icons/h3_features_icon03.svg",
    title: "Graduation Courses",
    desc: "Eestuidar University we prepare you to launch your.",
  },
  {
    id: 4,
    page: "home_3",
    icon_2: "assets/img/icons/h3_features_icon04.svg",
    title: "Certificate Program",
    desc: "Eestuidar University we prepare you to launch your.",
  },
  {
    id: 1,
    page: "home_4",
    icon: homefFeature_1,
    title: "Support & Motivation",
    desc: "We are able to offer every yoga training experienced & best yoga trainer.",
  },
  {
    id: 2,
    page: "home_4",
    icon: homefFeature_2,
    title: "Strong Body Life",
    desc: "We are able to offer every yoga training experienced & best yoga trainer.",
  },
  {
    id: 3,
    page: "home_4",
    icon: homefFeature_3,
    title: "Increased Flexibility",
    desc: "We are able to offer every yoga training experienced & best yoga trainer.",
  },
  {
    id: 1,
    page: "home_5",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-video-tutorial",
    title: "Easy Class",
    desc: "Dear Psum Dolor Amettey Adipis Aecing Eiusmod Incididutt Reore",
  },
  {
    id: 2,
    page: "home_5",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-verified",
    title: "Safety & Security",
    desc: "Dear Psum Dolor Amettey Adipis Aecing Eiusmod Incididutt Reore",
  },
  {
    id: 3,
    page: "home_5",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-instructor",
    title: "Skilled Teacher",
    desc: "Dear Psum Dolor Amettey Adipis Aecing Eiusmod Incididutt Reore",
  },
  {
    id: 4,
    page: "home_5",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-book-1",
    title: "Clean Curriculum",
    desc: "Dear Psum Dolor Amettey Adipis Aecing Eiusmod Incididutt Reore",
  },
  {
    id: 1,
    page: "home_8",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-book-1",
    title: "Learn skills with 120k+",
    desc: "video courses.",
  },
  {
    id: 2,
    page: "home_8",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-instructor",
    title: "Choose courses",
    desc: "real-world experts.",
  },
  {
    id: 3,
    page: "home_8",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-tutorial",
    title: "processional Tutors",
    desc: "video courses.",
  },
  {
    id: 4,
    page: "home_8",
    icon_3: "/assets/img/others/h5_features_item_shape02.svg",
    icon_2: "skillgro-graduated",
    title: "Online Degrees",
    desc: "Study flexibly online",
  },
];

type BlogItem = {
  id: number;
  page: string;
  thumb: StaticImageData;
  tag: string;
  date: string;
  title: string;
};

export const blog_data: BlogItem[] = [
  {
    id: 1,
    page: "home_1",
    thumb: blog_1,
    tag: "Marketing",
    date: "20 July, 2024",
    title: "How To Become idiculously Self-Aware In 20 Minutes",
  },
  {
    id: 2,
    page: "home_1",
    thumb: blog_2,
    tag: "Students",
    date: "20 July, 2024",
    title: "Get Started With UI Design With Tips To Speed",
  },
  {
    id: 3,
    page: "home_1",
    thumb: blog_3,
    tag: "Science",
    date: "20 July, 2024",
    title: "Make Your Own Expanding Contracting Content",
  },
  {
    id: 4,
    page: "home_1",
    thumb: blog_4,
    tag: "Agency",
    date: "20 July, 2024",
    title: "What we are capable to usually discovered",
  },
  {
    id: 1,
    page: "home_4",
    thumb: blog_5,
    tag: "Practice",
    date: "20 July, 2024",
    title: "Finding Zen: The Benefits of Yoga And Meditation For Mental Health",
  },
  {
    id: 2,
    page: "home_4",
    thumb: blog_6,
    tag: "Yoga",
    date: "20 July, 2024",
    title: "The Benefits of Yoga And Meditation For Mental Health",
  },
  {
    id: 3,
    page: "home_4",
    thumb: blog_7,
    tag: "Modern Instruments",
    date: "20 July, 2024",
    title: "The Benefits of Yoga And Meditation For Mental Health",
  },
  {
    id: 1,
    page: "home_5",
    thumb: blog_8,
    tag: "Marketing",
    date: "20 July, 2024",
    title: "Learn from Anywhere with Our eLearning Platform",
  },
  {
    id: 2,
    page: "home_5",
    thumb: blog_9,
    tag: "Agency",
    date: "20 July, 2024",
    title: "platform has given me the bility to learn on my own schedule",
  },
  {
    id: 3,
    page: "home_5",
    thumb: blog_10,
    tag: "Play Ground",
    date: "20 July, 2024",
    title: "learning platform where you can easily access course content",
  },
  {
    id: 1,
    page: "home_6",
    thumb: blog_11,
    tag: "Marketing",
    date: "20 July, 2024",
    title: "Learn from Anywhere with Our eLearning Platform",
  },
  {
    id: 2,
    page: "home_6",
    thumb: blog_12,
    tag: "Agency",
    date: "20 July, 2024",
    title: "platform has given me the bility to learn on my own schedule",
  },
  {
    id: 3,
    page: "home_6",
    thumb: blog_13,
    tag: "Play Ground",
    date: "20 July, 2024",
    title: "learning platform where you can easily access course content",
  },
  {
    id: 1,
    page: "home_8",
    thumb: blog_14,
    tag: "Cooking",
    date: "20 July, 2024",
    title: "Learn From Anywhere With Our ELearning Platform",
  },
  {
    id: 2,
    page: "home_8",
    thumb: blog_15,
    tag: "Food",
    date: "20 July, 2024",
    title: "Learn From Anywhere With Our ELearning Platform",
  },
  {
    id: 3,
    page: "home_8",
    thumb: blog_16,
    tag: "Recipes",
    date: "20 July, 2024",
    title: "Learn From Anywhere With Our ELearning Platform",
  },
];

type FaqItem = {
  id: number;
  page: string;
  question: string;
  answer: string;
  class_name?: string;
};

export const faq_data: FaqItem[] = [
  {
    id: 1,
    page: "home_1",
    question: "What’s Skillgrow Want to give you?",
    answer:
      "Groove’s intuitive shared inbox makes it easy for team members organize prioritize and.In this episode.urvived not only five centuries.Edhen an unknown printer took a galley of type and scrambl",
  },
  {
    id: 2,
    page: "home_1",
    question: "Why choose us for your education?",
    class_name: "collapsed",
    answer:
      "Groove’s intuitive shared inbox makes it easy for team members organize prioritize and.In this episode.urvived not only five centuries.Edhen an unknown printer took a galley of type and scrambl",
  },
  {
    id: 3,
    page: "home_1",
    question: "How We Provide Service For you?",
    class_name: "collapsed",
    answer:
      "Groove’s intuitive shared inbox makes it easy for team members organize prioritize and.In this episode.urvived not only five centuries.Edhen an unknown printer took a galley of type and scrambl",
  },
  {
    id: 4,
    page: "home_1",
    question: "Are you Affordable For Your Course",
    class_name: "collapsed",
    answer:
      "Groove’s intuitive shared inbox makes it easy for team members organize prioritize and.In this episode.urvived not only five centuries.Edhen an unknown printer took a galley of type and scrambl",
  },
];

type TestimonialItem = {
  id: number;
  page: string;
  avatar: StaticImageData;
  rating?: string;
  title: string;
  designation: string;
  desc: string;
};

export const testimonial_data: TestimonialItem[] = [
  {
    id: 1,
    page: "home_2",
    avatar: testi_avatar1,
    rating: "(4.8 Ratings)",
    title: "Olivia Mia",
    designation: "Web Design",
    desc: "SkillGro The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested.",
  },
  {
    id: 2,
    page: "home_2",
    avatar: testi_avatar2,
    rating: "(4.8 Ratings)",
    title: "William Hope",
    designation: "Digital Marketing",
    desc: "SkillGro The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested.",
  },
  {
    id: 3,
    page: "home_2",
    avatar: testi_avatar3,
    rating: "(4.8 Ratings)",
    title: "Olivia Mia",
    designation: "Web Design",
    desc: "SkillGro The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested.",
  },
  {
    id: 4,
    page: "home_2",
    avatar: testi_avatar4,
    rating: "(4.8 Ratings)",
    title: "Mark Jukarberg",
    designation: "UX Design Lead",
    desc: "SkillGro The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested.",
  },
  {
    id: 5,
    page: "home_2",
    avatar: testi_avatar5,
    rating: "(4.8 Ratings)",
    title: "David Millar",
    designation: "UX/UI Design",
    desc: "SkillGro The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested.",
  },
  {
    id: 6,
    page: "home_2",
    avatar: testi_avatar3,
    rating: "(4.8 Ratings)",
    title: "Olivia Mia",
    designation: "Web Design",
    desc: "SkillGro The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested.",
  },
  {
    id: 7,
    page: "home_2",
    avatar: testi_avatar4,
    rating: "(4.8 Ratings)",
    title: "Mark Jukarberg",
    designation: "UX Design Lead",
    desc: "SkillGro The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested.",
  },
  {
    id: 1,
    page: "home_3",
    avatar: testi_avatar6,
    rating: "(4.8 Ratings)",
    title: "Wade Warren",
    designation: "Designer",
    desc: "“ when an unknown printer took alley ffferer area typey and scrambled to make a type specimen book hass”",
  },
  {
    id: 2,
    page: "home_3",
    avatar: testi_avatar7,
    title: "Jenny Wilson",
    designation: "Designer",
    desc: "“ when an unknown printer took alley ffferer area typey and scrambled to make a type specimen book hass”",
  },
  {
    id: 3,
    page: "home_3",
    avatar: testi_avatar8,
    title: "Kristin Watson",
    designation: "Designer",
    desc: "“ when an unknown printer took alley ffferer area typey and scrambled to make a type specimen book hass”",
  },
  {
    id: 4,
    page: "home_3",
    avatar: testi_avatar7,
    title: "Jenny Wilson",
    designation: "Designer",
    desc: "“ when an unknown printer took alley ffferer area typey and scrambled to make a type specimen book hass”",
  },
];

export default feature_data;

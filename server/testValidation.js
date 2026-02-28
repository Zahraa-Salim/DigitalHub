import { z } from 'zod';

// Test 1: Current schema
const avatarDataUrlPattern = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const avatarUrlSchema = z.string().trim().url().or(z.string().trim().regex(avatarDataUrlPattern, "Invalid avatar image data URL"));

const updateMeBodySchema = z.object({
    full_name: z.string().trim().min(1).max(120).or(z.literal("")).optional(),
    bio: z.string().trim().max(2000).or(z.literal("")).optional(),
    job_title: z.string().trim().max(120).or(z.literal("")).optional(),
    avatar_url: avatarUrlSchema.or(z.literal("")).optional(),
    linkedin_url: z.string().trim().url().or(z.literal("")).optional(),
    github_url: z.string().trim().url().or(z.literal("")).optional(),
    portfolio_url: z.string().trim().url().or(z.literal("")).optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
});

// Test payloads that users might send
const testPayloads = [
  {
    name: "Empty optional fields",
    data: {
      full_name: "John Doe",
      job_title: "",
      bio: "",
      avatar_url: "",
      linkedin_url: "",
      github_url: "",
      portfolio_url: "",
    }
  },
  {
    name: "With some values",
    data: {
      full_name: "Jane Admin",
      job_title: "Admin Manager",
      bio: "Managing the system",
      avatar_url: "",
      linkedin_url: "",
      github_url: "",
      portfolio_url: "",
    }
  },
  {
    name: "With valid URLs",
    data: {
      full_name: "Test User",
      job_title: "",
      bio: "",
      avatar_url: "",
      linkedin_url: "https://linkedin.com/in/test",
      github_url: "https://github.com/test",
      portfolio_url: "https://test.com",
    }
  },
];

console.log("Testing validation schema...\n");

testPayloads.forEach(({ name, data }) => {
  console.log(`Test: ${name}`);
  const result = updateMeBodySchema.safeParse(data);
  
  if (result.success) {
    console.log("✅ PASSED\n");
  } else {
    console.log("❌ FAILED");
    console.log("Errors:", JSON.stringify(result.error.flatten(), null, 2));
    console.log();
  }
});

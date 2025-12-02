import { z } from "zod";

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be less than 2000 characters"),
});

export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be less than 5000 characters"),
});

export const aiInputSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be less than 5000 characters"),
  action: z.string().optional(),
  context: z.string().max(10000).optional(),
});

export const emailInputSchema = z.object({
  subject: z.string().trim().max(200, "Subject too long"),
  body: z.string().trim().max(5000, "Email body too long"),
  action: z.string(),
});

export type CommentInput = z.infer<typeof commentSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type AIInput = z.infer<typeof aiInputSchema>;
export type EmailInput = z.infer<typeof emailInputSchema>;

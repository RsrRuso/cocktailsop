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

export type CommentInput = z.infer<typeof commentSchema>;
export type MessageInput = z.infer<typeof messageSchema>;

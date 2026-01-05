
export type UserT = { id: string; handle: string; name: string; role: string; avatar?: string; badges?: string[] };
export type Ingredient = { name: string; ml: number; abvPct?: number; costPerLiter?: number };
export type Recipe = { abv?: number; brix?: number; ph?: number; glass?: string; ice?: string; garnish?: string; ingredients: Ingredient[]; method?: string };
export type Media = { type: 'image' | 'video'; url: string; aspect?: number };
export type CommentT = { id: string; authorId: string; text: string; createdAt: string };
export type Post = { id: string; authorId: string; createdAt: string; caption: string; media: Media[]; likes: number; comments: CommentT[]; kind: 'spec' | 'reel' | 'update'; recipe?: Recipe; tags?: string[]; _liked?: boolean };
export type Story = { id: string; authorId: string; createdAt: string; media: Media };
export type AppState = { users: UserT[]; meId: string; posts: Post[]; stories: Story[]; following: Record<string, boolean>; messages: { id: string; withId: string; last: string }[] };

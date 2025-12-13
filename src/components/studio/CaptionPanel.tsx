import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Hash, AtSign } from 'lucide-react';

interface CaptionPanelProps {
  caption: string;
  hashtags: string[];
  mentions: string[];
  onCaptionChange: (caption: string) => void;
  onHashtagsChange: (hashtags: string[]) => void;
  onMentionsChange: (mentions: string[]) => void;
}

const SUGGESTED_HASHTAGS = [
  'bartender', 'mixology', 'cocktails', 'bartenderlife', 
  'craftcocktails', 'drinks', 'bar', 'specverse'
];

const MAX_CAPTION_LENGTH = 2200;

export function CaptionPanel({ 
  caption, 
  hashtags, 
  mentions,
  onCaptionChange, 
  onHashtagsChange,
  onMentionsChange 
}: CaptionPanelProps) {
  const [hashtagInput, setHashtagInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');

  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim();
    if (cleanTag && !hashtags.includes(cleanTag)) {
      onHashtagsChange([...hashtags, cleanTag]);
    }
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    onHashtagsChange(hashtags.filter(t => t !== tag));
  };

  const addMention = (mention: string) => {
    const cleanMention = mention.replace(/^@/, '').trim();
    if (cleanMention && !mentions.includes(cleanMention)) {
      onMentionsChange([...mentions, cleanMention]);
    }
    setMentionInput('');
  };

  const removeMention = (mention: string) => {
    onMentionsChange(mentions.filter(m => m !== mention));
  };

  return (
    <div className="p-4 space-y-4 bg-card rounded-xl border border-border/40">
      <h3 className="font-medium">Caption</h3>

      {/* Caption textarea */}
      <div className="space-y-2">
        <Textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Write a caption..."
          className="min-h-[120px] resize-none"
          maxLength={MAX_CAPTION_LENGTH}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{caption.length} / {MAX_CAPTION_LENGTH}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Caption
          </Button>
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Hashtags</span>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeHashtag(tag)}
            >
              #{tag} ×
            </Badge>
          ))}
          <input
            type="text"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addHashtag(hashtagInput);
              }
            }}
            placeholder="Add hashtag..."
            className="bg-transparent text-sm outline-none w-24"
          />
        </div>

        {/* Suggested hashtags */}
        <div className="flex flex-wrap gap-1">
          {SUGGESTED_HASHTAGS.filter(t => !hashtags.includes(t)).slice(0, 5).map((tag) => (
            <Badge 
              key={tag}
              variant="outline"
              className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground"
              onClick={() => addHashtag(tag)}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Mentions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AtSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Mentions</span>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {mentions.map((mention) => (
            <Badge 
              key={mention} 
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeMention(mention)}
            >
              @{mention} ×
            </Badge>
          ))}
          <input
            type="text"
            value={mentionInput}
            onChange={(e) => setMentionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addMention(mentionInput);
              }
            }}
            placeholder="@username..."
            className="bg-transparent text-sm outline-none w-24"
          />
        </div>
      </div>
    </div>
  );
}

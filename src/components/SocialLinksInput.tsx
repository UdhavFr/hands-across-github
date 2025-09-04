import { useState } from 'react';
import { Globe, Github, Linkedin, Twitter, Instagram, Facebook, X } from 'lucide-react';

interface SocialLinksInputProps {
  socialLinks: Record<string, string>;
  onChange: (links: Record<string, string>) => void;
}

const socialPlatforms = [
  { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://yourwebsite.com' },
  { key: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/username' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
  { key: 'twitter', label: 'Twitter', icon: Twitter, placeholder: 'https://twitter.com/username' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/username' }
];

export function SocialLinksInput({ socialLinks, onChange }: SocialLinksInputProps) {
  const [showAll, setShowAll] = useState(false);

  const handleLinkChange = (platform: string, url: string) => {
    const newLinks = { ...socialLinks };
    if (url.trim()) {
      newLinks[platform] = url;
    } else {
      delete newLinks[platform];
    }
    onChange(newLinks);
  };

  const activePlatforms = socialPlatforms.filter(platform => 
    socialLinks[platform.key]?.trim()
  );

  const displayedPlatforms = showAll 
    ? socialPlatforms 
    : socialPlatforms.filter(platform => 
        socialLinks[platform.key]?.trim() || activePlatforms.length < 2
      ).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {displayedPlatforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <div key={platform.key}>
              <label className="block text-sm font-medium text-foreground mb-1">
                <Icon className="h-4 w-4 inline mr-2" />
                {platform.label}
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={socialLinks[platform.key] || ''}
                  onChange={(e) => handleLinkChange(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-8"
                />
                {socialLinks[platform.key] && (
                  <button
                    type="button"
                    onClick={() => handleLinkChange(platform.key, '')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!showAll && socialPlatforms.length > displayedPlatforms.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm text-primary hover:text-primary/80 font-medium"
        >
          + Add more social links ({socialPlatforms.length - displayedPlatforms.length} more available)
        </button>
      )}

      {showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Show fewer links
        </button>
      )}
    </div>
  );
}
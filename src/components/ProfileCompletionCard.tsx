import { Circle, User, Mail, Camera, FileText, MapPin, Briefcase } from 'lucide-react';
import type { AppUser } from '../types';

interface ProfileCompletionCardProps {
  user: AppUser;
  onEditProfile: () => void;
}

interface CompletionItem {
  field: keyof AppUser;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  points: number;
  isComplete: boolean;
}

export function ProfileCompletionCard({ user, onEditProfile }: ProfileCompletionCardProps) {
  const completionItems: CompletionItem[] = [
    {
      field: 'full_name',
      label: 'Full Name',
      icon: User,
      points: 20,
      isComplete: !!(user.full_name && user.full_name.trim())
    },
    {
      field: 'username', 
      label: 'Username',
      icon: User,
      points: 15,
      isComplete: !!(user.username && user.username.trim())
    },
    {
      field: 'email',
      label: 'Email',
      icon: Mail,
      points: 15,
      isComplete: !!(user.email && user.email.trim())
    },
    {
      field: 'avatar_url',
      label: 'Profile Photo',
      icon: Camera,
      points: 20,
      isComplete: !!(user.avatar_url && user.avatar_url.trim())
    },
    {
      field: 'bio',
      label: 'Bio',
      icon: FileText,
      points: 15,
      isComplete: !!(user.bio && user.bio.trim())
    },
    {
      field: 'skills',
      label: 'Skills',
      icon: Briefcase,
      points: 10,
      isComplete: !!(user.skills && user.skills.length > 0)
    },
    {
      field: 'location',
      label: 'Location',
      icon: MapPin,
      points: 5,
      isComplete: !!(user.location && user.location.trim())
    }
  ];

  const completedItems = completionItems.filter(item => item.isComplete);
  const totalScore = user.profile_completion_score || 0;
  const progressPercentage = Math.round((totalScore / 100) * 100);

  if (totalScore >= 100) {
    return null; // Don't show if profile is complete
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Complete Your Profile</h3>
        <span className="text-sm text-muted-foreground">
          {completedItems.length}/{completionItems.length} completed
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Profile Strength</span>
          <span className="text-sm font-medium text-foreground">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Incomplete Items */}
      <div className="space-y-3 mb-4">
        {completionItems
          .filter(item => !item.isComplete)
          .slice(0, 3) // Show only top 3 incomplete items
          .map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.field} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">+{item.points}pts</span>
              </div>
            );
          })}
      </div>

      {/* Complete Profile Button */}
      <button
        onClick={onEditProfile}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md text-sm font-medium transition-colors"
      >
        Complete Profile
      </button>
    </div>
  );
}
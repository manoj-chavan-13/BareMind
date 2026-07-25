/**
 * Preset avatar URLs for users to choose from.
 */
export const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Oliver&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Liliana&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Jack&backgroundColor=c0aede",
];

/**
 * Returns the user's custom avatar, or a default preset if none exists.
 */
export function getDefaultAvatar(identifier?: string): string {
  // Instead of random RoboHash, use the first preset as the default
  return PRESET_AVATARS[0];
}

export function getUserAvatar(avatarUrl?: string | null, identifier?: string): string {
  // If user uploaded a custom avatar in DB or selected a preset
  if (avatarUrl && avatarUrl.trim() !== "") {
    return avatarUrl;
  }
  return getDefaultAvatar(identifier);
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: "camera" | "lighting" | "composition" | "mood" | "effects";
  content: string;
  icon?: string;
}

export const promptTemplates: PromptTemplate[] = [
  // Camera Angles
  {
    id: "camera-overhead",
    name: "Overhead Shot",
    description: "Bird's eye view from directly above",
    category: "camera",
    content: "overhead shot, bird's eye view, top-down perspective",
    icon: "📷",
  },
  {
    id: "camera-low-angle",
    name: "Low Angle",
    description: "Shot from below looking up",
    category: "camera",
    content: "low angle shot, looking up, dramatic perspective",
    icon: "📷",
  },
  {
    id: "camera-dutch",
    name: "Dutch Angle",
    description: "Tilted camera angle",
    category: "camera",
    content: "dutch angle, tilted camera, dynamic composition",
    icon: "📷",
  },
  {
    id: "camera-close-up",
    name: "Close-up",
    description: "Tight shot focusing on subject",
    category: "camera",
    content: "close-up shot, detailed view, tight framing",
    icon: "📷",
  },
  {
    id: "camera-wide",
    name: "Wide Shot",
    description: "Expansive view showing environment",
    category: "camera",
    content: "wide shot, establishing shot, expansive view",
    icon: "📷",
  },

  // Lighting
  {
    id: "lighting-golden-hour",
    name: "Golden Hour",
    description: "Warm, soft lighting during sunset/sunrise",
    category: "lighting",
    content:
      "golden hour lighting, warm tones, soft shadows, magical atmosphere",
    icon: "☀️",
  },
  {
    id: "lighting-dramatic",
    name: "Dramatic Lighting",
    description: "High contrast with strong shadows",
    category: "lighting",
    content: "dramatic lighting, chiaroscuro, strong contrast, deep shadows",
    icon: "💡",
  },
  {
    id: "lighting-neon",
    name: "Neon Lighting",
    description: "Vibrant neon lights",
    category: "lighting",
    content:
      "neon lighting, cyberpunk atmosphere, vibrant colors, glowing signs",
    icon: "🌃",
  },
  {
    id: "lighting-soft",
    name: "Soft Lighting",
    description: "Gentle, diffused light",
    category: "lighting",
    content: "soft lighting, diffused light, gentle shadows, flattering",
    icon: "✨",
  },
  {
    id: "lighting-studio",
    name: "Studio Lighting",
    description: "Professional studio setup",
    category: "lighting",
    content: "studio lighting, professional setup, well-lit, clean background",
    icon: "💡",
  },

  // Composition
  {
    id: "composition-rule-thirds",
    name: "Rule of Thirds",
    description: "Balanced composition using grid",
    category: "composition",
    content:
      "rule of thirds composition, balanced layout, professional framing",
    icon: "📐",
  },
  {
    id: "composition-symmetry",
    name: "Symmetrical",
    description: "Perfect symmetry and balance",
    category: "composition",
    content: "symmetrical composition, perfect balance, centered subject",
    icon: "⚖️",
  },
  {
    id: "composition-leading-lines",
    name: "Leading Lines",
    description: "Lines that guide the eye",
    category: "composition",
    content: "leading lines, visual flow, guided composition",
    icon: "➡️",
  },
  {
    id: "composition-negative-space",
    name: "Negative Space",
    description: "Minimalist with empty space",
    category: "composition",
    content: "negative space, minimalist composition, breathing room",
    icon: "⬜",
  },

  // Mood
  {
    id: "mood-cinematic",
    name: "Cinematic",
    description: "Movie-like atmosphere",
    category: "mood",
    content: "cinematic mood, film-like quality, epic atmosphere",
    icon: "🎬",
  },
  {
    id: "mood-dreamy",
    name: "Dreamy",
    description: "Soft, ethereal feeling",
    category: "mood",
    content: "dreamy atmosphere, ethereal, soft focus, magical",
    icon: "💭",
  },
  {
    id: "mood-dark",
    name: "Dark & Moody",
    description: "Mysterious and atmospheric",
    category: "mood",
    content: "dark and moody, mysterious atmosphere, shadowy",
    icon: "🌑",
  },
  {
    id: "mood-vibrant",
    name: "Vibrant",
    description: "Energetic and colorful",
    category: "mood",
    content: "vibrant mood, energetic, bold colors, lively",
    icon: "🎨",
  },

  // Effects
  {
    id: "effect-bokeh",
    name: "Bokeh",
    description: "Blurred background with depth",
    category: "effects",
    content: "bokeh effect, shallow depth of field, blurred background",
    icon: "⭕",
  },
  {
    id: "effect-motion-blur",
    name: "Motion Blur",
    description: "Sense of movement and speed",
    category: "effects",
    content: "motion blur, dynamic movement, speed effect",
    icon: "💨",
  },
  {
    id: "effect-film-grain",
    name: "Film Grain",
    description: "Analog film texture",
    category: "effects",
    content: "film grain, analog texture, nostalgic feel",
    icon: "📼",
  },
  {
    id: "effect-lens-flare",
    name: "Lens Flare",
    description: "Sun or light flare effect",
    category: "effects",
    content: "lens flare, sun rays, light leak",
    icon: "☀️",
  },
];

export const getCategoryTemplates = (category: PromptTemplate["category"]) =>
  promptTemplates.filter((t) => t.category === category);

export const getTemplateById = (id: string) =>
  promptTemplates.find((t) => t.id === id);

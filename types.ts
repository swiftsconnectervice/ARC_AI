export enum AppStep {
  LANDING,
  AUTH,
  INPUT,
  GENERATING_BRIEFS,
  DECISION,
  ASSEMBLING_CAMPAIGN,
  GENERATING_CAMPAIGN,
  RESULT,
  AD_STUDIO,
}

// Represents the user-uploaded product image
export interface ProductImage {
  base64: string;
  mimeType: string;
}

// Represents the visual style analysis from an inspiration image
export interface StyleBrief {
  palette: string;
  lighting: string;
  composition: string;
  mood: string;
  subject_focus: string;
}

// Represents one of the three initial strategy options presented to the user
export interface StrategyBrief {
  title: string;
  description: string;
  keywords: string[];
}

// Represents a single image within the creative tree.
// Each image has a unique ID and a parent ID to track its lineage.
export interface CreativeImage {
  id: string; // Unique identifier for this image
  parentId: string | null; // ID of the parent image, null if it's an original
  prompt: string;
  url: string; // base64 data URL
  versionName: string; // User-facing version name like "V1", "V1.1"
  activeVariationId?: string; // Optional: Points to the ID of the variation to display on the main campaign view
}

// Represents the generated ad copy for a specific creative
export interface AdCopy {
  headline: string;
  body: string;
  cta: string;
}

// Represents a stored ad, linking copy to a channel and image
export interface StoredAd {
  channelName: string;
  creativeImageId: string;
  copy: AdCopy;
}


// Represents the final, detailed campaign kit generated after user selection
export interface CampaignKit {
  strategyTitle: string;
  targetAudience: {
    title: string;
    description: string;
  };
  keyMessaging: {
    title: string;
    points: string[];
  };
  marketingChannels: {
    title: string;
    channels: {
      name: string;
      description: string;
    }[];
  };
  visuals: {
    title: string;
    images: CreativeImage[]; // A flat list of all images in all creative trees
  };
  ads?: StoredAd[]; // Optional array to store generated ad copies
}
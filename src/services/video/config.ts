export const VIDEO_CONFIG = {
  MAX_CONCURRENT_JOBS: 2,
  MAX_IMAGES: 10,
  DEFAULT_DISPLAY_DURATION: 6,
  DEFAULT_TRANSITION_DURATION: 0.5,
  DEFAULT_KEN_BURNS: true,
  BACKGROUND_BLUR_SIGMA: 8,
  OPENING_HOOK_DURATION: 0.7,
  OPENING_INTRO_DURATION: 0.8,
  OPENING_PRODUCT_BLUR_SIGMA: 4,
  OPENING_PRODUCT_START_SCALE: 0.96,
  OUTPUT_WIDTH: 1080,
  OUTPUT_HEIGHT: 1920,
  OUTPUT_FPS: 30,
  OUTPUT_CODEC: 'libx264' as const,
  OUTPUTPixelFormat: 'yuv420p',
  OUTPUT_EXTENSION: '.mp4',
  THUMBNAIL_EXTENSION: '.jpg',
  THUMBNAIL_PRODUCT_MAX_WIDTH_RATIO: 0.4,
  THUMBNAIL_PRODUCT_MAX_HEIGHT_RATIO: 0.3,
  THUMBNAIL_PADDING_RATIO: 0.05,
  THUMBNAIL_QUALITY: 90,
  FALLBACK_BACKGROUND_BLUR_SIGMA: 30,
  BACKGROUND_DARKEN: -0.05,
  // Extra height scaled into the background so the crop window has room to
  // pan down over the video without exposing an edge.
  BACKGROUND_PAN_OVERSCAN_RATIO: 0.06,
} as const;

export const VIDEO_PATHS = {
  TEMP_BASE: '/tmp/video-gen',
  OUTPUT_BASE: '/var/www/html/uploads/videos',
  MUSIC_BASE: '/var/www/html/uploads/music',
  MUSIC_GLOBAL_BASE: '/var/www/html/uploads/music/global',
  BACKGROUND_BASE: '/var/www/html/uploads/backgrounds',
} as const;

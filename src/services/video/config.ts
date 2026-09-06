export const VIDEO_CONFIG = {
  MAX_CONCURRENT_JOBS: 2,
  MAX_IMAGES: 10,
  DEFAULT_DISPLAY_DURATION: 6,
  DEFAULT_TRANSITION_DURATION: 0.5,
  DEFAULT_KEN_BURNS: true,
  OUTPUT_WIDTH: 1080,
  OUTPUT_HEIGHT: 1920,
  OUTPUT_FPS: 30,
  OUTPUT_CODEC: 'libx264' as const,
  OUTPUTPixelFormat: 'yuv420p',
  OUTPUT_EXTENSION: '.mp4',
} as const;

export const VIDEO_PATHS = {
  TEMP_BASE: '/tmp/video-gen',
  OUTPUT_BASE: '/var/www/html/uploads/videos',
  MUSIC_BASE: '/var/www/html/uploads/music',
  MUSIC_GLOBAL_BASE: '/var/www/html/uploads/music/global',
} as const;

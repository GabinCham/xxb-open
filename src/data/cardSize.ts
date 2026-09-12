/** Display size of a full trading card (matches TradingCard / GLB 63×88 mm). */
export const CARD_PIXEL_W = 250;
export const CARD_PIXEL_H = 349;

/** OP_CARD.glb stock bounds, metres (63 mm × 88 mm). */
export const CARD_WORLD_W = 0.063;
export const CARD_WORLD_H = 0.088;

/** Larger hit-inspect canvas so rotation is not clipped. Card stays CARD_PIXEL_* on screen. */
export const HIT_CANVAS_W = 430;
export const HIT_CANVAS_H = 530;

const PIXELS_PER_METRE = CARD_PIXEL_W / CARD_WORLD_W;

export const HIT_FRUSTUM_W = HIT_CANVAS_W / PIXELS_PER_METRE;
export const HIT_FRUSTUM_H = HIT_CANVAS_H / PIXELS_PER_METRE;

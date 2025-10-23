// rewards.ts (optimized, same external API)

/** ========= Types ========= */
export type RewardType = "min" | "max";

export interface CurveConfig {
  totalLevels: number;
  rewardType: RewardType; // "min" anchors L1; "max" anchors LN
  perUserReward: number; // per-user reward according to rewardType
  baseScore?: number; // optional override
  exponent?: number; // optional override
}

/** ========= Core Score Curve ========= */
const DEFAULT_BASE_SCORE = 100;
const DEFAULT_EXPONENT = 3;

/** Level -> score (integer) */
export function scoreForLevelFn(
  level: number,
  baseScore: number,
  exponent: number
): number {
  if (level < 1) return Math.floor(baseScore);
  return Math.floor(baseScore * Math.pow(level, exponent));
}

/** Score -> level (integer) */
export function levelForScoreFn(
  score: number,
  baseScore: number,
  exponent: number
): number {
  if (score <= baseScore) return 1;
  return Math.floor(Math.pow(score / baseScore, 1 / exponent));
}

/** Using defaults */
export function scoreForLevel(level: number): number {
  return scoreForLevelFn(level, DEFAULT_BASE_SCORE, DEFAULT_EXPONENT);
}
export function levelForScore(score: number): number {
  return levelForScoreFn(score, DEFAULT_BASE_SCORE, DEFAULT_EXPONENT);
}

/** Utility: clamp integer */
function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/** ========= Internal helpers (optimized) ========= */

// Make a stable key for memoization (avoid JSON.stringify cost/ambiguity)
function cfgKey(cfg: CurveConfig): string {
  const b = cfg.baseScore ?? DEFAULT_BASE_SCORE;
  const e = cfg.exponent ?? DEFAULT_EXPONENT;
  // totalLevels and perUserReward are integers in practice; floor to be safe.
  const N = Math.floor(cfg.totalLevels);
  const R = Math.floor(cfg.perUserReward);
  return `${N}|${cfg.rewardType}|${R}|${b}|${e}`;
}

type RewardTable = {
  rewards: number[]; // 1..N rewards (index 0 = level 1)
  minReward: number; // rewards[0]
  maxReward: number; // rewards[N-1]
  totalLevels: number;
  baseScore: number;
  exponent: number;
};

// Tiny memo cache (no eviction needed unless you expect many configs)
const TABLE_CACHE = new Map<string, RewardTable>();

/**
 * Build (or fetch memoized) reward table:
 * - Precompute scale := perUserReward / score(anchorLevel)
 * - reward(level) = floor(scale * score(level)), min 1
 */
function getRewardTable(config: CurveConfig): RewardTable {
  const key = cfgKey(config);
  const cached = TABLE_CACHE.get(key);
  if (cached) return cached;

  const totalLevels = Math.floor(config.totalLevels);
  const baseScore = config.baseScore ?? DEFAULT_BASE_SCORE;
  const exponent = config.exponent ?? DEFAULT_EXPONENT;
  const perUserReward = Math.max(0, Math.floor(config.perUserReward));

  const anchorLevel = config.rewardType === "max" ? totalLevels : 1;
  const scoreAtAnchor = scoreForLevelFn(anchorLevel, baseScore, exponent) || 1; // guard

  // Precompute scale once
  const scale = perUserReward / scoreAtAnchor;

  const rewards = new Array<number>(totalLevels);
  for (let i = 1; i <= totalLevels; i++) {
    const s = scoreForLevelFn(i, baseScore, exponent);
    const r = Math.max(1, Math.floor(scale * s));
    rewards[i - 1] = r;
  }

  const table: RewardTable = {
    rewards,
    minReward: rewards[0],
    maxReward: rewards[totalLevels - 1],
    totalLevels,
    baseScore,
    exponent,
  };

  TABLE_CACHE.set(key, table);
  return table;
}

/** ========= Reward Curves (Anchors) =========
 * (Kept for API compatibility; implemented via precomputed table)
 */
export function rewardForLevelAnchoredAtTop(
  level: number,
  totalLevels: number,
  topReward: number,
  baseScore = DEFAULT_BASE_SCORE,
  exponent = DEFAULT_EXPONENT
): number {
  const rewards = getRewardTable({
    totalLevels,
    rewardType: "max",
    perUserReward: topReward,
    baseScore,
    exponent,
  }).rewards;
  const L = clampInt(level, 1, totalLevels);
  return rewards[L - 1];
}

export function rewardForLevelAnchoredAtBase(
  level: number,
  totalLevels: number,
  baseReward: number,
  baseScore = DEFAULT_BASE_SCORE,
  exponent = DEFAULT_EXPONENT
): number {
  const rewards = getRewardTable({
    totalLevels,
    rewardType: "min",
    perUserReward: baseReward,
    baseScore,
    exponent,
  }).rewards;
  const L = clampInt(level, 1, totalLevels);
  return rewards[L - 1];
}

/** Build full reward table from config (memoized) */
export function buildRewardTable(
  config: Pick<CurveConfig, "perUserReward" | "totalLevels" | "rewardType">
): { level: number; reward: number }[] {
  const table = getRewardTable(config);
  // map once; fast
  return table.rewards.map((reward, idx) => ({ level: idx + 1, reward }));
}

/** ========= Cap Logic ========= */

/** Binary search the largest reward <= remaining within [1..L] */
function findFloorRewardAtOrBelowLevel(
  rewards: number[],
  remaining: number,
  L: number
): number | null {
  // rewards are non-decreasing with level
  let lo = 0;
  let hi = L - 1; // search within [0..L-1]
  let ans: number | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = rewards[mid];
    if (r <= remaining) {
      ans = r; // candidate
      lo = mid + 1; // try to find a higher (closer) one
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * computeUserReward (optimized):
 * - Uses memoized table
 * - Binary search fallback within [1..L]
 * - If no reward <= remaining, return remaining (as specified)
 */
export function computeUserReward(params: {
  maxCap: number;
  currentDistribution: number;
  level: number;
  config: CurveConfig;
}): number {
  const { maxCap, currentDistribution, level, config } = params;

  const remaining = Math.max(
    0,
    Math.floor(maxCap) - Math.floor(currentDistribution)
  );
  if (remaining <= 0) return 0;

  const table = getRewardTable(config);
  const N = table.totalLevels;
  const L = clampInt(level, 1, N);

  const rewardAtL = table.rewards[L - 1];

  if (remaining >= rewardAtL) return rewardAtL;

  const fallback = findFloorRewardAtOrBelowLevel(table.rewards, remaining, L);
  if (fallback !== null) return fallback;

  // Even level 1 is too high → give the remaining
  return remaining;
}

/** Batch compute; reuses memoized table implicitly via computeUserReward */
export function computeRewardsForUsers(
  users: number[],
  maxCap: number,
  currentDistribution: number,
  config: CurveConfig
): number[] {
  let distributed = Math.floor(currentDistribution);
  const out = new Array<number>(users.length);
  for (let i = 0; i < users.length; i++) {
    const lvl = users[i];
    const payout = computeUserReward({
      maxCap,
      currentDistribution: distributed,
      level: lvl,
      config,
    });
    out[i] = payout;
    distributed += payout;
  }
  return out;
}

/** ========= Small Helpers / Tables for Debugging ========= */
export function levelTable(
  totalLevels: number,
  baseScore = DEFAULT_BASE_SCORE,
  exponent = DEFAULT_EXPONENT
): { level: number; score: number }[] {
  const out = new Array<{ level: number; score: number }>(totalLevels);
  for (let i = 1; i <= totalLevels; i++) {
    out[i - 1] = { level: i, score: scoreForLevelFn(i, baseScore, exponent) };
  }
  return out;
}

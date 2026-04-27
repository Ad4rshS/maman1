/**
 * Dream11 Exact Points System
 */
export const POINTS_SYSTEM = {
  BATTING: {
    RUN: 1,
    BOUNDARY_BONUS: 1,
    SIX_BONUS: 2,
    THIRTY_RUN_BONUS: 4,
    HALF_CENTURY_BONUS: 8,
    CENTURY_BONUS: 16,
    DISMISSAL_FOR_DUCK: -2, // Except Bowlers
  },
  BOWLING: {
    WICKET: 25,
    BONUS_LBW_BOWLED: 8,
    THREE_WICKET_BONUS: 4,
    FOUR_WICKET_BONUS: 8,
    FIVE_WICKET_BONUS: 16,
    MAIDEN_OVER: 12,
  },
  FIELDING: {
    CATCH: 8,
    THREE_CATCH_BONUS: 4,
    STUMPING: 12,
    RUN_OUT_DIRECT: 12,
    RUN_OUT_INDIRECT: 6,
  },
  'ECONOMY_RATE (min 2 overs)': {
    BELOW_5: 6,
    BETWEEN_5_6: 4,
    BETWEEN_6_7: 2,
    BETWEEN_10_11: -2,
    BETWEEN_11_12: -4,
    ABOVE_12: -6,
  },
  'STRIKE_RATE (min 10 balls)': {
    ABOVE_170: 6,
    BETWEEN_150_170: 4,
    BETWEEN_130_150: 2,
    BETWEEN_60_70: -2,
    BETWEEN_50_60: -4,
    BELOW_50: -6,
  }
};

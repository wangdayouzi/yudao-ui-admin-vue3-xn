/**
 * OA 考勤类型
 *
 * 与后端考勤字典的数值保持一致：1=上班打卡，2=下班打卡。
 */
export const OA_ATTENDANCE_TYPE = {
  CLOCK_IN: 1,
  CLOCK_OUT: 2
} as const

/**
 * OA 考勤状态
 *
 * 1=正常，2=迟到，3=早退。
 */
export const OA_ATTENDANCE_STATUS = {
  NORMAL: 1,
  LATE: 2,
  EARLY: 3
} as const

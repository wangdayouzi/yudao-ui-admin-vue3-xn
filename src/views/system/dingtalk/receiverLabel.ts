/** 不依赖列表接口是否提供账号字段，避免出现 undefined/null。 */
export const formatReceiverLabel = (user: {
  id: number
  nickname?: string | null
  username?: string | null
}) => {
  const nickname = user.nickname?.trim() || ''
  const username = user.username?.trim() || ''
  const name = nickname || username || `员工 ${user.id}`
  return username && username !== name ? `${name}（${username}）` : name
}

/** 中文输入法选词回车不提交，按住回车也只提交一次。 */
export function confirmKnowledgeName(inputEvent: KeyboardEvent | Event, confirm: () => unknown) {
  const event = inputEvent as KeyboardEvent
  if (
    event.isComposing ||
    event.keyCode === 229 ||
    event.repeat ||
    event.shiftKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return
  event.preventDefault()
  confirm()
}

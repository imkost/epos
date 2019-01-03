function createEventHandler (handler) {
  handler[_isEventHandler_] = true
  return handler
}

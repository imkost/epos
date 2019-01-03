function removeNode (node) {
  if (node._autorun) {
    node._autorun.stop()
  }
  node.remove()
}

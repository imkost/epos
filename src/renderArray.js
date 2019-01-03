function renderArray (template) {
  const startNode = document.createTextNode('')
  const endNode = document.createTextNode('')
  startNode[_isStartNode_] = true
  endNode[_isEndNode_] = true
  startNode[_nodeId_] = globalNodeId
  endNode[_nodeId_] = globalNodeId
  globalNodeId += 1

  return [
    startNode,
    ...toFlatArray(template.map(render)),
    endNode
  ]
}

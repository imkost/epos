/* eslint-disable no-unused-vars */

let curGet = null
let curAutorun = null
let curTransaction = null
let globalNodeId = 0
const renderPlugins = []
const computedSources = new Map()
const _change_ = Symbol('change')
const _splice_ = Symbol('splice')
const _itemAdd_ = Symbol('itemAdd')
const _itemRemove_ = Symbol('itemRemove')
const _isEventHandler_ = Symbol('isEventHandler')
const _isStartNode_ = Symbol('isStartNode')
const _isEndNode_ = Symbol('isEndNode')
const _nodeId_ = Symbol('nodeId')
const _isStream_ = Symbol('isStream')

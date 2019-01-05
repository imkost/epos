let computationsCount = 0

function createAutorun (fn) {
  computationsCount += 1
  let deps = []
  const computation = {
    stop,
    children: []
  }

  if (curComputation) {
    curComputation.children.push(computation)
  }

  run()

  return computation

  function run () {
    stop(false)
    const parentGet = curGet
    const parentComputation = curComputation
    curGet = get
    curComputation = computation
    fn()
    curGet = parentGet
    curComputation = parentComputation
  }

  function get (change) {
    change.add(run)
    deps.push(change)
  }

  function stop (isDestroy = true) {
    if (isDestroy) {
      computationsCount -= 1
    }
    for (const child of computation.children) {
      child.stop()
    }
    computation.children = []

    for (const change of deps) {
      change.delete(run)
    }
    deps = []
  }
}

function createStandaloneAutorun (fn) {
  const parentComputation = curComputation
  curComputation = null
  createAutorun(fn)
  curComputation = parentComputation
}

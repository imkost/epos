var state = Epos.object({ seconds: 0 })

function tick () {
  state.seconds += 1
}

function renderTimer () {
  setInterval(tick, 1000)

  return {
    inner: () => `Seconds: ${state.seconds}`
  }
}

document.addEventListener('DOMContentLoaded', () => {
  var $app = Epos.element(renderTimer())
  document.body.appendChild($app)
})

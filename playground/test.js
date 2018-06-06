
var store = Epos.object({
  big: true,
  title: '[big inner call]'
})

var view = {
  class: 'app',
  inner: () => store.big
    ? {
      class: 'big',
      inner: {
        class: 'title',
        inner: () => {
          console.log('title update')
          return store.title
        }
      }
    }
    : { class: 'small', inner: 'small' }
}

var $app = Epos.element(view)
document.body.appendChild($app)
window.store = store

/*

var store = Epos.object({
  rows: generateRows()
})

var view = {
  class: 'table',
  onClick: start,
  inner: store.rows.map(row => ({
    class: 'row',
    inner: () => row.title
  }))
}

var children
var ops = 0
var startTime

var $app = Epos.element(view)
document.body.appendChild($app)
children = document.querySelector('.table').children

function generateRows () {
  return Array.from(Array(50)).map(i => {
    return { title: '' + Math.round(Math.random() * 10000) }
  })
}

function start () {
  startTime = Date.now()
  frame()
}

function frame () {
  Array.from(new Array(3000)).forEach(() => {
    var i = Math.round(Math.random() * 49)
    store.rows[i].title = String(Math.round(Math.random() * 10000))
    // children[i].innerText = String(Math.round(Math.random() * 10000))
  })
  ops += 1

  if (Date.now() - startTime < 1000) {
    requestAnimationFrame(frame)
  } else {
    console.log(ops)
  }
}


*/

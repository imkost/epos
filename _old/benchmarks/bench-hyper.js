const store = {
  query: '',
  posts: window.posts.map(p => {
    return {
      title: p.title
    }
  })
}

const app = document.createElement('div')

function tick(render) {
  render`
    <div class="main">
      <button onclick="start()">
        start
      </button>
      <div>
        <input value="${store.query}" oninput="${e => {store.query = e.target.value;update();}}"/>
      </div>
      <div class="posts">
        ${store.posts.map(post => {
          return `
            <div class="post ${isHidden(post) ? 'hidden' : ''}">${post.title}</div>
          `
        })}
      </div>
    </div>
  `
}

function update () {
  tick(hyperHTML(app))
}

function isHidden (post) {
  const query = store.query.toLowerCase()
  const words = post.title.toLowerCase().split(' ')
  return !words.some(w => w.startsWith(query))
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.appendChild(app)
  update()
})

function start () {
  console.time('a')
  // store.query$ = 'b'
  // store.query$ = 'ab'
  store.query = 's'
  update()
  console.log(document.querySelectorAll('.post').length)

  requestAnimationFrame(() => {
    console.timeEnd('a')
  })
}

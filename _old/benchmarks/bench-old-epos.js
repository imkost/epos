const store = Epos.object({
  query: '',
  posts: window.posts.map(p => {
    return {
      title: p.title
    }
  })
})

const app = Epos.element({
  class: 'main',
  inner: [
    {
      tag: 'button',
      onclick () {
        start()
      },
      inner: 'start'
    },
    {
      inner: {
        tag: 'input',
        value () {
          return store.query
        },
        oninput (e) {
          store.query = e.target.value
        }
      }
    },
    {
      class: 'posts',
      inner: store.posts.map(post => {
        return {
          class () {
            return `post ${isHidden(post) ? 'hidden' : ''}`
          },
          inner () {
            return post.title
          }
        }
      })
    }
  ]
})

function isHidden (post) {
  const query = store.query.toLowerCase()
  const words = post.title.toLowerCase().split(' ')
  return !words.some(w => w.startsWith(query))
}

document.body.appendChild(app)


function start () {
  console.time('a')
  // store.query$ = 'b'
  // store.query$ = 'ab'
  store.query = 'ы'

  requestAnimationFrame(() => {
    console.timeEnd('a')
  })
}

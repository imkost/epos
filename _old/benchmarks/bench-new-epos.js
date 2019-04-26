const store = dynamic({
  query: '',
  posts: window.posts.map(p => {
    return {
      title: p.title
    }
  })
})

const app = render({
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
          return store.query$
        },
        oninput (e) {
          store.query$ = e.target.value
        }
      }
    },
    // {
    //   class: 'iks',
    //   inner () {
    //     console.log('run');
    //     return [].concat(store.posts$, store.posts$, store.posts$, store.posts$, store.posts$, store.posts$).filter(p => {
    //       return p.title$.includes('ik')
    //     }).length
    //   }
    // },
    // {
    //   class: 'posts',
    //   inner: store.posts.map$(post => {
    //     return {
    //       class () {
    //         return `post ${isHidden(post) ? 'hidden' : ''}`
    //       },
    //       inner () {
    //         return post.title$
    //       }
    //     }
    //   })
    // }
    {
      class: 'posts',
      inner: store.posts.map$(post => {
        function isPostHidden () {
          return isHidden(post)
        }

        return {
          class () {
            return `post ${Epos.dynamic(isPostHidden) ? 'hidden' : ''}`
          },
          inner: post.title
        }
        // return () => {
        //   if (Epos.dynamic(isPostHidden)) {
        //     return null
        //   }

        //   return {
        //     class: 'post',
        //     inner: [
        //       () => post.title$,
        //       { inner: '---' },
        //       { inner: '---' },
        //       { inner: '---' },
        //       { inner: '---' },
        //       { inner: '---' },
        //       { inner: '---' },
        //       { inner: '---' },
        //       { inner: '---' },
        //       { inner: '---' }
        //     ]
        //   }
        // }
      })
    }
  ]
})

function isHidden (post) {
  const query = store.query$.toLowerCase()
  const words = post.title$.toLowerCase().split(' ')
  return !words.some(w => w.startsWith(query))
}

document.body.appendChild(app)


function start () {
  console.time('a')
  // store.query$ = 'b'
  // store.query$ = 'ab'
  store.query$ = 's'

  requestAnimationFrame(() => {
    console.timeEnd('a')
  })
}

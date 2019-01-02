var store = Epos.object({
  router: urlToRouter(location.pathname + location.search),
  loading: false
})

var $app = Epos.element({
  class: 'app',
  inner: [
    {
      tag: 'style',
      inner:  `
        .menu a {
          margin-right: 20px;
        }
      `
    },
    {
      class: 'menu',
      inner: [
        { tag: 'a', href: '/', inner: 'main' },
        { tag: 'a', href: '/about', inner: 'about' },
        { tag: 'a', href: '/contacts', inner: 'contacts' }
      ]
    },
    {
      class: 'content',
      inner: () => {
        var section = store.router.section
        var loading = store.loading

        if (loading) {
          return 'Loading...'
        }

        return Epos.stop(() => {
          return (
            section === 'main' ? { tag: 'h4', inner: 'MAIN' } :
            section === 'about' ? { tag: 'i', inner: 'ABOUT' } :
            section === 'contacts' ? { tag: 'i', inner: 'Contacts' } :
            'NOT FOUND'
          )
        })
      }
    }
  ]
})

document.body.appendChild($app)

var $title = Epos.element({
  tag: 'title',
  inner: () => `EPOS: ${store.router.section}`
})

var $oldTitle = document.querySelector('title')
$oldTitle.insertAdjacentElement('beforebegin', $title)
$oldTitle.remove()

var request

document.body.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    e.preventDefault()
    var url = e.target.getAttribute('href')
    var router = urlToRouter(url)

    if (url === location.pathname + location.search) {
      return
    }

    request && clearTimeout(request)
    request = setTimeout(() => {
      store.loading = false
    }, 200)

    history.pushState(null, $title.innerText, url)

    store.router.section = router.section
    store.router.data = router.data
    store.loading = true

  }
})

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

window.addEventListener('popstate', () => {
  request && clearTimeout(request)
  var url = location.pathname + location.search
  var router = urlToRouter(url)
  store.router.section = router.section
  store.router.data = router.data
})

function urlToRouter (url) {
  var pathname = url.split('?')[0]
  var params = url.split('?')[1] || {}

  if (pathname === '/') {
    return { section: 'main', data: {} }
  }
  if (pathname === '/about') {
    return { section: 'about', data: {} }
  }
  if (pathname === '/contacts') {
    return { section: 'contacts', data: {} }
  }
  return { section: '404', data: {} }
}

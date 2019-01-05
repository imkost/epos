const { readFileSync, writeFileSync } = require('fs')

let code = readFileSync('src/core.js', 'utf-8')
code = `
  ;(() => {
    ${code}
  })()
`

writeFileSync('dist/epos.js', code)


// ;(function main () {
//   build('browser', 'dist/epos.browser.js')
//   build('node', 'dist/epos.node.js')
// })()

// function getFiles (env) {
//   return [
//     'src/core.js',
//     env === 'browser' ? 'src/index.browser.js' : null,
//     env === 'node' ? 'src/index.node.js' : null
//   ].filter(Boolean)
// }

// function build (env, output) {
//   const files = getFiles(env)
//   const js = concat(files)
//   writeFileSync(`dist/epos.${env}.js`, js)

//   if (env === 'browser') {
//     const jsMin = minify(js)
//     writeFileSync(`dist/epos.${env}.min.js`, jsMin)
//   }
// }

// function concat (paths) {
//   return paths.map(p => readFileSync(p, 'utf-8')).join('\n')
// }

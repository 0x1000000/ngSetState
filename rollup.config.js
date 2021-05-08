import typescript from 'rollup-plugin-typescript2'
import license from 'rollup-plugin-license'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs'
    }
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {})
  ],

plugins: [
    typescript({
      typescript: require('typescript')
    }),
    license({
      banner: "https://github.com/0x1000000/ngSetState License: MIT"
    })
  ]
}
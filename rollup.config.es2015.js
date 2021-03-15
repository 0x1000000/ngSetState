import typescript from 'rollup-plugin-typescript2'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.es2015,
      format: 'es'
    }
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {})
  ],

plugins: [
    typescript({
	  tsconfig: "tsconfig.2015.json",
      typescript: require('typescript')
    })
  ]
}
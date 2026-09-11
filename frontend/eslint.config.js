import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Los archivos de contexto exportan el proveedor (un componente) y, junto
    // a él, su hook de consumo: `useAuth`, `useCart` y `useToast`. Es la forma
    // habitual de publicar un contexto en React y evita tener que partir cada
    // contexto en tres archivos. Se autorizan esos nombres concretos (y las
    // constantes) para que el recambio en caliente de Vite siga avisando si
    // alguien exporta cualquier otra cosa desde un archivo de componente.
    files: ['src/context/*.jsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useAuth', 'useCart', 'useToast'],
        },
      ],
    },
  },
])

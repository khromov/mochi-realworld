import { Mochi, compress, noCache, sequence, silenceInternalRoutes } from 'mochi-framework';
import { auth, guards, handleError } from './handle';
import { routes } from './routes';
import { speculationRules } from './speculationRules';

const PORT = Number(process.env.PORT) || 3333;

await Mochi.serve({
  port: PORT,
  development: process.env.MODE === 'development',
  htmlShell: './src/shell.html',
  errorPage: './src/Error.svelte',
  trailingSlash: 'never',
  speculationRules,
  // Preloading would eagerly fetch 8 of the 13 faces (FONT_PRELOAD_MAX), where the reference's Google
  // Fonts link lazily fetches only the 4 the page renders — and the cap picks badly, dropping the body
  // face for italics. Off, the browser fetches on use, matching the reference.
  fonts: { preload: false },
  // `compress` goes innermost so it sees the body the rest of the chain produced; it is a no-op under
  // `development`, since the debug bar injects itself into the HTML after the response is built.
  handle: sequence(auth, guards, noCache, compress()),
  handleError,
  filters: {
    'consoleLogger:line': silenceInternalRoutes,
  },
  routes,
});

console.log('Server running at http://localhost:' + PORT);

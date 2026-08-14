import { Mochi, noCache, sequence, silenceInternalRoutes } from 'mochi-framework';
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
  // `noCache` is innermost so it sees the final response; every page varies by the session cookie, and
  // the speculation rules fetch pages ahead of a click.
  handle: sequence(auth, guards, noCache),
  handleError,
  filters: {
    'consoleLogger:line': silenceInternalRoutes,
  },
  routes,
});

console.log('Server running at http://localhost:' + PORT);

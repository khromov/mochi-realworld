import { Mochi, noCache, sequence, silenceInternalRoutes } from 'mochi-framework';
import { auth, guards, handleError } from './handle';
import { routes } from './routes';

const PORT = Number(process.env.PORT) || 3333;

await Mochi.serve({
  port: PORT,
  development: process.env.MODE === 'development',
  htmlShell: './src/shell.html',
  errorPage: './src/Error.svelte',
  trailingSlash: 'never',
  // `noCache` is innermost so it sees the final response; every page varies by the session cookie, and
  // the shell's speculation rules fetch pages ahead of a click.
  handle: sequence(auth, guards, noCache),
  handleError,
  filters: {
    'consoleLogger:line': silenceInternalRoutes,
  },
  routes,
});

console.log('Server running at http://localhost:' + PORT);

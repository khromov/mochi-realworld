import { Mochi, noCache, sequence, silenceInternalRoutes } from 'mochi-framework';
import { auth, guards, handleError } from './handle';
import { routes } from './routes';

const PORT = Number(process.env.PORT) || 3333;

await Mochi.serve({
  port: PORT,
  development: process.env.MODE === 'development',
  htmlShell: './src/shell.html',
  errorPage: './src/Error.svelte',
  // The reference app serves /article/:slug and /profile/@bob without a trailing slash.
  trailingSlash: 'never',
  // `noCache` is innermost so it sees the final response. Every page varies by the session cookie,
  // and the speculation rules in the shell mean pages get fetched ahead of a click, so responses must
  // revalidate rather than be served from a heuristic cache.
  handle: sequence(auth, guards, noCache),
  handleError,
  filters: {
    'consoleLogger:line': silenceInternalRoutes,
  },
  routes,
});

console.log('Server running at http://localhost:' + PORT);

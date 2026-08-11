import { Mochi, sequence, silenceInternalRoutes } from 'mochi-framework';
import { auth, guards } from './handle';
import { routes } from './routes';

const PORT = Number(process.env.PORT) || 3333;

await Mochi.serve({
  port: PORT,
  development: process.env.MODE === 'development',
  htmlShell: './src/shell.html',
  errorPage: './src/Error.svelte',
  // The reference app serves /article/:slug and /profile/@bob without a trailing slash.
  trailingSlash: 'never',
  handle: sequence(auth, guards),
  filters: {
    'consoleLogger:line': silenceInternalRoutes,
  },
  routes,
});

console.log('Server running at http://localhost:' + PORT);

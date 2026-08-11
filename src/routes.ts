import { Mochi, error, fail, getRequestContext, redirect, success } from 'mochi-framework';
import type { MochiRouteValue } from 'mochi-framework';
import * as api from './lib/api';
import { baseProps, currentUser } from './lib/baseProps';
import { page_size } from './lib/constants';
import { renderMarkdown } from './lib/markdown.server';
import { SESSION_COOKIE, encodeSession } from './lib/session';
import type { ApiErrors, Article, Comment, Profile, SessionUser } from './lib/types';

type ArticlesResponse = { articles: Article[]; articlesCount: number };
type UserResponse = { user?: SessionUser; errors?: ApiErrors };
type ArticleResponse = { article?: Article; errors?: ApiErrors };

function requireParam(params: Record<string, string>, name: string): string {
  const value = params[name];
  if (!value) {
    error(404, 'Not found');
  }
  return value;
}

/**
 * Bun's `:user` captures the whole segment including the literal `@`, and it also matches a bare
 * `/profile/bob` — which the reference app 404s. Assert the `@` and strip it.
 */
function profileUsername(params: Record<string, string>): string {
  const segment = requireParam(params, 'user');
  if (!segment.startsWith('@')) {
    error(404, 'Not found');
  }
  return segment.slice(1);
}

async function getProfile(username: string): Promise<Profile> {
  const { profile } = await api.get<{ profile: Profile }>(
    `profiles/${username}`,
    currentUser()?.token,
  );
  return profile;
}

/** Port of the reference's `profile/@[user]/get_articles.js`. */
async function getArticles(username: string, type: 'author' | 'favorited'): Promise<Article[]> {
  const { url } = getRequestContext();
  const p = Number(url.searchParams.get('page')) || 1;

  const q = new URLSearchParams();
  q.set('limit', String(page_size));
  q.set('offset', String((p - 1) * page_size));
  q.set(type, username);

  const { articles } = await api.get<ArticlesResponse>(`articles?${q}`, currentUser()?.token);
  return articles;
}

export const routes: Record<string, MochiRouteValue> = {
  '/': Mochi.page('./src/pages/Home.svelte', {
    serverProps: async () => {
      const { url } = getRequestContext();
      const tab = url.searchParams.get('tab') || 'all';
      const tag = url.searchParams.get('tag');
      const page = Number(url.searchParams.get('page') ?? '1');

      // `articles/feed` is auth-only, and the "Your Feed" pill is not rendered when signed out — but
      // the URL is reachable directly, and calling it anonymously returns an error body with no
      // `articles` key, which then blows up on destructuring.
      const token = currentUser()?.token;
      const endpoint = tab === 'feed' && token ? 'articles/feed' : 'articles';

      const q = new URLSearchParams();
      q.set('limit', String(page_size));
      q.set('offset', String((page - 1) * page_size));
      if (tag) {
        q.set('tag', tag);
      }

      const [{ articles, articlesCount }, { tags }] = await Promise.all([
        api.get<ArticlesResponse>(`${endpoint}?${q}`, token),
        api.get<{ tags: string[] }>('tags'),
      ]);

      return { ...baseProps(), articles, pages: Math.ceil(articlesCount / page_size), tags };
    },
  }),

  '/login': Mochi.page('./src/pages/Login.svelte', {
    serverProps: () => baseProps(),
    actions: {
      default: async ({ formData, cookies }) => {
        const body = await api.post<UserResponse>('users/login', {
          user: {
            email: formData.get('email'),
            password: formData.get('password'),
          },
        });

        if (body.errors || !body.user) {
          return fail(401, { errors: body.errors ?? { 'email or password': ['is invalid'] } });
        }

        cookies.set(SESSION_COOKIE, encodeSession(body.user), { path: '/' });

        return redirect(307, '/');
      },
    },
  }),

  '/register': Mochi.page('./src/pages/Register.svelte', {
    serverProps: () => baseProps(),
    actions: {
      default: async ({ formData, cookies }) => {
        const body = await api.post<UserResponse>('users', {
          user: {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
          },
        });

        if (body.errors || !body.user) {
          return fail(401, { errors: body.errors ?? { registration: ['failed'] } });
        }

        cookies.set(SESSION_COOKIE, encodeSession(body.user), { path: '/' });

        return redirect(307, '/');
      },
    },
  }),

  '/settings': Mochi.page('./src/pages/Settings.svelte', {
    serverProps: () => baseProps(),
    actions: {
      save: async ({ formData, cookies, locals }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        // A blank password means "leave it unchanged". The reference sends it anyway, which the API
        // rejects with a length error on every save — invisible upstream only because of the error
        // display bug fixed below, so omit the field when it is empty.
        const password = String(formData.get('password') ?? '');

        const body = await api.put<UserResponse>(
          'user',
          {
            user: {
              username: formData.get('username'),
              email: formData.get('email'),
              image: formData.get('image'),
              bio: formData.get('bio'),
              ...(password ? { password } : {}),
            },
          },
          user.token,
        );

        // The reference returns `fail(400, body.errors)` while its template reads `form.errors`, so
        // validation errors never render. Fixed here to match login/register.
        if (body.errors || !body.user) {
          return fail(400, { errors: body.errors ?? { settings: ['could not be saved'] } });
        }

        cookies.set(SESSION_COOKIE, encodeSession(body.user), { path: '/' });
        // Keep the POST re-render's baseProps() in sync with the freshly saved profile.
        locals.user = body.user;

        return success({});
      },

      // The reference relies on invalidation plus its load guard to bounce the user. Mochi re-renders
      // instead, and the page needs a user, so redirect explicitly.
      logout: ({ cookies }) => {
        cookies.delete(SESSION_COOKIE, { path: '/' });
        return redirect(303, '/login');
      },
    },
  }),

  '/editor': Mochi.page('./src/pages/EditorNew.svelte', {
    serverProps: () => baseProps(),
    actions: {
      default: async ({ formData }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        const result = await api.post<ArticleResponse>(
          'articles',
          {
            article: {
              title: formData.get('title'),
              description: formData.get('description'),
              body: formData.get('body'),
              tagList: formData.getAll('tag'),
            },
          },
          user.token,
        );

        if (result.errors || !result.article) {
          return fail(400, { errors: result.errors ?? { article: ['could not be created'] } });
        }

        return redirect(303, `/article/${result.article.slug}`);
      },
    },
  }),

  '/editor/:slug': Mochi.page('./src/pages/EditorEdit.svelte', {
    serverProps: async (_req, params) => {
      const slug = requireParam(params, 'slug');
      const { article } = await api.get<{ article: Article }>(
        `articles/${slug}`,
        currentUser()?.token,
      );

      return { ...baseProps(), article };
    },
    actions: {
      default: async ({ formData, params }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        const slug = requireParam(params, 'slug');
        const result = await api.put<ArticleResponse>(
          `articles/${slug}`,
          {
            article: {
              title: formData.get('title'),
              description: formData.get('description'),
              body: formData.get('body'),
              tagList: formData.getAll('tag'),
            },
          },
          user.token,
        );

        // The reference throws `error(400, ...)` here — a full error page — while the sibling /editor
        // route renders errors inline. Made consistent.
        if (result.errors || !result.article) {
          return fail(400, { errors: result.errors ?? { article: ['could not be updated'] } });
        }

        return redirect(303, `/article/${result.article.slug}`);
      },
    },
  }),

  '/article/:slug': Mochi.page('./src/pages/Article.svelte', {
    serverProps: async (_req, params) => {
      const slug = requireParam(params, 'slug');
      const token = currentUser()?.token;

      const [{ article }, { comments }] = await Promise.all([
        api.get<{ article: Article }>(`articles/${slug}`, token),
        api.get<{ comments: Comment[] }>(`articles/${slug}/comments`, token),
      ]);

      article.body = renderMarkdown(article.body);

      return { ...baseProps(), article, comments };
    },
    actions: {
      createComment: async ({ formData, params }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        const slug = requireParam(params, 'slug');
        const result = await api.post<{ comment: Comment }>(
          `articles/${slug}/comments`,
          { comment: { body: formData.get('comment') } },
          user.token,
        );

        // Returned so the island can prepend it, standing in for SvelteKit's invalidateAll().
        return success({ comment: result.comment });
      },

      deleteComment: async ({ url, params }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        const slug = requireParam(params, 'slug');
        const id = url.searchParams.get('id');
        await api.del(`articles/${slug}/comments/${id}`, user.token);

        return success({ id: Number(id) });
      },

      deleteArticle: async ({ params }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        const slug = requireParam(params, 'slug');
        await api.del(`articles/${slug}`, user.token);

        return redirect(303, '/');
      },

      toggleFavorite: async ({ formData, params, request }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        const slug = requireParam(params, 'slug');
        // The hidden checkbox carries the CURRENT state, so the desired state is its inverse.
        const favorited = formData.get('favorited') !== 'on';

        // Awaited, unlike the reference's fire-and-forget, which races the redirect.
        if (favorited) {
          await api.post(`articles/${slug}/favorite`, null, user.token);
        } else {
          await api.del(`articles/${slug}/favorite`, user.token);
        }

        // 303, not the reference's 307: 307 preserves the method, so a no-JS favorite click would
        // re-POST to the referring page, which has no matching action, and 405.
        return redirect(303, request.headers.get('referer') ?? `/article/${slug}`);
      },
    },
  }),

  '/profile': Mochi.api(({ locals }) => {
    const user = locals.user as SessionUser | null;

    return new Response(null, {
      status: 307,
      headers: { location: user ? `/profile/@${user.username}` : '/login' },
    });
  }),

  '/profile/:user/favorites': Mochi.page('./src/pages/ProfileFavorites.svelte', {
    serverProps: async (_req, params) => {
      const username = profileUsername(params);
      const [profile, articles] = await Promise.all([
        getProfile(username),
        getArticles(username, 'favorited'),
      ]);

      return { ...baseProps(), profile, articles };
    },
  }),

  '/profile/:user': Mochi.page('./src/pages/Profile.svelte', {
    serverProps: async (_req, params) => {
      const username = profileUsername(params);
      const [profile, articles] = await Promise.all([
        getProfile(username),
        getArticles(username, 'author'),
      ]);

      return { ...baseProps(), profile, articles };
    },
    actions: {
      toggleFollow: async ({ formData, params }) => {
        const user = currentUser();
        if (!user) {
          error(401, 'Unauthorized');
        }

        const username = profileUsername(params);
        // The hidden checkbox carries the CURRENT state, so the desired state is its inverse.
        const following = formData.get('following') !== 'on';

        const result = following
          ? await api.post<{ errors?: ApiErrors }>(
              `profiles/${username}/follow`,
              null,
              user.token,
            )
          : await api.del<{ errors?: ApiErrors }>(`profiles/${username}/follow`, user.token);

        if (result.errors) {
          return fail(422, { errors: result.errors });
        }

        return success({});
      },
    },
  }),
};

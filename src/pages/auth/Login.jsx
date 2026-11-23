import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePost from '../../hooks/usePost';
import useAuthStore from '../../store/useAuthStore';
import getErrorMessage from '../../lib/Geterrormessage';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Message left by the api.js interceptor when the session expired (401)
  const [submitError, setSubmitError] = useState(
    () => sessionStorage.getItem('authMessage') || ''
  );

  useEffect(() => {
    sessionStorage.removeItem('authMessage');
  }, []);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const login = usePost('/api/shipping/auth/login');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    try {
      // usePost already returns res.data, so this is { success, data: { token, user } }
      const response = await login.mutateAsync({ email, password });
      const token = response?.data?.token;
      const user = response?.data?.user;

      if (!token || !user) {
        throw new Error('The login response did not include an access token and user profile.');
      }

      // Saves the token to localStorage ('token') and the user to the store
      setUser(user, token);
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(getErrorMessage(
        error,
        'Unable to sign in. Please check your details and try again.'
      ));
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-8">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-lg font-bold">W</span>
          </div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Welcome back</h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium" htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium" htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-60"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default Login;
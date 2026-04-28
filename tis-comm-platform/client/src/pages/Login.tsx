import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-light px-4">
      <div className="bg-white rounded-lg shadow border border-gray-200 w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-dark">TIS D365 Communication Platform</h1>
          <p className="text-sm text-grey">Trelleborg Industrial Solutions — Sign in</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-prj"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-prj"
              required
            />
          </div>
          {error && <div className="text-danger text-sm">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-prj text-white hover:bg-prj/90 rounded px-4 py-2 font-medium disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 text-xs text-grey">
          <div className="font-semibold mb-1">Demo accounts:</div>
          <ul className="space-y-0.5">
            <li>damien@tis.com / Damien2024! (Program Manager)</li>
            <li>pm.varnamoo@tis.com / PMVrn2024! (Project Manager)</li>
            <li>admin@tis.com / Admin2024! (Admin)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

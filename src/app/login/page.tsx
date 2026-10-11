'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, ArrowRight, AlertCircle, Music } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication rejected. Please check your credentials.');
        setLoading(false);
        return;
      }

      router.push('/workspace');
      router.refresh();
    } catch {
      setError('Connection failure. Please retry.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: '#000000',
    }}>
      <div className="apple-glass" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem 2rem',
      }}>
        {/* Apple Music Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '4rem',
            height: '4rem',
            borderRadius: '1.25rem',
            background: 'var(--apple-gradient)',
            marginBottom: '1.25rem',
            boxShadow: '0 8px 24px var(--apple-pink-glow)',
          }}>
            <Music size={32} fill="#ffffff" color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
            Vault Music
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Sign in with your Apple-styled credentials
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(250, 36, 60, 0.12)',
            border: '1px solid rgba(250, 36, 60, 0.25)',
            color: '#ff6b81',
            fontSize: '0.8125rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Username or Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="identifier"
                type="text"
                className="apple-search-input"
                placeholder="Username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="apple-search-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-apple-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem 1rem', fontSize: '0.9375rem', justifyContent: 'center' }}
          >
            {loading ? (
              'Verifying...'
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-hairline)',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-tertiary)',
        }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            style={{
              color: 'var(--apple-pink)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

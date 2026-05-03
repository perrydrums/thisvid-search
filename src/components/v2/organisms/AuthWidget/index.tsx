import React, { useEffect, useRef, useState } from 'react';

import { useAuth } from '../../../../hooks/useAuth';

import styles from './AuthWidget.module.css';

export type AuthWidgetProps = {
  /** Mobile drawer pins auth block at bottom — uses slightly looser spacing. */
  placement?: 'sidebar' | 'drawer';
  /** Close parent sheet after sign-in completes on mobile (magic link return). */
  onAuthSuccessClose?: () => void;
};

type Phase =
  | 'browse'
  | 'email_login'
  | 'email_then_register_hint'
  /** Magic link sent; user finishes in their email client. */
  | 'magic_link_sent';

export const AuthWidget: React.FC<AuthWidgetProps> = ({ placement = 'sidebar', onAuthSuccessClose }) => {
  const { user, loading, sendLoginOtp, sendRegisterOtp, signOut } = useAuth();

  const [phase, setPhase] = useState<Phase>('browse');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const wrapClass = placement === 'drawer' ? styles.drawer : styles.wrapper;
  const didCloseDrawerAfterMagicRef = useRef(false);

  /** Close mobile nav once when the session appears after following the magic link in the same tab. */
  useEffect(() => {
    if (!user) {
      didCloseDrawerAfterMagicRef.current = false;
      return;
    }
    if (phase !== 'magic_link_sent' || didCloseDrawerAfterMagicRef.current) return;
    didCloseDrawerAfterMagicRef.current = true;
    onAuthSuccessClose?.();
  }, [user, phase, onAuthSuccessClose]);

  const resetFlow = () => {
    setPhase('browse');
    setErrorMsg(null);
    setHint(null);
  };

  if (loading) {
    return (
      <div className={wrapClass}>
        <p className={styles.success}>Loading session…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className={wrapClass}>
        <h3 className={styles.title}>ACCOUNT</h3>
        <div className={styles.signedRow}>
          <span className={styles.emailMuted}>{user.email}</span>
          <button type="button" className={styles.secondaryBtn} onClick={() => void signOut()}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  const onSendLoginOtp = async () => {
    setBusy(true);
    setErrorMsg(null);
    setHint(null);
    const { error } = await sendLoginOtp(email);
    setBusy(false);
    if (error) {
      setPhase('email_then_register_hint');
      const errLower = error.toLowerCase();
      const benignSignup =
        errLower.includes('signups not allowed') ||
        errLower.includes('signup not allowed') ||
        (errLower.includes('signup') && errLower.includes('not allowed'));
      setErrorMsg(benignSignup ? null : error);
      setHint(
        benignSignup
          ? 'No account yet for this email. Use Register below and we\'ll send a confirmation link.'
          : 'No account with this email, or sign-in is not available. Register to create one.',
      );
      return;
    }
    setPhase('magic_link_sent');
    setHint(
      "We've sent a sign-in link to your email. Open your mail app, find the message from us, and tap the link to log in. You can leave this page — the same tab will update when you're signed in.",
    );
  };

  const onSendRegisterOtp = async () => {
    setBusy(true);
    setErrorMsg(null);
    setHint(null);
    const { error } = await sendRegisterOtp(email);
    setBusy(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    setPhase('magic_link_sent');
    setHint(
      "We've sent a confirmation link to your email. Open your mail app, tap the link to verify your address, and finish creating your account.",
    );
  };

  return (
    <div className={[wrapClass, phase === 'browse' ? styles.browseSpacer : ''].filter(Boolean).join(' ')}>
      <h3 className={styles.title}>ACCOUNT</h3>

      {phase === 'browse' && (
        <button type="button" className={styles.primaryBtn} onClick={() => setPhase('email_login')}>
          LOGIN
        </button>
      )}

      {phase === 'email_login' && (
        <>
          <input
            className={styles.field}
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className={styles.rowBtns}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={busy || !email.trim()}
              onClick={() => void onSendLoginOtp()}
            >
              Send magic link
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={resetFlow} disabled={busy}>
              Cancel
            </button>
          </div>
        </>
      )}

      {phase === 'email_then_register_hint' && (
        <>
          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
          {hint && <p className={styles.success}>{hint}</p>}
          <p className={styles.success}>New here? Use Register to create an account.</p>
          <div className={styles.rowBtns}>
            <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void onSendRegisterOtp()}>
              REGISTER
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => setPhase('email_login')} disabled={busy}>
              Back
            </button>
          </div>
        </>
      )}

      {phase === 'magic_link_sent' && (
        <>
          {hint && <p className={styles.success}>{hint}</p>}
          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
          <div className={styles.rowBtns}>
            <button type="button" className={styles.secondaryBtn} onClick={resetFlow} disabled={busy}>
              Use another email
            </button>
          </div>
        </>
      )}
    </div>
  );
};

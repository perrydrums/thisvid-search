import React, { useState } from 'react';

import { useAuth } from '../../../../hooks/useAuth';

import styles from './AuthWidget.module.css';

export type AuthWidgetProps = {
  /** Mobile drawer pins auth block at bottom — uses slightly looser spacing. */
  placement?: 'sidebar' | 'drawer';
  /** Close parent sheet after OTP success on mobile */
  onAuthSuccessClose?: () => void;
};

type Phase =
  | 'browse'
  | 'email_login'
  | 'email_then_register_hint'
  | 'otp_verify'
  /** User chose register flow after hint. */
  | 'otp_after_register_otp_sent';

export const AuthWidget: React.FC<AuthWidgetProps> = ({ placement = 'sidebar', onAuthSuccessClose }) => {
  const { user, loading, sendLoginOtp, sendRegisterOtp, verifyOtp, signOut } = useAuth();

  const [phase, setPhase] = useState<Phase>('browse');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const wrapClass = placement === 'drawer' ? styles.drawer : styles.wrapper;

  const resetFlow = () => {
    setPhase('browse');
    setOtp('');
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
          ? 'No account yet for this email. Use Register below to get a sign-up code.'
          : 'No account with this email, or sign-in is not available. Register to create one.',
      );
      return;
    }
    setPhase('otp_verify');
    setHint('Check your email for a one-time code.');
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
    setPhase('otp_after_register_otp_sent');
    setHint('Registration code sent. Enter it below.');
  };

  const onVerify = async () => {
    setBusy(true);
    setErrorMsg(null);
    const { error } = await verifyOtp(email, otp);
    setBusy(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    resetFlow();
    onAuthSuccessClose?.();
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
              Send code
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

      {(phase === 'otp_verify' || phase === 'otp_after_register_otp_sent') && (
        <>
          {hint && <p className={styles.success}>{hint}</p>}
          <input
            className={styles.field}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="One-time code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
          <div className={styles.rowBtns}>
            <button type="button" className={styles.primaryBtn} disabled={busy || !otp.trim()} onClick={() => void onVerify()}>
              Verify
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={resetFlow} disabled={busy}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

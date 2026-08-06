import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSignIn, useSignUp, useSSO } from '@clerk/expo';
import { Button, Card, ScreenContainer, Text, useTheme, spacing, radius, palette } from '@noivos/ui';

WebBrowser.maybeCompleteAuthSession();

// PRD §12.1: Email, Apple, Google. Apple/Google both go through useSSO
// (browser-based) rather than the platform-native hooks — this app is
// currently only exercised via Expo's web export (no native build yet), and
// Clerk's own docs point web platforms at useSSO for both providers.
//
// Uses Clerk's Core 3 "future" resource API (signIn.password(), signUp.password()
// + signUp.verifications.sendEmailCode()/verifyEmailCode(), then .finalize() to
// activate the session) — the installed @clerk/expo v4 no longer exposes the
// classic isLoaded/setActive-style hooks.
export function SignInScreen() {
  const { colors } = useTheme();
  const { startSSOFlow } = useSSO();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [mode, setMode] = useState<'signIn' | 'signUp' | 'verify'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onEmailPress() {
    setError(null);
    setPending(true);
    try {
      if (mode === 'signIn') {
        const { error: signInError } = await signIn.password({ identifier: email, password });
        if (signInError) {
          setError(signInError.message ?? "Couldn't sign in with those details — check them and try again.");
        } else if (signIn.status === 'complete') {
          await signIn.finalize();
        } else {
          setError("Couldn't complete sign-in — this account may need an extra verification step.");
        }
      } else if (mode === 'signUp') {
        const { error: signUpError } = await signUp.password({ emailAddress: email, password });
        if (signUpError) {
          setError(signUpError.message ?? "Couldn't create that account — try again.");
        } else {
          await signUp.verifications.sendEmailCode();
          setMode('verify');
        }
      } else {
        const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
        if (verifyError) {
          setError(verifyError.message ?? "That code didn't work — try again.");
        } else if (signUp.status === 'complete') {
          await signUp.finalize();
        } else {
          setError("That code didn't work — try again.");
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? "Something went wrong — let's try that again.");
    } finally {
      setPending(false);
    }
  }

  async function onSSOPress(strategy: 'oauth_apple' | 'oauth_google') {
    setError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? 'Sign-in was cancelled or failed.');
    }
  }

  return (
    <ScreenContainer>
      <View style={{ marginTop: spacing.xxl }}>
        <Text variant="display">Noivos</Text>
        <Text variant="body" secondary>Better money. Together.</Text>
      </View>

      {mode === 'verify' ? (
        <Card>
          <Text variant="h3" style={{ marginBottom: spacing.sm }}>Check your email</Text>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.md }}>
            We sent a code to {email}.
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={colors.textSecondary}
            aria-label="Verification code"
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.medium,
              padding: spacing.md,
              color: colors.textPrimary,
              marginBottom: spacing.md,
            }}
          />
          <Button label={pending ? 'Verifying…' : 'Verify & Continue'} onPress={onEmailPress} disabled={pending} />
        </Card>
      ) : (
        <>
          <Card>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              aria-label="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.medium,
                padding: spacing.md,
                color: colors.textPrimary,
                marginBottom: spacing.md,
              }}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              aria-label="Password"
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.medium,
                padding: spacing.md,
                color: colors.textPrimary,
                marginBottom: spacing.md,
              }}
            />
            <Button
              label={pending ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
              onPress={onEmailPress}
              disabled={pending || !email || !password}
            />
            {/* A Pressable, not a Text with onPress — react-native-web's Text
                only attaches an onClick handler for onPress, with no role,
                tabIndex, or keyboard handling added, so this control was
                completely unreachable by keyboard/screen reader on web
                (found during the 2026-08-06 accessibility pass). Pressable
                adds real keyboard focus/Enter-activation on its own, but not
                a "button" role — role="button" is what actually gets this a
                Space-key activation and a proper screen-reader announcement
                (confirmed against react-native-web's PressResponder source). */}
            <Pressable
              onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              role="button"
              style={{ marginTop: spacing.md }}
            >
              <Text variant="bodySmall" secondary style={{ textAlign: 'center' }}>
                {mode === 'signIn' ? "New to Noivos? Create an account" : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <Button label="Continue with Apple" variant="secondary" onPress={() => onSSOPress('oauth_apple')} />
            <Button label="Continue with Google" variant="tertiary" onPress={() => onSSOPress('oauth_google')} />
          </View>
        </>
      )}

      {error && (
        <Text variant="bodySmall" color={palette.sourPunch}>
          {error}
        </Text>
      )}
    </ScreenContainer>
  );
}

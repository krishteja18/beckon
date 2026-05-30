import React, { Component, ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Top-level error boundary. Catches React render errors and shows them
 * on-screen with a copyable stack trace, so we never get a silent white screen.
 *
 * Wraps the root layout. Renders the error in red on a dark background.
 * Pressing "Try again" remounts the tree (often enough to recover from
 * transient errors like a stale Hermes cache).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  handleCopy = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;
    const text =
      `${error.name}: ${error.message}\n\n` +
      `STACK:\n${error.stack ?? '(no stack)'}\n\n` +
      `COMPONENT STACK:\n${errorInfo?.componentStack ?? '(no component stack)'}`;
    try {
      await Clipboard.setStringAsync(text);
    } catch {/* clipboard not always available */}
  };

  render() {
    const { error, errorInfo } = this.state;
    if (!error) return this.props.children;

    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>SHOWUP · RUNTIME ERROR</Text>
          <Text style={styles.title}>{error.name}</Text>
          <Text style={styles.message}>{error.message}</Text>

          <View style={styles.actionsRow}>
            <Pressable onPress={this.handleReset} style={styles.btn}>
              <Text style={styles.btnText}>Try again</Text>
            </Pressable>
            <Pressable onPress={this.handleCopy} style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnText, styles.btnGhostText]}>Copy details</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>STACK</Text>
          <Text style={styles.code} selectable>
            {error.stack ?? '(no stack)'}
          </Text>

          {errorInfo?.componentStack && (
            <>
              <Text style={styles.sectionLabel}>COMPONENT STACK</Text>
              <Text style={styles.code} selectable>
                {errorInfo.componentStack}
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#03050C' },
  scroll:    { padding: 24, gap: 12 },
  eyebrow:   { color: '#FCA5A5', fontSize: 10.5, letterSpacing: 1.8, fontFamily: 'JetBrainsMono_500Medium' },
  title:     { color: '#FCA5A5', fontSize: 22, fontFamily: 'Inter_500Medium', marginTop: 6 },
  message:   { color: '#EEF0F6', fontSize: 14.5, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  actionsRow:{ flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 8 },
  btn:       { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#38BDF8' },
  btnText:   { color: '#03050C', fontSize: 13.5, fontFamily: 'Inter_500Medium' },
  btnGhost:  { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  btnGhostText: { color: 'rgba(238,240,246,0.85)' },
  sectionLabel:{ color: 'rgba(150,160,185,0.5)', fontSize: 9.5, letterSpacing: 1.6, marginTop: 14, fontFamily: 'JetBrainsMono_500Medium' },
  code:      { color: 'rgba(238,240,246,0.85)', fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', lineHeight: 16 },
});

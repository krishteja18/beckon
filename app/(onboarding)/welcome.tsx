import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VoiceBall } from '../../src/components/VoiceBall';
import { AmbientBackground } from '../../src/components/AmbientBackground';

export default function Welcome() {
  const router = useRouter();

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.topSpace} />

        {/* Floating Glowing Gemini Orb Hero Section */}
        <View className="items-center gap-12 my-auto">
          <View style={styles.orbWrapper}>
            <VoiceBall state="speaking" size={180} />
          </View>

          <View className="items-center gap-3 px-6">
            <Text
              style={{
                color: '#EEF0F6',
                fontSize: 36,
                fontWeight: '200',
                letterSpacing: -1.6,
                textAlign: 'center',
                fontFamily: 'Inter_300Light',
                lineHeight: 44,
              }}
            >
              A coach that{'\n'}
              <Text style={{ color: '#38BDF8', fontWeight: '400' }}>actually shows up.</Text>
            </Text>
            <Text
              className="mt-3 text-center"
              style={{
                fontSize: 14.5,
                lineHeight: 22,
                fontFamily: 'Inter_400Regular',
                color: 'rgba(170, 178, 200, 0.75)',
                paddingHorizontal: 16,
              }}
            >
              Voice-first goal coaching that calls you at your scheduled times.
              No streak shame, no judgment.
            </Text>
          </View>
        </View>

        {/* Buttons / CTAs */}
        <View className="px-6 pb-8 gap-3">
          <Pressable
            onPress={() => router.push('/(onboarding)/auth')}
            style={styles.primaryButton}
          >
            <Text style={{ color: '#03050C', fontSize: 15, fontFamily: 'Inter_500Medium', letterSpacing: -0.2 }}>
              Get started
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push('/(onboarding)/auth')}
            className="items-center py-3"
          >
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: 'rgba(170, 178, 200, 0.55)',
              }}
            >
              I already have an account
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSpace: {
    height: 40,
  },
  orbWrapper: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});

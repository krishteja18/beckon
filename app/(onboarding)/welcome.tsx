import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VoiceBall } from '../../src/components/VoiceBall';

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 justify-between py-12">
        <View />

        <View className="items-center gap-10">
          <VoiceBall state="idle" size={140} />
          <View className="items-center gap-3 px-6">
            <Text
              style={{
                color: '#EEF0F6',
                fontSize: 38,
                fontWeight: '200',
                letterSpacing: -1.6,
                textAlign: 'center',
                fontFamily: 'Inter_300Light',
              }}
            >
              A coach that{'\n'}actually shows up.
            </Text>
            <Text
              className="text-text-2 mt-2 text-center"
              style={{ fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' }}
            >
              Voice-first goal coaching that calls you at every scheduled time.
              No streak shame, no judgment.
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Pressable
            onPress={() => router.push('/(onboarding)/auth')}
            style={{
              backgroundColor: '#38BDF8',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#020409', fontSize: 15, fontFamily: 'Inter_500Medium' }}>
              Get started
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(onboarding)/auth')} className="items-center py-3">
            <Text className="text-text-2 text-[14px]" style={{ fontFamily: 'Inter_400Regular' }}>
              I already have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

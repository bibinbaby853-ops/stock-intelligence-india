import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Card, Divider, Row, Screen, T, Tag } from '@/components/ui';
import { answer, suggestedQuestions, type Answer } from '@/lib/assistant';
import { useStore } from '@/store';
import { useTheme } from '@/theme';

type Turn = { question: string; answer: Answer };

export default function Assistant() {
  const t = useTheme();
  const router = useRouter();
  const { ask: initial } = useLocalSearchParams<{ ask?: string }>();
  const { settings } = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const asked = useRef(false);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setTurns((prev) => [...prev, { question: q, answer: answer(q, settings.weights) }]);
    setText('');
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  useEffect(() => {
    if (initial && !asked.current) {
      asked.current = true;
      ask(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <Screen title="Research assistant" subtitle="Answers from the application database" back scroll={false} hideActions>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          {turns.length === 0 ? (
            <T size={13} color={t.muted}>
              This assistant answers a fixed set of research questions directly from the financial database, so every figure can be traced. Free-form conversation will come when the artificial intelligence service is connected.
            </T>
          ) : null}
          {turns.map((turn, i) => (
            <View key={i} style={{ gap: 10 }}>
              <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: t.accentSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
                <T>{turn.question}</T>
              </View>
              <Card gap={12}>
                {turn.answer.facts.map((f) => (
                  <View key={f} style={{ gap: 4 }}>
                    <Tag label="Fact" color={t.accent} />
                    <T size={13}>{f}</T>
                  </View>
                ))}
                {turn.answer.rows.length ? (
                  <View>
                    {turn.answer.rows.map((r, k) => (
                      <View key={r.symbol}>
                        {k > 0 ? <Divider /> : null}
                        <Row title={r.name} sub={r.detail} right={<Ionicons name="chevron-forward" size={16} color={t.muted} />} onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: r.symbol } })} />
                      </View>
                    ))}
                  </View>
                ) : null}
                {turn.answer.interpretations.map((f) => (
                  <View key={f} style={{ gap: 4 }}>
                    {turn.answer.facts.length ? <Tag label="Interpretation" color={t.amber} /> : null}
                    <T size={13}>{f}</T>
                  </View>
                ))}
                {turn.answer.sources.length ? <T size={12} color={t.muted}>Sources: {turn.answer.sources.join('; ')}</T> : null}
              </Card>
            </View>
          ))}
          <View style={{ gap: 8 }}>
            <T size={12} color={t.muted}>Suggested questions</T>
            {suggestedQuestions.map((q) => (
              <Pressable key={q} accessibilityRole="button" onPress={() => ask(q)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface }}>
                <T size={13}>{q}</T>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.surface }}>
          <TextInput
            accessibilityLabel="Type a question"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => ask(text)}
            placeholder="Type a question"
            placeholderTextColor={t.muted}
            returnKeyType="send"
            style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.bg, color: t.text, paddingHorizontal: 14, fontSize: 15 }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send question" onPress={() => ask(text)} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="send" size={20} color={t.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

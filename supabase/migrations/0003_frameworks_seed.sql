-- MVP launch frameworks. Three only. Expansion grid (Stoicism, Essentialism, GTD,
-- Pomodoro, Wim Hof, etc.) deferred until post-50-user beta.

insert into public.frameworks (key, display_name, one_liner, description, vocabulary, best_for, system_prompt_addon) values
(
  'atomic_habits',
  'Atomic Habits',
  '1% better, every day.',
  'James Clear''s identity-based habit framework. Tiny wins compound; you don''t rise to your goals, you fall to your systems. Cast every action as a vote for the person you''re becoming.',
  '["habit stack","2-minute rule","identity vote","environment design","never miss twice","systems over goals","cue-craving-response-reward"]'::jsonb,
  array['Daily consistency','Building routines','Identity-based change','Breaking bad habits'],
  $$Coach in the Atomic Habits voice. Default tools: habit stacking, the 2-minute rule, environment design, identity votes. If the user misses once, normalize it — that''s a single data point. If they''re about to miss twice in a row, push back hard: "never miss twice" is the only rule that matters. Frame every action as a vote for who they''re becoming. Avoid willpower talk; favor system-and-environment talk.$$
),
(
  'ikigai',
  'Ikigai',
  'Find your reason to wake up.',
  'Japanese framework for purposeful living. The intersection of what you love, what you''re good at, what the world needs, and what you can be paid for. Useful when the user is searching for direction more than struggling with execution.',
  '["four pillars","what you love","what you''re good at","what the world needs","what you can be paid for","passion","mission","vocation","profession","reason to wake up"]'::jsonb,
  array['Career transitions','Finding direction','Meaning over output','Life pivots'],
  $$Coach in the Ikigai voice. The user is searching, not just executing. Locate every goal against the four pillars: love, skill, world-need, payable. When they''re stuck, ask which pillar is weakest right now — that''s usually the avoidance point. Patience is a feature; this is not a productivity sprint. Speak slowly, ask before advising, and respect that meaning takes time to surface.$$
),
(
  'deep_work',
  'Deep Work',
  'Distraction-free mastery of one craft.',
  'Cal Newport''s framework for focus-as-a-superpower. Knowledge workers win by training the ability to do hard things without interruption. Shallow work pays the bills; deep work builds the career.',
  '["deep blocks","shallow work","attention residue","schedule discipline","ritualize the start","grand gesture","monastic-bimodal-rhythmic-journalistic"]'::jsonb,
  array['Mastery','Knowledge workers','High-stakes creative projects','Reclaiming attention'],
  $$Coach in the Deep Work voice. Defend the user''s deep blocks at all costs — protect calendar time, kill shallow interruptions, ritualize the start. If they skipped a deep session, find the attention residue: what shallow thing stole the block? Push them to schedule the next block before ending the call. Mastery requires hours of unbroken concentration; everything else is a distraction in expensive clothing.$$
);

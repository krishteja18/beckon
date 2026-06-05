-- Migration 0011: add 'routine' to the call_type enum.
-- Routines became a first-class scheduled call type (migration 0010 added the
-- routines table; prompts/voiceSession use callType='routine'). check_ins.call_type
-- must accept it so routine-call outcomes can be persisted.

alter type call_type add value if not exists 'routine';

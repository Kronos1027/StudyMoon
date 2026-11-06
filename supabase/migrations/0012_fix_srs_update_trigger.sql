-- StudyMoon 0012: correct a broken trigger shipped in migration 0002.
--
-- srs_cards uses last_update (FSRS timestamp), not updated_at.
-- The generic set_updated_at trigger tries NEW.updated_at = now() and raises
-- "record new has no field updated_at" on every UPDATE, breaking rescheduling
-- of existing review cards. The FSRS scheduler already writes last_update.
-- Other set_updated_at triggers are valid and remain unchanged.
drop trigger if exists trg_srs_cards_updated_at on public.srs_cards;

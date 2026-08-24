-- Additional event challenges for the three-hour Siem Reap race.
-- Titles make this seed idempotent if the organizer has already added them.

update public.challenges
set description = 'Take a photo with at least one team member in a pool. Earn 15 bonus points for each team member in the water.',
    base_points = 0,
    bonus_points_per_unit = 15,
    max_bonus_units = 5,
    bonus_label = 'team members in pool'
where title = 'Everybody In';

insert into public.challenges (
  id, slug, title, description, category, base_points, media_kind,
  bonus_points_per_unit, max_bonus_units, bonus_label, sort_order, is_active
)
select
  id, slug, title, description, category, base_points,
  media_kind::public.media_kind, bonus_points_per_unit, max_bonus_units,
  bonus_label, sort_order, is_active
from (values
  ('3ee57c94-922e-426a-b157-f6a5a0a78231'::uuid, 'angkor-botanical-garden', 'Angkor Botanical Garden', 'Take a team photo in front of the Angkor Botanical Garden entrance.', 'landmark', 35, 'photo', 0, 0, null::text, 110, true),
  ('a8998d5f-b293-40f4-bc9d-d9b3f797fa6e'::uuid, 'royal-residence', 'Royal Residence', 'Take a team photo outside the Royal Residence in Siem Reap. Stay outside the restricted grounds.', 'landmark', 35, 'photo', 0, 0, null::text, 120, true),
  ('0424cb19-6167-4d1c-97ea-6649e49e2904'::uuid, 'bookstore-browse', 'Bookstore Browse', 'Take a team photo inside a bookstore after asking staff for permission.', 'city', 20, 'photo', 0, 0, null::text, 130, true),
  ('e142d96c-2a77-4cac-9edd-28d279327579'::uuid, 'starbucks-stop', 'Starbucks Stop', 'Take a team photo inside a Starbucks without disturbing customers or staff.', 'city', 20, 'photo', 0, 0, null::text, 140, true),
  ('7ace15ff-a5bd-4cd2-a720-02bb95752be2'::uuid, 'tuk-tuk-team', 'Tuk Tuk Team', 'Take a photo with your whole team safely seated in one tuk tuk. Earn a bonus if the tuk tuk is red.', 'adventure', 25, 'photo', 15, 1, 'red tuk tuk', 150, true),
  ('ca2cc1db-b107-42e6-a387-633bdca18804'::uuid, 'find-levi-brill', 'Find Levi Brill', 'Find Levi Brill and take a team selfie with him after asking permission.', 'people', 50, 'photo', 0, 0, null::text, 160, true),
  ('434442f8-8d5c-455a-a73a-06b53d93150b'::uuid, 'reenact-last-supper', 'Reenact the Last Supper', 'Create a respectful team reenactment of the Last Supper and take a photo.', 'creative', 45, 'photo', 0, 0, null::text, 170, true),
  ('9865b01c-799b-4b09-b8e0-ffcc4d2a4f5d'::uuid, 'riverside-elephant', 'Riverside Elephant', 'Find the elephant by the Siem Reap River and take a team photo beside it.', 'landmark', 30, 'photo', 0, 0, null::text, 180, true),
  ('5d8430a8-a85a-4d05-a9d8-ade97bfa0974'::uuid, 'old-market', 'Old Market', 'Take a team photo at Psar Chas (Old Market) without blocking vendors or shoppers.', 'landmark', 25, 'photo', 0, 0, null::text, 190, true),
  ('898f4126-626f-4449-8927-1f34f98cc497'::uuid, 'find-thean-tinh', 'Find Thean Tinh', 'Find Thean Tinh and take a team selfie after asking permission.', 'people', 50, 'photo', 0, 0, null::text, 200, true),
  ('9391fe42-0966-4ee5-9adb-7d6b90985ee9'::uuid, 'fruit-salad-team', 'Fruit Salad Team', 'Take a photo with every team member holding a different kind of fruit.', 'food', 30, 'photo', 0, 0, null::text, 210, true),
  ('b3a35837-f3ce-4c9a-828f-e583fb07b276'::uuid, 'one-moto-whole-team', 'One Moto, Whole Team', 'Gather your whole team safely around one parked moto for a photo. Do not sit on it or ride overcrowded.', 'creative', 30, 'photo', 0, 0, null::text, 220, true),
  ('41615590-e2cf-435c-a805-a92c5689994b'::uuid, 'five-international-friends', 'Five International Friends', 'Take one team photo with five international visitors who are strangers, not YWAMers. Ask everyone for permission first.', 'people', 45, 'photo', 0, 0, null::text, 230, true),
  ('4d269276-4e98-46a3-8ece-5e557aa25ca3'::uuid, 'animal-encounter', 'Animal Encounter', 'Take a team photo with a living animal, animal statue, or prepared food. Keep a safe distance and never touch or disturb a live animal.', 'adventure', 25, 'photo', 0, 0, null::text, 240, true)
) as proposed(
  id, slug, title, description, category, base_points, media_kind,
  bonus_points_per_unit, max_bonus_units, bonus_label, sort_order, is_active
)
where not exists (
  select 1 from public.challenges existing where existing.title = proposed.title
);

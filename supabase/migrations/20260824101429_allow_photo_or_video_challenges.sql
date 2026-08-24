-- Let teams choose a photo or video unless a challenge specifically requires video.
update public.challenges
set media_kind = 'either'
where media_kind = 'photo';

update public.challenges
set description = 'Gather your whole team on and around one parked moto for a photo or video. Keep the engine off, remove the keys, and do not ride overcrowded.'
where title = 'One Moto, Whole Team';

-- ============================================
-- SENDKINDLY DEMO DATA
-- Paste this into Supabase SQL Editor
--
-- FIRST: Replace YOUR_USER_ID_HERE with your
-- actual user UUID from Authentication > Users
--
-- NOTE: After running this SQL, manually add
-- 1-2 photo contributions via /p/grandma-sarah
-- to make the keepsake visually richer for demo.
-- ============================================

-- Step 1: Set your user ID
DO $$
DECLARE
  my_uid UUID := '7638845b-0637-43cf-8ba7-3bd135190151';  -- ← REPLACE THIS
  page1_id UUID;
  page2_id UUID;
  page3_id UUID;
BEGIN

  -- ============================================
  -- CELEBRATION 1: Birthday (active, lots of contributions)
  -- ============================================
  INSERT INTO pages (id, creator_id, slug, recipient_name, template_type, status, created_at, creator_message, contribution_prompt)
  VALUES (gen_random_uuid(), my_uid, 'grandma-sarah', 'Grandma Sarah', 'birthday', 'collecting', NOW() - INTERVAL '3 days',
    'Happy 80th birthday Grandma! You fill our lives with so much love, laughter, and the best Sunday lunches. Here''s to many more years of your warmth and wisdom.',
    'Share your favorite memory with Grandma or tell her what she means to you!')
  RETURNING id INTO page1_id;

  INSERT INTO contributions (page_id, contributor_name, message_text, created_at) VALUES
  (page1_id, 'Priya', 'Happy birthday Grandma! You are the heart of our family. Every Sunday lunch is special because of you. Love you to the moon and back! 🌙', NOW() - INTERVAL '2 days'),
  (page1_id, 'James', 'Grandma Sarah, thank you for teaching me to bake. Those chocolate chip cookies changed my life forever. Wishing you the happiest birthday!', NOW() - INTERVAL '2 days'),
  (page1_id, 'Amara', 'You always know exactly what to say when things get tough. Your wisdom and warmth make the world brighter. Happy birthday, Gogo! 💛', NOW() - INTERVAL '1 day'),
  (page1_id, 'Thabo', 'Remember when you taught us to dance in the kitchen? Best memories of my childhood. Happy birthday to the coolest grandma ever!', NOW() - INTERVAL '1 day'),
  (page1_id, 'Fatima', 'Dear Grandma Sarah, your garden is my happy place. Thank you for always having a cup of tea and a story ready. Many happy returns!', NOW() - INTERVAL '12 hours'),
  (page1_id, 'David', 'The world needs more people like you. Kind, patient, and always smiling. Happy birthday from all of us in Cape Town! 🎂', NOW() - INTERVAL '6 hours'),
  (page1_id, 'Lerato', 'Grandma, your strength inspires me every day. You raised an incredible family. Cheers to another amazing year! 🥂', NOW() - INTERVAL '3 hours'),
  (page1_id, 'Nisha', 'Grandma Sarah, you welcomed me into this family like I had always been here. Your hugs feel like home. Wishing you the most beautiful birthday! 🌸', NOW() - INTERVAL '1 hour');

  -- ============================================
  -- CELEBRATION 2: Farewell (completed/shared)
  -- ============================================
  INSERT INTO pages (id, creator_id, slug, recipient_name, template_type, status, created_at, locked_at, creator_message, contribution_prompt)
  VALUES (gen_random_uuid(), my_uid, 'farewell-sipho', 'Sipho', 'farewell', 'shared', NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days',
    'Sipho, you have been the heart and soul of our team. We are all going to miss you more than words can say. Go conquer London!',
    'Share your favorite Sipho moment or wish him well on his next adventure!')
  RETURNING id INTO page2_id;

  INSERT INTO contributions (page_id, contributor_name, message_text, created_at) VALUES
  (page2_id, 'Naledi', 'Sipho, working with you has been an absolute joy. Your energy in every meeting lifted all of us. Good luck in London!', NOW() - INTERVAL '13 days'),
  (page2_id, 'Marcus', 'You made our team better just by being you. The new company is lucky to have you, brother. Stay in touch!', NOW() - INTERVAL '12 days'),
  (page2_id, 'Zanele', 'From our first day as interns to now — what a journey. I will miss our coffee runs. Go shine! ✨', NOW() - INTERVAL '11 days'),
  (page2_id, 'Raj', 'Your code reviews taught me more than university ever did. Thank you for your patience and mentorship.', NOW() - INTERVAL '10 days');

  -- Add a recipient reply to farewell
  INSERT INTO recipient_replies (page_id, reply_text, created_at)
  VALUES (page2_id, 'I am so touched by all these messages. You have no idea how much this means to me. I will miss every single one of you. Thank you for making these years unforgettable. 💛', NOW() - INTERVAL '7 days');

  -- ============================================
  -- CELEBRATION 3: Thank You (draft, no contributions yet)
  -- ============================================
  INSERT INTO pages (id, creator_id, slug, recipient_name, template_type, status, created_at)
  VALUES (gen_random_uuid(), my_uid, 'thanks-doc-moosa', 'Dr Moosa', 'thank_you', 'draft', NOW() - INTERVAL '1 day')
  RETURNING id INTO page3_id;

END $$;

-- ============================================
-- VERIFY: Check what was created
-- ============================================
SELECT p.recipient_name, p.template_type, p.status, p.slug,
       (SELECT COUNT(*) FROM contributions c WHERE c.page_id = p.id) as contrib_count
FROM pages p
ORDER BY p.created_at DESC;

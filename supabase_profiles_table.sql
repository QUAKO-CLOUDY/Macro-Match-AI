-- SQL script to create/update the profiles table with flat columns
-- Run this in your Supabase Dashboard SQL Editor

-- First, check if the table exists and drop the user_profile column if it exists
DO $$ 
BEGIN
  -- Drop user_profile column if it exists (migration from nested to flat structure)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'user_profile'
  ) THEN
    ALTER TABLE profiles DROP COLUMN user_profile;
  END IF;
END $$;

-- Create or alter the profiles table with flat columns
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic profile fields
  name TEXT,
  email TEXT,
  full_name TEXT,
  
  -- Goal and dietary preferences
  goal TEXT CHECK (goal IN ('lose-fat', 'maintain', 'build-muscle')),
  dietary_type TEXT,
  diet_type TEXT CHECK (diet_type IN ('Regular', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Low Carb')),
  
  -- Macro targets (using the column names you specified)
  calorie_goal INTEGER DEFAULT 2000,
  protein_goal INTEGER DEFAULT 150,
  carb_limit INTEGER DEFAULT 200,
  fat_limit INTEGER DEFAULT 70,
  
  -- Arrays for dietary restrictions and preferences
  allergens TEXT[] DEFAULT '{}',
  dietary_options TEXT[] DEFAULT '{}',
  nutrition_goals TEXT[] DEFAULT '{}',
  preferred_cuisines TEXT[] DEFAULT '{}',
  preferred_meal_types TEXT[] DEFAULT '{}',
  eating_styles TEXT[] DEFAULT '{}',
  dietary_preferences TEXT[] DEFAULT '{}',
  
  -- Activity and training
  activity_level TEXT,
  training_style TEXT,
  
  -- Theme preference
  theme_preference TEXT CHECK (theme_preference IN ('light', 'dark')),
  
  -- Last login tracking
  last_login TIMESTAMPTZ
);

-- Create index on id for faster lookups
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

-- Create updated_at trigger to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;


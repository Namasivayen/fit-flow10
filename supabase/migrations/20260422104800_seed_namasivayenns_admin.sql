-- Seed the admin account directly so no signup step is needed.

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'namasivayenns@gmail.com';

  IF admin_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user
    ) VALUES (
      admin_user_id,
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'namasivayenns@gmail.com',
      crypt('12345678', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      false
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider,
      provider_id,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      'email',
      'namasivayenns@gmail.com',
      jsonb_build_object('sub', admin_user_id::text, 'email', 'namasivayenns@gmail.com'),
      now(),
      now(),
      now()
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

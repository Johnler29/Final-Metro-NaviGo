    -- Fix Feedback Foreign Key to Use CASCADE Delete
    -- This allows deleting users and automatically deletes their feedback
    -- Run this in your Supabase SQL Editor

    -- Step 1: Drop the existing foreign key constraint
    ALTER TABLE feedback 
    DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;

    -- Step 2: Recreate the foreign key with ON DELETE CASCADE
    -- This means when a user is deleted, their feedback will be automatically deleted too
    ALTER TABLE feedback
    ADD CONSTRAINT feedback_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

    -- Verify the constraint was created
    SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'feedback' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id';

    -- Expected result: delete_rule should be 'CASCADE'




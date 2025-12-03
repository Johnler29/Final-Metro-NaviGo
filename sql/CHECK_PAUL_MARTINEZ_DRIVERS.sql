    -- CHECK: Why are there multiple Paul Martinez entries?
    -- This will show if there are duplicate driver records or just multiple assignments

    -- ============================================
    -- STEP 1: Check for Duplicate Driver Records
    -- ============================================
    SELECT 
    'Duplicate Driver Records' AS check_type,
    id AS driver_id,
    name AS driver_name,
    email,
    license_number,
    status AS driver_status,
    created_at,
    updated_at
    FROM drivers
    WHERE name = 'Paul Martinez'
    OR email LIKE '%paul%martinez%'
    ORDER BY created_at;

    -- ============================================
    -- STEP 2: Count How Many Driver Records Exist
    -- ============================================
    SELECT 
    'Driver Count' AS check_type,
    COUNT(*) AS total_driver_records,
    COUNT(DISTINCT id) AS unique_driver_ids,
    COUNT(DISTINCT email) AS unique_emails,
    COUNT(DISTINCT license_number) AS unique_licenses,
    CASE 
        WHEN COUNT(*) > COUNT(DISTINCT id) THEN '❌ DUPLICATE DRIVER RECORDS FOUND'
        WHEN COUNT(*) = 1 THEN '✅ Only one driver record'
        WHEN COUNT(*) > 1 AND COUNT(DISTINCT id) = COUNT(*) THEN '✅ Multiple driver records (different IDs)'
        ELSE '❓ Check manually'
    END AS status
    FROM drivers
    WHERE name = 'Paul Martinez'
    OR email LIKE '%paul%martinez%';

    -- ============================================
    -- STEP 3: Check Assignments Per Driver Record
    -- ============================================
    SELECT 
    'Assignments Per Driver' AS check_type,
    d.id AS driver_id,
    d.name AS driver_name,
    d.email,
    d.license_number,
    COUNT(dba.id) AS total_assignments,
    COUNT(CASE WHEN dba.is_active = true THEN 1 END) AS active_assignments,
    STRING_AGG(DISTINCT b.bus_number, ', ') AS assigned_buses,
    STRING_AGG(dba.id::text, ', ') AS assignment_ids
    FROM drivers d
    LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
    LEFT JOIN buses b ON b.id = dba.bus_id
    WHERE d.name = 'Paul Martinez'
    OR d.email LIKE '%paul%martinez%'
    GROUP BY d.id, d.name, d.email, d.license_number
    ORDER BY d.created_at;

    -- ============================================
    -- STEP 4: Show All Assignments with Details
    -- ============================================
    SELECT 
    'All Assignments Details' AS check_type,
    d.id AS driver_id,
    d.name AS driver_name,
    d.email AS driver_email,
    dba.id AS assignment_id,
    dba.driver_id AS assignment_driver_id,
    dba.bus_id,
    dba.is_active,
    dba.assigned_at,
    b.bus_number,
    b.name AS bus_name,
    CASE 
        WHEN d.id::text = dba.driver_id::text THEN '✅ Driver ID matches'
        ELSE '❌ Driver ID mismatch'
    END AS id_match
    FROM drivers d
    LEFT JOIN driver_bus_assignments dba ON dba.driver_id::text = d.id::text
    LEFT JOIN buses b ON b.id = dba.bus_id
    WHERE d.name = 'Paul Martinez'
    OR d.email LIKE '%paul%martinez%'
    ORDER BY d.id, dba.assigned_at DESC NULLS LAST;

    -- ============================================
    -- STEP 5: Check if Same Driver ID Has Multiple Assignments
    -- ============================================
    SELECT 
    'Same Driver, Multiple Assignments' AS check_type,
    dba.driver_id,
    COUNT(*) AS assignment_count,
    COUNT(CASE WHEN dba.is_active = true THEN 1 END) AS active_count,
    STRING_AGG(dba.id::text, ', ') AS assignment_ids,
    STRING_AGG(b.bus_number, ', ') AS bus_numbers,
    CASE 
        WHEN COUNT(CASE WHEN dba.is_active = true THEN 1 END) > 1 THEN '❌ PROBLEM: Multiple active assignments'
        WHEN COUNT(CASE WHEN dba.is_active = true THEN 1 END) = 1 THEN '✅ OK: Only one active assignment'
        WHEN COUNT(CASE WHEN dba.is_active = true THEN 1 END) = 0 THEN '❌ PROBLEM: No active assignments'
        ELSE '❓ Check manually'
    END AS status
    FROM driver_bus_assignments dba
    INNER JOIN drivers d ON d.id::text = dba.driver_id::text
    LEFT JOIN buses b ON b.id = dba.bus_id
    WHERE d.name = 'Paul Martinez'
    GROUP BY dba.driver_id
    HAVING COUNT(*) > 1 OR COUNT(CASE WHEN dba.is_active = true THEN 1 END) > 1;

    -- ============================================
    -- STEP 6: Fix - Remove Duplicate Driver Records (if any)
    -- ============================================
    -- Only run this if STEP 1 shows duplicate driver records
    -- This keeps the most recent driver record and transfers assignments to it
    /*
    WITH ranked_drivers AS (
    SELECT 
        id,
        name,
        email,
        license_number,
        created_at,
        ROW_NUMBER() OVER (
        PARTITION BY LOWER(name), LOWER(email)
        ORDER BY created_at DESC
        ) AS rn
    FROM drivers
    WHERE name = 'Paul Martinez'
    )
    UPDATE driver_bus_assignments dba
    SET 
    driver_id = (SELECT id FROM ranked_drivers WHERE rn = 1 LIMIT 1),
    updated_at = NOW()
    FROM ranked_drivers rd
    WHERE dba.driver_id::text = rd.id::text
    AND rd.rn > 1
    RETURNING 
    '✅ Transferred assignment to main driver record' AS action,
    dba.id AS assignment_id,
    dba.driver_id AS new_driver_id;
    */


-- Remove seeded default license row (only if it matches install_id)
DELETE FROM license_info WHERE install_id = 'seeded-default-install';
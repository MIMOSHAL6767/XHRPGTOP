SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Game'
  AND column_name IN (
    'titleMode',
    'titleLogo',
    'detailBackground',
    'detailBackgroundOpacity',
    'detailBackgroundFit',
    'screenshots'
  )
ORDER BY column_name;
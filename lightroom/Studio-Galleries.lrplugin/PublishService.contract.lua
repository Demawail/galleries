-- DESIGN CONTRACT ONLY. Not registered in Info.lua and never performs an upload.
-- Implement against a verified production API and test in Lightroom Classic.
return {
  version = 'planned-v1',
  provider = 'Studio Galleries',
  collectionSet = 'gallery',
  collection = 'section',
  sourceKey = { 'catalog_uuid', 'photo_uuid', 'virtual_copy_uuid' },
  operations = {
    'pair_device',
    'create_gallery',
    'create_section',
    'upsert_source',
    'upload_rendition',
    'commit_rendition',
    'list_submitted_pins',
    'acknowledge_receipt',
  },
  constraints = {
    'No account credentials in source or export presets.',
    'A new rendition never replaces the stable source key.',
    'No automatic overwrite of photographer flags, stars or color labels.',
    'No silent deletion of a client-selected source.',
    'Retried requests use idempotency keys.',
  },
}

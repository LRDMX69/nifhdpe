-- HARDEN LEGACY CLAIMS-PROOF STORAGE
--
-- The claims-proof bucket was created public by an older migration. Claim
-- evidence can contain receipts, invoices, and employee information, so it
-- must not be retrievable by an unauthenticated caller. The current frontend
-- uses claim-attachments; this migration also protects any legacy objects
-- that remain in claims-proof.

UPDATE storage.buckets
SET public = false
WHERE id = 'claims-proof';

DROP POLICY IF EXISTS "claims_proof_public_read" ON storage.objects;
DROP POLICY IF EXISTS "claims_proof_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "claims_proof_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "claims_proof_org_members_read" ON storage.objects;
DROP POLICY IF EXISTS "claims_proof_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "claims_proof_owner_update" ON storage.objects;

-- Legacy objects are expected to use either <org_id>/<user_id>/<file> or
-- <user_id>/<file>. Permit reads only to members of the owning organization
-- when the organization prefix is present, and otherwise only to the uploader.
CREATE POLICY "claims_proof_org_members_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'claims-proof'
  AND (
    (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND is_member_of_org(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
    OR auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "claims_proof_owner_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claims-proof'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "claims_proof_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'claims-proof'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
)
WITH CHECK (
  bucket_id = 'claims-proof'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "claims_proof_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'claims-proof'
  AND (
    owner = auth.uid()
    OR is_maintenance_admin(auth.uid())
  )
);

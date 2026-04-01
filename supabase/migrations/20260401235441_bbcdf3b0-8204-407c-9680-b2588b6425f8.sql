CREATE POLICY "Clients can read pix_config"
ON public.pix_config
FOR SELECT
TO authenticated
USING (true);
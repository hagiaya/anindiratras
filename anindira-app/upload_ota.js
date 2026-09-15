import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function upload() {
  const file = fs.readFileSync('../update-v1.0.9.zip');
  console.log('Uploading to app_updates bucket...');
  const { data, error } = await supabase.storage.from('app_updates').upload('update-v1.0.9.zip', file, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'application/zip'
  });
  
  if (error) {
    console.error('Upload error:', error);
    return;
  }
  
  console.log('Upload success:', data);
  
  const publicUrl = supabase.storage.from('app_updates').getPublicUrl('update-v1.0.9.zip').data.publicUrl;
  console.log('Public URL:', publicUrl);
  
  console.log('Updating app_versions table...');
  const { data: verData, error: verError } = await supabase.from('app_versions').insert([
    {
      version_code: '1.0.9',
      zip_url: publicUrl,
      is_active: true
    }
  ]);
  
  if (verError) {
    console.error('Insert error:', verError);
  } else {
    console.log('Insert success:', verData);
  }
}

upload();

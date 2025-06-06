import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

async function migrateThreads() {
  try {
    console.log('Starting thread migration...');

    // 1. First, check if the column exists
    const { data: columnInfo, error: columnError } = await supabase
      .from('threads')
      .select('openai_thread_id')
      .limit(1);

    if (columnError && columnError.code === '42703') { // Column doesn't exist
      console.log('Adding openai_thread_id column...');
      
      // Add the column as nullable
      const { error: alterError } = await supabase.rpc('add_openai_thread_id_column');
      
      if (alterError) {
        console.error('Error adding column:', alterError);
        return;
      }
      console.log('Added openai_thread_id column');
    } else if (columnError) {
      console.error('Error checking column:', columnError);
      return;
    } else {
      console.log('openai_thread_id column already exists');
    }

    // 2. Get all threads without OpenAI thread IDs
    const { data: threads, error: fetchError } = await supabase
      .from('threads')
      .select('id')
      .is('openai_thread_id', null);

    if (fetchError) {
      console.error('Error fetching threads:', fetchError);
      return;
    }

    console.log(`Found ${threads?.length || 0} threads to migrate`);

    // 3. Update each thread with a new OpenAI thread ID
    for (const thread of threads || []) {
      try {
        // Create a new OpenAI thread
        const openaiThread = await openai.beta.threads.create();
        console.log(`Created OpenAI thread for thread ${thread.id}:`, openaiThread.id);

        // Update the thread in our database
        const { error: updateError } = await supabase
          .from('threads')
          .update({ openai_thread_id: openaiThread.id })
          .eq('id', thread.id);

        if (updateError) {
          console.error(`Error updating thread ${thread.id}:`, updateError);
          continue;
        }

        console.log(`Successfully updated thread ${thread.id}`);
      } catch (error) {
        console.error(`Error processing thread ${thread.id}:`, error);
      }
    }

    // 4. Make the column NOT NULL after all threads are updated
    const { error: notNullError } = await supabase.rpc('make_openai_thread_id_not_null');
    if (notNullError) {
      console.error('Error making column NOT NULL:', notNullError);
      return;
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateThreads().catch(console.error); 
import { createClient } from '@insforge/sdk';

const insforgeUrl = import.meta.env.VITE_INSFORGE_URL || 'https://ycrxi75f.us-east.insforge.app';
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || 'anon_aec5a73e6f93cf8207d9ae4605ad8512c9b410763c1e132b0482a2078c534a45';

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey
});

/**
 * Fetch persistent Lost & Found posts from InsForge.
 */
export async function getLostAndFoundPosts() {
  try {
    const { data, error } = await insforge.database
      .from('lost_and_found')
      .select()
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch lost & found posts from InsForge:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('InsForge getLostAndFoundPosts error:', err);
    return [];
  }
}

/**
 * Create a new persistent Lost & Found post.
 */
export async function createLostAndFoundPost({ title, description, category = 'lost', status = 'open', anonymous_handle }) {
  const payload = {
    title: title.trim(),
    description: (description || '').trim(),
    category,
    status: status || category || 'open',
    timestamp: new Date().toISOString(),
    anonymous_handle: {
      name: anonymous_handle?.name || 'Anonymous Student',
      avatar: anonymous_handle?.avatar || '🎓',
      color: anonymous_handle?.color || '#8b5cf6'
    }
  };

  const { data, error } = await insforge.database
    .from('lost_and_found')
    .insert([payload])
    .select();

  if (error) {
    console.error('InsForge createLostAndFoundPost error:', error);
    throw error;
  }
  return data?.[0];
}

/**
 * Mark a Lost & Found item as resolved.
 */
export async function resolveLostAndFoundPost(id) {
  const { data, error } = await insforge.database
    .from('lost_and_found')
    .update({ status: 'resolved' })
    .eq('id', id)
    .select();

  if (error) {
    console.error('InsForge resolveLostAndFoundPost error:', error);
    throw error;
  }
  return data?.[0];
}

/**
 * Fetch persistent Campus Trade messages from InsForge.
 */
export async function getTradeMessages() {
  try {
    const { data, error } = await insforge.database
      .from('trade_messages')
      .select()
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch trade messages from InsForge:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('InsForge getTradeMessages error:', err);
    return [];
  }
}

/**
 * Create a new persistent Campus Trade message.
 */
export async function createTradeMessage({ item_offered, item_wanted, description, anonymous_handle }) {
  const payload = {
    item_offered: item_offered.trim(),
    item_wanted: item_wanted.trim(),
    description: (description || '').trim(),
    status: 'open',
    timestamp: new Date().toISOString(),
    anonymous_handle: {
      name: anonymous_handle?.name || 'Anonymous Student',
      avatar: anonymous_handle?.avatar || '🏷️',
      color: anonymous_handle?.color || '#10b981'
    }
  };

  const { data, error } = await insforge.database
    .from('trade_messages')
    .insert([payload])
    .select();

  if (error) {
    console.error('InsForge createTradeMessage error:', error);
    throw error;
  }
  return data?.[0];
}

/**
 * Mark a Trade message as resolved.
 */
export async function resolveTradeMessage(id) {
  const { data, error } = await insforge.database
    .from('trade_messages')
    .update({ status: 'resolved' })
    .eq('id', id)
    .select();

  if (error) {
    console.error('InsForge resolveTradeMessage error:', error);
    throw error;
  }
  return data?.[0];
}

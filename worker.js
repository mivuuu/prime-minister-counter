export default {
  async fetch(request, env) {
    console.log('=== NEW REQUEST ===');
    console.log('Method:', request.method);
    console.log('URL:', request.url);

    if (request.method === 'GET') {
      const url = new URL(request.url);
      if (url.searchParams.has('test')) {
        console.log('Test request received');
        return new Response('OK - test', { status: 200 });
      }
      return new Response('Telegram Counter Worker is running', { status: 200 });
    }

    if (request.method !== 'POST') {
      console.log('Method Not Allowed:', request.method);
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const update = await request.json();
      console.log('Update received:', JSON.stringify(update));

      if (!update.message) {
        console.log('No message in update');
        return new Response('OK', { status: 200 });
      }

      if (!update.message.text) {
        console.log('No text in message', JSON.stringify(update.message));
        return new Response('OK', { status: 200 });
      }

      const msg = update.message;
      const chatId = String(msg.chat.id);
      const userId = String(msg.from.id);
      const text = msg.text;

      console.log('Chat ID:', chatId, '(expected:', env.CHAT_ID, ')');
      console.log('User ID:', userId, '(allowed:', env.ALLOWED_USERS, ')');
      console.log('Text:', text);

      if (chatId !== env.CHAT_ID) {
        console.log('Chat ID mismatch');
        return new Response('OK', { status: 200 });
      }

      const allowedUsers = env.ALLOWED_USERS.split(',').map(u => u.trim());
      if (!allowedUsers.includes(userId)) {
        console.log('User not allowed:', userId);
        return new Response('OK', { status: 200 });
      }

      const keywords = JSON.parse(env.KEYWORDS);
      console.log('Keywords:', JSON.stringify(keywords));

      let matchedKeyword = null;
      let matchedLabel = null;

      for (const [keyword, label] of Object.entries(keywords)) {
        console.log('Checking keyword:', keyword, 'against text:', text.toLowerCase());
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          matchedKeyword = keyword;
          matchedLabel = label;
          console.log('MATCH! Keyword:', keyword, 'Label:', label);
          break;
        }
      }

      if (!matchedKeyword) {
        console.log('No keyword matched');
        return new Response('OK', { status: 200 });
      }

      console.log('Calling Supabase RPC...');
      console.log('Supabase URL:', env.SUPABASE_URL);

      const supabaseUrl = env.SUPABASE_URL;
      const supabaseKey = env.SUPABASE_SERVICE_KEY;

      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_id: matchedKeyword,
          p_label: matchedLabel,
        }),
      });

      console.log('Supabase response status:', rpcResponse.status);
      const rpcText = await rpcResponse.text();
      console.log('Supabase response body:', rpcText);

      if (!rpcResponse.ok) {
        console.error('Supabase RPC error:', rpcResponse.status, rpcText);
      } else {
        console.log('Counter incremented successfully!');
      }

      return new Response('OK', { status: 200 });
    } catch (err) {
      console.error('ERROR:', err.message);
      console.error('Stack:', err.stack);
      return new Response('OK', { status: 200 });
    }
  },
};
